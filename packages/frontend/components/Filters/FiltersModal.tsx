import {
  Badge,
  Button,
  Card,
  Fieldset,
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
import { useColorScheme, useListState, useSetState } from "@mantine/hooks"
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
import classes from "./index.module.css"
import { useEffect, useState } from "react"
import { Filter } from "shared"

const FILTERS_UI_DATA = {
  model: {
    icon: IconBrandOpenai,
    color: "violet",
    description: "Is the run.model in the list of model names",
  },
  tag: {
    icon: IconTag,
    color: "indigo",
  },
  user: {
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

function FilterCard({ onItemClick, filter, isSelected }) {
  const theme = useMantineTheme()

  const uiData = FILTERS_UI_DATA[filter.id] || FILTERS_UI_DATA["other"]

  if (!uiData) {
    return null
  }

  return (
    <Card key={filter.id} onClick={() => onItemClick(filter.id)} withBorder>
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
          <uiData.icon color={theme.colors[uiData.color][7]} size="22px" />
          <Text size="xs" mt={7} fw="500">
            {filter.name}
          </Text>
        </Stack>
      </UnstyledButton>
    </Card>
  )
}

// TODO: search bar
// TODO: separate each filter type (basic, smart, ai) in tab
// TODO: coming soon badge
export default function FiltersModal({
  filters,
  opened,
  setOpened,
  selected,
  onItemClick,
}: {
  filters: Filter[]
  opened: boolean
  setOpened: (opened: boolean) => void
  selected: any
  onItemClick: (id: string) => void
}) {
  const scheme = useColorScheme()

  const types = ["Basic", "Smart", "AI"]

  return (
    <Modal
      title="Assertion Library"
      opened={opened}
      onClose={() => {
        setOpened(false)
      }}
      // withCloseButton={false}
      size="xl"
    >
      <Stack gap="xl">
        {types
          .filter((type) =>
            filters.some((filter) => filter.uiType === type.toLowerCase()),
          )
          .map((type) => (
            <Stack key={type} gap="md">
              <Fieldset
                variant="filled"
                legend={
                  <Title mt={-3} order={3}>
                    {type}
                  </Title>
                }
              >
                <SimpleGrid cols={5} spacing="md">
                  {filters
                    .filter((filter) => filter.uiType === type.toLowerCase())
                    .map((filter) => (
                      <FilterCard
                        key={filter.id}
                        filter={filter}
                        isSelected={selected.find((s) => s.id === filter.id)}
                        onItemClick={onItemClick}
                      />
                    ))}
                </SimpleGrid>
              </Fieldset>
            </Stack>
          ))}
      </Stack>

      <Flex
        className={classes["footer-container"]}
        align="center"
        justify="end"
      >
        <Button
          size="xs"
          onClick={() => {
            setOpened(false)
          }}
        >
          Add
        </Button>
      </Flex>
    </Modal>
  )
}
