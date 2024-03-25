import React, { useEffect, useState } from "react"

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Combobox,
  Container,
  Divider,
  Flex,
  Group,
  Input,
  InputBase,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  Popover,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  useCombobox,
} from "@mantine/core"
import {
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { z } from "zod"

import CopyText, { SuperCopyButton } from "@/components/blocks/CopyText"
import UserAvatar from "@/components/blocks/UserAvatar"
import {
  // useInvitations,
  useOrg,
  useOrgUser,
  useProjects,
  useUser,
} from "@/utils/dataHooks"
import { fetcher } from "@/utils/fetcher"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { roles } from "shared"
import classes from "./team.module.css"
import { useForm } from "@mantine/form"

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

        <Group wrap="nowrap">
          <Text>Single Logout Service (SLO) URL</Text>
          <CopyText
            c="blue"
            value={`${window.API_URL}/auth/saml/${org?.id}/slo`}
          />
        </Group>

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

function InviteLinkModal({ opened, setOpened, link }) {
  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={<Title size="h3">Invite Link</Title>}
    >
      <Text size="sm">
        Send this link to the person you want to invite to your organization.
      </Text>

      <Input
        my="lg"
        value={link}
        rightSectionPointerEvents="all"
        rightSection={<SuperCopyButton value={link} />}
      />

      <Button
        leftSection={<IconCopy size={18} />}
        onClick={() => {
          navigator.clipboard.writeText(link)
        }}
        variant="light"
        fullWidth
        mb="sm"
      >
        Copy Link
      </Button>
    </Modal>
  )
}

