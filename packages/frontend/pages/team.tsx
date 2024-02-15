import { useState } from "react"

import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Modal,
  Progress,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core"
import { IconDotsVertical, IconTrash, IconUserPlus } from "@tabler/icons-react"
import { NextSeo } from "next-seo"

import RenamableField from "@/components/Blocks/RenamableField"
import { useOrg, useOrgUser, useUser } from "@/utils/dataHooks"
import { SEAT_ALLOWANCE } from "@/utils/pricing"
import { useDisclosure } from "@mantine/hooks"
import { openUpgrade } from "../components/Layout/UpgradeModal"

function Invite() {
  const { org } = useOrg()
  const plan = org?.plan

  const allowedSeats = SEAT_ALLOWANCE[plan]

  if (org?.users?.length >= allowedSeats) {
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
    <Group>
      <Text>Invite link: </Text>
      {typeof window !== "undefined" && (
        <CopyText value={`${window.location.origin}/join?orgId=${org?.id}`} />
      )}
    </Group>
  )
}

function UserMenu({ user }) {
  const [opened, { open, close }] = useDisclosure(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user: currentUser } = useUser()
  const { removeUserFromOrg } = useOrgUser(user.id)

  if (user.role === "admin" || currentUser.id === user.id) {
    return
  }

  async function confirm() {
    setIsLoading(true)
    await removeUserFromOrg()
    setIsLoading(false)
    close()
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={<Title size="h3">Remove user from Team?</Title>}
      >
        <Group mt="md" justify="right">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button loading={isLoading} color="red" onClick={confirm}>
            Continue
          </Button>
        </Group>
      </Modal>

      <Menu>
        <Menu.Target>
          <ActionIcon variant="transparent">
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            onClick={open}
            leftSection={<IconTrash size={16} />}
            color="red"
          >
            Remove from Team
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  )
}

export default function Team() {
  const { user: currentUser } = useUser()
  const { org, updateOrg, mutate } = useOrg()

  return (
    <Container className="unblockable">
      <NextSeo title="Team" />
      <Stack gap="lg">
        <Card withBorder p={0}>
          <Group justify="space-between" align="center" p="lg">
            <RenamableField
              defaultValue={org?.name}
              onRename={async (name) => {
                await updateOrg({ id: org?.id, name }, { optimisticData: org })

                mutate()
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
                <Table.Th></Table.Th>
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
                  <Table.Td>
                    <UserMenu user={user} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
        {org?.plan && (
          <Card withBorder radius="md" padding="xl">
            <Stack gap="sm">
              <Text fz="md" fw={700} size="lg">
                Seat Allowance
              </Text>
              <Text fz="lg" fw={500}>
                {org?.users?.length} / {SEAT_ALLOWANCE[org?.plan]} users
              </Text>
              <Progress
                value={
                  ((org?.users?.length || 0) / SEAT_ALLOWANCE[org?.plan]) * 100
                }
                size="lg"
                color="orange"
                radius="xl"
              />
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
