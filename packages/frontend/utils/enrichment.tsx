import { Badge, Box, Popover, Text } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import {
  IconCheck,
  IconLetterX,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconSquareLetterX,
  IconX,
} from "@tabler/icons-react"
import { EvaluatorType } from "shared"
import { getFlagEmoji } from "./format"

export function renderEnrichment(data: any, type: EvaluatorType) {
  const renderers: Record<EvaluatorType, (data: any) => any> = {
    language: getFlagEmoji,
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
  return renderer(data)
}

function renderPIIEnrichment(data: any) {
  const [opened, { close, open }] = useDisclosure(false)

  let piiCount = 0
  for (const key in data) {
    if (Array.isArray(data[key])) {
      piiCount += data[key].length
    }
  }

  if (piiCount === 0) {
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
        <Badge onMouseEnter={open} onMouseLeave={close} color="blue">
          {piiCount} PII
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm">
          {Object.entries(data).map(
            ([key, items]) =>
              items.length > 0 && (
                <div key={key}>
                  <strong style={{ textTransform: "capitalize" }}>
                    {key}:
                  </strong>
                  <div>{items.join(", ")}</div>
                </div>
              ),
          )}
        </Text>
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
        <Badge
          onMouseEnter={open}
          onMouseLeave={close}
          color="blue"
          styles={{ label: { textTransform: "lowercase" } }}
        >
          {data.length === 1 ? "1 topic" : data.length + " topics"}
        </Badge>
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

  if (!data) {
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
        <Text size="sm">
          Sentiment analysis score:
          {data} ({type})
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
}

function renderAssertEnrichment(data: any) {
  if (!data.result) {
    return ""
  }

  if (data.result === "yes" || data.result === "true" || data.result === true) {
    return <IconCheck color="green" />
  }

  return <IconX color="red" />
}

function renderGuidelinesEnrichment(data: any) {
  if (!data.result) {
    return ""
  }

  if (data.result === "yes" || data.result === "true" || data.result === true) {
    return <IconCheck color="green" />
  }

  return <IconX color="red" />
}

function renderRepliesEnrichment(data: any) {
  if (!data) {
    return ""
  }

  if (data === "true" || data.result === true) {
    return <IconCheck color="green" />
  }

  return <IconX color="red" />
}
