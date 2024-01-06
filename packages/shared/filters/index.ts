import { Badge } from "@mantine/core"
import { FIELD_PARAM, FORMAT_PARAM, MATCH_PARAM, NUMBER_PARAM } from "./params"

import { Filter } from "./types"

export const FILTERS: Filter[] = [
  {
    id: "modelName",
    name: "Model name",
    params: [
      {
        type: "multiselect",
        id: "name",
        label: "Model name",
        options: (projectId, type) =>
          `/filters/models/${projectId}?type=${type}`,
      },
    ],
    sql: ({ name }) => `name = '${name}'`,
  },
  {
    id: "tags",
    name: "Tags",
    params: [
      {
        type: "multiselect",
        id: "tags",
        label: "Tags",
        options: (projectId, type) => `/filters/tags/${projectId}?type=${type}`,
      },
    ],
    sql: ({ tags }) => `tags && '{${tags}}'`,
  },
  {
    id: "feedback",
    name: "Feedback",
    params: [
      {
        type: "multiselect",
        id: "feedbacks",
        options: (projectId, type) => `/filters/feedback/${projectId}`,
      },
    ],
    // feedback is a jsonb column
    sql: ({ feedbacks }) => `feedback @> '${feedbacks}'`,
  },
  {
    id: "users",
    name: "Users",
    params: [
      {
        type: "multiselect",
        id: "users",
        options: (projectId, type) => `/filters/users/${projectId}`,
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
    params: [FORMAT_PARAM],
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
    params: [FORMAT_PARAM],
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
    params: [FIELD_PARAM, MATCH_PARAM],
    evaluator: async (run) => {
      const re = new RegExp(
        "^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35d{3})d{11})$"
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
    params: [FIELD_PARAM, MATCH_PARAM],
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
        type: "number",
        id: "length",
        unit: "chars",
        label: "Length",
      },
    ],
    sql: ({ field, operator, length }) =>
      `LENGTH(${field}) ${operator} ${length}`,
  },
  {
    id: "date",
    name: "Date",
    params: [
      NUMBER_PARAM,
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
      NUMBER_PARAM,
      {
        type: "number",
        id: "duration",
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
      NUMBER_PARAM,
      {
        type: "number",
        id: "cost",
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
        type: "text",
        id: "text",
        label: "Text",
      },
    ],
    sql: ({ field, text }) => `${field}_text LIKE '%${text}%'`,
  },
  {
    id: "status",
    name: "Status",
    params: [
      {
        type: "select",
        id: "status",
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
