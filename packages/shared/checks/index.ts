import {
  FIELD_PARAM,
  FIELD_PARAM_ANY,
  FORMAT_PARAM,
  MATCH_PARAM,
  NUMBER_PARAM,
  PERCENT_PARAM,
} from "./params";

import type { Check } from "./types";

export * from "./serialize";
export * from "./types";

export const RUN_TYPES = [
  "llm",
  "thread",
  "agent",
  "chain",
  "chat",
  "custom-event",
  "tool",
] as const;

export type RunTypeFilterValue = (typeof RUN_TYPES)[number];

export const RUN_TYPE_LABELS: Record<RunTypeFilterValue, string> = {
  llm: "LLM Call",
  thread: "Conversation",
  agent: "Agent",
  chain: "Chain",
  chat: "Chat",
  "custom-event": "Custom Event",
  tool: "Tool Call",
};

export const RUN_TYPE_OPTIONS = RUN_TYPES.map((value) => ({
  value,
  label: RUN_TYPE_LABELS[value],
}));

const ALL_LANGUAGES = [
  "en", // English
  "zh", // Chinese
  "hi", // Hindi
  "es", // Spanish
  "fr", // French
  "ar", // Arabic
  "bn", // Bengali
  "ru", // Russian
  "pt", // Portuguese
  "id", // Indonesian
  "ur", // Urdu
  "de", // German
  "ja", // Japanese
  "sw", // Swahili
  "ta", // Tamil
  "vi", // Vietnamese
  "ko", // Korean
  "tr", // Turkish
  "fa", // Persian
  "it", // Italian
  "pa", // Punjabi
  "pl", // Polish
  "uk", // Ukrainian
  "nl", // Dutch
  "ro", // Romanian
  "el", // Greek
  "hu", // Hungarian
  "he", // Hebrew
  "th", // Thai
  "sv", // Swedish
  "fi", // Finnish
  "no", // Norwegian
  "da", // Danish
  "cs", // Czech
  "sk", // Slovak
  "bg", // Bulgarian
  "sr", // Serbian
  "hr", // Croatian
  "lt", // Lithuanian
  "lv", // Latvian
  "et", // Estonian
  "sl", // Slovenian
  "mk", // Macedonian
  "sq", // Albanian
  "hy", // Armenian
  "ka", // Georgian
  "az", // Azerbaijani
  "ms", // Malay
];

export const CHECKS: Check[] = [
  {
    id: "tools",
    name: "Tool name",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Tool name is",
      },
      {
        type: "text",
        id: "toolName",
        placeholder: "value",
      },
    ],
  },
  {
    id: "retrievers",
    name: "Retriever name",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Retriever name is",
      },
      {
        type: "text",
        id: "retrieverName",
        placeholder: "value",
      },
    ],
  },
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
        width: 100,
        defaultValue: "llm",
        searchable: false,
        options: RUN_TYPE_OPTIONS,
      },
    ],
  },
  {
    id: "models",
    name: "Model name",
    uniqueInBar: true,
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
        id: "models",
        width: 100,
        options: () => `/filters/models`,
      },
    ],
  },
  {
    id: "custom-events",
    name: "Custom Events",
    uniqueInBar: true,
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Event name is",
      },
      {
        type: "select",
        multiple: true,
        id: "custom-events",
        width: 100,
        options: () => `/filters/custom-events`,
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
    id: "templates",
    name: "Templates",
    uniqueInBar: true,
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Prompt Template",
      },
      {
        type: "select",
        multiple: true,
        width: 150,
        id: "templates",
        options: () => `/filters/templates`,
      },
    ],
  },
  {
    id: "status",
    name: "Status",
    uniqueInBar: true,
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
        options: [{ thumb: "up" }, { thumb: "down" }, { thumb: null }],
        getItemValue: (item) => JSON.stringify(item),
      },
    ],
  },
  {
    id: "users",
    name: "Users",
    uiType: "basic",
    uniqueInBar: true,
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Users",
      },
      {
        type: "users",
        width: 100,
        id: "users",
      },
    ],
  },
  {
    id: "topics",
    name: "Topics",
    uiType: "ai",
    uniqueInBar: true,
    disableInEvals: true,
    params: [
      FIELD_PARAM,
      {
        type: "label",
        label: "is about",
      },
      {
        type: "select",
        id: "topics",
        multiple: true,
        width: 100,
        options: () => `/filters/topics`,
      },
    ],
  },
  {
    id: "intents",
    name: "User Intent",
    uiType: "ai",
    uniqueInBar: true,
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "includes",
      },
      {
        type: "select",
        id: "intents",
        multiple: true,
        searchable: true,
        width: 160,
        options: () => `/filters/intents`,
      },
    ],
  },
  {
    id: "toxicity",
    name: "Toxicity",
    uiType: "ai",
    uniqueInBar: true,
    disableInEvals: true,
    params: [
      FIELD_PARAM,
      {
        type: "label",
        label: "is",
      },
      {
        type: "select",
        id: "topics",
        multiple: true,
        width: 100,
        options: [
          {
            label: "Toxic",
            value: "toxicity",
          },
          {
            label: "Non Toxic",
            value: "non-toxicity",
          },
        ],
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
        options: (projectId, type) =>
          type ? `/filters/metadata?type=${type}` : "/filters/metadata",
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
    id: "user-props",
    name: "User Property",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "User property",
      },
      {
        type: "select",
        id: "key",
        width: 120,
        searchable: true,
        options: () => "/filters/user-props/keys",
        resetParams: ["value"],
      },
      {
        type: "label",
        label: "is",
      },
      {
        type: "select",
        id: "value",
        width: 180,
        searchable: true,
        requires: ["key"],
        options: (_projectId, _type, params) =>
          params?.key
            ? `/filters/user-props/values?key=${encodeURIComponent(params.key)}`
            : null,
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
      {
        type: "label",
        label: "Start Date",
      },
      {
        type: "select",
        id: "operator",
        width: 50,
        defaultValue: "lt",
        options: [
          {
            label: "after",
            value: "gt",
          },
          {
            label: "before",
            value: "lt",
          },
        ],
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
    id: "messages",
    name: "Message count",
    uiType: "basic",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "Messages",
      },
      {
        ...NUMBER_PARAM,
        defaultValue: "gte",
      },
      {
        type: "number",
        id: "messages",
        width: 70,
        min: 0,
        defaultValue: 1,
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
        defaultValue: 100,
        id: "tokens",
        width: 70,
      },
    ],
  },
  {
    id: "languages",
    name: "Language",
    uiType: "ai",
    disableInEvals: true,
    params: [
      FIELD_PARAM,
      {
        type: "label",
        label: "contains",
      },
      {
        type: "select",
        id: "codes",
        multiple: true,
        width: 100,
        options: ALL_LANGUAGES.map((code) => ({
          label: code,
          value: code,
        })),
      },
    ],
  },
  {
    id: "pii",
    name: "PII",
    uiType: "ai",
    disableInEvals: true,
    params: [
      {
        type: "label",
        label: "PII",
      },
      {
        type: "select",
        id: "containsPii",
        defaultValue: "success",
        width: 140,
        options: [
          {
            label: "Contains PII",
            value: "true",
          },
          {
            label: "Does not contain PII",
            value: "false",
          },
        ],
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
    id: "assertion",
    name: "Assertion",
    uiType: "ai",
    description:
      "Checks if the output matches the given requirement, using an LLM to grade the output.",
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
    name: "User Sentiment",
    uiType: "ai",
    description: "Uses AI to detect users sentiments.",
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
      "Assesses if the tone of the response matches with the desired persona.",
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
    id: "guidelines",
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
];
