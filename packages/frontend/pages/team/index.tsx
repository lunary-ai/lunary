import React, { forwardRef, useEffect, useState } from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Combobox,
  Container,
  Divider,
  Group,
  Input,
  InputBase,
  Menu,
  Modal,
  MultiSelect,
  Popover,
  Stack,
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
  IconTrash,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { z } from "zod";

import { CopyInput } from "@/components/blocks/CopyText";
import SearchBar from "@/components/blocks/SearchBar";
import { SettingsCard } from "@/components/blocks/SettingsCard";
import UserAvatar from "@/components/blocks/UserAvatar";
import { openUpgrade } from "@/components/layout/UpgradeModal";
import config from "@/utils/config";
import { useOrg, useOrgUser, useProjects, useUser } from "@/utils/dataHooks";
import { useInvitedUsers, useInviteUser } from "@/utils/dataHooks/users";
import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import { SEAT_ALLOWANCE } from "@/utils/pricing";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { hasAccess, roles } from "shared";
import classes from "./team.module.css";

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

/* -------------------------------------------------------------------------- */
/* USER MENU                                                                 */
/* -------------------------------------------------------------------------- */

function UserMenu({ user, isInvitation }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useUser();
  const { removeUserFromOrg } = useOrgUser(user.id);
  const { mutate: mutateInvited } = useInvitedUsers();

  if (["admin", "owner"].includes(user.role) && currentUser?.role !== "owner") {
    return null;
  }

  if (currentUser?.id === user.id) {
    return null;
  }

  async function confirm() {
    setIsLoading(true);
    if (isInvitation) {
      // delete pending invitation
      await errorHandler(fetcher.delete(`/users/invitation/${user.id}`));
      await mutateInvited();
      notifications.show({
        title: "Invitation cancelled",
        message: "",
        icon: <IconCheck size={18} />,
        color: "green",
      });
    } else {
      await removeUserFromOrg();
    }
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
                const tok = user.token || user.singleUseToken;
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?token=${tok}`,
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
      value === "owner" && currentUser.role !== "owner" ? null : (
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
            disabled={
              (!free && !canUsePaidRoles) ||
              (value === "billing" && currentUser.role !== "owner")
            }
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

/* -------------------------------------------------------------------------- */
/* PROJECT MULTI SELECT                                                      */
/* -------------------------------------------------------------------------- */

type ProjectMultiProps = {
  value: string[];
  setValue: (v: string[]) => void;
  disabled: boolean;
};

const ProjectMultiSelect = forwardRef<HTMLInputElement, ProjectMultiProps>(
  (props, ref) => {
    const { value, setValue, disabled } = props;
    const { projects } = useProjects();

    const data = projects.map((project) => ({
      value: project.id,
      label: project.name,
    }));

    return (
      <MultiSelect
        ref={ref}
        value={value}
        data={data}
        onChange={(projectIds) => setValue(projectIds)}
        classNames={{ pillsList: classes.pillsList }}
        disabled={disabled}
        readOnly={disabled}
      />
    );
  },
);
ProjectMultiSelect.displayName = "ProjectMultiSelect";

function InviteMemberCard() {
  const [role, setRole] = useState("member");
  const { projects } = useProjects();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [opened, setOpened] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const { org } = useOrg();

  const { invite, isInviting } = useInviteUser();

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

  async function onInvite({ email }: { email: string }) {
    const seatAllowance = org?.seatAllowance || SEAT_ALLOWANCE[org?.plan];
    if (org?.users?.length >= seatAllowance) {
      return openUpgrade("team");
    }

    try {
      const res = (await invite({
        email,
        role,
        projects: selectedProjects,
      })) as any;

      if (!config.IS_SELF_HOSTED) {
        notifications.show({
          title: "Member invited",
          message: "An email has been sent to them",
          icon: <IconCheck />,
          color: "green",
        });
        return;
      }

      const tok = res?.token || res?.user?.token;
      if (tok) {
        const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?token=${tok}`;
        setInviteLink(link);
        setOpened(true);
      }
    } catch (error) {
      console.error(error);
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

      <form onSubmit={form.onSubmit(onInvite)}>
        <Group grow={true}>
          <TextInput
            label="Email"
            placeholder="john@example.com"
            type="email"
            required
            {...form.getInputProps("email")}
          />
          <Input.Wrapper label="Role">
            <RoleSelect value={role} setValue={setRole} />
          </Input.Wrapper>
          <Input.Wrapper label="Projects">
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

        <Group mt="lg" justify="end">
          <Button
            variant="default"
            size="md"
            type="submit"
            loading={isInviting}
          >
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

  console.log(users);
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
          Are you sure you want to transfer the ownership of your organization
          to this user? This action will make you an admin.
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
                            <Badge variant="light">
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
            <Text>Nothing pending invitations.</Text>
          </Card>
        )}
      </Stack>
    </>
  );
}

function MemberListCard() {
  const { org } = useOrg();
  const { invitedUsers } = useInvitedUsers();

  const teamMembers = org?.users;

  return (
    <Tabs defaultValue="members">
      <Tabs.List>
        <Tabs.Tab value="members">Team Members</Tabs.Tab>
        <Tabs.Tab value="invitations">Pending Invitations</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="members">
        <MemberList users={teamMembers} isInvitation={false} />
      </Tabs.Panel>

      <Tabs.Panel value="invitations">
        <MemberList users={invitedUsers} isInvitation={true} />
      </Tabs.Panel>
    </Tabs>
  );
}

export default function Team() {
  const { user } = useUser();

  return (
    <Container className="unblockable">
      <NextSeo title="Team" />

      <Stack gap="xl">
        <Group align="center">
          <Title order={2}>Manage Team</Title>
        </Group>

        {hasAccess(user.role, "teamMembers", "create") && <InviteMemberCard />}
        <MemberListCard />
      </Stack>
    </Container>
  );
}
