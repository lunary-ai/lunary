import { NextSeo } from "next-seo"
import Router, { useRouter } from "next/router"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppUserAvatar from "@/components/Blocks/AppUserAvatar"
import DataTable from "@/components/Blocks/DataTable"
import Feedback from "@/components/Blocks/Feedback"
import { BubbleMessage } from "@/components/Blocks/SmartViewer/Message"
import Empty from "@/components/Layout/Empty"

import {
  durationColumn,
  feedbackColumn,
  inputColumn,
  tagsColumn,
  timeColumn,
  userColumn,
} from "@/utils/datatable"

import {
  useAllFeedbacks,
  useAppUser,
  useConvosByFeedback,
  useRuns,
} from "@/utils/dataHooks"
import { formatDateTime } from "@/utils/format"

import {
  Button,
  Card,
  Drawer,
  Flex,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
  Title,
} from "@mantine/core"

import { IconMessages, IconNeedleThread } from "@tabler/icons-react"
import FacetedFilter from "../../components/Blocks/FacetedFilter"
import analytics from "../../utils/analytics"

const columns = [
  timeColumn("created_at", "Started at"),
  durationColumn("full"),
  userColumn(),
  inputColumn("Opening Message"),
  tagsColumn(),
  feedbackColumn(true),
]

const parseMessageFromRun = (run) => {
  const createMessage = (msg, role, siblingOf) => {
    if (Array.isArray(msg)) {
      return msg
        .map((item) => createMessage(item, role, siblingOf))
        .flat()
        .filter((messages) => messages.content !== undefined)
    }

    return {
      role,
      content: typeof msg === "string" ? msg : msg.content,
      timestamp: role === "user" ? run.created_at : run.ended_at,
      id: run.id,
      feedback: run.feedback,
      ...(siblingOf && { siblingOf }),
      ...(role === "assistant" && {
        took:
          new Date(run.ended_at).getTime() - new Date(run.created_at).getTime(),
      }),
    }
  }

  return [
    createMessage(run.input, "user", run.sibling_of),
    createMessage(run.output, "assistant", run.sibling_of),
  ]
}

const ChatReplay = ({ run }) => {
  const { runs, loading } = useRuns("chat", {
    match: { parent_run: run.id },
    notInfinite: true,
  })

  const [selectedRetries, setSelectedRetries] = useState({})

  const { user } = useAppUser(run.user)

  // Each chat run has input = user message, output = bot message
  const messages = useMemo(
    () =>
      runs
        ?.filter((run) => run.type === "chat")
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .map(parseMessageFromRun)
        .flat(2),
    [runs],
  )

  const getSiblingsOf = useCallback(
    (message) => {
      return messages
        ?.filter(
          (m) =>
            [m.siblingOf, m.id].includes(message.id) && message.role === m.role,
        )
        .sort((a, b) => a.timestamp - b.timestamp)
    },
    [messages],
  )

  const handleRetrySelect = (messageId, retryIndex) => {
    setSelectedRetries((prevRetries) => ({
      ...prevRetries,
      [messageId]: retryIndex,
    }))
  }

  return (
    <Stack>
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
            <Text>{formatDateTime(run.created_at)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>Last message</Text>
            <Text>{formatDateTime(run.ended_at)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>Messages</Text>
            <Text>{messages?.length}</Text>
          </Group>
        </Stack>
      </Card>
      <Button
        variant="outline"
        onClick={() => {
          Router.push(`/traces/${run.id}`)
        }}
        rightSection={<IconNeedleThread size="16" />}
      >
        View trace
      </Button>

      <Title order={3}>Replay</Title>

      {messages && (
        <Stack gap={0}>
          {messages
            ?.filter((m) => !m.siblingOf) // Show the main tree
            .map((m, i) => {
              const siblings = getSiblingsOf(m)
              const selectedIndex = selectedRetries[m.id] || 0
              const msg = siblings[selectedIndex]
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

                  {msg.role === "user" && !!siblings.length && (
                    <Pagination
                      gap={1}
                      mx="auto"
                      mb="lg"
                      mt={-6}
                      size="xs"
                      value={selectedIndex + 1}
                      total={siblings.length}
                      onChange={(page) => handleRetrySelect(m.id, page - 1)}
                    />
                  )}
                </>
              )
            })}
        </Stack>
      )}
    </Stack>
  )
}

export default function Chats() {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState([])
  const [selected, setSelected] = useState()

  const { runIds } = useConvosByFeedback(selectedItems)
  let { runs, loading, validating, loadMore } = useRuns(
    null,
    {
      filter: ["type", "in", '("convo","thread")'],
    },
    runIds,
  )

  useEffect(() => {
    if (loading === false) {
      const defaultSelectedRun = runs.find(({ id }) => id === router.query.chat)
      setSelected(defaultSelectedRun)
    }
  }, [loading])

  const { allFeedbacks } = useAllFeedbacks()

  if (!loading && runs?.length === 0) {
    return <Empty Icon={IconMessages} what="conversations" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <NextSeo title="Chats" />
      <Flex justify="space-between">
        <Group>
          {allFeedbacks?.length && (
            <FacetedFilter
              name="Feedbacks"
              items={allFeedbacks}
              render={(item) => <Feedback data={item} />}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              withSearch={false}
            />
          )}
        </Group>
      </Flex>
      {loading && <Loader />}

      <Drawer
        opened={!!selected}
        keepMounted
        size="lg"
        position="right"
        title={<Title order={3}>Chat details</Title>}
        onClose={() => {
          router.replace(`/chats`)
          setSelected(null)
        }}
      >
        {selected && <ChatReplay run={selected} />}
      </Drawer>

      <DataTable
        type="chats"
        onRowClicked={(row) => {
          analytics.trackOnce("OpenChat")
          router.push(`/chats?chat=${row.id}`)
          setSelected(row)
        }}
        loading={loading || validating}
        loadMore={loadMore}
        columns={columns}
        data={runs}
      />
    </Stack>
  )
}
