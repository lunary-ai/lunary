import React, { useEffect, useState } from "react";

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
  Tooltip,
  useCombobox,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconLogin,
  IconTrash,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { z } from "zod";

import { CopyInput } from "@/components/blocks/CopyText";
import UserAvatar from "@/components/blocks/UserAvatar";
import {
  // useInvitations,
  useOrg,
  useOrgUser,
  useProjects,
  useUser,
} from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { hasAccess, roles } from "shared";
import classes from "./team.module.css";
import { useForm } from "@mantine/form";
import SearchBar from "@/components/blocks/SearchBar";
import { SettingsCard } from "@/components/blocks/SettingsCard";
import { SEAT_ALLOWANCE } from "@/utils/pricing";
import { openUpgrade } from "@/components/layout/UpgradeModal";
import config from "@/utils/config";
import RenamableField from "@/components/blocks/RenamableField";
import errorHandler from "@/utils/errors";

function SAMLConfig() {
  const { org, updateOrg, mutate } = useOrg();

  const [idpXml, setIdpXml] = useState(org?.samlIdpXml);
  const [idpLoading, setIdpLoading] = useState(false);
  const [spLoading, setSpLoading] = useState(false);

  // Check if URL is supplied, if so download the xml
  async function addIdpXml() {
    setIdpLoading(true);

    const res = await errorHandler(
      fetcher.post(`/auth/saml/${org?.id}/download-idp-xml`, {
        arg: {
          content: idpXml,
        },
      }),
    );

    if (res) {
      notifications.show({
        title: "IDP XML added",
        message: "The IDP XML has been added successfully",
        icon: <IconCheck />,
        color: "green",
      });

      mutate();
    }

    setIdpLoading(false);
  }

  async function downloadSpXml() {
    setSpLoading(true);
    const response = await fetcher.getText(`/auth/saml/${org?.id}/metadata/`);
    const blob = new Blob([response], { type: "text/xml" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "SP_Metadata.xml");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    setSpLoading(false);
  }

  const samlEnabled = config.IS_SELF_HOSTED
    ? org.license.samlEnabled
    : org.samlEnabled;

  return (
    <SettingsCard
      title={"SAML Configuration"}
      paywallConfig={{
        enabled: !samlEnabled,
        description:
          "Enable SAML to configure Single Sign-On (SSO) with your Identity Provider (IDP)",
        Icon: IconLogin,
        feature: "SAML",
        plan: "enterprise",
        p: 16,
      }}
    >
      <Text fw="bold">
        1. Provide your Identity Provider (IDP) Metadata XML.
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
            addIdpXml();
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
              <CopyInput value={"urn:lunary.ai:saml:sp"} />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Assertion Consumer Service (ACS) URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/acs`}
              />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Single Logout Service (SLO) URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/slo`}
              />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Sign on URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/login`}
              />
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Single Logout URL:</Table.Td>
            <Table.Td>
              <CopyInput
                value={`${process.env.NEXT_PUBLIC_API_URL}/auth/saml/${org?.id}/slo`}
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
    </SettingsCard>
  );
}

function InviteLinkModal({ opened, setOpened, link }) {
  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={<Title size="h3">Invite Link</Title>}
    >
      <Text size="sm">
        Send this link to the person you want to invite to join your
        organization.
      </Text>

      <CopyInput my="lg" value={link} />

      <Button
        leftSection={<IconCopy size={18} />}
        onClick={() => {
          navigator.clipboard.writeText(link);
        }}
        variant="light"
        fullWidth
        mb="sm"
      >
        Copy Link
      </Button>
    </Modal>
  );
}

// TODO: split in two components (instead of useInvitation)
function UserMenu({ user, isInvitation }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useUser();
  const { removeUserFromOrg } = useOrgUser(user.id);

  if (["admin", "owner"].includes(user.role) && currentUser?.role !== "owner") {
    return null;
  }

  if (currentUser?.id === user.id) {
    return null;
  }

  async function confirm() {
    setIsLoading(true);
    await removeUserFromOrg();
    setIsLoading(false);
    close();
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
                  `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?token=${user.singleUseToken}`,
                );
                notifications.show({
                  icon: <IconCheck size={18} />,
                  title: "Link copied",
                  color: "green",
                  message: "",
                  autoClose: 2000,
                });
              }}
              leftSection={<IconCopy size={16} />}
            >
              Copy Invitation Link
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </>
  );
}

export function RoleSelect({
  value,
  setValue,
  disabled = false,
  minimal = false,
  additionalOptions = [],
}: {
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
  minimal?: boolean;
  additionalOptions?: React.JSX.Element[];
}) {
  const { user: currentUser } = useUser();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const { org } = useOrg();

  const canUsePaidRoles = config.IS_SELF_HOSTED
    ? org.license.accessControlEnabled
    : org?.plan === "custom";

  const options = Object.values(roles).map(
    ({ value, name, description, free }) =>
      (value === "owner" ? currentUser.role === "owner" : true) && (
        <Tooltip
          key={value}
          label={
            !free && !canUsePaidRoles
              ? "This role is available on Enterprise plans"
              : null
          }
          position="left"
          disabled={free || canUsePaidRoles}
        >
          <Combobox.Option
            value={value}
            key={value}
            disabled={!free && !canUsePaidRoles}
          >
            <Text size="sm">{name}</Text>
            {minimal !== true && (
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            )}
          </Combobox.Option>
        </Tooltip>
      ),
  );

  options.push(...additionalOptions);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        setValue(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          miw="200px"
          component="button"
          type="button"
          disabled={disabled}
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
  );
}

function ProjectMultiSelect({ value, setValue, disabled }) {
  const { projects } = useProjects();

  const data = [
    ...projects.map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ];

  return (
    <MultiSelect
      value={value}
      data={data}
      onChange={(projectIds) => setValue(projectIds)}
      classNames={{ pillsList: classes.pillsList }}
      disabled={disabled}
      readOnly={disabled}
    />
  );
}

function InviteMemberCard() {
  const [role, setRole] = useState("member");
  const { projects } = useProjects();
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [opened, setOpened] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const { org, mutate } = useOrg();

  const [isLoading, setIsLoading] = useState(false);
  const { addUserToOrg } = useOrg();

  useEffect(() => {
    setSelectedProjects(projects.map((p) => p.id));
  }, [projects]);

  useEffect(() => {
    if (["admin", "billing"].includes(role)) {
      setSelectedProjects(projects.map((p) => p.id));
    }
  }, [role]);

  const form = useForm({
    initialValues: {
      email: "",
    },

    validate: {
      email: (value) =>
        z.string().email().safeParse(value).success ? null : "Invalid email",
    },
  });

  async function invite({ email }) {
    const seatAllowance = org?.seatAllowance || SEAT_ALLOWANCE[org?.plan];
    if (org?.users?.length >= seatAllowance) {
      return openUpgrade("team");
    }

    try {
      setIsLoading(true);
      const { user: newUser } = await addUserToOrg({
        email,
        role,
        projects: selectedProjects,
      });

      if (!config.IS_SELF_HOSTED) {
        notifications.show({
          title: "Member invited",
          message: "An email has been sent to them",
          icon: <IconCheck />,
          color: "green",
        });

        mutate();

        return;
      } else {
        const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?token=${newUser.singleUseToken}`;
        setIsLoading(false);
        setInviteLink(link);
        setOpened(true);
        return;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const upgradeForGranular = org?.plan !== "custom";

  return (
    <SettingsCard title="Invite Team Member">
      <InviteLinkModal
        opened={opened}
        setOpened={setOpened}
        link={inviteLink}
      />

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
            <Tooltip
              label="Upgrade to manage project access granuarly"
              position="top"
              disabled={!upgradeForGranular}
            >
              <ProjectMultiSelect
                value={selectedProjects}
                setValue={setSelectedProjects}
                disabled={
                  upgradeForGranular || ["admin", "billing"].includes(role)
                }
              />
            </Tooltip>
          </Input.Wrapper>
        </Group>

        <Group mt="md" justify="end">
          <Button variant="light" type="submit" loading={isLoading}>
            Invite
          </Button>
        </Group>
      </form>
    </SettingsCard>
  );
}

function UpdateUserForm({ user, onClose, setShowConfirmation, setOnConfirm }) {
  const [role, setRole] = useState(user.role);
  const { projects } = useProjects();
  const { org } = useOrg();

  const [userProjects, setUserProjects] = useState(user.projects);
  const { updateUser } = useOrgUser(user.id);
  const [isLoading, setIsLoading] = useState(false);

  const canUsePaidRoles = config.IS_SELF_HOSTED
    ? org.license.accessControlEnabled
    : org?.plan === "custom";

  useEffect(() => {
    if (["owner", "admin", "billing"].includes(role)) {
      setUserProjects(projects.map((p) => p.id));
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (role === "owner") {
        setOnConfirm(() => () => updateUser({ role, projects: userProjects }));
        setShowConfirmation(true);
      } else {
        await updateUser({ role, projects: userProjects });
      }

      onClose();
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input.Wrapper mt="md" label="Role">
        <RoleSelect value={role} setValue={setRole} />
      </Input.Wrapper>
      <Input.Wrapper mt="md" label="Projects">
        <ProjectMultiSelect
          value={userProjects}
          setValue={setUserProjects}
          disabled={
            ["owner", "admin", "billing"].includes(role) || !canUsePaidRoles
          }
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
  );
}

function MemberList({ users, isInvitation }) {
  const { user: currentUser } = useUser();
  const { projects } = useProjects();
  const { org } = useOrg();
  const [opened, { close, open }] = useDisclosure(false);

  const [searchValue, setSearchValue] = useState("");
  const [role, setRole] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [onConfirm, setOnConfirm] = useState<(value: any) => void>();

  const confirmOwnerUpdate = async (value) => {
    setShowConfirmation(false);

    if (value) {
      try {
        onConfirm?.(value);
      } catch (error) {
        console.error("Error updating role:", error);
      }
    }
  };

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const additionalOptions = [
    <Combobox.Option value="all" key="all">
      <Text size="sm">All</Text>
    </Combobox.Option>,
  ];

  users = users
    .filter(
      (user) =>
        user.name?.includes(searchValue) || user.email.includes(searchValue),
    )
    .filter((user) => role === "all" || user.role.includes(role));

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
            setOnConfirm={setOnConfirm}
            setShowConfirmation={setShowConfirmation}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </Modal>

      <Modal
        opened={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title={<Title size="h3">Transfer organization ownership?</Title>}
      >
        <Text size="sm">
          Are you sure you want to transfer the ownership of your organizationto
          this this user? This action will make you an admin.
        </Text>

        <Group mt="md" justify="end">
          <Button
            color="red"
            variant="outline"
            onClick={() => confirmOwnerUpdate(false)}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            color="red"
            type="submit"
            onClick={() => confirmOwnerUpdate(true)}
          >
            Confirm
          </Button>
        </Group>
      </Modal>

      <Stack gap="0">
        <Group w="100%" wrap="nowrap">
          <SearchBar
            query={searchValue}
            setQuery={setSearchValue}
            placeholder="Filter..."
            my="md"
            w="100%"
          />

          <RoleSelect
            value={role}
            disabled={org.plan !== "custom"}
            setValue={setRole}
            minimal={true}
            additionalOptions={additionalOptions}
          />
        </Group>

        {!!users?.length ? (
          <Card withBorder p="0">
            {users.map((user, i) => (
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
                        {hasAccess(currentUser.role, "teamMembers", "update") &&
                          user.role !== "owner" && (
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

                {i !== users.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Card>
        ) : (
          <Card withBorder p="lg">
            <Text>Nothing here.</Text>
          </Card>
        )}
      </Stack>
    </>
  );
}
function MemberListCard() {
  const { org } = useOrg();

  const invitedUsers = org?.users.filter(
    (user) => user.verified === false && user.role !== "owner",
  );
  const activatedUsers = org?.users.filter(
    (user) => user.verified === true || user.role === "owner",
  );

  return (
    <Tabs defaultValue="members">
      <Tabs.List>
        <Tabs.Tab value="members">Team Members</Tabs.Tab>

        <Tabs.Tab value="invitations">Pending Invitations</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="members">
        <MemberList users={activatedUsers} isInvitation={false} />
      </Tabs.Panel>

      <Tabs.Panel value="invitations">
        <MemberList users={invitedUsers} isInvitation={true} />
      </Tabs.Panel>
    </Tabs>
  );
}

// TODO: put back at root level
export default function Team() {
  const { org, updateOrg, mutate } = useOrg();
  const { user } = useUser();
  const samlEnabled = config.IS_SELF_HOSTED
    ? org.license.samlEnabled
    : org.samlEnabled;

  return (
    <Container className="unblockable">
      <NextSeo title="Team" />

      <Stack gap="xl">
        <Group align="center">
          <Title order={2}>Manage Team:</Title>
          <RenamableField
            defaultValue={org?.name}
            order={2}
            onRename={(newName) => {
              updateOrg({ id: org.id, name: newName });
              mutate({ ...org, name: newName });
            }}
          />
        </Group>

        {hasAccess(user.role, "teamMembers", "create") && <InviteMemberCard />}
        <MemberListCard />
        {["admin", "owner"].includes(user.role) && <SAMLConfig />}
      </Stack>
    </Container>
  );
}
