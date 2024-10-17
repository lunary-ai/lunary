import { isOpenAIMessage, unCamelObject } from "@/src/utils/misc";
import { Parser } from "@json2csv/plainjs";
import { Context } from "koa";
import { Run } from "shared";

interface ExportType {
  sql: any;
  ctx: Context;
  runs: Array<any>;
  projectId: string;
}

interface TraceRun extends Run {
  children: TraceRun[];
}

function cleanOpenAiMessage(message: any) {
  // remove empty toolCalls if any empty
  if (Array.isArray(message.toolCalls) && !message.toolCalls.length) {
    delete message.toolCalls;
  }

  if (message.content === null) {
    message.content = "";
  }

  // openai format is snake_case
  return unCamelObject(message);
}

function validateOpenAiMessages(messages: any[] | any): any[] {
  const isValid =
    messages && Array.isArray(messages)
      ? messages.every(isOpenAIMessage)
      : isOpenAIMessage(messages);

  if (!isValid) return [];

  if (!Array.isArray(messages)) {
    return [messages];
  }

  return messages;
}

async function getRelatedRuns(sql: any, runId: string, projectId: string) {
  const related = await sql`
    with recursive related_runs as (
      select 
        r1.*
      from 
        run r1
      where
        r1.id = ${runId}
        and project_id = ${projectId}

      union all 

      select 
        r2.*
      from 
        run r2
        inner join related_runs rr on rr.id = r2.parent_run_id
  )
  select 
    rr.created_at, 
    rr.tags, 
    rr.project_id, 
    rr.id, 
    rr.status, 
    rr.name, 
    rr.ended_at, 
    rr.error, 
    rr.input, 
    rr.output, 
    rr.params, 
    rr.type, 
    rr.parent_run_id, 
    rr.completion_tokens, 
    rr.prompt_tokens, 
    rr.feedback, 
    rr.metadata
  from 
    related_runs rr;
  `;
  return related;
}

function getTraceChildren(run: Run, runs: Run[]): TraceRun {
  // @ts-ignore
  if (run.input === "__NOT_INGESTED__") {
    run.status = "filtered";
  }

  const childRuns = runs
    .filter((subRun) => subRun.parentRunId === run.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return {
    ...run,
    children: childRuns.map((subRun) => getTraceChildren(subRun, runs)),
  };
}

export async function fileExport(
  { ctx, sql, runs, projectId }: ExportType,
  exportFormat: "csv" | "ojsonl" | "jsonl",
  exportType?: "trace" | "thread",
) {
  if (exportFormat === "csv") {
    const data = runs.length > 0 ? runs : [{}];
    const parser = new Parser();
    const csv = parser.parse(data);
    const buffer = Buffer.from(csv, "utf-8");

    ctx.set("Content-Type", "text/csv");
    ctx.set("Content-Disposition", 'attachment; filename="export.csv"');

    ctx.body = buffer;
  } else if (exportFormat === "ojsonl") {
    const jsonl = runs
      // make sure it's a valid row of OpenAI messages
      .filter((row) => {
        return (
          validateOpenAiMessages(row.input).length &&
          validateOpenAiMessages(row.output).length
        );
      })
      // convert to JSON string format { messages: [input, output]}
      .map((row) =>
        unCamelObject({
          messages: [
            ...validateOpenAiMessages(row.input),
            ...validateOpenAiMessages(row.output),
          ].map(cleanOpenAiMessage),
        }),
      )

      .map((row) => JSON.stringify(row))
      .filter((line) => line.length > 0)
      .join("\n");

    const buffer = Buffer.from(jsonl, "utf-8");

    ctx.set("Content-Type", "application/jsonl");
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"');

    ctx.body = buffer;
  } else if (exportFormat === "jsonl") {
    const jsonl = (
      await Promise.all(
        runs.map(async (row) => {
          if (exportType === "trace") {
            const related = await getRelatedRuns(sql, row.id, projectId);
            row = getTraceChildren(row, related);
          }
          return JSON.stringify(row);
        }),
      )
    )
      .filter((line) => line.length > 0)
      .join("\n");

    const buffer = Buffer.from(jsonl, "utf-8");

    ctx.set("Content-Type", "application/jsonl");
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"');

    ctx.body = buffer;
  } else {
    ctx.throw(400, "Invalid export type");
  }
}
