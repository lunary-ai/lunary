import sql from "../utils/db"
import aiAssert from "./ai/assert"
import aiFact from "./ai/fact"
import aiNER from "./ai/ner"
import aiSentiment from "./ai/sentiment"
import aiSimilarity from "./ai/similarity"
import aiToxicity from "./ai/toxic"
import rouge from "rouge"

export type CheckRunner = {
  id: string
  evaluator?: (
    run: any,
    params: any,
  ) => Promise<{
    passed: boolean
    details?: any
  }>
  sql?: (params: any) => any // todo: postgres sql type
}

const isOpenAIMessage = (field: any) =>
  typeof field === "object" &&
  field.role &&
  (field.content || field.toolCalls || field.functionCalls)

function lastMsg(field: any) {
  if (typeof field === "string" || !field) {
    return field
  } else if (Array.isArray(field) && isOpenAIMessage(field[0])) {
    return field[field.length - 1].content
  } else if (isOpenAIMessage(field)) {
    return field.content
  } else return JSON.stringify(field)
}

function postgresOperators(operator: string) {
  switch (operator) {
    case "gt":
      return sql`>`
    case "gte":
      return sql`>=`
    case "lt":
      return sql`<`
    case "lte":
      return sql`<=`
    case "eq":
      return sql`=`
    case "neq":
      return sql`!=`
    case "iequals":
      return sql`ILIKE`
    case "icontains":
      return sql`ILIKE`
    case "contains":
      return sql`LIKE`
    case "startswith":
      return sql`LIKE`
    case "istartswith":
      return sql`ILIKE`
    case "endswith":
      return sql`LIKE`
    case "iendswith":
      return sql`ILIKE`
    default:
      throw new Error(`Unsupported operator: ${operator}`)
  }
}

