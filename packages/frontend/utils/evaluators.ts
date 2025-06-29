import {
  IconBadge,
  IconBiohazard,
  IconCheck,
  IconEyeCheck,
  IconIdBadge,
  IconLanguage,
  IconNotebook,
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
  },
  bias: {
    id: "bias",
    name: "Bias",
    category: "labeler",
    icon: IconEyeCheck,
    color: "blue",
    description:
      "Detects if the LLM output contains gender, racial, or political bias.",
    params: [],
    beta: true,
    soon: false,
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
  },
  llm: {
    id: "llm",
    name: "LLM Evaluator",
    category: "custom",
    icon: IconNotebook,
    color: "blue",
    description: "Use a customizable LLM model to evaluate outputs.",
    params: [],
    beta: true,
    soon: false,
  },
  bleu: {
    id: "bleu",
    name: "BLEU",
    category: "text-similarity",
    icon: IconTextWrap,
    color: "blue",
    description: "Evaluate outputs using the BLEU metric.",
    beta: true,
    params: [
      {
        type: "label",
        label: "Reference Text",
      },
      {
        type: "text",
        id: "reference",
        label: "Reference Text",
        placeholder: "Reference",
      },
      {
        type: "slider",
        id: "threshold",
        label: "Passing grade",
        description: "Minimum BLEU score (0‑1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
  },
  gleu: {
    id: "gleu",
    name: "GLEU",
    category: "text-similarity",
    icon: IconTextWrap,
    color: "teal",
    description: "Evaluate outputs using the GLEU metric.",
    beta: true,
    params: [
      {
        type: "label",
        label: "Reference Text",
      },
      {
        type: "text",
        id: "reference",
        label: "Reference Text",
        placeholder: "Reference",
      },
      {
        type: "slider",
        id: "threshold",
        label: "Passing grade",
        description: "Minimum GLEU score (0‑1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
  },
  rouge: {
    id: "rouge",
    name: "ROUGE",
    category: "text-similarity",
    icon: IconTextWrap,
    color: "red",
    description: "Evaluate outputs using the ROUGE metric.",
    beta: true,
    params: [
      {
        type: "label",
        label: "Reference Text",
      },
      {
        type: "text",
        id: "reference",
        label: "Reference Text",
        placeholder: "Reference",
      },
      {
        type: "slider",
        id: "threshold",
        label: "Passing grade",
        description: "Minimum ROUGE score (0‑1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
  },
  cosine: {
    id: "cosine",
    name: "Cosine Similarity",
    category: "text-similarity",
    icon: IconTextWrap,
    color: "violet",
    description: "Evaluate outputs using Cosine Similarity.",
    beta: true,
    params: [
      {
        type: "label",
        label: "Reference Text",
      },
      {
        type: "text",
        id: "reference",
        label: "Reference Text",
        placeholder: "Reference",
      },
      {
        type: "slider",
        id: "threshold",
        label: "Passing grade",
        description: "Minimum Cosine Similarity (0‑1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
  },
  fuzzy: {
    id: "fuzzy",
    name: "Fuzzy Match",
    category: "text-similarity",
    icon: IconTextWrap,
    color: "orange",
    description: "Evaluate outputs using Fuzzy Matching.",
    beta: true,
    params: [
      {
        type: "label",
        label: "Reference Text",
      },
      {
        type: "text",
        id: "reference",
        label: "Reference Text",
        placeholder: "Reference",
      },
      {
        type: "slider",
        id: "threshold",
        label: "Passing grade",
        description: "Minimum Fuzzy Match ratio (0‑1)",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
  },
  string: {
    id: "string",
    name: "String Comparator",
    category: "text-similarity",
    icon: IconTextWrap,
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
