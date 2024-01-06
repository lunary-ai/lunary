import analytics from "@/utils/analytics"
import { Anchor, AppShell, Button, Flex, Group, Select } from "@mantine/core"

import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconAnalyze,
  IconBolt,
  IconCheck,
  IconHelp,
  IconMessage,
} from "@tabler/icons-react"

import { notifications } from "@mantine/notifications"
import Link from "next/link"
import { useRouter } from "next/router"
import Script from "next/script"
import { useEffect, useState } from "react"
import errorHandler from "../../utils/errorHandler"
import { openUpgrade } from "./UpgradeModal"
import {
  useCurrentProject,
  useOrg,
  useProjects,
  useUser,
} from "@/utils/newDataHooks"

export default function Navbar() {
  const { project, setProjectId } = useCurrentProject()
  const router = useRouter()

  const { user, mutate } = useUser()
  const { org } = useOrg()
  const { projects, isLoading: loading } = useProjects()
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // const user = useUser()

  // check if has ?verified=true in url
  useEffect(() => {
    const verified = router.query.verified === "true"

    if (verified) {
      mutate() // force update user
      notifications.show({
        id: "verified",
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Email verified",
        message: "You now have access to all features.",
      })

      // remove query param
      router.replace(router.pathname, undefined, { shallow: true })
    }
  }, [router.query])

  const sendVerification = async () => {
    if (sendingEmail) return
    setSendingEmail(true)

    const ok = await errorHandler(
      fetch("/api/user/send-verification", {
        method: "POST",
        body: JSON.stringify({
          email: user?.email,
          name: user?.name,
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

      try {
        const win = window as any

        if (typeof win.Featurebase !== "function") {
          win.Featurebase = function () {
            // eslint-disable-next-line prefer-rest-params
            ;(win.Featurebase.q = win.Featurebase.q || []).push(arguments)
          }
        }
        win.Featurebase("initialize_feedback_widget", {
          organization: "lunary",
          theme: "light",
          // placement: "right",
          email: user?.email,
        })
      } catch (e) {}
    }
  }, [user])

  // Select first project if none selected
  useEffect(() => {
    if (!project && projects?.length && !loading) {
      setProjectId(projects[0].id)
    }
  }, [project, projects, loading, setProjectId])

  return (
    <>
      <AppShell.Header p="md" h="60">
        <Script
          src="https://do.featurebase.project/js/sdk.js"
          id="featurebase-sdk"
        />

        <Flex align="center" justify="space-between" h="100%">
          <Group>
            <Anchor component={Link} href="/">
              <Group mx="sm">
                <IconAnalyze size={26} />
              </Group>
            </Anchor>

            {!loading && user && projects?.length && (
              <Select
                size="xs"
                ml="lg"
                placeholder="Select an project"
                value={project?.id}
                onChange={(id) => setProjectId(id)}
                data={projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
              />
            )}
          </Group>

          <Group>
            {org?.canceled ? (
              <Button
                size="xs"
                color="red"
                onClick={() => openUpgrade()}
                leftSection={<IconAlertTriangleFilled size="16" />}
              >
                Subscription will cancel soon. Click here to restore and prevent
                data deletion.
              </Button>
            ) : org?.limited ? (
              <Button
                color="orange"
                size="xs"
                onClick={() => openUpgrade("events")}
                leftSection={<IconAlertTriangle size="16" />}
              >
                Events limit reached. Click here to upgrade & restore access.
              </Button>
            ) : (
              <>
                {!user?.verified && (
                  <Group
                    bg="orange.9"
                    h="30"
                    c="white"
                    gap={8}
                    px="16"
                    display="flex"
                    style={{ borderRadius: 8, fontSize: 14, color: "white" }}
                  >
                    {`Verify your email to keep your account`}

                    {!emailSent && (
                      <>
                        <span style={{ marginRight: 0 }}>-</span>
                        <Anchor
                          href="#"
                          onClick={sendVerification}
                          c="white"
                          style={{ fontSize: 14 }}
                        >
                          {sendingEmail ? "Sending..." : "Resend email"}
                        </Anchor>
                      </>
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
                  href="https://lunary.ai/docs"
                  size="xs"
                  target="_blank"
                  variant="outline"
                  leftSection={<IconHelp size={18} />}
                >
                  Docs
                </Button>
              </>
            )}

            {org?.plan === "free" && (
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
