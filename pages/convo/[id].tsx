import { useEvents } from "@/utils/supabaseHooks"
import { useRouter } from "next/router"

import {
  Anchor,
  Avatar,
  Card,
  Flex,
  Group,
  Loader,
  Paper,
  Space,
  Spoiler,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Timeline,
  Title,
} from "@mantine/core"

import {
  IconAccessPoint,
  IconAnalyze,
  IconAnalyzeFilled,
  IconBug,
  IconCodeDots,
  IconMessageChatbot,
  IconMessages,
  IconRobot,
  IconTimelineEvent,
  IconUser,
} from "@tabler/icons-react"

const ChatMessage = ({ message, type }: { message: string; type: string }) => {
  const isBot = type === "assistant:message"
  return (
    <>
      <Flex direction={isBot ? "row" : "row-reverse"} align="center" gap="md">
        <Avatar placeholder="B" radius="xl" color={isBot ? "blue" : "red"}>
          {isBot ? <IconRobot /> : "U"}
        </Avatar>
        <div>
          <Paper px="md" py={"sm"} radius="lg" shadow="sm" withBorder maw={400}>
            <Text style={{ whiteSpace: "pre-line" }}>{message}</Text>
          </Paper>
        </div>
      </Flex>

      <Space h="lg" />
    </>
  )
}

const averageTimeToStream = (events: any[]) => {
  const userMessages = events.filter(({ type }) => type === "user:message")
  const streamingEvents = events.filter(({ type }) => type === "llm:stream")

  if (!userMessages.length || !streamingEvents.length) return 0

  const responseTimes = userMessages
    .map(({ timestamp }, index) => {
      if (!streamingEvents[index]) return 0

      return (
        new Date(streamingEvents[index].timestamp).getTime() -
        new Date(timestamp).getTime()
      )
    })
    .filter((time) => time > 0)

  const averageResponseTime =
    responseTimes.reduce((a, b) => a + b) / responseTimes.length

  return (averageResponseTime / 1000).toFixed(2)
}

/* Calculates the average time between a `user:message` and `assistant:message` response */
const averageResponseTime = (events: any[]) => {
  const userMessages = events.filter(({ type }) => type === "user:message")
  const assistantMessages = events.filter(
    ({ type }) => type === "assistant:message"
  )

  if (!userMessages.length || !assistantMessages.length) return 0

  const responseTimes = userMessages
    .map(({ timestamp }, index) => {
      if (!assistantMessages[index]) return 0

      return (
        new Date(assistantMessages[index].timestamp).getTime() -
        new Date(timestamp).getTime()
      )
    })
    .filter((time) => time > 0)

  const averageResponseTime =
    responseTimes.reduce((a, b) => a + b) / responseTimes.length

  return (averageResponseTime / 1000).toFixed(2)
}

const mapType = {
  "assistant:message": {
    name: "Bot Answer",
    color: "violet",
    Icon: IconMessageChatbot,
  },

  "user:message": {
    name: "User Message",
    color: "pink",
    Icon: IconUser,
  },

  "llm:call": {
    name: "LLM Call",
    color: "blue",
    Icon: IconAnalyze,
  },

  "log:error": {
    name: "Error",
    color: "red",
    Icon: IconBug,
  },

  "log:info": {
    name: "Log",
    color: "gray",
    Icon: IconCodeDots,
  },

  "log:warn": {
    name: "Warning",
    color: "yellow",
    Icon: IconCodeDots,
  },

  "llm:result": {
    name: "LLM Result",
    color: "green",
    Icon: IconAnalyzeFilled,
  },

  "llm:stream": {
    name: "Started streaming",
    color: "green",
    Icon: IconAccessPoint,
  },
}

// Format the event timestamp
// And if relevant, add the time it took from the preceding event
const timeLabel = (events, i) => {
  const { timestamp, type } = events[i]

  const time = new Date(timestamp).toLocaleTimeString()

  const previousEvents = events.slice(0, i).reverse()

  if (!previousEvents.length) return ""

  let took = 0
  if (type === "assistant:message") {
    const lastUserMessage = previousEvents.find(
      ({ type }) => type === "user:message"
    )

    if (lastUserMessage) {
      took =
        new Date(timestamp).getTime() -
        new Date(lastUserMessage.timestamp).getTime()
    }
  } else if (type === "llm:stream") {
    const lastUserMessage = previousEvents.find(
      ({ type }) => type === "user:message"
    )

    if (lastUserMessage) {
      took =
        new Date(timestamp).getTime() -
        new Date(lastUserMessage.timestamp).getTime()
    }
  } else if (type === "llm:result") {
    const lastCall = previousEvents.find(({ type }) => type === "llm:call")

    if (lastCall) {
      took =
        new Date(timestamp).getTime() - new Date(lastCall.timestamp).getTime()
    }
  }

  return `${time} ${took > 0 ? `(took ${(took / 1000).toFixed(2)}s)` : ""}`
}

export default function AppAnalytics() {
  const router = useRouter()
  const { id } = router.query

  const { events, loading } = useEvents(id as string)

  if (!events) return <Loader />

  return (
    <Stack>
      <Anchor onClick={() => router.back()}>← Back</Anchor>
      <Title>Conversation</Title>

      {loading && <Loader />}

      <Group ta="center" grow>
        <Card>
          <Text>
            <b>{averageResponseTime(events)}s</b>
            <br />
            avg time to answer
          </Text>
        </Card>
        <Card>
          <Text>
            <b>{averageTimeToStream(events)}s</b>
            <br />
            avg time to stream
          </Text>
        </Card>
        <Card>
          <Text>
            <b>{events.length}</b>
            <br />
            messages
          </Text>
        </Card>
        <Card>
          <Text>
            <b>{events.filter(({ type }) => type === "llm:call").length}</b>
            <br />
            LLM calls
          </Text>
        </Card>
        <Card>
          <Text>
            <b>{events.filter(({ type }) => type === "error").length}</b>
            <br />
            errors
          </Text>
        </Card>
      </Group>

      <Card>
        <Tabs variant="outline" defaultValue="replay">
          <Tabs.List>
            <Tabs.Tab value="replay" icon={<IconMessages size="0.8rem" />}>
              Replay
            </Tabs.Tab>
            <Tabs.Tab
              value="details"
              icon={<IconTimelineEvent size="0.8rem" />}
            >
              Details
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="replay" pt="md">
            <Stack gap="md">
              {events
                .filter(
                  ({ type }) =>
                    type === "assistant:message" || type === "user:message"
                )
                .map(({ id: eventId, timestamp, type, message }) => (
                  <ChatMessage key={eventId} message={message} type={type} />
                ))}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="details" p="md">
            <Timeline>
              {events.map((event, i) => {
                const { id: eventId, timestamp, type, message } = event
                const { name, color, Icon } = mapType[type]

                return (
                  <Timeline.Item
                    bullet={
                      <ThemeIcon radius="xl" size={28} color={color}>
                        <Icon size={16} />
                      </ThemeIcon>
                    }
                    title={<Text>{name}</Text>}
                    key={eventId}
                  >
                    <Spoiler
                      showLabel="Show message"
                      hideLabel="Hide message"
                      maxHeight={150}
                    >
                      <Text>{message}</Text>
                    </Spoiler>
                    <Text size="xs" mt={4}>
                      {timeLabel(events, i)}
                    </Text>
                  </Timeline.Item>
                )
              })}
            </Timeline>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Stack>
  )
}
