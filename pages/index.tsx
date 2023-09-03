import { useContext, useEffect, useState } from "react"
import Link from "next/link"

import { useApps } from "@/utils/supabaseHooks"
import {
  Anchor,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Mark,
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

import { AppContext } from "@/utils/context"
import analytics from "@/utils/analytics"
import { NextSeo } from "next-seo"
import Router from "next/router"

export default function Home() {
  const [modalOpened, setModalOpened] = useState(false)
  const [newAppName, setNewAppName] = useState("")
  const { setApp } = useContext(AppContext)

  const { apps, insert, loading } = useApps()
  const user = useUser()

  const createApp = async () => {
    await insert([{ name: newAppName, owner: user.id }])

    setModalOpened(false)

    analytics.track("Create App", {
      name: newAppName,
    })
  }

  // If there are no apps, directly create one with
  // the user's projectName
  useEffect(() => {
    if (user && !loading && !apps?.length) {
      const appName: string = user?.user_metadata.projectName || "Project #1"

      insert([{ name: appName, owner: user.id }]).then((app) => {
        setApp(app[0])
        Router.push("/analytics")
      })
    }
  }, [user, loading, apps])

  return (
    <Stack>
      <NextSeo title="Dashboard" />

      {loading && <Loader />}

      <Group position="apart">
        <Title order={3}>Your Apps</Title>
        <Button
          onClick={() => {
            setModalOpened(true)
          }}
        >
          + New app
        </Button>
      </Group>

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
      <Stack>
        {apps?.map((app) => (
          <Anchor
            href={`/analytics`}
            key={app.id}
            component={Link}
            onClick={() => {
              setApp(app)
            }}
          >
            <Card key={app.id}>
              <Title order={4}>{app.name}</Title>
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
          </Anchor>
        ))}
      </Stack>
    </Stack>
  )
}
