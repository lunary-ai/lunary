import { useState } from "react"

import LineChart from "@/components/Blocks/Analytics/LineChart"
import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"
import {
  useAppSWR,
  useApps,
  useCurrentApp,
  useProfile,
} from "@/utils/dataHooks"

import {
  Badge,
  Button,
  Card,
  Container,
  FocusTrap,
  Group,
  Popover,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { IconPencil, IconUserPlus } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"

import { openUpgrade } from "../components/Layout/UpgradeModal"

function Invite() {
  const { profile } = useProfile()

  if (profile?.org.plan === "pro") {
    if (profile?.org.users?.length === 4) {
      return <Badge color="orange">Seat allowance exceeded</Badge>
    }
    return (
      <Text>
        Invite link:{" "}
        <CopyText
          value={`${window.location.origin}/join?orgId=${profile?.org.id}`}
        />
      </Text>
    )
  }

  return (
    <Button
      variant="light"
      onClick={() => openUpgrade("team")}
      style={{ float: "right" }}
      leftSection={<IconUserPlus size="16" />}
    >
      Invite
    </Button>
  )
}

function RenamableField({ defaultValue, onRename }) {
  const [focused, setFocused] = useState(false)

  const applyRename = (e) => {
    setFocused(false)
    onRename(e.target.value)
  }

  return focused ? (
    <FocusTrap>
      <TextInput
        defaultValue={defaultValue}
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
      {defaultValue} <IconPencil size="16" />
    </Title>
  )
}

export default function AppAnalytics() {
  const { app, setAppId } = useCurrentApp()

  const { profile, updateOrg, mutate } = useProfile()
  const { drop, update } = useApps()

  const { data: appUsage } = useAppSWR("/analytics/usage")

  const isAdmin =
    profile?.id === profile?.org?.users?.find((u) => u.role === "admin")?.id

  return (
    <Container className="unblockable">
      <Stack>
        <NextSeo title="Settings" />
        <Stack>
          <Card withBorder p="lg">
            <Stack>
              <RenamableField
                defaultValue={app?.name}
                onRename={(name) => update({ id: app?.id, name })}
              />
              <Text>
                Project ID for tracking: <CopyText value={app?.id} />
              </Text>
            </Stack>
          </Card>

          <Card withBorder p={0}>
            <Group justify="space-between" align="center" p="lg">
              <RenamableField
                defaultValue={profile?.org.name}
                onRename={(name) => {
                  updateOrg({ id: profile?.org.id, name }).then(() => {
                    mutate()
                  })
                }}
              />

              <Invite />
            </Group>

            <Table striped verticalSpacing="lg" horizontalSpacing="lg">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Role</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {profile?.org.users?.map((user, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Group>
                        <UserAvatar profile={user} />
                        <Text>{user?.name}</Text>

                        {user.id === profile.id ? (
                          <Badge color="blue">You</Badge>
                        ) : null}
                      </Group>
                    </Table.Td>
                    <Table.Td>{user?.email}</Table.Td>
                    <Table.Td>{user?.role}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>

          <Card withBorder p="lg">
            <Stack>
              <Group justify="space-between" align="center">
                <Title order={3}>Api Key</Title>
                {/* <Button onClick={() => alert("TODO")}>
                Refresh Api Key
              </Button> */}
              </Group>

              <Text>
                Use this key to authenticate with the Data API and fetch data
                from your projects.
              </Text>

              <Text>
                API Key: <CopyText value={profile?.org.apiKey} />
              </Text>
            </Stack>
          </Card>

          <LineChart
            title={<Title order={3}>Project Usage</Title>}
            range={30}
            data={appUsage}
            formatter={(val) => `${val} runs`}
            props={["count"]}
          />

          {isAdmin && (
            <Card withBorder p="lg" style={{ overflow: "visible" }}>
              <Stack align="start">
                <Title order={4}>Danger Zone</Title>

                <Text>
                  Deleting your project is irreversible and it will delete all
                  associated data.
                  <br />
                  We <b>cannot</b> recover your data once it's deleted.
                </Text>

                <Popover width={200} position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <Button color="red">Delete App</Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Text mb="md">
                      Are you sure you want to delete this project? This action
                      is irreversible and it will delete all associated data.
                    </Text>
                    <Button
                      color="red"
                      onClick={() => {
                        drop({ id: app?.id })
                        setAppId(null)
                        Router.push("/")
                      }}
                    >
                      Delete
                    </Button>
                  </Popover.Dropdown>
                </Popover>
              </Stack>
            </Card>
          )}
        </Stack>
      </Stack>
    </Container>
  )
}
