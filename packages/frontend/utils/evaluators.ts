import {
  IconBadge,
  IconBiohazard,
  IconCheck,
  IconEyeCheck,
  IconIdBadge,
  IconLanguage,
  IconMoodSmile,
  IconTextWrap,
} from "@tabler/icons-react";

// TODO: typescript
const EVALUATOR_TYPES = {
  language: {
    id: "language",
    name: "Language",
    icon: IconLanguage,
    color: "green",
    description: "Uses AI to detect the language of the interaction.",
    params: [],
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
};

export default EVALUATOR_TYPES;
