import analytics from "@/utils/analytics"
import { useApps, useCurrentApp, useProfile } from "@/utils/dataHooks"
import { Anchor, AppShell, Button, Flex, Group, Select } from "@mantine/core"
import { modals } from "@mantine/modals"
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
import errorHandler from "../../utils/errorHandler"
import { notifications } from "@mantine/notifications"
import { openUpgrade } from "./UpgradeModal"

export default function Navbar() {
  const { app, setAppId } = useCurrentApp()

  const { profile } = useProfile()
  const { apps, loading } = useApps()
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const user = useUser()

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
    <>
      <AppShell.Header p="md" h="60">
        <Script
          src="https://do.featurebase.app/js/sdk.js"
          id="featurebase-sdk"
        />

        <Flex align="center" justify="space-between" h="100%">
          <Group>
            <Anchor component={Link} href="/">
              <Group mx="sm">
                <IconAnalyze size={26} />
                {/* <Text fw="bold">llmonitor</Text> */}
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
                leftSection={<IconAlertTriangle size="16" />}
              >
                Events limit reached. Click here to upgrade & restore access.
              </Button>
            ) : (
              <>
                {profile?.verified === false && (
                  <Group
                    bg="orange"
                    h="30"
                    px="16"
                    display="flex"
                    style={{ borderRadius: 8, fontSize: 14, color: "white" }}
                  >
                    {`Verify your email within 24h to keep your account`}

                    {!emailSent && <span style={{ marginRight: 5 }}>-</span>}
                    {!emailSent && (
                      <Anchor
                        href="#"
                        onClick={sendVerification}
                        c="white"
                        style={{ fontSize: 14 }}
                      >
                        {sendingEmail ? "Sending..." : "Resend email"}
                      </Anchor>
                    )}
                  </Group>
                )}
                <Button
                  size="xs"
                  leftSection={<IconMessage size={18} />}
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
                  leftSection={<IconHelp size={18} />}
                >
                  Docs
                </Button>
              </>
            )}

            {profile?.org.plan === "free" && (
              <Button
                onClick={() => openUpgrade()}
                size="xs"
                variant="gradient"
                gradient={{ from: "#0788ff", to: "#9900ff", deg: 30 }}
                leftSection={<IconBolt size="16" />}
              >
                Upgrade
              </Button>
            )}
          </Group>
        </Flex>
      </AppShell.Header>
    </>
  )
}
