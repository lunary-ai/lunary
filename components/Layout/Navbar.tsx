import analytics from "@/utils/analytics"
import { useApps, useCurrentApp, useProfile } from "@/utils/dataHooks"
import errorHandler from "@/utils/errorHandler"
import {
  Alert,
  Anchor,
  Button,
  Flex,
  Group,
  Header,
  Select,
  Text,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { notifications } from "@mantine/notifications"
import { useUser } from "@supabase/auth-helpers-react"

import {
  IconAlertTriangle,
  IconAnalyze,
  IconBolt,
  IconCheck,
  IconHelp,
  IconMessage,
} from "@tabler/icons-react"

import Link from "next/link"
import Script from "next/script"
import { useEffect, useState } from "react"

export default function Navbar() {
  const { app, setAppId } = useCurrentApp()

  const { profile } = useProfile()
  const { apps, loading } = useApps()
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const user = useUser()

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

  const sendVerification = async () => {
    if (sendingEmail) return
    setSendingEmail(true)

    const ok = await errorHandler(
      fetch("/api/user/send-verification", {
        method: "POST",
        body: JSON.stringify({
          email: profile?.email,
          name: profile?.name,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    )

    if (ok) {
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Email sent 💌",
        message: "Check your emails to verify your email.",
      })

      setEmailSent(true)
    }

    setSendingEmail(false)
  }

  // Select first app if none selected
  useEffect(() => {
    if (!app && apps?.length && !loading) {
      setAppId(apps[0].id)
    }
  }, [app, apps, loading])

  return (
    <>
      <Header height={60} p="md">
        <Script
          src="https://do.featurebase.app/js/sdk.js"
          id="featurebase-sdk"
        />

        <Flex align="center" justify="space-between" h="100%">
          <Group>
            <Anchor component={Link} href="/">
              <Group mx="sm">
                <IconAnalyze size={26} />
                {/* <Text weight="bold">llmonitor</Text> */}
              </Group>
            </Anchor>

            {!loading && user && apps?.length && (
              <Select
                size="xs"
                ml="lg"
                placeholder="Select an app"
                value={app?.id}
                onChange={(id) => setAppId(id)}
                data={apps.map((app) => ({ value: app.id, label: app.name }))}
              />
            )}
          </Group>

          <Group>
            {profile?.verified === false && (
              <Alert color="orange" variant="filled" py={3}>
                {`Verify your email within 24h to keep your account - `}
                {!emailSent && (
                  <Anchor
                    href="#"
                    onClick={sendVerification}
                    ml="sm"
                    color="white"
                  >
                    {sendingEmail ? "Sending..." : "Resend email"}
                  </Anchor>
                )}
              </Alert>
            )}

            {profile?.org.limited ? (
              <Button
                color="orange"
                size="xs"
                onClick={() =>
                  modals.openContextModal({
                    modal: "upgrade",
                    size: 900,
                    innerProps: {
                      highlight: "events",
                    },
                  })
                }
                leftIcon={<IconAlertTriangle size={16} />}
              >
                Events limit reached. Click here to upgrade & restore access.
              </Button>
            ) : (
              <>
                <Button
                  size="xs"
                  leftIcon={<IconMessage size={18} />}
                  data-featurebase-feedback
                >
                  Feedback
                </Button>

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
              </>
            )}

            {profile?.org.plan === "free" && (
              <Button
                onClick={() =>
                  modals.openContextModal({
                    modal: "upgrade",
                    size: 900,
                    innerProps: {},
                  })
                }
                size="xs"
                variant="gradient"
                gradient={{ from: "#0788ff", to: "#9900ff", deg: 30 }}
                leftIcon={<IconBolt size={16} />}
              >
                Upgrade
              </Button>
            )}
          </Group>
        </Flex>
      </Header>
    </>
  )
}
