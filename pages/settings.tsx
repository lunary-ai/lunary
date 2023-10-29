import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"
import {
  useApps,
  useCurrentApp,
  useProfile,
  useTeam,
} from "@/utils/supabaseHooks"

import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  FocusTrap,
  Group,
  Overlay,
  Popover,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import {
  IconBrandOpenai,
  IconDownload,
  IconPencil,
  IconUserPlus,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import { useState } from "react"

function Invite() {
  const { team } = useTeam()
  const { profile } = useProfile()

  if (profile?.team_owner) {
    return null
  }

  if (team?.plan === "pro") {
    if (team.users.length === 5) {
      return <Badge color="orange">Seat allowance exceeded</Badge>
    }
    return (
      <Text>
        Invite link:{" "}
        <CopyText
          value={`${window.location.origin}/join?team=${profile?.id}`}
        />
      </Text>
    )
  }

  return (
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
  )
}

export default function AppAnalytics() {
  const { app, setAppId } = useCurrentApp()
  const [focused, setFocused] = useState(false)

  const { profile } = useProfile()

  const { team } = useTeam()

  const { drop, update } = useApps()

  const applyRename = (e) => {
    setFocused(false)
    update({ id: app.id, name: e.target.value })
  }

  return (
    <Container className="unblockable" pt="md">
      <Stack>
        <NextSeo title="Settings" />
        <Stack>
          <Card withBorder p="lg">
            <Stack>
              {focused ? (
                <FocusTrap>
                  <TextInput
                    defaultValue={app?.name}
                    variant="unstyled"
                    h={40}
                    px={10}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") applyRename(e)
                    }}
                    onBlur={(e) => applyRename(e)}
                  />
                </FocusTrap>
              ) : (
                <Title
                  order={3}
                  onClick={() => setFocused(true)}
                  style={{ cursor: "pointer" }}
                >
                  {app?.name} <IconPencil size={16} />
                </Title>
              )}
              <Text>
                App ID for tracking: <CopyText value={app?.id} />
              </Text>
            </Stack>
          </Card>
          <Card withBorder p={0}>
            <Group position="apart" align="center" p="lg">
              <Title order={3}>Team</Title>
              <Invite />
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
                {team?.users?.map((user, i) => (
                  <tr key={i}>
                    <td>
                      <Group>
                        <UserAvatar profile={user} />
                        <Text>{user?.name}</Text>

                        {user.id === profile.id ? (
                          <Badge color="blue">You</Badge>
                        ) : null}
                      </Group>
                    </td>
                    <td>{user?.email}</td>
                    <td>{user?.role}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {!profile?.team_owner && (
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
                      setAppId(null)
                      Router.push("/")
                    }}
                  >
                    Delete
                  </Button>
                </Popover.Dropdown>
              </Popover>
            </Card>
          )}
        </Stack>
      </Stack>
    </Container>
  )
}
