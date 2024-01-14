import { useState } from "react"

import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"

import {
  Badge,
  Button,
  Card,
  Container,
  FocusTrap,
  Group,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { IconPencil, IconUserPlus } from "@tabler/icons-react"
import { NextSeo } from "next-seo"

import { useOrg, useUser } from "@/utils/dataHooks"
import { openUpgrade } from "../components/Layout/UpgradeModal"

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

export default function Team() {
  const { user: currentUser } = useUser()
  const { org, updateOrg, mutate } = useOrg()

  return (
    <Container className="unblockable">
      <NextSeo title="Team" />

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
    </Container>
  )
}
