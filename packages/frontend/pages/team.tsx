import { useEffect, useState } from "react"

import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Menu,
  Modal,
  Progress,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core"
import {
  IconDotsVertical,
  IconDownload,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"

import RenamableField from "@/components/Blocks/RenamableField"
import { useOrg, useOrgUser, useUser } from "@/utils/dataHooks"
import { SEAT_ALLOWANCE } from "@/utils/pricing"
import { useDisclosure } from "@mantine/hooks"
import { openUpgrade } from "../components/Layout/UpgradeModal"
import { fetcher } from "@/utils/fetcher"

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

function SAMLConfig() {
  const { org, updateOrg, mutate } = useOrg()

  const [idpXml, setIdpXml] = useState(org?.saml_idp_xml)
  const [idpLoading, setIdpLoading] = useState(false)
  const [spLoading, setSpLoading] = useState(false)

  // Check if URL is supplied, if so download the xml
  async function addIdpXml() {
    let content = idpXml

    setIdpLoading(true)

    if (idpXml.startsWith("http")) {
      const res = await fetcher.post(`/auth/saml/${org?.id}/download-idp-xml`, {
        arg: {
          url: idpXml,
        },
      })

      console.log(res)
    } else {
      await updateOrg({ id: org?.id, saml_idp_xml: content })
    }

    mutate()

    setIdpLoading(false)
  }

  async function downloadSpXml() {
    setSpLoading(true)
    const response = await fetcher.getText(`/auth/saml/${org?.id}/metadata/`)
    const blob = new Blob([response], { type: "text/xml" })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.setAttribute("download", "SP_Metadata.xml")
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
    setSpLoading(false)
  }

  return (
    <Card withBorder p="lg">
      <Stack gap="lg">
        <Title order={3}>SAML configuration</Title>
        {/* <TextInput value={org?.email_domain} label="Users email domain" /> */}

        <Text fw="bold">
          1. Provider your Identity Provider (IDP) Metadata XML.
        </Text>
        <Flex gap="md">
          <TextInput
            style={{ flex: 1 }}
            value={idpXml}
            placeholder="Paste the URL or content of your IDP XML here"
            w="max-content"
            onChange={(e) => setIdpXml(e.currentTarget.value)}
          />

          <Button
            variant="light"
            loading={idpLoading}
            onClick={() => {
              addIdpXml()
            }}
          >
            Add IDP XML
          </Button>
        </Flex>

        <Text fw="bold">
          2. Setup the configuration in your Identity Provider (IDP)
        </Text>

        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Identifier (Entity ID):</Table.Td>
              <Table.Td>
                <CopyText c="blue" value={"urn:lunary.ai:saml:sp"} />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Assertion Consumer Service (ACS) URL:</Table.Td>
              <Table.Td>
                <CopyText
                  c="blue"
                  value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/acs`}
                />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Single Logout Service (SLO) URL:</Table.Td>
              <Table.Td>
                <CopyText
                  c="blue"
                  value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/slo`}
                />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Sign on URL:</Table.Td>
              <Table.Td>
                <CopyText
                  c="blue"
                  value={`${process.env.NEXT_PUBLIC_API_URL}/login`}
                />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Button
          onClick={() => downloadSpXml()}
          loading={spLoading}
          variant="default"
          rightSection={<IconDownload size="14" />}
        >
          Download Service Provider Metadata XML
        </Button>
      </Stack>
    </Card>
  )
}

export default function Team() {
  const { user: currentUser } = useUser()
  const { org, updateOrg, mutate } = useOrg()

  const samlEnabled = org?.samlEnabled

  return (
    <Container className="unblockable">
      <NextSeo title="Team" />
      <Stack gap="xl">
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
          <Card withBorder p="lg">
            <Stack gap="lg">
              <Title order={3}>Seat Allowance</Title>
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
        {samlEnabled && <SAMLConfig />}
      </Stack>
    </Container>
  )
}
