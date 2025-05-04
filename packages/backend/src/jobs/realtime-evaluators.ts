import { convertChecksToSQL } from "@/src/utils/checks";
import sql from "@/src/utils/db";
import { Run } from "shared";
import { RealtimeEvaluator } from "shared/enrichers";
import { sleep } from "../utils/misc";
import evaluators from "../evaluators";
import type { ToxicityResult } from "../evaluators/toxicity";

const RUNS_BATCH_SIZE = 5;

async function runEvaluator(evaluator: RealtimeEvaluator, run: Run) {
  try {
    const result = await evaluators[evaluator.type].evaluate(
      run,
      evaluator.params,
    );

    if (evaluator.type === "toxicity" && result) {
      const tox = result as ToxicityResult;

      // Upsert into run_toxicity (snake_case handled by porsager‑postgres)
      await sql`
        insert into run_toxicity ${sql({
          runId: run.id,
          toxicInput: tox.toxic_input,
          toxicOutput: tox.toxic_output,
          inputLabels: tox.input_labels,
          outputLabels: tox.output_labels,
          messages: tox.messages, // jsonb column
        })}
        on conflict (run_id) do update set
          toxic_input   = excluded.toxic_input,
          toxic_output  = excluded.toxic_output,
          input_labels  = excluded.input_labels,
          output_labels = excluded.output_labels,
          messages      = excluded.messages
      `;
    }

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
      // Sentry.captureException(error);
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

  const toxJoin =
    evaluator.type === "toxicity"
      ? sql`left join run_toxicity rt on r.id = rt.run_id`
      : sql``;

  const toxWhere =
    evaluator.type === "toxicity" ? sql`and rt.run_id is null` : sql``;

  return await sql`
    select
      r.*
    from
      run r
      ${toxJoin}
      left join evaluation_result_v2 er
        on r.id = er.run_id
        and er.evaluator_id = ${evaluator.id}
    where
      r.project_id = ${evaluator.projectId}
      and (${filtersQuery})
      and er.run_id is null
      ${toxWhere}
      and r.is_deleted = false
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
    order by
      random()
  `;

  for (let i = 0; i < evaluators.length; i++) {
    const evaluator = evaluators[i];

    const runs = await getEvaluatorRuns(evaluator);

    if (!runs.length) {
      console.info(
        `Skipping Real-time Evaluator ${evaluator.id} (${i} / ${evaluators.length})`,
      );
      continue;
    }

    console.info(
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
        // Sentry.captureException(error);
      }
      console.error(error);
    }
  }
}
