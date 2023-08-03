import { analytics } from "@/utils/analytics"
import errorHandler from "@/utils/errorHandler"
import { useApps, useCurrentApp } from "@/utils/supabaseHooks"
import {
  Header,
  Anchor,
  Button,
  Flex,
  Group,
  Text,
  Select,
  Textarea,
  Modal,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { useUser } from "@supabase/auth-helpers-react"

import { IconAnalyze, IconHelp, IconMessage } from "@tabler/icons-react"

import Link from "next/link"
import { useEffect, useState } from "react"

const sendMessage = async ({ message }) => {
  const currentPage = window.location.pathname

  return await errorHandler(
    fetch("/api/user/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, currentPage }),
    })
  )
}

const Feedback = ({ close }) => {
  const [loading, setLoading] = useState(false)

  const form = useForm({
    initialValues: {
      feedback: "",
    },

    validate: {
      feedback: (value) =>
        value.trim().length > 5 ? null : "Tell us a bit more",
    },
  })

  const send = async ({ feedback }) => {
    setLoading(true)

    const ok = await sendMessage({ message: feedback })

    setLoading(false)

    if (ok) {
      notifications.show({
        title: "Feedback sent",
        message: "Thank you for your feedback! We will get back to you soon.",
        color: "blue",
      })

      close()
    }
  }

  return (
    <form onSubmit={form.onSubmit(send)}>
      <Text mb="md">
        We are always happy to hear from you. If you have any questions or
        suggestions, please let us know.
      </Text>

      <Textarea
        placeholder="Leave your feedback here"
        inputMode="text"
        {...form.getInputProps("feedback")}
      />

      <Group position="right" mt="md">
        <Button type="submit" loading={loading}>
          Send
        </Button>
      </Group>
    </form>
  )
}

export default function Navbar() {
  const { apps } = useApps()
  const [opened, setOpened] = useState(null)

  const { app, setAppId, loading } = useCurrentApp()
  const user = useUser()

  useEffect(() => {
    if (user) {
      analytics?.identify(user.id, {
        email: user.email,
      })
    }
  }, [user])

  return (
    <Header height={60} p="md">
      <Modal
        centered
        title="Send Feedback"
        opened={opened === "feedback"}
        onClose={() => setOpened(null)}
      >
        <Feedback close={() => setOpened(null)} />
      </Modal>
      <Flex align="center" justify="space-between" h="100%">
        <Group>
          <Anchor component={Link} href="/">
            <Group spacing="sm">
              <IconAnalyze />
              <Text weight="bold">LLMonitor</Text>
            </Group>
          </Anchor>

          {!loading && user && apps?.length && (
            <Select
              size="xs"
              placeholder="Select an app"
              value={app?.id}
              onChange={(value) => setAppId(value)}
              data={apps?.map((app) => ({ value: app.id, label: app.name }))}
            />
          )}
        </Group>

        <Group>
          <Button
            component="a"
            href="https://llmonitor.com/docs"
            size="xs"
            target="_blank"
            variant="outline"
            leftIcon={<IconHelp size={18} />}
          >
            Docs
          </Button>

          <Button
            size="xs"
            leftIcon={<IconMessage size={18} />}
            onClick={() => setOpened("feedback")}
          >
            Feedback
          </Button>
        </Group>
      </Flex>
    </Header>
  )
}
