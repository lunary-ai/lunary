import {
  Box,
  Button,
  Flex,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core"
import { useSetState } from "@mantine/hooks"
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
  IconFileTypeJs,
  IconFileTypeXml,
  IconHtml,
  IconJson,
  IconMarkdown,
  IconMoodAngry,
  IconMoodSmile,
  IconPhone,
  IconTag,
  IconTimeDuration15,
  IconUser,
} from "@tabler/icons-react"
import classes from "./FiltersModal.module.css"
import { useEffect, useState } from "react"

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
]

const smartFilters = [
  {
    id: "json",
    name: "Is valid JSON",
    icon: IconJson,
    color: "violet",
  },
  {
    id: "md",
    name: "Is valid Markdown",
    icon: IconMarkdown,
    color: "violet",
  },
  {
    id: "html",
    name: "Is valid HTML",
    icon: IconHtml,
    color: "violet",
  },
  {
    id: "credit-card",
    name: "Contains credit card number",
    icon: IconCreditCard,
    color: "blue",
  },
  {
    id: "phone",
    name: "Contains phone number",
    icon: IconPhone,
    color: "blue",
  },
  {
    id: "email",
    name: "Contains email address",
    icon: IconAt,
    color: "blue",
  },
  {
    id: "profanity",
    name: "Contains profanities",
    icon: IconMoodAngry,
    color: "red",
  },
]

const AIFilters = [
  {
    id: "sentimentAnalysis",
    name: "Sentiment Analysis",
    icon: IconMoodSmile,
    color: "violet",
  },
]

function FilterCard({ onItemClick, item, isSelected }) {
  const theme = useMantineTheme()

  return (
    <UnstyledButton
      className={classes.item}
      key={item.id}
      onClick={() => onItemClick(item.id)}
      pos="relative"
    >
      <Flex justify="right" pos="absolute" top="6px" right="6px" h="30" w="30">
        {isSelected ? (
          <IconCircleCheck size="20" color="#4589df" />
        ) : (
          <IconCirclePlus size="20" color="#bfc4cd" />
        )}
      </Flex>

      <Stack align="center" gap="0" pt="10" maw="80%">
        <item.icon color={theme.colors[item.color][7]} size="22px" />
        <Text size="xs" mt={7} fw="500" c="#383c44">
          {item.name}
        </Text>
      </Stack>
    </UnstyledButton>
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

  useEffect(() => {
    if (defaultSelected) {
      setSelected(defaultSelected)
    }
  }, [defaultSelected, setSelected])

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
        bg="gray.0"
        h="650"
        // display="flex"
        // style={{ flexDirection: "column" }}
      >
        <Modal.Body p="24">
          <Title order={2} mb="8" size="20" c="#383c44">
            Basic Filters
          </Title>
          <SimpleGrid cols={4} mb="50">
            {basicFilterCards}
          </SimpleGrid>

          <Title order={2} mb="8" size="20" c="#383c44">
            Smart Filters
          </Title>
          <SimpleGrid cols={4} mb="50">
            {smartFilterCards}
          </SimpleGrid>

          <Title order={2} mb="8" size="20" c="#383c44">
            AI Filters
          </Title>
          <SimpleGrid cols={4}>{AIFilterCards}</SimpleGrid>
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
