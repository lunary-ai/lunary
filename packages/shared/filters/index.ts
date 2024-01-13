import { FIELD_PARAM, FORMAT_PARAM, MATCH_PARAM, NUMBER_PARAM } from "./params"

import type { Filter } from "./types"

export const FILTERS: Filter[] = [
  {
    id: "modelName",
    name: "Model name",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Model name",
      },
      {
        type: "select",
        multiple: true,
        id: "name",
        label: "Model name",
        options: (type) => `/filters/models`,
      },
    ],
    sql: ({ name }) => `name = '${name}'`,
  },
  {
    id: "tags",
    name: "Tags",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Tags",
      },
      {
        type: "select",
        multiple: true,
        id: "tags",
        label: "Tags",
        options: () => `/filters/tags`,
      },
    ],
    sql: ({ tags }) => `tags && '{${tags}}'`,
  },
  {
    id: "feedback",
    name: "Feedback",
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
        label: "Regex",
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
    name: "Valid JSON",
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
    name: "Valid XML / HTML",
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
        label: "Length",
      },
    ],
    sql: ({ field, operator, length }) =>
      `LENGTH(${field}) ${operator} ${length}`,
  },
  {
    id: "date",
    name: "Date",
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
        label: "Date",
      },
    ],

    sql: ({ operator, date }) => `created_at ${operator} '${date}'`,
  },
  {
    id: "duration",
    name: "Duration",
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
        label: "Duration",
      },
    ],
    sql: ({ operator, duration }) =>
      `ended_at - created_at ${operator} ${duration} * interval '1 second'`,
  },
  {
    id: "cost",
    name: "Cost",
    params: [
      {
        type: "label",
        label: "Cost",
      },
      NUMBER_PARAM,

      {
        type: "number",
        id: "cost",
        width: 100,
        defaultValue: 0.1,
        unit: "$",
        label: "Cost",
      },
    ],
    sql: ({ operator, cost }) => `cost ${operator} ${cost}`,
  },
  {
    id: "tokens",
    name: "Tokens",
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
        label: "Tokens",
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
    id: "contains",
    name: "Contains",
    params: [
      FIELD_PARAM,
      {
        type: "label",
        label: "Contains",
      },
      {
        type: "text",
        width: 100,
        id: "text",
        label: "Text",
      },
    ],
    sql: ({ field, text }) => `${field}_text LIKE '%${text}%'`,
  },
  {
    id: "status",
    name: "Status",
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
]
