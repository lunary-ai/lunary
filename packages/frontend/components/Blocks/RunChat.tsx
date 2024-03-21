import { useCallback, useMemo, useState } from "react"

import Feedback from "@/components/blocks/Feedback"
import { BubbleMessage } from "@/components/SmartViewer/Message"

import {
  Button,
  Card,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import AppUserAvatar from "./AppUserAvatar"
import { formatDateTime } from "@/utils/format"
import Router from "next/router"
import { IconNeedleThread } from "@tabler/icons-react"
import { useProjectSWR } from "@/utils/dataHooks"

const OUTPUT_ROLES = ["assistant", "ai", "tool"]
const INPUT_ROLES = ["user"]

function parseMessageFromRun(run) {
  function extractMessages(msg, role, siblingRunId) {
    if (!msg) return []

    if (Array.isArray(msg)) {
      return msg
        .map((item) => extractMessages(item, role, siblingRunId))
        .flat()
        .filter((msg) => msg.content !== undefined)
    }

    return {
      role: msg.role || role,
      content: typeof msg === "string" ? msg : msg.content,
      timestamp: new Date(
        INPUT_ROLES.includes(role) ? run.createdAt : run.endedAt,
      ),
      id: run.id,
      feedback: run.feedback,
      ...(siblingRunId && { siblingRunId }),
      ...(OUTPUT_ROLES.includes(role) && {
        took:
          new Date(run.endedAt).getTime() - new Date(run.createdAt).getTime(),
      }),
    }
  }

  return [
    extractMessages(run.input, "user", run.siblingRunId),
    extractMessages(run.output, "assistant", run.siblingRunId),
  ]
}

// Renders a list of run (or just one)
// As a chat

function RunsChat({ runs }) {
  const [selectedRetries, setSelectedRetries] = useState({})

  // Each chat run has input = [user message], output = [bot message]
  const messages = useMemo(
    () =>
      runs
        ?.map(parseMessageFromRun)
        .flat(2)
        .sort((a, b) => a.timestamp - b.timestamp),
    [runs],
  )

  const getSiblingsOf = useCallback(
    (run) => {
      return runs?.filter((m) => [m.siblingRunId, m.id].includes(run.id))
    },
    [runs],
  )

  const handleRetrySelect = (messageId, retryIndex) => {
    setSelectedRetries((prevRetries) => ({
      ...prevRetries,
      [messageId]: retryIndex,
    }))
  }

  return (
    <Stack gap={0}>
      {runs
        ?.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .filter((run) => !run.siblingRunId) // Use the main tree as reference
        .map((run, i) => {
          const siblings = getSiblingsOf(run)
          const selectedIndex = selectedRetries[run.id] || 0
          const picked = siblings[selectedIndex]

          return messages
            .filter((m) => m.id === picked.id)
            .map((msg, i) => {
              return (
                <>
                  <BubbleMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    extra={
                      <>
                        {!!msg.took && (
                          <Text c="dimmed" size="xs">
                            {msg.took}ms
                          </Text>
                        )}

                        {msg.role !== "user" && msg.feedback && (
                          <Feedback data={msg.feedback} />
                        )}
                      </>
                    }
                  />

                  {msg.role === "user" && siblings?.length > 1 && (
                    <Pagination
                      gap={1}
                      mx="auto"
                      mb="lg"
                      mt={-6}
                      size="xs"
                      value={selectedIndex + 1}
                      total={siblings.length}
                      onChange={(page) => handleRetrySelect(run.id, page - 1)}
                    />
                  )}
                </>
              )
            })
        })}
    </Stack>
  )
}

export function ChatReplay({ run }) {
  const { data: runs, isLoading: loading } = useProjectSWR(
    run.id && `/runs?type=chat&parentRunId=${run.id}`,
  )

  const { data: user } = useProjectSWR(
    run.user?.id && `/external-users/${run.user?.id}`,
  )

  const sorted = runs?.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Stack>
      <Button
        variant="outline"
        ml="auto"
        w="fit-content"
        onClick={() => {
          Router.push(`/traces/${run.id}`)
        }}
        rightSection={<IconNeedleThread size="16" />}
      >
        View trace
      </Button>

      <Card withBorder radius="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text>User</Text>
            <Text>
              {user ? (
                <AppUserAvatar size="sm" user={user} withName />
              ) : (
                "Unknown"
              )}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text>First message</Text>
            <Text>{formatDateTime(run.createdAt)}</Text>
          </Group>
          {!!sorted?.length && (
            <Group justify="space-between">
              <Text>Last message</Text>
              <Text>{formatDateTime(sorted[sorted.length - 1].createdAt)}</Text>
            </Group>
          )}
        </Stack>
      </Card>

      <Title order={3}>Replay</Title>

      {loading && <Loader />}

      <RunsChat runs={sorted} />
    </Stack>
  )
}

export default RunsChat
