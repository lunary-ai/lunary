import { Badge, Box, Group, Popover, Stack, Text, Tooltip } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import {
  IconCheck,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconX,
} from "@tabler/icons-react"
import { EvaluatorType, LanguageDetectionResult } from "shared"
import { getFlagEmoji } from "./format"
import ErrorBoundary from "@/components/blocks/ErrorBoundary"

export function renderEnrichment(data: any, type: EvaluatorType) {
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
  const outputEmojis = languageDetections.output.map((detectionResult) => {
    if (detectionResult === null) {
      return ""
    }
    return getFlagEmoji(detectionResult.isoCode)
  })

  return (
    <Stack>
      <Group gap="0">
        {outputEmojis.map((emoji) => (
          <Text size="lg">{emoji}</Text>
        ))}
      </Group>
    </Stack>
  )
}

function renderPIIEnrichment(data: Record<string, any[]>) {
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
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Stack>
          {Object.entries(data)
            .filter(([_, items]) => items.some(Boolean))
            .map(([key, items]) => {
              const uniqueItemEntities = new Set()
              items
                .filter(Boolean)
                .forEach((item) =>
                  item.forEach((subItem: { entity: string }) =>
                    uniqueItemEntities.add(subItem.entity),
                  ),
                )
              return (
                <div key={key}>
                  <strong style={{ textTransform: "capitalize" }}>
                    {key}:
                  </strong>
                  <Group>
                    {Array.from(uniqueItemEntities).map((entity) => (
                      <Badge
                        key={entity as string}
                        variant="filled"
                        color="blue"
                      >
                        {entity as string}
                      </Badge>
                    ))}
                  </Group>
                </div>
              )
            })}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

function renderToxicityEnrichment(data: string[]) {
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

function renderTopicsEnrichment(data: string[]) {
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
function renderToneEnrichment(data: string[]) {
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

function renderSentimentEnrichment(data: number) {
  const [opened, { close, open }] = useDisclosure(false)
  let emoji
  let type

  if (typeof data !== "number") {
    return ""
  }

  if (data > 0.5) {
    emoji = <IconMoodSmile color="teal" />
    type = "positive"
  } else if (data < -0.5) {
    emoji = <IconMoodSad color="crimson" />
    type = "negative"
  } else {
    emoji = <IconMoodNeutral color="gray" />
    type = "neutral"
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
        <Box onMouseEnter={open} onMouseLeave={close}>
          {emoji}
        </Box>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm">{`Sentiment analysis score: ${data} (${type})`}</Text>
      </Popover.Dropdown>
    </Popover>
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
