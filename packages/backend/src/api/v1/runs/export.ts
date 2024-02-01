import { Parser } from "@json2csv/plainjs"
import { Context } from "koa"

export async function fileExport(
  rows: Array<any>,
  exportType: "csv" | "jsonl",
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
  } else if (exportType === "jsonl") {
    const jsonl = rows.map((row) => JSON.stringify(row)).join("\n")
    const buffer = Buffer.from(jsonl, "utf-8")

    ctx.set("Content-Type", "application/jsonl")
    ctx.set("Content-Disposition", 'attachment; filename="export.jsonl"')

    ctx.body = buffer
  }
}
