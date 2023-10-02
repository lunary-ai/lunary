import analytics from "@/utils/analytics"
import { useApps, useCurrentApp, useTeam } from "@/utils/supabaseHooks"
import {
  Anchor,
  Button,
  Flex,
  Group,
  Header,
  Select,
  Text,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { useUser } from "@supabase/auth-helpers-react"

import {
  IconAnalyze,
  IconHelp,
  IconMessage,
  IconStarFilled,
} from "@tabler/icons-react"

import Link from "next/link"
import Script from "next/script"
import { useEffect } from "react"

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

      const win = window as any

      if (typeof win.Featurebase !== "function") {
        win.Featurebase = function () {
          // eslint-disable-next-line prefer-rest-params
          ;(win.Featurebase.q = win.Featurebase.q || []).push(arguments)
        }
      }
      win.Featurebase("initialize_feedback_widget", {
        organization: "llmonitor",
        theme: "light",
        // placement: "right",
        email: user?.email,
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
      <Script src="https://do.featurebase.app/js/sdk.js" id="featurebase-sdk" />

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
          <Button
            size="xs"
            leftIcon={<IconMessage size={18} />}
            data-featurebase-feedback
          >
            Feedback
          </Button>

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
