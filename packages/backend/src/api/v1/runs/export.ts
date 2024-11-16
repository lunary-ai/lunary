import { isOpenAIMessage, unCamelObject } from "@/src/utils/misc";
import { Parser } from "@json2csv/plainjs";
import { Context } from "koa";
import { Run } from "shared";
import { Readable } from "stream";

interface ExportType {
  sql: any;
  ctx: Context;
  projectId: string;
  cursor?: any;
  formatRun: (run: any) => any;
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
  { ctx, sql, cursor, formatRun, projectId }: ExportType,
  exportFormat: "csv" | "ojsonl" | "jsonl",
  exportType?: "trace" | "thread" | "llm",
) {
  if (exportFormat === "csv") {
    const parser = new Parser();

    ctx.set("Content-Type", "text/csv");
    ctx.set("Content-Disposition", 'attachment; filename="export.csv"');

    const stream = Readable.from({
      async *[Symbol.asyncIterator]() {
        let isFirst = true;
        for await (const [row] of cursor) {
          let line;
          if (exportType === "trace") {
            const related = await getRelatedRuns(sql, row.id, projectId);
            line = parser.parse(getTraceChildren(formatRun(row), related));
          } else {
            line = parser.parse(formatRun(row));
          }
          if (isFirst) {
            isFirst = false;
          } else {
            line = line.trim().split("\n").slice(1).join("\\n");
          }
          // console.log(line);
          yield line + "\n";
        }
      },
    });
    ctx.body = stream;
  } else if (exportFormat === "ojsonl") {
    ctx.set("Content-Type", "application/jsonl");
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"');

    const stream = Readable.from({
      async *[Symbol.asyncIterator]() {
        for await (const [row] of cursor) {
          // make sure it's a valid row of OpenAI messages
          const input = validateOpenAiMessages(row.input);
          const output = validateOpenAiMessages(row.output);

          if (input.length && output.length) {
            // convert to JSON string format { messages: [input, output]}
            const line = JSON.stringify(
              unCamelObject({
                messages: [...input, ...output].map(cleanOpenAiMessage),
              }),
            );
            if (line.length > 0) {
              yield line + "\n";
            }
          }
        }
      },
    });
    ctx.body = stream;
  } else if (exportFormat === "jsonl") {
    ctx.set("Content-Type", "application/jsonl");
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"');

    const stream = Readable.from({
      async *[Symbol.asyncIterator]() {
        for await (const [row] of cursor) {
          let line;
          if (exportType === "trace") {
            const related = await getRelatedRuns(sql, row.id, projectId);
            line = JSON.stringify(getTraceChildren(row, related));
          } else {
            line = JSON.stringify(row);
          }
          if (line.length > 0) {
            yield line + "\n";
          }
        }
      },
    });
    ctx.body = stream;
  } else {
    ctx.throw(400, "Invalid export type");
  }
}
