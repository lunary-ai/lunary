import {
  IconBadge,
  IconBiohazard,
  IconBrain,
  IconCheck,
  IconEyeCheck,
  IconIdBadge,
  IconLanguage,
  IconMessage2,
  IconMessages,
  IconMoodSmile,
  IconTextWrap,
  IconTools,
  IconUserCheck,
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
        description: "Add custom regex expressions to detect PII (optional).",
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
  assert: {
    id: "assert",
    name: "Assertion",
    icon: IconEyeCheck,
    color: "blue",
    description:
      "Checks if the input or output matches the given requirement, using an LLM to grade the output.",
    onlyInEvals: true,
    params: [
      {
        type: "label",
        label: "List of conditions",
      },
      {
        type: "select",
        multiple: true,
        allowCustom: true,
        id: "conditions",
        options: ["answer is spoken like a pirate"],
        defaultValue: ["answer is spoken like a pirate"],
        placeholder: "Is spoken like a pirate",
        width: 300,
      },
    ],
  },
  topics: {
    name: "Classify",
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
  tone: {
    name: "Tone",
    id: "tone",
    icon: IconUserCheck,
    color: "blue",
    description: "Uses AI to detect the tone of the assistant's response.",
    params: [
      {
        type: "label",
        label: "Pick tone between",
      },
      {
        type: "select",
        multiple: true,
        allowCustom: true,
        id: "tone",
        defaultValue: [
          "Casual",
          "Empathetic",
          "Enthusiastic",
          "Formal",
          "Friendly",
          "Helpful",
          "Humorous",
          "Professional",
          "Rude",
          "Sarcastic",
          "Sincere",
          "Unprofessional",
        ],
        options: [
          "Casual",
          "Empathetic",
          "Enthusiastic",
          "Formal",
          "Friendly",
          "Helpful",
          "Humorous",
          "Professional",
          "Rude",
          "Sarcastic",
          "Sincere",
          "Unprofessional",
        ],
        width: 230,
      },
    ],
  },
  factualness: {
    id: "factualness",
    name: "Factualness",
    description:
      "Checks how correct the LLM's response is compared to the ideal output (ues OpenAI's eval prompt).",
    soon: true,
    icon: IconCheck,
    color: "green",
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
  geval: {
    id: "geval",
    icon: IconBrain,
    color: "blue",
    name: "G-Eval",
    soon: true,
    uiType: "ai",
    description:
      "G-Eval is a framework that uses LLMs with chain-of-thoughts (CoT) to evaluate LLM outputs based on ANY custom criteria",

    params: [
      {
        type: "label",
        label: "G-Eval",
      },
      {
        type: "text",
        id: "criteria",
        value:
          "Determine if the actual output is factually correct based on the expected output.",
        placeholder: "Enter the main criteria",
        width: 400,
      },
      {
        id: "steps",
        type: "select",
        multiple: true,
        allowCustom: true,
        // options: ["step 1", "step 2", "step 3"],
        defaultValue: [
          "Check whether the facts in 'actual output' contradicts any facts in 'expected output'",
          "You should also heavily penalize omission of detail",
          "Vague language, or contradicting OPINIONS, are OK",
        ],
        label: "Steps",
        placeholder: "Enter thinking steps",
        width: 300,
      },
    ],
  },
  guidelines: {
    id: "guidelines",
    name: "System Guidelines",
    icon: IconTools,
    color: "gray",
    description: `Checks if the assistant answer matches guidelines set in the 'system' message.`,
    params: [],
  },
  replies: {
    id: "replies",
    name: "Successful Answer",
    icon: IconMessages,
    color: "blue",
    description: `Checks if the assistant successfully answers the question asked by the user.`,
    params: [],
  },
}

export default EVALUATOR_TYPES
