import { useState } from "react"
import Link from "next/link"

import { useApps, useCurrentApp, useProfile } from "@/utils/supabaseHooks"
import {
  Anchor,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Modal,
  Stack,
  CopyButton,
  ActionIcon,
  Tooltip,
  Text,
  TextInput,
  Title,
} from "@mantine/core"

import { IconCopy, IconCheck } from "@tabler/icons-react"
import { useUser } from "@supabase/auth-helpers-react"

import analytics from "@/utils/analytics"
import { NextSeo } from "next-seo"

export default function Home() {
  const [modalOpened, setModalOpened] = useState(false)
  const [newAppName, setNewAppName] = useState("")
  const { setAppId } = useCurrentApp()

  const { apps, insert, loading } = useApps()
  const user = useUser()
  const { profile } = useProfile()

  const createApp = async () => {
    await insert([{ name: newAppName, owner: user.id }])

    setModalOpened(false)

    analytics.track("Create App", {
      name: newAppName,
    })
  }

  return (
    <Stack>
      <NextSeo title="Dashboard" />

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="New app"
      >
        <Group>
          <TextInput
            placeholder="App name"
            value={newAppName}
            onChange={(e) => setNewAppName(e.currentTarget.value)}
          />
          <Button onClick={createApp}>Create</Button>
        </Group>
      </Modal>

      {loading && <Loader />}

      {apps && !apps.length ? (
        <Card p="xl" w={600} withBorder>
          <Stack align="start">
            <Title order={3}>
              Start by adding an app to get a tracking ID.
            </Title>
            <Button
              size="md"
              onClick={() => {
                setModalOpened(true)
              }}
            >
              + Create one
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          <Group>
            <Title order={3}>Your Apps</Title>
            {!profile?.team_owner && (
              <Button
                onClick={() => {
                  setModalOpened(true)
                }}
              >
                + New app
              </Button>
            )}
          </Group>

          <Stack>
            {apps?.map((app) => (
              <Card key={app.id}>
                <Anchor
                  href={`/analytics`}
                  key={app.id}
                  component={Link}
                  onClick={() => {
                    setAppId(app.id)
                  }}
                >
                  <Title order={4}>{app.name}</Title>
                </Anchor>
                <Group>
                  <Text>
                    Tracking ID: <Code color="pink">{app.id}</Code>
                  </Text>
                  <CopyButton value={app.id} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? "Copied" : "Copy"}
                        withArrow
                        position="right"
                      >
                        <ActionIcon
                          color={copied ? "pink" : "gray"}
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size="1rem" />
                          ) : (
                            <IconCopy size="1rem" />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