// TODO: split in two components (instead of useInvitation)
function UserMenu({ user, isInvitation }) {
  const [opened, { open, close }] = useDisclosure(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user: currentUser } = useUser()
  const { removeUserFromOrg } = useOrgUser(user.id)

  if (["admin", "owner"].includes(user.role) && currentUser?.role !== "owner") {
    return null
  }

  if (currentUser?.id === user.id) {
    return null
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
          {!isInvitation && (
            <Menu.Item
              onClick={open}
              leftSection={<IconTrash size={16} />}
              color="red"
            >
              Remove from Team
            </Menu.Item>
          )}
          {isInvitation && (
            <Menu.Item
              onClick={confirm}
              leftSection={<IconTrash size={16} />}
              color="red"
            >
              Cancel Invitation
            </Menu.Item>
          )}
          {isInvitation && (
            <Menu.Item
              onClick={() => {
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${user.singleUseToken}`,
                )
                notifications.show({
                  icon: <IconCheck size={18} />,
                  title: "Link copied",
                  color: "green",
                  message: "",
                  autoClose: 2000,
                })
              }}
              leftSection={<IconCopy size={16} />}
            >
              Copy Invitation Link
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </>
  )
}

export function RoleSelect({
  value,
  setValue,
  minimal = false,
  additionalOptions = [],
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  })

  const options = Object.values(roles).map(
    ({ value, name, description }) =>
      value !== "owner" && (
        <Combobox.Option value={value} key={value}>
          <Text size="sm">{name}</Text>
          {minimal !== true && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Combobox.Option>
      ),
  )
  options.push(...additionalOptions)

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        setValue(val)
        combobox.closeDropdown()
      }}
    >
      <Combobox.Target>
        <InputBase
          miw="200px"
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents="none"
        >
          {value ? (
            value === "all" ? (
              "All"
            ) : (
              roles[value].name
            )
          ) : (
            <Input.Placeholder>Select a Role</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}

function ProjectMultiSelect({ value, setValue, disabled }) {
  const { projects } = useProjects()

  const data = [
    ...projects.map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ]

  return (
    <MultiSelect
      value={value}
      data={data}
      onChange={(projectIds) => setValue(projectIds)}
      classNames={{ pillsList: classes.pillsList }}
      disabled={disabled}
      readOnly={disabled}
    />
  )
}

function InviteMemberCard() {
  const [role, setRole] = useState("member")
  const { projects } = useProjects()
  const [selectedProjects, setSelectedProjects] = useState([])
  const [opened, setOpened] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const { org } = useOrg()

  const [isLoading, setIsLoading] = useState(false)
  const { addUserToOrg } = useOrg()
  const { user } = useUser()

  useEffect(() => {
    setSelectedProjects(projects.map((p) => p.id))
  }, [projects])

  useEffect(() => {
    if (["admin", "billing"].includes(role)) {
      setSelectedProjects(projects.map((p) => p.id))
    }
  }, [role])

  const form = useForm({
    initialValues: {
      email: "",
    },

    validate: {
      email: (value) =>
        z.string().email().safeParse(value).success ? null : "Invalid email",
    },
  })

  async function invite({ email }) {
    try {
      setIsLoading(true)
      const { user: newUser } = await addUserToOrg({
        email,
        role,
        projects: selectedProjects,
      })

      if (!process.env.NEXT_PUBLIC_IS_SELF_HOSTED) {
        notifications.show({
          title: "Member invited",
          message: "An email has been sent to them",
          icon: <IconCheck />,
          color: "green",
        })
        return
      } else {
        const link = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${newUser.singleUseToken}`
        setIsLoading(false)
        setInviteLink(link)
        setOpened(true)
        return
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card withBorder p="lg">
      <InviteLinkModal
        opened={opened}
        setOpened={setOpened}
        link={inviteLink}
      />
      <Text>Invite new team members</Text>
      <form onSubmit={form.onSubmit(invite)}>
        <Group grow={true}>
          <TextInput
            label="Email"
            placeholder="john@example.com"
            mt="md"
            type="email"
            required
            {...form.getInputProps("email")}
          />
          <Input.Wrapper mt="md" label="Role">
            <RoleSelect value={role} setValue={setRole} />
          </Input.Wrapper>
          <Input.Wrapper mt="md" label="Projects">
            <ProjectMultiSelect
              value={selectedProjects}
              setValue={setSelectedProjects}
              disabled={
                org.plan !== "custom" || ["admin", "billing"].includes(role)
              }
            />
          </Input.Wrapper>
        </Group>

        <Group mt="md" justify="end">
          <Button variant="light" type="submit" loading={isLoading}>
            Invite
          </Button>
        </Group>
      </form>
    </Card>
  )
}

function UpdateUserForm({ user, onClose }) {
  const [role, setRole] = useState(user.role)
  const { projects } = useProjects()

  const [userProjects, setUserProjects] = useState(user.projects)
  const { updateUser } = useOrgUser(user.id)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    console.log(role)
    if (["admin", "billing"].includes(role)) {
      setUserProjects(projects.map((p) => p.id))
    }
  }, [role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateUser({ role, projects: userProjects })

      onClose()
    } catch (error) {
      console.error("Error updating role:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input.Wrapper mt="md" label="Role">
        <RoleSelect value={role} setValue={setRole} />
      </Input.Wrapper>
      <Input.Wrapper mt="md" label="Projects">
        <ProjectMultiSelect
          value={userProjects}
          setValue={setUserProjects}
          disabled={["admin", "billing"].includes(role)}
        />
      </Input.Wrapper>

      <Group mt="md" justify="end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="filled" loading={isLoading} type="submit">
          Update
        </Button>
      </Group>
    </form>
  )
}

function MemberList({ users, isInvitation }) {
  const { user: currentUser } = useUser()
  const { projects } = useProjects()
  const { org } = useOrg()
  const [opened, { close, open }] = useDisclosure(false)

  const [searchValue, setSearchValue] = useState("")
  const [role, setRole] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const handleOpenModal = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const additionalOptions = [
    <Combobox.Option value="all" key="all">
      <Text size="sm">All</Text>
    </Combobox.Option>,
  ]

  users = users
    .filter(
      (user) =>
        user.name?.includes(searchValue) || user.email.includes(searchValue),
    )
    .filter((user) => role === "all" || user.role.includes(role))

  return (
    <>
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={<Title size="h3">Manage User Access</Title>}
      >
        {selectedUser && (
          <UpdateUserForm
            user={selectedUser}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </Modal>
      <Stack gap="0">
        <Group justify="space-between">
          <TextInput
            style={{ flexGrow: 1 }}
            my="md"
            leftSection={<IconSearch size="14" />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Filter..."
          />
          {org.plan === "custom" && (
            <RoleSelect
              value={role}
              setValue={setRole}
              minimal={true}
              additionalOptions={additionalOptions}
            />
          )}
        </Group>

        <Card withBorder p="0">
          {users?.map((user, i) => (
            <React.Fragment key={i}>
              <Group justify="space-between" p="lg">
                <Group>
                  <UserAvatar profile={user} size="30" />
                  <Stack gap="0">
                    <Text size="sm" fw="500">
                      {isInvitation ? "Pending Invitation" : user.name}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {user.email}
                    </Text>
                  </Stack>
                  {user?.id === currentUser?.id ? (
                    <Badge color="blue">You</Badge>
                  ) : null}
                </Group>

                <Group>
                  <Text size="sm" c="dimmed">
                    {roles[user.role].name}
                  </Text>
                  {currentUser?.id !== user.id && !isInvitation && (
                    <>
                      <Popover
                        width={200}
                        position="bottom"
                        withArrow
                        shadow="md"
                        opened={opened}
                      >
                        <Popover.Target>
                          <Badge
                            // TODO: bug when hovering its opens for all users
                            // onMouseEnter={open}
                            // onMouseLeave={close}
                            variant="light"
                          >
                            {user.projects.length} projects
                          </Badge>
                        </Popover.Target>
                        <Popover.Dropdown style={{ pointerEvents: "none" }}>
                          {user.projects.map((projectId) => (
                            <Stack gap="lg" key={projectId}>
                              <Text size="md">
                                {
                                  projects?.find((p) => p.id === projectId)
                                    ?.name
                                }
                              </Text>
                            </Stack>
                          ))}
                        </Popover.Dropdown>
                      </Popover>
                      {user.role !== "owner" && (
                        <Button
                          variant="default"
                          onClick={() => handleOpenModal(user)}
                        >
                          Manage Access
                        </Button>
                      )}
                    </>
                  )}
                  <UserMenu user={user} isInvitation={isInvitation} />
                </Group>
              </Group>

              {i !== users.length && <Divider />}
            </React.Fragment>
          ))}
        </Card>
      </Stack>
    </>
  )
}
function MemberListCard() {
  const { org } = useOrg()

  const invitedUsers = org?.users.filter(
    (user) => user.verified === false && user.role !== "owner",
  )
  const activatedUsers = org?.users.filter(
    (user) => user.verified === true || user.role === "owner",
  )

  return (
    <Tabs defaultValue="members" classNames={{ root: classes.root }}>
      <Tabs.List>
        <Tabs.Tab value="members">Team Members</Tabs.Tab>
        {invitedUsers?.length >= 1 && (
          <Tabs.Tab value="invitations">Pending Invitations</Tabs.Tab>
        )}
      </Tabs.List>

      <Tabs.Panel value="members">
        <MemberList users={activatedUsers} isInvitation={false} />
      </Tabs.Panel>

      <Tabs.Panel value="invitations">
        <MemberList users={invitedUsers} isInvitation={true} />
      </Tabs.Panel>
    </Tabs>
  )
}

// TODO: put back at root level
export default function Team() {
  const { org } = useOrg()
  const samlEnabled = org?.samlEnabled

  if (!org) {
    return <Loader />
  }

  return (
    <Container className="unblockable">
      <NextSeo title="Team" />

      <Stack gap="lg">
        <Title order={2}>Team Members</Title>

        <InviteMemberCard />
        <MemberListCard />
        {samlEnabled && <SAMLConfig />}
      </Stack>
    </Container>
  )
}
