import {
  IconAt,
  IconBiohazard,
  IconBraces,
  IconBracketsContainStart,
  IconBrandOpenai,
  IconCalendar,
  IconCheck,
  IconCircleLetterT,
  IconClock,
  IconCoin,
  IconCreditCard,
  IconEyeCheck,
  IconFilter,
  IconHelpCircle,
  IconHtml,
  IconIdBadge,
  IconJson,
  IconMarkdown,
  IconMoodAngry,
  IconMoodSmile,
  IconNorthStar,
  IconPhone,
  IconRegex,
  IconRuler2,
  IconRulerMeasure,
  IconSearch,
  IconShieldBolt,
  IconTag,
  IconThumbUp,
  IconTools,
  IconUser,
  IconUserCheck,
  IconWorldWww,
} from "@tabler/icons-react"
import Feedback from "../blocks/Feedback"
import AppUserAvatar from "../blocks/AppUserAvatar"
import { Group, Text } from "@mantine/core"
import { capitalize, formatAppUser } from "@/utils/format"

type CheckUI = {
  icon: React.FC<any>
  color: string
  renderListItem?: (value: any) => JSX.Element
  renderLabel?: (value: any) => JSX.Element
  getItemValue?: (value: any) => string
}

type ChecksUIData = {
  [key: string]: CheckUI
}

const CHECKS_UI_DATA: ChecksUIData = {
  model: {
    icon: IconBrandOpenai,
    color: "violet",
  },
  tags: {
    icon: IconTag,
    color: "indigo",
  },
  users: {
    icon: IconUser,
    color: "blue",
    renderListItem: (item) => (
      <>
        <AppUserAvatar size={30} user={item} />
        {formatAppUser(item)}
      </>
    ),
    renderLabel: (item) => formatAppUser(item),
  },
  feedback: {
    icon: IconThumbUp,
    color: "green",
    renderListItem: (item) => {
      const key = Object.keys(item)[0]
      const value = item[key] || ""
      return (
        <>
          <Feedback data={item} />
          <Text size="xs">{`${capitalize(key)}${value ? ": " + value : ""}`}</Text>
        </>
      )
    },
    renderLabel: (value) => <Feedback data={value} />,
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
  metadata: {
    icon: IconBraces,
    color: "blue",
  },
  hatred: {
    icon: IconMoodAngry,
    color: "red",
  },
  ai: {
    icon: IconBrandOpenai,
    color: "violet",
  },
  tone: {
    icon: IconUserCheck,
    color: "orange",
  },
  factualness: {
    icon: IconCheck,
    color: "green",
  },
  system: {
    icon: IconTools,
    color: "gray",
  },
  assertion: {
    icon: IconEyeCheck,
    color: "blue",
  },
  similarity: {
    icon: IconRulerMeasure,
    color: "blue",
  },
  radar: {
    icon: IconShieldBolt,
    color: "red",
  },
  search: {
    icon: IconSearch,
    color: "blue",
  },
  string: {
    icon: IconBracketsContainStart,
    color: "blue",
  },
  toxicity: {
    icon: IconBiohazard,
    color: "red",
  },
  entities: {
    icon: IconIdBadge,
    color: "orange",
  },
  pii: {
    icon: IconIdBadge,
    color: "orange",
  },
  other: {
    icon: IconFilter,
    color: "gray",
  },
}

export default CHECKS_UI_DATA
