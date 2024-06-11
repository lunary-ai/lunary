import { isOpenAIMessage, unCamelObject } from "@/src/utils/misc"
import { Parser } from "@json2csv/plainjs"
import { Context } from "koa"

function cleanOpenAiMessage(message: any) {
  // remove empty toolCalls if any empty
  // if (Array.isArray(message.toolCalls) && !message.toolCalls.length) {
  // delete message.toolCalls
  // }

  // TODO: when OpenAI supports it, remove this line
  delete message.toolCalls

  if (message.content === null) {
    message.content = ""
  }

  // openai format is snake_case
  return unCamelObject(message)
}

function validateOpenAiMessages(messages: any[] | any): any[] {
  const isValid =
    messages && Array.isArray(messages)
      ? messages.every(isOpenAIMessage)
      : isOpenAIMessage(messages)

  if (!isValid) return []

  if (!Array.isArray(messages)) {
    return [messages]
  }

  return messages
}

export async function fileExport(
  rows: Array<any>,
  exportType: "csv" | "ojsonl" | "jsonl",
  ctx: Context,
) {
  if (exportType === "csv") {
    const data = rows.length > 0 ? rows : [{}]
    const parser = new Parser()
    const csv = parser.parse(data)
    const buffer = Buffer.from(csv, "utf-8")

    ctx.set("Content-Type", "text/csv")
    ctx.set("Content-Disposition", 'attachment; filename="export.csv"')

    ctx.body = buffer
  } else if (exportType === "ojsonl") {
    const jsonl = rows
      // make sure it's a valid row of OpenAI messages
      .filter((row) => {
        return (
          validateOpenAiMessages(row.input).length &&
          validateOpenAiMessages(row.output).length
        )
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
      .join("\n")

    const buffer = Buffer.from(jsonl, "utf-8")

    ctx.set("Content-Type", "application/jsonl")
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"')

    ctx.body = buffer
  } else if (exportType === "jsonl") {
    const jsonl = rows
      .map((row) => JSON.stringify(row))
      .filter((line) => line.length > 0)
      .join("\n")

    const buffer = Buffer.from(jsonl, "utf-8")

    ctx.set("Content-Type", "application/jsonl")
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"')

    ctx.body = buffer
  } else {
    ctx.throw(400, "Invalid export type")
  }
}
