import { convertChecksToSQL } from "@/src/utils/checks";
import sql from "@/src/utils/db";
import * as Sentry from "@sentry/node";
import { Run } from "shared";
import { RealtimeEvaluator } from "shared/enrichers";
import { sleep } from "../utils/misc";
import evaluators from "../evaluators";

const RUNS_BATCH_SIZE = 20;

async function runEvaluator(evaluator: RealtimeEvaluator, run: Run) {
  try {
    const result = await evaluators[evaluator.type].evaluate(
      run,
      evaluator.params,
    );

    if (typeof result !== "undefined" && result !== null) {
      await sql`
      insert into evaluation_result_v2
      ${sql({
        evaluatorId: evaluator.id,
        runId: run.id,
        result,
      })}
    `;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    }
    console.error(
      `Error while evaluating run ${run.id} with evaluator ${evaluator.id}: `,
      error,
    );
  }
}

async function getEvaluatorRuns(evaluator: any) {
  const filtersQuery = convertChecksToSQL(
    evaluator.filters || ["AND", { id: "type", params: { type: "llm" } }],
  );

  return await sql`
    select 
      r.* 
    from 
      run r
      left join evaluation_result_v2 er on r.id = er.run_id
        and er.evaluator_id = ${evaluator.id}
    where 
      r.project_id = ${evaluator.projectId}
      and (${filtersQuery})
      and er.run_id is null
    order by 
      r.created_at desc
    limit ${RUNS_BATCH_SIZE}
  `;
}

async function evaluatorJob() {
  const [{ exists }] = await sql`select exists(select 1 from run)`;
  if (!exists) {
    // No runs, sleep to not spam the logs
    await sleep(20000);
  }

  const evaluators = await sql<RealtimeEvaluator[]>`
    select 
      * 
    from 
      evaluator e 
    where
      mode = 'realtime' 
      and project_id = '07ff18c9-f052-4260-9e89-ea93fe9ba8c5' 
    order by 
      random()
  `;

  for (let i = 0; i < evaluators.length; i++) {
    const evaluator = evaluators[i];

    const runs = await getEvaluatorRuns(evaluator);

    if (!runs.length) {
      console.log(
        `Skipping Real-time Evaluator ${evaluator.id} (${i} / ${evaluators.length})`,
      );
      continue;
    }

    console.log(
      `Starting Real-time Evaluator ${evaluator.id} - ${runs.length} runs (${i + 1} / ${evaluators.length})`,
    );

    await Promise.all(runs.map((run) => runEvaluator(evaluator, run)));
  }
}

export default async function runEvaluatorsJob() {
  while (true) {
    try {
      await evaluatorJob();
    } catch (error) {
      await sleep(3000); // Avoid spamming the ml service when there are connection errors
      if (process.env.NODE_ENV === "production") {
        Sentry.captureException(error);
      }
      console.error(error);
    }
  }
}
