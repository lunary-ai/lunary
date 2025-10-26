import {
  IconBadge,
  IconBiohazard,
  IconCheck,
  IconGauge,
  IconIdBadge,
  IconLanguage,
  IconNotebook,
  IconTargetArrow,
  IconTextWrap,
} from "@tabler/icons-react";

type EvaluatorCategory = "labeler" | "text-similarity" | "custom";

interface EvaluatorDefinition {
  id: string;
  name: string;
  /** Lower‑case bucket name */
  category: EvaluatorCategory;
  /** React icon component */
  icon: React.ComponentType<any>;
  /** Mantine / Tailwind color key */
  color: string;
  description: string;
  /** Configuration inputs shown in the UI */
  params: any[];
  /** Optional feature‑flag fields */
  beta?: boolean;
  soon?: boolean;
  builtin?: boolean;
}

type EvaluatorTypes = Record<string, EvaluatorDefinition>;

const EVALUATOR_TYPES: EvaluatorTypes = {
  language: {
    id: "language",
    name: "Language",
    category: "labeler",
    icon: IconLanguage,
    color: "green",
    description:
      "Detect the languages used for each messages of your conversations.",
    params: [],
    beta: false,
    soon: false,
    builtin: true,
  },
  toxicity: {
    id: "toxicity",
    name: "Toxicity",
    category: "labeler",
    icon: IconBiohazard,
    color: "red",
    description: "Use LLM models to detect if your LLM Logs contain toxicity.",
    params: [],
    beta: true,
    soon: false,
    builtin: true,
  },
  topics: {
    id: "topics",
    name: "Topics Detection",
    category: "labeler",
    icon: IconBadge,
    color: "violet",
    description:
      "Uses Lunary's ML models to detect the topics of an interaction. You can add custom topics to the model.",
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
    beta: false,
    soon: false,
    builtin: true,
  },
  intent: {
    id: "intent",
    name: "Intent Detection",
    category: "labeler",
    icon: IconTargetArrow,
    color: "indigo",
    description:
      "Detect the underlying intents behind an entire conversation thread.",
    params: [],
    beta: true,
    soon: false,
    builtin: true,
  },
  pii: {
    id: "pii",
    name: "PII Detection",
    category: "labeler",
    icon: IconIdBadge,
    color: "orange",
    description:
      "Uses Lunary's ML models to detect if the given field contains personal identifiable information (PII).",
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
          { label: "Email", value: "email" },
          { label: "Phone", value: "phone" },
          { label: "SSN", value: "ssn" },
          { label: "Credit Card", value: "cc" },
          { label: "IBAN", value: "iban" },
        ],
      },
      {
        type: "label",
        label: "Custom Regex Expressions",
        description: "Use the PCRE Regex format.",
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
          "Add case‑insensitive strings to exclude from the PII detection.",
      },
      {
        type: "select",
        id: "excludedEntities",
        allowCustom: true,
        multiple: true,
        defaultValue: [],
        placeholder: "Enter strings to exclude from detection",
        placeholderSearch: "Enter a string to exclude",
        width: 300,
      },
    ],
    beta: false,
    soon: false,
    builtin: true,
  },
  "model-labeler": {
    id: "model-labeler",
    name: "Model Labeler",
    category: "labeler",
    icon: IconNotebook,
    color: "blue",
    description:
      "Use a custom LLM prompt to assign labels to model responses.",
    params: [],
    beta: true,
    soon: false,
  },
  "model-scorer": {
    id: "model-scorer",
    name: "Model Scorer",
    category: "custom",
    icon: IconGauge,
    color: "gray",
    description:
      "Score responses with an LLM prompt and capture the numeric result.",
    params: [],
    beta: true,
    soon: false,
  },
  "text-similarity": {
    id: "text-similarity",
    name: "Text Similarity",
    category: "text-similarity",
    icon: IconTextWrap,
    color: "indigo",
    description:
      "Compare outputs to reference text using BLEU, ROUGE, cosine and more.",
    params: [],
    beta: true,
    soon: false,
  },
  string: {
    id: "string",
    name: "String Check",
    category: "text-similarity",
    icon: IconCheck,
    color: "gray",
    description: "Compare output text to a reference string.",
    beta: true,
    params: [
      {
        type: "select",
        id: "comparator",
        label: "Comparator",
        defaultValue: "equals",
        options: [
          { label: "Equals", value: "equals" },
          { label: "Does not equal", value: "not_equals" },
          { label: "Contains", value: "contains" },
          { label: "Contains ignore case", value: "contains_ignore_case" },
        ],
      },
      {
        type: "text",
        id: "target",
        label: "Target string",
        placeholder: "Enter reference string",
        width: 300,
      },
    ],
  },
};

export default EVALUATOR_TYPES;
