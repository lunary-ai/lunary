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
  },
  {
    id: "sentiment",
    name: "Sentiment",
    soon: true,
    uiType: "ai",
    description: "Checks if the output is positive, neutral, or negative.",
    params: [
      FIELD_PARAM,
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
    id: "toxicity",
    name: "Toxicity",
    uiType: "ai",
    description:
      "Checks if the given field is toxic, offensive, obscene, or hateful. English only at the moment.",
    params: [
      FIELD_PARAM,
      MATCH_PARAM,
      {
        type: "label",
        label: "toxicity",
      },
    ],
  },
  {
    id: "system",
    name: "System Guidelines",
    uiType: "ai",
    onlyInEvals: true,
    description: `Checks if the output matches guidelines set in the 'system' message.`,
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
