import {
  IconBadge,
  IconBiohazard,
  IconEyeCheck,
  IconIdBadge,
  IconLanguage,
  IconMoodSmile,
  IconTextWrap,
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
        label: "Look for",
      },
      {
        type: "select",
        id: "entities",
        width: 230,
        defaultValue: ["ip", "email"],
        multiple: true,
        searchable: true,
        options: [
          {
            label: "Email",
            value: "email",
          },
          {
            label: "IP",
            value: "ip",
          },
        ],
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
}

export default EVALUATOR_TYPES
