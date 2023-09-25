import analytics from "@/utils/analytics"
import errorHandler from "@/utils/errorHandler"
import { useApps, useCurrentApp, useTeam } from "@/utils/supabaseHooks"
import {
  Anchor,
  Button,
  Flex,
  Group,
  Header,
  Popover,
  Select,
  Text,
  Textarea,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { modals } from "@mantine/modals"
import { notifications } from "@mantine/notifications"
import { useUser } from "@supabase/auth-helpers-react"

import {
  IconAnalyze,
  IconHelp,
  IconMessage,
  IconStarFilled,
} from "@tabler/icons-react"

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

const Feedback = ({}) => {
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
    }
  }

  return (
    <form onSubmit={form.onSubmit(send)}>
      <Textarea
        placeholder="What can we do better?"
        inputMode="text"
        minRows={4}
        {...form.getInputProps("feedback")}
      />

      <Group position="right" mt="xs">
        <Button type="submit" size="xs" color="dark" loading={loading}>
          Send
        </Button>
      </Group>
    </form>
  )
}

export default function Navbar() {
  const { app, setAppId } = useCurrentApp()

  const { apps, loading } = useApps()

  const user = useUser()
  const { team } = useTeam()

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.name,
      })
    }
  }, [user])

  // Select first app if none selected
  useEffect(() => {
    if (!app && apps?.length && !loading) {
      setAppId(apps[0].id)
    }
  }, [app, apps, loading])

  return (
    <Header height={60} p="md">
      <Flex align="center" justify="space-between" h="100%">
        <Group>
          <Anchor component={Link} href="/">
            <Group spacing="sm">
              <IconAnalyze />
              <Text weight="bold">llmonitor</Text>
            </Group>
          </Anchor>

          {!loading && user && apps?.length && (
            <Select
              size="xs"
              placeholder="Select an app"
              value={app?.id}
              onChange={(id) => setAppId(id)}
              data={apps.map((app) => ({ value: app.id, label: app.name }))}
            />
          )}
        </Group>

        <Group>
          <Popover
            width={400}
            position="bottom"
            arrowSize={10}
            withArrow
            shadow="sm"
            trapFocus
          >
            <Popover.Target>
              <Button size="xs" leftIcon={<IconMessage size={18} />}>
                Feedback
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Feedback />
            </Popover.Dropdown>
          </Popover>

          {team?.plan === "free" && (
            <Button
              onClick={() =>
                modals.openContextModal({
                  modal: "upgrade",
                  size: 800,
                  innerProps: {},
                })
              }
              size="xs"
              variant="gradient"
              gradient={{ from: "#0788ff", to: "#9900ff", deg: 30 }}
              leftIcon={<IconStarFilled size={16} />}
            >
              Upgrade
            </Button>
          )}

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
        </Group>
      </Flex>
    </Header>
  )
}
