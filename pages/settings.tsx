import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"
import { AppContext } from "@/utils/context"
import { useApps, useProfile } from "@/utils/supabaseHooks"

import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Overlay,
  Popover,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import {
  IconBrandOpenai,
  IconCsv,
  IconDownload,
  IconUserPlus,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import { useContext } from "react"

export default function AppAnalytics() {
  const { app, setApp } = useContext(AppContext)

  const { profile } = useProfile()

  const { drop } = useApps()

  return (
    <Container>
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
          <Card withBorder p={0}>
            <Group position="apart" align="center" p="lg">
              <Title order={3}>Team</Title>
              <Button
                variant="light"
                onClick={() =>
                  modals.openContextModal({
                    modal: "upgrade",
                    size: 800,
                    innerProps: {},
                  })
                }
                sx={{ float: "right" }}
                leftIcon={<IconUserPlus size={16} />}
              >
                Invite
              </Button>
            </Group>

            <Table striped verticalSpacing="lg" horizontalSpacing="lg">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Group>
                      <UserAvatar profile={profile} />
                      <Text>{profile.name}</Text>

                      <Badge color="blue">You</Badge>
                    </Group>
                  </td>
                  <td>{profile.email}</td>
                  <td>Owner</td>
                </tr>
              </tbody>
            </Table>
          </Card>
          <Card withBorder p="lg">
            <Overlay blur={2} opacity={0.3} p="lg" zIndex={1}>
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
    </Container>
  )
}
