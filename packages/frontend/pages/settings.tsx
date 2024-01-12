import { useState } from "react"

import LineChart from "@/components/Blocks/Analytics/LineChart"
import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"

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
import {
  useCurrentProject,
  useOrg,
  useProjects,
  useUser,
} from "@/utils/dataHooks"
import useSWR from "swr"

function Invite() {
  const { org } = useOrg()
  const plan = org?.plan

  if (plan === "free" || (plan === "pro" && org?.users?.length === 4)) {
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

  return (
    <Text>
      Invite link:{" "}
      <CopyText value={`${window.location.origin}/join?orgId=${org?.id}`} />
    </Text>
  )
}

function RenamableField({ defaultValue, onRename }) {
  const [focused, setFocused] = useState(false)

  const projectlyRename = (e) => {
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
          if (e.key === "Enter") projectlyRename(e)
        }}
        onBlur={(e) => projectlyRename(e)}
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
  const { project, setProjectId } = useCurrentProject()

  const { user: currentUser } = useUser()
  const { org, updateOrg, mutate } = useOrg()
  const { drop, update } = useProjects()

  const { data: projectUsage } = useSWR(
    `/orgs/${org?.id}/usage?project=${project?.id}`,
  )

  const isAdmin =
    currentUser?.id === org?.users?.find((u) => u.role === "admin")?.id

  return (
    <Container className="unblockable">
      <NextSeo title="Settings" />
      <Stack gap="lg">
        <Card withBorder p="lg">
          <Stack>
            <RenamableField
              defaultValue={project?.name}
              onRename={(name) => update({ id: project?.id, name })}
            />
            <Text>
              Project ID for tracking: <CopyText value={project?.id} />
            </Text>
          </Stack>
        </Card>

        <Card withBorder p={0}>
          <Group justify="space-between" align="center" p="lg">
            <RenamableField
              defaultValue={org?.name}
              onRename={(name) => {
                const newOrg = { ...org, name }
                updateOrg({ id: org?.id, name }, { optimisticData: org }).then(
                  () => {
                    mutate()
                  },
                )
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
              {org?.users?.map((user, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    <Group>
                      <UserAvatar profile={user} />
                      <Text>{user?.name}</Text>

                      {user?.id === currentUser?.id ? (
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
              Use this key to authenticate with the Data API and fetch data from
              your projects.
            </Text>

            <Text>
              API Key: <CopyText value={org?.apiKey} />
            </Text>
          </Stack>
        </Card>

        <LineChart
          title={<Title order={3}>Project Usage</Title>}
          range={30}
          data={projectUsage}
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
                  <Button color="red">Delete Project</Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text mb="md">
                    Are you sure you want to delete this project? This action is
                    irreversible and it will delete all associated data.
                  </Text>
                  <Button
                    color="red"
                    onClick={() => {
                      drop(project.id)
                      setProjectId(null)
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
    </Container>
  )
}
