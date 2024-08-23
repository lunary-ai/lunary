import {
  IconBadge,
  IconBiohazard,
  IconCheck,
  IconEyeCheck,
  IconIdBadge,
  IconLanguage,
  IconMoodSmile,
  IconTextWrap,
} from "@tabler/icons-react"

// TODO: typescript
const EVALUATOR_TYPES = {
  pii: {
    id: "pii",
    name: "PII",
    description:
      "Uses AI to detect if the given field contains personal identifiable information (PII).",
    icon: IconIdBadge,
    color: "orange",
    params: [
      {
        type: "label",
        label: "Entities to look for",
        description: "Select the types of entities to look for.",
      },
      {
        type: "select",
        id: "types",
        width: 230,
        defaultValue: [
          "email",
          "phone",
          "person",
          "location",
          "org",
          "ssn",
          "cc",
          "phone",
        ],
        multiple: true,
        placeholder: "Select types",
        searchable: true,
        options: [
          {
            label: "Email",
            value: "email",
          },
          {
            label: "Phone",
            value: "phone",
          },
          {
            label: "Person",
            value: "person",
          },
          {
            label: "Location",
            value: "location",
          },
          {
            label: "Org",
            value: "org",
          },
          {
            label: "Credit Card",
            value: "cc",
          },
        ],
      },
      {
        type: "label",
        label: "Custom Regex Expressions",
        description:
          "Add custom regex expressions to detect PII (optional). Use the PCRE Regex format.",
      },
      {
        type: "select",
        id: "customRegexes",
        allowCustom: true,
        multiple: true,
        defaultValue: [],
        placeholder: "Enter custom regex",
        placeholderSearch: "Paste a custom regex to add",
        width: 300,
      },
      {
        type: "label",
        label: "Exclude strings",
        description:
          "Add case-insentive strings to exclude from the PII detection.",
      },
      {
        type: "select",
        id: "excludedEntities",
        allowCustom: true,
        multiple: true,
        defaultValue: [],
        placeholder: "Enter a strings to exclude from detection",
        placeholderSearch: "Enter a string to exclude",
        width: 300,
      },
    ],
  },
  factualness: {
    id: "factualness",
    name: "Factualness",
    soon: true,
    icon: IconCheck,
    color: "blue",
    description:
      "Checks if the LLM's response is relevant given the context and the prompt.",
    params: [],
  },
  summarization: {
    id: "summarization",
    name: "Summarization",
    icon: IconTextWrap,
    soon: true,
    color: "blue",
    description:
      "The summarization metric uses LLMs to determine whether your agent is generating factually correct summaries while including the necessary details from the original text.",
    params: [],
  },
  sentiment: {
    id: "sentiment",
    name: "Sentiment",
    icon: IconMoodSmile,
    color: "green",
    description: "Uses AI to detect the sentiment of the given field.",
    params: [],
  },
  language: {
    id: "language",
    name: "Language",
    icon: IconLanguage,
    color: "green",
    description: "Uses AI to detect the language of the interaction.",
    params: [],
  },
  toxicity: {
    name: "Toxicity",
    id: "toxicity",
    icon: IconBiohazard,
    color: "red",
    description:
      "Detects toxic, offensive, obscene, or hateful language. English only at the moment.",
    params: [],
  },
  assertion: {
    id: "assertion",
    name: "Assertion",
    icon: IconEyeCheck,
    color: "blue",
    description:
      "Checks if the input or output matches the given requirement, using an LLM to grade the output.",
    onlyInEvals: true,
    params: [
      {
        type: "label",
        label: "Condition",
        description: "Enter the condition to check for.",
      },
      {
        type: "text",
        id: "statement",
        defaultValue: "The answer is spoken like a pirate.",
        placeholder: "Is spoken like a pirate",
        width: 400,
      },
      {
        type: "label",
        label: "Model to use",
        description:
          "Select or type a custom model to use for evaluating. Note: you need to configure the proper API key for the model.",
      },
      {
        type: "select",
        id: "model",
        defaultValue: "gpt-4o-mini",
        allowCustom: true,
        options: [
          "gpt-4o-mini",
          "gpt-4o",
          "claude-3-5-sonnet-20240620",
          "claude-3-haiku-20240307",
          "bedrock/meta.llama3-8b-instruct-v1:0",
        ],
        width: 200,
      },
    ],
  },
  topics: {
    name: "Topics",
    id: "topics",
    icon: IconBadge,
    color: "violet",
    description:
      "Uses AI to detect the topics of an interaction. You can add custom topics to the model.",
    params: [
      {
        type: "label",
        label: "Enter predefined topics",
        description:
          "Add predefined topics to help the model classify conversations.",
      },
      {
        type: "select",
        multiple: true,
        id: "topics",
        defaultValue: ["Sales", "Support", "Q/A", "Feedback"],
        allowCustom: true,
        label: "Topics",
        placeholder: "Enter custom topics",
        width: 300,
      },
    ],
  },
}

export default EVALUATOR_TYPES