export const CHECK_RUNNERS: CheckRunner[] = [
  {
    id: "type",
    sql: ({ type }) =>
      type === "trace"
        ? sql`(type in ('agent','chain') and parent_run_id is null)`
        : sql`type = ${type}`,
  },
  {
    id: "models",
    sql: ({ names }) => sql`name = any(${names})`,
  },
  {
    id: "tags",
    sql: ({ tags }) => sql`tags && ${sql.array(tags)}`,
  },
  {
    id: "status",
    sql: ({ status }) => sql`status = ${status}`,
  },

  {
    id: "users",
    sql: ({ users }) => sql`external_user_id = ANY (${users})`,
  },
  {
    id: "regex",
    evaluator: async (run, params) => {
      const { regex, type, field } = params

      const re = new RegExp(regex)

      const has = re.test(lastMsg(run[field]))

      const passed = type === "contains" ? has : !has

      const match = has ? run[field].match(re)[0] : ""

      return {
        passed,
        details: { match },
      }
    },
  },
  {
    id: "json",
    evaluator: async (run, params) => {
      const { field, type } = params
      let passed = false
      let reason = ""

      const fieldText = lastMsg(run[field])

      if (type === "valid") {
        try {
          JSON.parse(fieldText)
          passed = true
        } catch (e: any) {
          reason = e.message
        }
      } else if (type === "invalid") {
        try {
          JSON.parse(fieldText)
          passed = false
        } catch (e) {}
      } else if (type === "contains") {
        const regex = /{.*?}/gs // Non-greedy match on anything between {}
        const matches = fieldText.match(regex)
        if (matches) {
          passed = matches.some((match) => {
            try {
              JSON.parse(match)
              return true // Found valid JSON
            } catch (e) {}
          })
        }
      }

      return {
        passed,
        reason,
      }
    },
  },
  // {
  //   id: "xml",
  //   name: "XML / HTML",
  //   uiType: "smart",
  //   params: [
  //     {
  //       label: "Response",
  //       type: "label",
  //     },
  //     FORMAT_PARAM,
  //     {
  //       type: "label",
  //       label: "XML / HTML",
  //     },
  //   ],
  //   evaluator: async (run) => {
  //     let parsable = false
  //     let passed = false

  //     try {
  //       if (!run.output.startsWith("<")) throw "Not an object"
  //       // TODO: use a real XML parser
  //       // new DOMParser().parseFromString(run.output, "text/xml")
  //       parsable = true
  //       partial = true
  //     } catch (e) {}

  //     return {
  //       parsable,
  //       partial,
  //     }
  //   },

  // },
  {
    id: "cc",
    sql: ({ field, type }) => {
      const operator = type === "contains" ? sql`~` : sql`!~`

      return sql`${sql(field + "_text")} ${operator} '(?:4[0-9]{3}(?:[ -]?[0-9]{4}){3}|[25][1-7][0-9]{2}(?:[ -]?[0-9]{4}){3}|6(?:011|5[0-9]{2})(?:[ -]?[0-9]{4}){3}|3[47][0-9]{2}(?:[ -]?[0-9]{4}){3}|3(?:0[0-5]|[68][0-9])(?:[ -]?[0-9]{4}){2}|(?:2131|1800|35\d{2})\d{2}(?:[ -]?\d{4}){3})'`
    },
  },
  {
    id: "email",
    sql: ({ field, type }) => {
      const regexPattern = sql`[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+`
      const operator = type === "contains" ? sql`~` : sql`!~`

      return sql`${sql(field + "_text")}::text ${operator} '${regexPattern}'`
    },
  },
  {
    id: "phone",
    sql: ({ field, type }) => {
      const regexPattern = sql`^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$`
      const operator = type === "contains" ? sql`~` : sql`!~`

      return sql`${sql(field + "_text")} ${operator} '${regexPattern}'`
    },
  },
  {
    id: "length",
    sql: ({ field, operator, length }) =>
      sql`length(${sql(field + "_text")} ${postgresOperators(operator)} ${length}`,
  },
  {
    id: "date",
    sql: ({ operator, date }) =>
      sql`created_at ${postgresOperators(operator)} '${date}'`,
  },
  {
    id: "duration",
    sql: ({ operator, duration }) =>
      sql`duration ${postgresOperators(operator)} ${duration} * interval '1 second'`,
  },
  {
    id: "cost",
    sql: ({ operator, cost }) =>
      sql`cost ${postgresOperators(operator)} ${cost}`,
  },
  {
    id: "tokens",
    // sum completion_tokens and prompt_tokens if field is total
    sql: ({ field, operator, tokens }) => {
      if (field === "total") {
        return sql`completion_tokens + prompt_tokens ${postgresOperators(
          operator,
        )} ${tokens}`
      } else {
        return sql`${sql(field + "_tokens")} ${postgresOperators(
          operator,
        )} ${tokens}`
      }
    },
  },
  {
    id: "radar",
    sql: ({ ids }) =>
      // match on table radar_result (rr) via col rr.radar_id if rr.passed = true
      sql`exists (select 1 from radar_result rr where rr.run_id = r.id and rr.passed = true and rr.radar_id = any(${ids}))`,
  },
  {
    id: "search",
    sql: ({ query }) =>
      sql`r.input_text &@ ${query} or r.output_text &@ ${query} or r.error_text &@ ${query}`,
  },
  {
    id: "string",
    sql: ({ fields, type, text, sensitive }) => {
      // inspiration (r.input ilike ${ "%" + search + "%" } or r.output ilike ${"%" + search + "%"})`;

      let operator = sql`LIKE`
      let caseSensitive = sensitive === "true"

      let textParam = text

      if (type === "starts") {
        // JSON fragment: ..., {"content": "text...
        textParam = `, "content": "${text}`
      } else if (type === "ends") {
        textParam = `${text}"}`
      }

      if (type === "contains" || type === "starts" || type === "ends") {
        operator = caseSensitive ? sql`LIKE` : sql`ILIKE`
        textParam = "%" + textParam + "%"
      } else if (type === "notcontains") {
        operator = caseSensitive ? sql`NOT LIKE` : sql`NOT ILIKE`
        textParam = "%" + textParam + "%"
      }

      // problem for the following: output_text is stringified JSON, so contains starts with JSON
      // else if (type === "starts") {
      //   operator = caseSensitive ? sql`LIKE` : sql`ILIKE`
      //   textParam = text + "%"
      // } else if (type === "ends") {
      //   operator = caseSensitive ? sql`LIKE` : sql`ILIKE`
      //   textParam = "%" + text
      // } else if (type === "equals") {
      //   operator = sql`=`
      // }

      let field = sql`input_text || output_text`

      if (fields === "input") {
        field = sql`input_text`
      } else if (fields === "output") {
        field = sql`output_text`
      }

      return sql`${field} ${operator} ${textParam}`
    },
  },
  {
    id: "assertion",
    async evaluator(run, params) {
      const { assertion } = params

      console.log("assertion", assertion)
      console.log("lastMsg(run['output'])", lastMsg(run["output"]))

      const { passed, reason } = await aiAssert(
        lastMsg(run["output"]),
        assertion,
      )

      return {
        passed,
        reason,
        details: { reason },
      }
    },
  },
  {
    id: "sentiment",
    async evaluator(run, params) {
      const { field, sentiment } = params

      const score = await aiSentiment(lastMsg(run[field]))

      let passed = false

      if (sentiment === "positive") {
        passed = score >= 0.7
      } else if (sentiment === "negative") {
        passed = score <= 0.4
      } else {
        passed = score >= 0.4 && score <= 0.7
      }

      return {
        passed,
        reason: `Sentiment score: ${score}`,
        details: { sentiment: score },
      }
    },
  },
  {
    id: "tone",
    async evaluator(run, params) {
      const { persona } = params
      // using aiAsertion
      const { passed, reason } = await aiAssert(
        lastMsg(run["output"]),
        `The tone of the response is spoken in a '${persona}' way.`,
      )

      return {
        passed,
        reason,
        details: { reason },
      }
    },
  },
  {
    id: "factualness",
    async evaluator(run, params) {
      const { choices } = params

      const input = lastMsg(run["input"])
      const output = lastMsg(run["output"])

      if (!run.idealOutput) throw new Error("No ideal response to compare to")

      const { result, reason } = await aiFact(input, output, run.idealOutput)

      const passed = choices.includes(result)

      return {
        passed,
        reason,
      }
    },
  },
  {
    id: "system",
  },
  {
    id: "rouge",
    async evaluator(run, params) {
      const { percent, rouge: rougeType } = params

      const output = lastMsg(run["output"])

      if (!run.context) throw new Error("No context to compare to")

      const scorer = rouge[rougeType]

      const rougeScore = scorer(output, run.context) * 100

      const passed = rougeScore >= parseInt(percent)

      return {
        passed,
        reason: `Rouge score: ${rougeScore} >= ${percent}%`,
        details: { rouge: rougeScore },
      }
    },
  },
  {
    id: "similarity",
    async evaluator(run, params) {
      const { algorithm, percent } = params
      const output = lastMsg(run["output"])

      if (!run.idealOutput) throw new Error("No ideal response to compare to")

      const similarity = await aiSimilarity(output, run.idealOutput, algorithm)

      const passed = similarity >= percent

      return {
        passed,
        details: { similarity },
      }
    },
  },
  {
    id: "entities",
    async evaluator(run, params) {
      const { field, type, entities } = params

      const result = await aiNER(lastMsg(run[field]))

      let passed = false

      if (type === "contains") {
        passed = entities.some((entity) => result[entity]?.length > 0)
      } else {
        passed = entities.every((entity) => result[entity]?.length === 0)
      }

      let labels = {
        PER: "Persons",
        ORG: "Organizations",
        LOC: "Locations",
      }

      let reason = "No entities detected"
      if (passed) {
        reason =
          "Entities detected: " +
          Object.keys(result)
            .filter((key) => result[key].length > 0)
            .map((key) => labels[key] + ": " + result[key].join(", "))
            .join(", ")
      }

      return {
        passed,
        reason,
        details: result,
      }
    },
  },
  {
    id: "toxicity",
    async evaluator(run, params) {
      const { field, type } = params

      let textsToCheck = []
      if (field === "any") {
        textsToCheck.push(lastMsg(run["input"]), lastMsg(run["output"]))
      } else {
        textsToCheck.push(lastMsg(run[field]))
      }

      const labels = await aiToxicity(textsToCheck)

      const hasToxicity = labels.length > 0

      const passed = type === "contains" ? hasToxicity : !hasToxicity

      let reason = "No toxicity detected"
      if (hasToxicity) {
        reason = `Toxicity detected: ${labels.join(", ")}`
      }

      return {
        passed,
        reason,
        details: { labels },
      }
    },
  },
]

export default CHECK_RUNNERS
