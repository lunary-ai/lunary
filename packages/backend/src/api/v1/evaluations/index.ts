import { runChecksOnRun } from "@/src/checks/runChecks";
import { checkAccess } from "@/src/utils/authorization";
import { calcRunCost } from "@/src/utils/cost";
import { getReadableDateTime } from "@/src/utils/date";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { RunEvent } from "lunary/types";

import Queue from "queue-promise";
import { PassThrough } from "stream";
import { runEval } from "./utils";
import { evaluate as evaluateToxicity } from "@/src/evaluators/toxicity";
import type { Run } from "shared";
import { MessageSchema } from "shared/schemas/openai";
import { z } from "zod";

const evaluations = new Router({ prefix: "/evaluations" });

const MAX_PARALLEL_EVALS = 4;

evaluations.post(
  "/",
  checkAccess("evaluations", "create"),
  async (ctx: Context) => {
    const { name, datasetId, checklistId, providers } = ctx.request.body as any;
    const { userId, projectId, orgId } = ctx.state;

    ctx.request.socket.setTimeout(0);
    ctx.request.socket.setNoDelay(true);
    ctx.request.socket.setKeepAlive(true);

    ctx.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const queue = new Queue({
      concurrent: MAX_PARALLEL_EVALS,
      start: true,
    });

    const [{ plan }] =
      await sql`select plan, eval_allowance from org where id = ${orgId}`;
    if (plan === "free") {
      ctx.throw(403, "You can't create evaluations on the free plan.");
    }

    // TODO: transactions, but not working with because of nesting
    const evaluationToInsert = {
      name: name ? name : `Evaluation of ${getReadableDateTime()}`,
      ownerId: userId,
      projectId,
      datasetId,
      providers,
      checklistId,
      models: [], // TODO: remove this legacy col from DB,
      checks: [], // TODO: remove this legacy col from DB,
    };

    const [evaluation] =
      await sql`insert into evaluation ${sql(evaluationToInsert)} returning *`;

    const prompts = await sql`
      select * from dataset_prompt where dataset_id = ${datasetId}
    `;

    let count = 0;

    for (const prompt of prompts) {
      const variations = await sql`
        select * from dataset_prompt_variation where prompt_id = ${prompt.id}
      `;
      for (const variation of variations) {
        for (const provider of evaluation.providers) {
          count++;
          queue.enqueue(async () => {
            await runEval({
              projectId,
              evaluationId: evaluation.id,
              promptId: prompt.id,
              variation,
              provider,
              prompt: prompt.messages,
              checklistId,
              orgId,
            });
            console.info(`Task ${count} don with model ${provider.model} done`);
          });
        }
      }
    }

    const stream = new PassThrough();
    stream.pipe(ctx.res);
    ctx.status = 200;
    ctx.body = stream;

    let done = 0;

    queue.on("dequeue", () => {
      done++;
      const percentDone = (1 - (count - done) / count) * 100;
      console.debug(`Active: ${done} of ${count} (${percentDone}%)`);
      stream.write(JSON.stringify({ percentDone }) + "\n");
    });

    console.debug(`Queue started with ${count} tasks`);

    queue.on("end", () => {
      console.debug("Queue is empty now");

      stream.write(JSON.stringify({ id: evaluation?.id }) + "\n");

      stream.end();
    });
  },
);

evaluations.get(
  "/:id",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = ctx.params;

    const [evaluation] = await sql`
    select * from evaluation where id = ${id} and project_id = ${projectId}
  `;

    if (!evaluation) {
      ctx.throw(404, "Evaluation not found");
    }

    ctx.body = evaluation;
  },
);

evaluations.get(
  "/result/:evaluationId",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
    const { evaluationId } = ctx.params;
    const { projectId } = ctx.state;

    const results = await sql`
      select 
        *,
        p.id as prompt_id
      from 
        evaluation_result er 
        left join evaluation e on e.id = er.evaluation_id
        left join dataset_prompt p on p.id = er.prompt_id
        left join dataset_prompt_variation pv on pv.id = er.variation_id
      where 
        er.evaluation_id = ${evaluationId}
        and e.project_id = ${projectId}
      `;

    ctx.body = results;
  },
);

evaluations.get(
  "/",
  checkAccess("evaluations", "list"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;

    const evaluations = await sql`
    select * from evaluation where project_id = ${projectId} order by created_at desc
  `;

    ctx.body = evaluations;
  },
);

// special route used by the SDK to run evaluations
evaluations.post("/run", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { checklist, input, output, idealOutput, duration, model } = ctx.request
    .body as any;

  const [checklistData] =
    await sql` select * from checklist where slug = ${checklist} and project_id = ${projectId}`;

  if (!checklistData) {
    ctx.throw(400, "Invalid checklist, is the slug correct?");
  }

  const checks = checklistData.data;

  // deprecated: build run event without strict typing
  const virtualRun = {
    type: "llm",
    input,
    output,
    status: "success",
    // params: extra,
    name: model || "custom",
    duration: duration || 0,
    promptTokens: 0,
    completionTokens: 0,
    createdAt: new Date(),
    endedAt: new Date(),
    // Eval-only fields:
    idealOutput,
    // So the SQL queries don't fail:
    id: "00000000-0000-4000-8000-000000000000",
    projectId: "00000000-0000-4000-8000-000000000000",
    isPublic: false,
    cost: 0,
  };

  const cost = await calcRunCost(virtualRun);
  virtualRun.cost = cost ?? 0;
  virtualRun.duration = virtualRun.duration / 1000; // needs to be in ms in calcRunCost, but needs to be in seconds in the checks

  // run checks
  const { passed, results } = await runChecksOnRun(virtualRun, checks);

  ctx.body = { passed, results };
});

// new evaluator endpoint
evaluations.post(
  "/evaluate",
  checkAccess("evaluations", "create"),
  async (ctx: Context) => {
    const bodySchema = z.object({
      input: z.array(MessageSchema),
      output: MessageSchema,
      evaluatorType: z.enum(["toxicity"]),
    });
    const { evaluatorType, input, output } = bodySchema.parse(ctx.request.body);

    let passed: Boolean = false;

    if (evaluatorType === "toxicity") {
      const result = await evaluateToxicity({ input, output });
      if (result.toxic_input === false && result.toxic_output === false) {
        ctx.passed = true;
      }
    } else {
      ctx.throw(400, `Unknown evaluator type: ${evaluatorType}`);
    }

    ctx.body = { passed };
  },
);

export default evaluations;
