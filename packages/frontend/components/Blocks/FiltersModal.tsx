import {
  Badge,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core"
import { useColorScheme, useSetState } from "@mantine/hooks"
import {
  IconAt,
  IconBrandOpenai,
  IconCalendar,
  IconCircleCheck,
  IconCircleLetterT,
  IconCirclePlus,
  IconClock,
  IconCoin,
  IconCreditCard,
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
import classes from "./FiltersModal.module.css"
import { useEffect } from "react"

const basicFilters = [
  {
    id: "model",
    name: "Model name",
    icon: IconBrandOpenai,
    color: "violet",
    description: "Is the run.model in the list of model names",
  },
  {
    id: "tag",
    name: "Tag",
    icon: IconTag,
    color: "indigo",
  },
  {
    id: "user",
    name: "User",
    icon: IconUser,
    color: "blue",
  },
  {
    id: "date",
    name: "Date",
    icon: IconCalendar,
    color: "green",
  },
  {
    id: "length",
    name: "Response Length",
    icon: IconRuler2,
    color: "blue",
  },
  {
    id: "duration",
    name: "Duration",
    icon: IconClock,
    color: "teal",
  },
  {
    id: "totalToken",
    name: "Tokens",
    icon: IconCircleLetterT,
    color: "cyan",
  },
  {
    id: "cost",
    name: "Cost",
    icon: IconCoin,
    color: "pink",
  },
  {
    id: "feedback",
    name: "Feedback",
    icon: IconThumbUp,
    color: "green",
  },
]

const smartFilters = [
  {
    id: "json",
    name: "Valid JSON",
    icon: IconJson,
    color: "violet",
  },
  {
    id: "md",
    name: "Valid Markdown",
    icon: IconMarkdown,
    color: "violet",
  },
  {
    id: "html",
    name: "Valid HTML",
    icon: IconHtml,
    color: "violet",
  },
  {
    id: "regex",
    name: "Regex",
    icon: IconRegex,
    color: "violet",
  },
  {
    id: "credit-card",
    name: "Credit card number",
    icon: IconCreditCard,
    color: "blue",
  },
  {
    id: "url",
    name: "URL",
    icon: IconWorldWww,
    color: "blue",
  },
  {
    id: "phone",
    name: "Phone number",
    icon: IconPhone,
    color: "blue",
  },
  {
    id: "email",
    name: "Email address",
    icon: IconAt,
    color: "blue",
  },

  {
    id: "profanity",
    name: "Profanities",
    icon: IconMoodAngry,
    color: "red",
  },
]

const AIFilters = [
  {
    id: "sentiment",
    name: "Sentiment",
    icon: IconMoodSmile,
    color: "violet",
  },
  {
    id: "conciseness",
    name: "Conciseness",
    icon: IconNorthStar,
    color: "green",
  },
  {
    id: "helpfulness",
    name: "Helpfulness",
    icon: IconHelpCircle,
    color: "blue",
  },
  {
    id: "hatred",
    name: "Hatred",
    icon: IconMoodAngry,
    color: "red",
  },
]

function FilterCard({ onItemClick, item, isSelected }) {
  const theme = useMantineTheme()

  return (
    <Card key={item.id} onClick={() => onItemClick(item.id)} withBorder>
      <UnstyledButton>
        <Flex
          justify="right"
          pos="absolute"
          top="6px"
          right="6px"
          h="30"
          w="30"
        >
          {isSelected ? (
            <IconCircleCheck size="20" color="#4589df" />
          ) : (
            <IconCirclePlus size="20" color="#bfc4cd" />
          )}
        </Flex>

        <Stack align="center" gap="0" pt="10" maw="100%">
          <item.icon color={theme.colors[item.color][7]} size="22px" />
          <Text size="xs" mt={7} fw="500">
            {item.name}
          </Text>
        </Stack>
      </UnstyledButton>
    </Card>
  )
}

export function FiltersGrid({ selected, setSelected }) {
  function onItemClick(id: string) {
    setSelected((current) => ({ [id]: !current[id] }))
  }

  const basicFilterCards = basicFilters.map((item) => (
    <FilterCard
      key={item.id}
      item={item}
      onItemClick={onItemClick}
      isSelected={Boolean(selected[item.id])}
    />
  ))

  const smartFilterCards = smartFilters.map((item) => (
    <FilterCard
      key={item.id}
      item={item}
      onItemClick={onItemClick}
      isSelected={Boolean(selected[item.id])}
    />
  ))

  const AIFilterCards = AIFilters.map((item) => (
    <FilterCard
      key={item.id}
      item={item}
      onItemClick={onItemClick}
      isSelected={Boolean(selected[item.id])}
    />
  ))

  return (
    <>
      <Title order={2} mb="8" size="20">
        Basic
      </Title>
      <SimpleGrid cols={4} mb="30">
        {basicFilterCards}
      </SimpleGrid>

      <Title order={2} mb="8" size="20">
        Smart
      </Title>
      <SimpleGrid cols={4} mb="30">
        {smartFilterCards}
      </SimpleGrid>

      <Group mb="8" gap="xs">
        <Title order={2} size="20">
          AI
        </Title>
        <Badge variant="filled" color="violet">
          coming soon
        </Badge>
      </Group>
      <SimpleGrid cols={4}>{AIFilterCards}</SimpleGrid>
    </>
  )
}

// TODO: search bar
// TODO: separate each filter type (basic, smart, ai) in tab
// TODO: coming soon badge
export default function FiltersModal({
  opened,
  setOpened,
  defaultSelected,
  save,
}) {
  const [selected, setSelected] = useSetState(defaultSelected)
  const scheme = useColorScheme()

  useEffect(() => {
    if (defaultSelected) {
      setSelected(defaultSelected)
    }
  }, [defaultSelected, setSelected])

  return (
    <Modal.Root
      opened={opened}
      onClose={setOpened}
      // withCloseButton={false}
      size="xl"
    >
      <Modal.Overlay />
      {/* TODO: css module, or everything in props? */}
      <Modal.Content
        p="0"
        h="650"
        bg={scheme === "dark" ? "#181818" : "#fafafa"}
      >
        <Modal.Body p="24">
          <FiltersGrid selected={selected} setSelected={setSelected} />
        </Modal.Body>

        <Flex
          className={classes["footer-container"]}
          align="center"
          justify="end"
        >
          <Button
            mr="xs"
            size="xs"
            variant="default"
            onClick={() => setOpened(false)}
          >
            Cancel
          </Button>
          <Button size="xs" onClick={() => save(selected)}>
            Save
          </Button>
        </Flex>
      </Modal.Content>
    </Modal.Root>
  )
}
