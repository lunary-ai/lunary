import { IconIdBadge, IconTextWrap } from "@tabler/icons-react"
import { FIELD_PARAM, MATCH_PARAM } from "shared/checks/params"

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
      FIELD_PARAM,
      MATCH_PARAM,
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
    color: "blue",
    description:
      "The summarization metric uses LLMs to determine whether your agent is generating factually correct summaries while including the necessary details from the original text.",
    params: [],
  },
}

export default EVALUATOR_TYPES
