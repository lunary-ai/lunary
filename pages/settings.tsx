import CopyText from "@/components/Blocks/CopyText"
import { AppContext } from "@/utils/context"
import { useApps } from "@/utils/supabaseHooks"

import {
  Alert,
  Button,
  Card,
  Center,
  Group,
  Overlay,
  Popover,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconBrandOpenai, IconCsv, IconDownload } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import { useContext } from "react"

export default function AppAnalytics() {
  const { app, setApp } = useContext(AppContext)

  const { drop } = useApps()

  return (
    <Stack>
      <NextSeo title="Settings" />
      <Stack>
        <Card withBorder p="lg">
          <Stack>
            <Title order={3}>{app?.name}</Title>
            <Text>
              App ID for tracking: <CopyText value={app?.id} />
            </Text>
          </Stack>
        </Card>
        <Card withBorder p="lg">
          <Overlay blur={2} opacity={0.3} p="lg">
            <Center h="100%">
              <Alert title="Datasets">
                This feature is currently invite-only. Contact us with details
                on what you're building to request access.
              </Alert>
            </Center>
          </Overlay>
          <Stack spacing="md">
            <Title order={4}>Export dataset</Title>

            <Text weight="semibold">Select conditions:</Text>

            <Group spacing="xs">
              <Button variant="outline" compact>
                model = "gpt-4"
              </Button>

              <Text>and</Text>
              <Button variant="outline" compact>
                feedback: "thumbs" = "up"
              </Button>

              <Text>and</Text>
              <Button variant="outline" compact>
                contains tag: "training"
              </Button>
            </Group>

            <Text weight="semibold">Download:</Text>

            <Group>
              <Button variant="light" leftIcon={<IconDownload size={16} />}>
                .csv
              </Button>
              <Button
                variant="light"
                color="cyan"
                leftIcon={<IconDownload size={16} />}
                rightIcon={<IconBrandOpenai size={16} />}
              >
                OpenAI .jsonl
              </Button>
            </Group>
          </Stack>
        </Card>
        <Card withBorder p="lg" sx={{ overflow: "visible" }}>
          <Title mb="md" order={4}>
            Danger Zone
          </Title>

          <Popover width={200} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Button color="red">Delete App</Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Text mb="md">
                Are you sure you want to delete this app? This action is
                irreversible and it will delete all associated data.
              </Text>
              <Button
                color="red"
                onClick={() => {
                  drop({ id: app.id })
                  setApp(null)
                  Router.push("/")
                }}
              >
                Delete
              </Button>
            </Popover.Dropdown>
          </Popover>
        </Card>
      </Stack>
    </Stack>
  )
}
