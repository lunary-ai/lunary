import {
  IconBadge,
  IconBiohazard,
  IconCheck,
  IconEyeCheck,
  IconIdBadge,
  IconLanguage,
  IconMoodSmile,
  IconNotebook,
  IconTextWrap,
} from "@tabler/icons-react";

// TODO: typescript
const EVALUATOR_TYPES = {
  language: {
    id: "language",
    name: "Language",
    icon: IconLanguage,
    color: "green",
    description:
      "Detect the languages used for each messages of your conversations.",
    params: [],
  },
  bias: {
    id: "bias",
    name: "Bias",
    icon: IconEyeCheck,
    color: "blue",
    description:
      "Detects if the LLM output contains gender, racial, or political bias.",
    params: [],
    beta: true,
  },
  toxicity: {
    id: "toxicity",
    name: "Toxicity",
    icon: IconBiohazard,
    color: "red",
    description: "Detects the toxicness in your LLM outputs.",
    params: [],
    beta: true,
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
        defaultValue: ["email", "phone", "ssn", "cc", "iban"],
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
            label: "SSN",
            value: "ssn",
          },
          {
            label: "Credit Card",
            value: "cc",
          },
          {
            label: "IBAN",
            value: "iban",
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
};

export default EVALUATOR_TYPES;
