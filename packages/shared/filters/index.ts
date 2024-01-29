import {
  FIELD_PARAM,
  FORMAT_PARAM,
  MATCH_PARAM,
  NUMBER_PARAM,
  PERCENT_PARAM,
} from "./params"

import type { Filter } from "./types"

export * from "./types"
export * from "./serialize"

function postgresOperators(sql: any, operator: string) {
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

export const FILTERS: Filter[] = [
  {
    id: "type",
    name: "Type",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Type is",
      },
      {
        type: "select",
        id: "type",
        width: 110,
        defaultValue: "llm",
        options: [
          {
            label: "LLM Call",
            value: "llm",
          },
          {
            label: "Agent",
            value: "agent",
          },
          {
            label: "Tool",
            value: "tool",
          },
          {
            label: "Thread",
            value: "thread",
          },
          {
            label: "Chat Message",
            value: "chat",
          },
          {
            label: "Trace",
            value: "trace",
          },
        ],
      },
    ],
    sql: (sql, { type }) =>
      type === "trace"
        ? sql`(type in ('agent','chain') and parent_run_id is null)`
        : sql`type = ${type}`,
  },
  {
    id: "models",
    name: "Model name",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Model is",
      },
      {
        type: "select",
        multiple: true,
        id: "names",
        width: 100,
        options: (type) => `/filters/models`,
      },
    ],
    sql: (sql, { names }) => sql`name = any(${names})`,
  },
  {
    id: "tags",
    name: "Tags",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Has tags",
      },
      {
        type: "select",
        multiple: true,
        width: 100,
        id: "tags",
        options: () => `/filters/tags`,
      },
    ],
    sql: (sql, { tags }) => sql`tags && '{${sql(tags)}}'`,
  },
  {
    id: "status",
    name: "Status",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Status is",
      },
      {
        type: "select",
        id: "status",
        defaultValue: "success",
        width: 140,
        options: [
          {
            label: "Completed",
            value: "success",
          },
          {
            label: "Failed",
            value: "error",
          },
        ],
      },
    ],
    sql: (sql, { status }) => sql`status = ${status}`,
  },
  // {
  //   id: "feedbacks",
  //   name: "Feedback",
  //   uiType: "basic",
  //   disableInEvals: true,
  //   params: [
  //     {
  //       type: "label",
  //       label: "Feedback",
  //     },
  //     {
  //       type: "select",
  //       multiple: true,
  //       id: "feedbacks",
  //       options: () => `/filters/feedback`,
  //     },
  //   ],
  //   // feedback is a jsonb column
  //   sql: (sql, { feedbacks }) => sql`feedback @> '${feedbacks}'`,
  // },
  {
    id: "users",
    name: "Users",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Users",
      },
      {
        type: "select",
        multiple: true,
        width: 100,
        id: "users",
        options: () => `/filters/users`,
        // render: (item) => <AppUser/> // todo
      },
    ],
    sql: (sql, { users }) => sql`external_user_id = ANY (${users})`,
  },
  {
    id: "regex",
    name: "Regex",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      MATCH_PARAM,
      {
        type: "label",
        label: "Regex",
      },
      {
        type: "text",
        id: "regex",
        placeholder: "^[0-9]+$",
      },
    ],
    evaluator: async (run, params) => {
      const { regex, type, field } = params

      const re = new RegExp(regex)

      const has = re.test(run[field])

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
    name: "JSON",
    uiType: "smart",
    params: [
      {
        label: "Response",
        type: "label",
      },
      FORMAT_PARAM,
      {
        type: "label",
        label: "JSON",
      },
    ],
    evaluator: async (run, params) => {
      const { type } = params
      let passed = false

      // todo: contains, partial, equals,..

      try {
        if (!run.output.startsWith("{")) throw "Not an object"
        JSON.parse(run.output)
        passed = true
      } catch (e) {}

      return {
        passed,
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
    name: "Credit Card",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      MATCH_PARAM,
      {
        type: "label",
        label: "Credit Card",
      },
    ],
    sql: (sql, { field, type }) => {
      const regexPattern = sql`[a-zA-Z0-9.!#$%&'*+\/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*`
      const operator = type === "contains" ? sql`~` : sql`!~`

      return sql`${sql(field + "_text")} ${operator} '${regexPattern}'`
    },
  },
  {
    id: "email",
    name: "Email",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      MATCH_PARAM,
      {
        type: "label",
        label: "Email",
      },
    ],
    sql: (sql, { field, type }) => {
      const regexPattern = sql`[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+`
      const operator = type === "contains" ? sql`~` : sql`!~`

      return sql`${sql(field + "_text")} ${operator} '${regexPattern}'`
    },
  },
  {
    id: "phone",
    name: "Phone",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      MATCH_PARAM,
      {
        type: "label",
        label: "Phone",
      },
    ],
    sql: (sql, { field, type }) => {
      const regexPattern = sql`^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$`
      const operator = type === "contains" ? sql`~` : sql`!~`

      return sql`${sql(field + "_text")} ${operator} '${regexPattern}'`
    },
  },
  {
    id: "length",
    name: "Length",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      NUMBER_PARAM,
      {
        type: "label",
        label: "Length",
      },
      {
        type: "number",
        id: "length",
        defaultValue: 100,
        unit: "chars",
        width: 60,
      },
    ],
    sql: (sql, { field, operator, length }) =>
      sql`length(${sql(field + "_text")} ${postgresOperators(sql, operator)} ${length}`,
  },
  {
    id: "date",
    name: "Date",
    uiType: "basic",
    disableInEvals: true,
    params: [
      NUMBER_PARAM,
      {
        type: "label",
        label: "Date",
      },
      {
        type: "date",
        id: "date",
      },
    ],

    sql: (sql, { operator, date }) =>
      sql`created_at ${postgresOperators(sql, operator)} '${date}'`,
  },
  {
    id: "duration",
    name: "Duration",
    uiType: "basic",
    params: [
      {
        type: "label",
        label: "Duration",
      },
      NUMBER_PARAM,
      {
        type: "number",
        id: "duration",
        defaultValue: 5,
        min: 0,
        step: 0.1,
        width: 40,
        unit: "s",
      },
    ],
    sql: (sql, { operator, duration }) =>
      sql`duration ${postgresOperators(sql, operator)} ${duration} * interval '1 second'`,
  },
  {
    id: "cost",
    name: "Cost",
    uiType: "basic",
    params: [
      {
        type: "label",
        label: "Cost",
      },
      NUMBER_PARAM,
      {
        type: "number",
        id: "cost",
        width: 70,
        min: 0,
        defaultValue: 0.1,
        unit: "$",
      },
    ],
    sql: (sql, { operator, cost }) =>
      sql`cost ${postgresOperators(sql, operator)} ${cost}`,
  },
  {
    id: "tokens",
    name: "Tokens",
    uiType: "basic",
    params: [
      {
        type: "select",
        id: "field",
        width: 100,
        defaultValue: "total",
        options: [
          {
            label: "Completion",
            value: "completion",
          },
          {
            label: "Prompt",
            value: "prompt",
          },
          {
            label: "Total",
            value: "total",
          },
        ],
      },
      {
        type: "label",
        label: "Tokens",
      },
      NUMBER_PARAM,
      {
        type: "number",
        min: 0,
        id: "tokens",
        width: 70,
      },
    ],
    // sum completion_tokens and prompt_tokens if field is total
    sql: (sql, { field, operator, tokens }) => {
      if (field === "total") {
        return sql`completion_tokens + prompt_tokens ${postgresOperators(
          sql,
          operator,
        )} ${tokens}`
      } else {
        return sql`${sql(field + "_tokens")} ${postgresOperators(
          sql,
          operator,
        )} ${tokens}`
      }
    },
  },
  {
    id: "radar",
    name: "Radar Match",
    uiType: "smart",
    params: [
      {
        type: "label",
        label: "Matches radar",
      },
      {
        type: "select",
        id: "ids",
        width: 150,
        placeholder: "Select radars",
        multiple: true,
        options: () => `/filters/radars`,
      },
    ],
    sql: (sql, { ids }) =>
      // match on table radar_result (rr) via col rr.radar_id if rr.passed = true
      sql`exists (select 1 from radar_result rr where rr.run_id = r.id and rr.passed = true and rr.radar_id = any(${ids}))`,
  },
  {
    id: "search",
    name: "Search Match",
    uiType: "smart",
    params: [
      {
        type: "label",
        label: "Search",
      },
      {
        type: "text",
        id: "query",
        placeholder: "Search",
      },
    ],
    sql: (sql, { query }) =>
      sql`r.input_text &@ ${query} or r.output_text &@ ${query} or r.error_text &@ ${query}`,
  },
  {
    id: "string",
    name: "String match",
    uiType: "smart",
    params: [
      {
        type: "select",
        id: "fields",
        width: 70,
        defaultValue: "any",
        options: [
          {
            label: "Input",
            value: "input",
          },
          {
            label: "Output",
            value: "output",
          },
          {
            label: "Any",
            value: "any",
          },
        ],
      },
      {
        type: "select",
        id: "type",
        width: 100,
        defaultValue: "contains",
        options: [
          {
            label: "Contains",
            value: "contains",
          },
          {
            label: "Not contains",
            value: "notcontains",
          },
          // {
          //   label: "Equals",
          //   value: "equals",
          // },
          {
            label: "Starts with",
            value: "starts",
          },
          {
            label: "Ends with",
            value: "ends",
          },
        ],
      },
      {
        type: "select",
        id: "sensitive",
        width: 120,
        defaultValue: "false",
        options: [
          {
            label: "Case sensitive",
            value: "true",
          },
          {
            label: "Case insensitive",
            value: "false",
          },
        ],
      },
      {
        type: "text",
        width: 100,
        id: "text",
      },
    ],
    sql: (sql, { fields, type, text, sensitive }) => {
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
    id: "ai-assertion",
    name: "AI Assertion",
    uiType: "ai",
    // soon: true,
    description:
      "Checks if the output matches the given requirement, using a gpt-3.5-turbo to grade the output.",
    onlyInEvals: true,
    params: [
      {
        type: "label",
        label: "Output",
      },
      {
        type: "select",
        id: "aiAssertion",
        placeholder: "Is spoken like a pirate",
        width: 140,
        options: [
          {
            label: "Correct",
            value: "correct",
          },
          {
            label: "Incorrect",
            value: "incorrect",
          },
        ],
      },
    ],
    // async evaluator(run, params) {
    //   return {}
    // },
  },
  {
    id: "sentiment",
    name: "Sentiment",
    soon: true,
    uiType: "ai",
    // soon: true,
    description: "Checks if the output is positive, neutral, or negative.",
    // async evaluator(run, params) {
    //   return {}
    // },
    params: [
      {
        type: "label",
        label: "Output is",
      },
      {
        type: "select",
        id: "sentiment",
        defaultValue: "positive",
        width: 140,
        options: [
          {
            label: "positive",
            value: "positive",
          },
          {
            label: "neutral",
            value: "neutral",
          },
          {
            label: "negative",
            value: "negative",
          },
        ],
      },
    ],
  },
  {
    id: "tone",
    name: "Tone",
    soon: true,
    uiType: "ai",
    onlyInEvals: true,
    description:
      "Assesses if the tone of LLM responses matches with the desired persona.",
    // async evaluator(run, params) {
    //   return {}
    // },
    params: [
      {
        type: "label",
        label: "Tone of output is more than",
      },
      PERCENT_PARAM,
      {
        type: "select",
        id: "persona",
        defaultValue: "helpful",
        width: 140,
        options: [
          {
            label: "Helpful assistant",
            value: "helpful",
          },
          {
            label: "Formal",
            value: "formal",
          },

          {
            label: "Casual",
            value: "casual",
          },
          {
            label: "Teacher",
            value: "teacher",
          },
          {
            label: "Friendly",
            value: "friendly",
          },
          {
            label: "Pirate",
            value: "pirate",
          },
        ],
      },
    ],
  },
  {
    id: "factualness",
    name: "Factualness",
    uiType: "ai",
    soon: true,
    onlyInEvals: true,
    description:
      "Checks if the output is factually correct compared to a given context",
    // async evaluator(run, params) {
    //   return {}
    // },
    params: [
      {
        type: "label",
        label: "Output is >=",
      },
      PERCENT_PARAM,
      {
        type: "label",
        label: "correct compared to context",
      },
    ],
  },
  {
    id: "system",
    name: "System Guidelines",
    uiType: "ai",
    onlyInEvals: true,
    description: `Checks if the output matches guidelines set in the 'system' message.`,
    // async evaluator(run, params) {
    //   return {}
    // },
    params: [
      {
        type: "label",
        label: "Output follows >=",
      },
      PERCENT_PARAM,
      {
        type: "label",
        label: "system guidelines",
      },
    ],
  },
  {
    id: "similarity",
    name: "Output Similarity",
    uiType: "ai",
    soon: true,
    onlyInEvals: true,
    description: `Ensure the output is similar to a given expected output (gold output).`,
    // async evaluator(run, params) {
    //   return {}
    // },
    params: [
      {
        type: "label",
        label: "Output is >=",
      },
      PERCENT_PARAM,
      {
        type: "label",
        label: "similar to expected output",
      },
    ],
  },
]
