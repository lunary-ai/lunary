import Link from "next/link"
import { useState } from "react"

import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core"

import { IconCheck, IconCopy } from "@tabler/icons-react"

import analytics from "@/utils/analytics"
import { NextSeo } from "next-seo"
import { useCurrentProject, useProjects } from "@/utils/dataHooks"

export default function Home() {
  const [modalOpened, setModalOpened] = useState(false)
  const [newAppName, setNewAppName] = useState("")

  const { projects, isLoading: projectsLoading, insert } = useProjects()

  const { setCurrentProjectId } = useCurrentProject()

  const createApp = async () => {
    await insert(newAppName)

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
        title="New project"
      >
        <Group>
          <TextInput
            placeholder="Project name"
            value={newAppName}
            onChange={(e) => setNewAppName(e.currentTarget.value)}
          />
          <Button onClick={createApp}>Create</Button>
        </Group>
      </Modal>
      {projects && !projects.length ? (
        <Card p="xl" w={600} withBorder>
          <Stack align="start">
            <Title order={3}>
              Create your first project to get a tracking ID.
            </Title>
            <Button
              size="md"
              onClick={() => {
                setModalOpened(true)
              }}
            >
              + Create project
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          <Group>
            <Title order={3}>Projects</Title>
            <Button
              onClick={() => {
                setModalOpened(true)
              }}
            >
              + New project
            </Button>
          </Group>
          {projectsLoading && <Loader />}

          <SimpleGrid cols={3} spacing="lg" verticalSpacing="lg">
            {projects?.map((app) => (
              <Card key={app.id}>
                <Anchor
                  href={`/analytics`}
                  key={app.id}
                  component={Link}
                  onClick={() => {
                    setCurrentProjectId(app.id)
                  }}
                >
                  <Title order={4}>{app.name}</Title>
                </Anchor>
                <Group>
                  <Text>
                    ID:{" "}
                    <Code color="var(--mantine-color-pink-light)">
                      {app.id}
                    </Code>
                  </Text>
                  <CopyButton value={app.id} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? "Copied" : "Copy"}
                        withArrow
                        position="right"
                      >
                        <ActionIcon
                          variant="transparent"
                          color={copied ? "pink" : "gray"}
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size="16px" />
                          ) : (
                            <IconCopy size="16px" />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </>
      )}
    </Stack>
  )
}
