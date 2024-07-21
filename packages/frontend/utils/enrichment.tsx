import { Badge, Box, Group, Popover, Stack, Text, Tooltip } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import {
  IconCheck,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconX,
} from "@tabler/icons-react"
import {
  AssertionResult,
  EnrichmentData,
  EvaluatorType,
  LanguageDetectionResult,
} from "shared"
import { getFlagEmoji } from "./format"
import ErrorBoundary from "@/components/blocks/ErrorBoundary"
import { useMemo } from "react"
import { set } from "date-fns"

export function renderEnrichment(data: EnrichmentData, type: EvaluatorType) {
  const renderers: Record<EvaluatorType, (data: any) => any> = {
    language: renderLanguageEnrichment,
    pii: renderPIIEnrichment,
    toxicity: renderToxicityEnrichment,
    topics: renderTopicsEnrichment,
    sentiment: renderSentimentEnrichment,
    assertion: renderAssertionEnrichment,
    tone: renderToneEnrichment,
    guidelines: renderGuidelinesEnrichment,
    replies: renderRepliesEnrichment,
  }

  const renderer = renderers[type] || JSON.stringify
  return <ErrorBoundary>{renderer(data)}</ErrorBoundary>
}

function renderLanguageEnrichment(languageDetections: LanguageDetectionResult) {
  if (
    !languageDetections?.input ||
    !languageDetections?.error ||
    !languageDetections?.error
  ) {
    return ""
  }
  const languages = languageDetections.output.map((detectionResult) => {
    if (detectionResult === null) {
      return ""
    }

    const languageNames = new Intl.DisplayNames(["en"], { type: "language" })

    return {
      emoji: getFlagEmoji(detectionResult.isoCode),
      name: languageNames.of(detectionResult.isoCode),
    }
  }) as { emoji: string; name: string }[]

  return (
    <Group gap="xs" justify="center">
      {languages.map(({ emoji, name }) => (
        <Tooltip key={name} label={name}>
          <Text size="lg">{emoji}</Text>
        </Tooltip>
      ))}
    </Group>
  )
}

const PII_COLORS = {
  person: "blue",
  email: "orange",
  phone: "yellow",
  location: "green",
  cc: "red",
  ip: "purple",
  regex: "gray",
}

function renderPIIEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false)

  const uniqueEntities: { entity: string; type: string }[] = useMemo(() => {
    const entities = new Set()
    const entityTypeArray = []

    for (const items of Object.values(data)) {
      for (const item of items.filter(Boolean)) {
        for (const subItem of item) {
          if (!entities.has(subItem.entity)) {
            entities.add(subItem.entity)
            entityTypeArray.push({ entity: subItem.entity, type: subItem.type })
          }
        }
      }
    }
    return entityTypeArray
  }, [data])

  const piiCount = uniqueEntities.length

  if (piiCount === 0) return null

  const size = piiCount > 20 ? 500 : 350

  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <Badge
          color="orange"
          variant="light"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          {piiCount} PII
        </Badge>
      </Popover.Target>
      <Popover.Dropdown w={size}>
        <Group p="sm" px={4}>
          {uniqueEntities.slice(0, 40).map(({ entity, type }) => (
            <Badge
              key={entity as string}
              variant="light"
              color={PII_COLORS[type] || "gray"}
            >
              {entity as string}
            </Badge>
          ))}
          {uniqueEntities.length > 40 && (
            <Badge variant="light" color="gray" ml="auto">
              and {uniqueEntities.length - 40} more
            </Badge>
          )}
        </Group>
      </Popover.Dropdown>
    </Popover>
  )
}

function renderToxicityEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false)

  if (data.length === 0) {
    return ""
  }

  const toxicityCategories = [
    ...new Set([...data.input, ...data.output]),
  ].filter((category) => category)

  if (toxicityCategories.length) {
    return (
      <Popover
        width={200}
        position="bottom"
        withArrow
        shadow="md"
        opened={opened}
      >
        <Popover.Target>
          <Badge onMouseEnter={open} onMouseLeave={close} color="red">
            Toxicity
          </Badge>
        </Popover.Target>
        <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
          <Text size="sm">
            <strong>Toxic Comments:</strong>
            {/* <div>{data.join(", ")}</div> */}
          </Text>
        </Popover.Dropdown>
      </Popover>
    )
  }
}

function renderTopicsEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false)

  if (data.length === 0) {
    return ""
  }

  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <div>
          {data.length < 3 ? (
            <Group gap={2}>
              {data.map((topic, index) => (
                <Badge
                  key={index}
                  onMouseEnter={open}
                  onMouseLeave={close}
                  color="blue"
                  styles={{ label: { textTransform: "lowercase" } }}
                >
                  {topic}
                </Badge>
              ))}
            </Group>
          ) : (
            <Badge
              onMouseEnter={open}
              onMouseLeave={close}
              color="blue"
              styles={{ label: { textTransform: "lowercase" } }}
            >
              {data.length + " topics"}
            </Badge>
          )}
        </div>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm">
          <strong>Topics:</strong>
          <div>{data.join(", ")}</div>
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
}
function renderToneEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false)

  if (data.length === 0) {
    return ""
  }

  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <Badge
          onMouseEnter={open}
          onMouseLeave={close}
          color="blue"
          styles={{ label: { textTransform: "initial" } }}
        >
          {data[0].charAt(0).toUpperCase() + data[0].slice(1)}{" "}
          {data.length > 1 && ` and ${data.length - 2} others`}
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm" style={{ textTransform: "capitalize" }}>
          <div>{data.join(", ")}</div>
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
}

export function renderSentimentEnrichment(data?: EnrichmentData) {
  if (!data || !data.input || data.input.length === 0) {
    return null
  }

  const { input } = data

  // get last input item for the quick glance
  const lastInput = input[input.length - 1]
  const { score, subjectivity } = lastInput

  const [opened, { close, open }] = useDisclosure(false)
  let emoji
  let type

  if (typeof score !== "number" || isNaN(score) || subjectivity < 0.4) {
    return null
  }

  if (score > 0.2) {
    emoji = <IconMoodSmile color="teal" />
    type = "positive"
  } else if (score < -0.2) {
    emoji = <IconMoodSad color="crimson" />
    type = "negative"
  } else {
    emoji = <IconMoodNeutral color="gray" />
    type = "neutral"
  }

  return (
    <Tooltip label={`Sentiment analysis: ${type}`} opened={opened}>
      <Box onMouseEnter={open} onMouseLeave={close}>
        {emoji}
      </Box>
    </Tooltip>
  )
}

function renderAssertionEnrichment(data: AssertionResult) {
  if (typeof data !== "object" || typeof data.result !== "boolean") return null

  return (
    <Tooltip label={data.reason} disabled={!data.reason?.length}>
      {data.result ? <IconCheck color="green" /> : <IconX color="red" />}
    </Tooltip>
  )
}

function renderGuidelinesEnrichment(data: any) {
  return (
    <Tooltip label={data.reason} disabled={!data.reason?.length}>
      {data.result ? <IconCheck color="green" /> : <IconX color={"red"} />}
    </Tooltip>
  )
}

function renderRepliesEnrichment(data: any) {
  return <IconX color={data === "true" ? "green" : "red"} />
}
