import nlp from "compromise"
import { Run } from "../../types"
import postgres from "postgres"
import { franc } from "franc"

interface PiiParams {
  entities: "person" | "location" | "org" | "email"
}

export async function evaluate(run: Run, params: PiiParams) {
  const { entities } = params
  const results: {
    names?: string[]
    places?: string[]
    emails?: string[]
    ips?: string[]
  } = {}

  run.inputText = run.inputText || ""
  run.outputText = run.outputText || ""

  const text = run.inputText + run.outputText
  const doc = nlp(text)
  const lang = franc(text)

  if (entities.includes("person") && lang === "eng") {
    results.names = [...new Set<string>(doc.people().out("array"))]
  }

  if (entities.includes("location") && lang === "eng") {
    results.names = [...new Set<string>(doc.places().out("array"))]
  }

  if (entities.includes("email")) {
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    results.emails = [...new Set(text.match(emailRegex))] || undefined
  }

  if (entities.includes("ip")) {
    const ipRegex = /(?:\d{1,3}\.){3}\d{1,3}/gi
    results.ips = [...new Set(text.match(ipRegex))] || undefined
  }

  return results
}

async function main() {
  const sql = postgres(
    "postgresql://postgres:JuvjG9Wy5a1CwjUu@88.198.48.232/lunary",
    {
      transform: {
        ...postgres.camel,
      },
    },
  )
  const runs = await sql`select * from run limit 1000`

  for (const run of runs) {
    const res = await evaluate(run, {
      entities: ["person", "email", "ip", "location"],
    })
    console.log(run.id)
    console.log(res)
  }
}
main()
