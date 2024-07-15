import { Badge, Box, Group, Popover, Stack, Text, Tooltip } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import {
  IconCheck,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconX,
} from "@tabler/icons-react"
import { EnrichmentData, EvaluatorType, LanguageDetectionResult } from "shared"
import { getFlagEmoji } from "./format"
import ErrorBoundary from "@/components/blocks/ErrorBoundary"

export function renderEnrichment(data: EnrichmentData, type: EvaluatorType) {
  return ""
  const renderers: Record<EvaluatorType, (data: any) => any> = {
    language: renderLanguageEnrichment,
    pii: renderPIIEnrichment,
    toxicity: renderToxicityEnrichment,
    topics: renderTopicsEnrichment,
    sentiment: renderSentimentEnrichment,
    assert: renderAssertEnrichment,
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
function renderPIIEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false)

  const uniqueEntities = new Set()
  Object.values(data).forEach((items) =>
    items
      .filter(Boolean)
      .forEach((item) =>
        item.forEach((subItem: { entity: string }) =>
          uniqueEntities.add(subItem.entity),
        ),
      ),
  )

  const piiCount = uniqueEntities.size

  if (piiCount === 0) return null

  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <Badge onMouseEnter={open} onMouseLeave={close} color="blue">
          {piiCount} PII
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w={300}>
        <Group>
          {Array.from(uniqueEntities).map((entity) => (
            <Badge key={entity as string} variant="light">
              {entity as string}
            </Badge>
          ))}
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
          <div>{data.join(", ")}</div>
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
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

function renderAssertEnrichment(data: any) {
  return (
    <Tooltip label={data.reason} disabled={!data.reason?.length}>
      <IconX color={data.result ? "green" : "red"} />
    </Tooltip>
  )
}

function renderGuidelinesEnrichment(data: any) {
  return (
    <Tooltip label={data.reason} disabled={!data.reason?.length}>
      <IconX color={data.result ? "green" : "red"} />
    </Tooltip>
  )
}

function renderRepliesEnrichment(data: any) {
  return <IconX color={data === "true" ? "green" : "red"} />
}
