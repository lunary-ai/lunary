import {
  FIELD_PARAM,
  FORMAT_PARAM,
  MATCH_PARAM,
  NUMBER_PARAM,
  PERCENT_PARAM,
} from "./params"

import type { Filter } from "./types"

export * from "./types"

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
        ],
      },
    ],
  },
  {
    id: "model",
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
        id: "name",
        options: (type) => `/filters/models`,
      },
    ],
    sql: ({ name }) => `name = '${name}'`,
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
        id: "tags",
        options: () => `/filters/tags`,
      },
    ],
    sql: ({ tags }) => `tags && '{${tags}}'`,
  },
  {
    id: "feedback",
    name: "Feedback",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Feedback",
      },
      {
        type: "select",
        multiple: true,
        id: "feedbacks",
        options: () => `/filters/feedback`,
      },
    ],
    // feedback is a jsonb column
    sql: ({ feedbacks }) => `feedback @> '${feedbacks}'`,
  },
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
        id: "users",
        options: () => `/filters/users`,
      },
    ],
    sql: ({ users }) => `user_id = ANY ('{${users}}')`,
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
      const { regex } = params
      const re = new RegExp(regex)

      const inputMatch = re.test(run.output)
      const outputMatch = re.test(run.output)

      return {
        inputMatch,
        outputMatch,
      }
    },

    sql: ({ field, type }) =>
      `result.${field}Match = ${type === "match" ? 1 : 0}`,
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
    evaluator: async (run) => {
      let parsable = false
      let partial = false

      try {
        if (!run.output.startsWith("{")) throw "Not an object"
        JSON.parse(run.output)
        parsable = true
        partial = true
      } catch (e) {}

      return {
        parsable,
        partial,
      }
    },
    sql: ({ type }) => `result.parsable = ${type === "parsable" ? 1 : 0}`,
  },
  {
    id: "xml",
    name: "XML / HTML",
    uiType: "smart",
    params: [
      {
        label: "Response",
        type: "label",
      },
      FORMAT_PARAM,
      {
        type: "label",
        label: "XML / HTML",
      },
    ],
    evaluator: async (run) => {
      let parsable = false
      let partial = false

      try {
        if (!run.output.startsWith("<")) throw "Not an object"
        // TODO: use a real XML parser
        // new DOMParser().parseFromString(run.output, "text/xml")
        parsable = true
        partial = true
      } catch (e) {}

      return {
        parsable,
        partial,
      }
    },
    sql: ({ type }) => `result.parsable = ${type === "parsable" ? 1 : 0}`,
  },
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
    evaluator: async (run) => {
      const re = new RegExp(
        "^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35d{3})d{11})$",
      )

      const inputMatch = re.test(run.input)
      const outputMatch = re.test(run.output)

      return {
        inputMatch,
        outputMatch,
      }
    },
    sql: ({ field, type }) =>
      `result.${field}Match = ${type === "match" ? 1 : 0}`,
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
    evaluator: async (run) => {
      const re = new RegExp("^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$")

      const inputMatch = re.test(run.input)
      const outputMatch = re.test(run.output)

      return {
        inputMatch,
        outputMatch,
      }
    },
    sql: ({ field, type }) =>
      `result.${field}Match = ${type === "match" ? 1 : 0}`,
  },

  {
    id: "length",
    name: "Length",
    uiType: "basic",
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
    sql: ({ field, operator, length }) =>
      `LENGTH(${field}) ${operator} ${length}`,
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

    sql: ({ operator, date }) => `created_at ${operator} '${date}'`,
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
        width: 40,
        unit: "s",
      },
    ],
    sql: ({ operator, duration }) =>
      `ended_at - created_at ${operator} ${duration} * interval '1 second'`,
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
        defaultValue: 0.1,
        unit: "$",
      },
    ],
    sql: ({ operator, cost }) => `cost ${operator} ${cost}`,
  },
  {
    id: "tokens",
    name: "Tokens",
    uiType: "basic",
    params: [
      {
        type: "select",
        id: "field",
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
        id: "tokens",
      },
    ],
    // sum completion_tokens and prompt_tokens if field is total
    sql: ({ field, operator, tokens }) => {
      if (field === "total") {
        return `completion_tokens + prompt_tokens ${operator} ${tokens}`
      } else {
        return `${field}_tokens ${operator} ${tokens}`
      }
    },
  },
  {
    id: "string",
    name: "String match",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      {
        type: "select",
        id: "type",
        width: 150,
        defaultValue: "icontains",
        options: [
          {
            label: "Contains",
            value: "contains",
          },
          {
            label: "Contains (insensitive)",
            value: "icontains",
          },
          {
            label: "Equals",
            value: "equals",
          },
          {
            label: "Equals (insensitive)",
            value: "iequals",
          },
          {
            label: "Starts with",
            value: "startswith",
          },
          {
            label: "Starts with (insensitive)",
            value: "istartswith",
          },
          {
            label: "Ends with",
            value: "endswith",
          },
          {
            label: "Ends with (insensitive)",
            value: "iendswith",
          },
        ],
      },
      {
        type: "text",
        width: 100,
        id: "text",
      },
    ],
    sql: ({ field, text }) => `${field}_text LIKE '%${text}%'`,
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
    sql: ({ status }) => `status = '${status}'`,
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
    async evaluator(run, params) {
      return {}
    },
  },
  {
    id: "sentiment",
    name: "Sentiment",
    uiType: "ai",
    // soon: true,
    description: "Checks if the output is positive, neutral, or negative.",
    async evaluator(run, params) {
      return {}
    },
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
    // soon: true,
    uiType: "ai",
    onlyInEvals: true,
    description:
      "Assesses if the tone of LLM responses matches with the desired persona.",
    async evaluator(run, params) {
      return {}
    },
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
    // soon: true,
    onlyInEvals: true,
    description:
      "Checks if the output is factually correct compared to a given context",
    async evaluator(run, params) {
      return {}
    },
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
    async evaluator(run, params) {
      return {}
    },
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
    onlyInEvals: true,
    description: `Ensure the output is similar to a given expected output (gold output).`,
    async evaluator(run, params) {
      return {}
    },
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
