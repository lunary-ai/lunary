import {
  IconAt,
  IconBrandOpenai,
  IconCalendar,
  IconCircleLetterT,
  IconClock,
  IconCoin,
  IconCreditCard,
  IconFilter,
  IconHelpCircle,
  IconHtml,
  IconJson,
  IconMarkdown,
  IconMoodAngry,
  IconMoodSmile,
  IconNorthStar,
  IconPhone,
  IconRegex,
  IconRuler2,
  IconTag,
  IconThumbUp,
  IconUser,
  IconWorldWww,
} from "@tabler/icons-react"

const FILTERS_UI_DATA = {
  model: {
    icon: IconBrandOpenai,
    color: "violet",
    description: "Is the run.model in the list of model names",
  },
  tags: {
    icon: IconTag,
    color: "indigo",
  },
  users: {
    icon: IconUser,
    color: "blue",
  },
  date: {
    icon: IconCalendar,
    color: "green",
  },
  length: {
    icon: IconRuler2,
    color: "blue",
  },
  duration: {
    icon: IconClock,
    color: "teal",
  },
  tokens: {
    icon: IconCircleLetterT,
    color: "cyan",
  },
  cost: {
    icon: IconCoin,
    color: "pink",
  },
  feedback: {
    icon: IconThumbUp,
    color: "green",
  },
  json: {
    icon: IconJson,
    color: "violet",
  },
  md: {
    icon: IconMarkdown,
    color: "violet",
  },
  xml: {
    icon: IconHtml,
    color: "violet",
  },
  regex: {
    icon: IconRegex,
    color: "violet",
  },
  cc: {
    icon: IconCreditCard,
    color: "blue",
  },
  url: {
    icon: IconWorldWww,
    color: "blue",
  },
  phone: {
    icon: IconPhone,
    color: "blue",
  },
  email: {
    icon: IconAt,
    color: "blue",
  },
  profanity: {
    icon: IconMoodAngry,
    color: "red",
  },
  sentiment: {
    icon: IconMoodSmile,
    color: "violet",
  },
  conciseness: {
    icon: IconNorthStar,
    color: "green",
  },
  helpfulness: {
    icon: IconHelpCircle,
    color: "blue",
  },
  hatred: {
    icon: IconMoodAngry,
    color: "red",
  },
  other: {
    icon: IconFilter,
    color: "gray",
  },
}

export default FILTERS_UI_DATA
