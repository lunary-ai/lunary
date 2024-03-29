import {
  FIELD_PARAM,
  FIELD_PARAM_ANY,
  FORMAT_PARAM,
  MATCH_PARAM,
  NUMBER_PARAM,
  PERCENT_PARAM,
} from "./params"

import type { Check } from "./types"

export * from "./types"
export * from "./serialize"

export const CHECKS: Check[] = [
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
        searchable: true,
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
        id: "types",
        options: () => `/filters/feedback`,
        getItemValue: (item) => JSON.stringify(item),
      },
    ],
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
        width: 100,
        id: "users",
        options: () => `/filters/users`,
        searchable: true,
        getItemValue: (item) => `${item.id}`,
        customSearch: (search, item) => {
          const searchTerm = search.toLowerCase().trim()

          const toCheck = [
            item.external_id,
            item.props?.email,
            item.props?.name,
            item.props?.firstName,
            item.props?.lastName,
          ]

          return toCheck.some((check) =>
            check?.toLowerCase().includes(searchTerm),
          )
        },
      },
    ],
  },
  {
    id: "metadata",
    name: "Metadata",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Metadata",
      },
      {
        type: "select",
        width: 100,
        id: "key",
        searchable: true,
        options: () => `/filters/metadata`,
      },
      {
        type: "label",
        label: "is",
      },
      {
        type: "text",
        id: "value",
        placeholder: "value",
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
    description: "Checks if the given field is valid JSON.",
    uiType: "smart",
    params: [
      FIELD_PARAM,
      FORMAT_PARAM,
      {
        type: "label",
        label: "JSON",
      },
    ],
  },
  {
    id: "python",
    name: "Python",
    description: "Checks if the given field is valid python code.",
    soon: true,
    uiType: "smart",
    params: [
      FIELD_PARAM,
      FORMAT_PARAM,
      {
        type: "label",
        label: "Python",
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
  // {
  //   id: "cc",
  //   name: "Credit Card",
  //   disableInEvals: true,
  //   uiType: "smart",
  //   params: [
  //     FIELD_PARAM,
  //     MATCH_PARAM,
  //     {
  //       type: "label",
  //       label: "Credit Card",
  //     },
  //   ],
  // },
  // {
  //   id: "email",
  //   name: "Email",
  //   disableInEvals: true,
  //   uiType: "smart",
  //   params: [
  //     FIELD_PARAM,
  //     MATCH_PARAM,
  //     {
  //       type: "label",
  //       label: "Email",
  //     },
  //   ],
  // },
  // {
  //   id: "phone",
  //   name: "Phone",
  //   disableInEvals: true,
  //   uiType: "smart",
  //   params: [
  //     FIELD_PARAM,
  //     MATCH_PARAM,
  //     {
  //       type: "label",
  //       label: "Phone",
  //     },
  //   ],
  // },
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
    disableInEvals: true,
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
    disableInEvals: true,
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
    disableInEvals: true,
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
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Matches radar",
      },
      {
        type: "select",
        id: "ids",
        width: 200,
        placeholder: "Select radars",
        multiple: true,
        options: () => `/filters/radars`,
        searchable: true,
      },
    ],
  },
  {
    id: "search",
    name: "Search Match",
    uiType: "smart",
    disableInEvals: true,
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
        defaultValue: "output",
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
    id: "pii",
    name: "PII",
    uiType: "ai",

    description:
      "Uses AI to detect if the given field contains personal identifiable information (PII).",
    params: [
      FIELD_PARAM,
      MATCH_PARAM,
      {
        type: "select",
        id: "entities",
        width: 230,
        defaultValue: ["person", "location", "email", "cc", "phone", "ssn"],
        multiple: true,
        searchable: true,
        options: [
          {
            label: "Name",
            value: "person",
          },
          {
            label: "Location",
            value: "location",
          },
          {
            label: "Organization",
            value: "org",
          },
          {
            label: "Email",
            value: "email",
          },
          {
            label: "Credit Card",
            value: "cc",
          },
          {
            label: "Phone",
            value: "phone",
          },
          {
            label: "SSN",
            value: "ssn",
          },
        ],
      },
    ],
  },
  {
    id: "assertion",
    name: "Assertion",
    uiType: "ai",
    description:
      "Checks if the output matches the given requirement, using GPT-4 to grade the output.",
    onlyInEvals: true,
    params: [
      {
        type: "label",
        label: "Output",
      },
      {
        type: "text",
        id: "assertion",
        placeholder: "Is spoken like a pirate",
        width: 140,
      },
    ],
  },
  {
    id: "sentiment",
    name: "Sentiment",
    uiType: "ai",
    description:
      "Uses AI to check if content is positive, neutral, or negative.",
    params: [
      FIELD_PARAM,
      {
        type: "label",
        label: "sentiment is",
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
    uiType: "ai",
    onlyInEvals: true,
    description:
      "Assesses if the tone of the LLM response matches with the desired persona.",
    params: [
      {
        type: "label",
        label: "Tone of output matches",
      },
      {
        type: "select",
        id: "persona",
        defaultValue: "helpful",
        width: 140,
        searchable: true,
        options: [
          {
            label: "Helpful Assistant",
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
            label: "Professional",
            value: "professional",
          },
          {
            label: "Instructive",
            value: "instructive",
          },
          {
            label: "Authoritative",
            value: "authoritative",
          },
          {
            label: "Informative",
            value: "informative",
          },
          {
            label: "Sarcastic",
            value: "sarcastic",
          },
          {
            label: "Humorous",
            value: "humorous",
          },
          {
            label: "Empathetic",
            value: "empathetic",
          },
          {
            label: "Enthusiastic",
            value: "enthusiastic",
          },
          {
            label: "Motivational",
            value: "motivational",
          },
          {
            label: "Curious",
            value: "curious",
          },
          {
            label: "Sincere",
            value: "sincere",
          },
          {
            label: "Witty",
            value: "witty",
          },
          {
            label: "Pirate",
            value: "pirate",
          },
        ],
      },
      {
        type: "label",
        label: "persona",
      },
    ],
  },
  {
    id: "factualness",
    name: "Factualness",
    uiType: "ai",
    onlyInEvals: true,
    description:
      "Checks how correct the LLM's response is compared to the ideal output (ues OpenAI's eval prompt).",
    params: [
      {
        type: "label",
        label: "The answer",
      },
      {
        type: "select",
        id: "choices",
        defaultValue: ["b", "c"],
        multiple: true,
        width: 200,
        searchable: true,
        options: [
          {
            label: "is a subset of",
            value: "a",
          },
          {
            label: "is a superset of",
            value: "b",
          },
          {
            label: "contains all the same details as",
            value: "c",
          },
          {
            label: "disagrees with",
            value: "d",
          },
          {
            label: "differs (but doesn't matter from a factual standpoint)",
            value: "e",
          },
        ],
      },
      {
        type: "label",
        label: "the ideal output",
      },
    ],
  },
  {
    id: "relevancy",
    name: "Relevancy",
    uiType: "ai",
    soon: true,
    onlyInEvals: true,
    description:
      "Checks if the LLM's response is relevant given the context and the prompt.",
    params: [
      {
        type: "label",
        label: "Output is >=",
      },
      PERCENT_PARAM,
      {
        type: "label",
        label: "relevant",
      },
    ],
  },
  {
    id: "toxicity",
    name: "Toxicity",
    uiType: "ai",
    description:
      "Checks if the given field contains toxic, offensive, obscene, or hateful language. English only at the moment.",
    params: [
      FIELD_PARAM_ANY,
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
    soon: true,
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
    name: "Similarity",
    uiType: "ai",
    onlyInEvals: true,
    description: `Check if the output is similar to a given ideal output with various algorithms.`,
    params: [
      {
        type: "label",
        label: "Output is >=",
      },
      PERCENT_PARAM,
      {
        type: "label",
        label: "similar to ideal output using",
      },
      {
        type: "select",
        id: "algorithm",
        width: 100,
        defaultValue: "ai",
        options: [
          {
            value: "ai",
            label: "Smart AI",
          },
          {
            label: "Cosine (vector)",
            value: "cosine",
          },
          {
            label: "Jaccard",
            value: "jaccard",
          },
        ],
      },
      {
        type: "label",
        label: "similarity",
      },
    ],
  },
  {
    id: "rouge",
    name: "ROUGE",
    uiType: "ai",
    onlyInEvals: true,
    description: `Rouge (Recall-Oriented Understudy for Gisting Evaluation) is a metric used for evaluating the quality of generated text, especially in tasks like text summarization.`,

    params: [
      {
        type: "label",
        label: "Output is >=",
      },
      PERCENT_PARAM,
      {
        type: "select",
        id: "rouge",
        width: 100,
        defaultValue: "n",
        options: [
          {
            value: "n",
            label: "ROUGE-n",
          },
          {
            value: "l",
            label: "ROUGE-l",
          },
          {
            value: "rouge-s",
            label: "ROUGE-s",
          },
        ],
      },
    ],
  },
]
