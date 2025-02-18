import {
  ActionIcon,
  Anchor,
  Box,
  Collapse,
  Flex,
  Group,
  Menu,
  NavLink,
  Notification,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";

import {
  IconActivity,
  IconAnalyze,
  IconBinaryTree2,
  IconBrandOpenai,
  IconChecklist,
  IconCreditCard,
  IconDatabase,
  IconHelpOctagon,
  IconHelpSmall,
  IconListSearch,
  IconLogout,
  IconMessage2,
  IconMessages,
  IconMoon,
  IconNotebook,
  IconPaint,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSun,
  IconTimeline,
  IconUsers,
} from "@tabler/icons-react";

import UserAvatar from "@/components/blocks/UserAvatar";
import { useOrg, useUser } from "@/utils/dataHooks";
import Link from "next/link";
import { useRouter } from "next/router";
import { openUpgrade } from "./UpgradeModal";

import analytics from "@/utils/analytics";
import { Button, Combobox, Input, InputBase, useCombobox } from "@mantine/core";

import { IconPlus } from "@tabler/icons-react";

import { useAuth } from "@/utils/auth";
import config from "@/utils/config";
import { useProject, useProjects } from "@/utils/dataHooks";
import { useViews } from "@/utils/dataHooks/views";
import { useDisclosure, useFocusTrap, useLocalStorage } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { ResourceName, hasAccess, hasReadAccess, serializeLogic } from "shared";
import DashboardsSidebarButton from "../analytics/DashboardsSidebarButton";
import { getIconComponent } from "../blocks/IconPicker";
import styles from "./sidebar.module.css";

interface NavbarLinkProps {
  icon: any;
  label: string;
  link: string;
  rightSection?: any;
  soon?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  disabled?: boolean;
}

export function NavbarLink({
  icon: Icon,
  label,
  link,
  rightSection,
  soon = false,
  onClick = () => {},
  disabled = false,
}: NavbarLinkProps) {
  const router = useRouter();

  // For logs pages, we want to compare the view param to see if a view is selected

  const active = (() => {
    const linkParams = new URLSearchParams(link.split("?")[1]);
    if (router.pathname.startsWith("/logs")) {
      if (router.asPath.includes(`view=`)) {
        const viewParam = linkParams.get("view");
        if (viewParam) {
          return router.asPath.includes(`view=${viewParam}`);
        }
      }
      return router.asPath.startsWith(link);
    }
    if (
      router.pathname.startsWith("/dashboards/[id]") &&
      link.startsWith("/dashboards")
    ) {
      return true;
    }
    return router.pathname.startsWith(link);
  })();

  return (
    <NavLink
      w="100%"
      href={link}
      component={Link}
      pl={5}
      styles={{
        label: {
          fontSize: 14,
        },
      }}
      onClick={onClick}
      h={33}
      label={`${label}${soon ? " (soon)" : ""}`}
      disabled={disabled || soon}
      active={active}
      leftSection={
        <ThemeIcon variant={"subtle"} size="md" mr={-10}>
          <Icon size={16} opacity={0.7} />
        </ThemeIcon>
      }
      rightSection={rightSection}
    />
  );
}

type MenuItem = {
  label: string;
  icon?: any;
  link?: string;
  resource?: ResourceName;
  disabled?: boolean;
  searchable?: boolean;
  c?: string;
  isSection?: boolean;
  subMenu?: MenuItem[];
};

function MenuSection({ item }) {
  const { user } = useUser();

  const [opened, { toggle }] = useDisclosure(true);
  const [query, setQuery] = useState("");

  const [searchOn, setSearchOn] = useState(false);

  const focusTrapRef = useFocusTrap();

  const filtered = item.subMenu?.filter((subItem) =>
    subItem.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Box mb="sm" mt="md">
      <Group gap={3} align="center" justify="space-between" px="sm">
        {searchOn ? (
          <TextInput
            size="xs"
            py={0}
            h={16}
            leftSection={<IconSearch size={12} />}
            mb={15}
            ref={focusTrapRef}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onBlur={() => {
              setSearchOn(false);

              // leave time for the click event to trigger
              setTimeout(() => {
                setQuery("");
              }, 200);
            }}
          />
        ) : (
          <>
            <Text
              mb={5}
              fz={13}
              fw={400}
              opacity={0.8}
              onClick={toggle}
              style={{ cursor: "pointer" }}
            >
              {item.label}
            </Text>
            <Group gap={6} align="center">
              {item.searchable && opened && (
                <IconSearch
                  onClick={() => setSearchOn(true)}
                  size={14}
                  opacity={0.4}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    top: -2,
                  }}
                />
              )}

              {/* TODO: put back */}
              {/* <IconChevronRight
                onClick={toggle}
                size={14}
                opacity={0.6}
                style={{
                  cursor: "pointer",
                  position: "relative",
                  top: -2,
                  transform: `rotate(${opened ? 90 : 0}deg)`,
                }}
              /> */}
            </Group>
          </>
        )}
      </Group>

      <Collapse in={opened}>
        {filtered
          ?.filter((subItem) => hasReadAccess(user.role, subItem.resource))
          .map((subItem) => {
            if (subItem.label === "Dashboards") {
              return (
                <DashboardsSidebarButton
                  item={subItem}
                  key={subItem.link || subItem.label}
                />
              );
            }
            return (
              <NavbarLink {...subItem} key={subItem.link || subItem.label} />
            );
          })}
      </Collapse>
    </Box>
  );
}

export default function Sidebar() {
  const auth = useAuth();
  const router = useRouter();

  const { project, setProjectId } = useProject();

  const { org } = useOrg();
  const { user } = useUser();
  const { views } = useViews();
  const { projects, isLoading: loading, insert } = useProjects();

  const { colorScheme, setColorScheme } = useMantineColorScheme({});
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useLocalStorage({
    key: "github-notification-dismissed",
    defaultValue: false,
    getInitialValueInEffect: false,
  });

  const projectsCombobox = useCombobox({
    onDropdownClose: () => {
      projectsCombobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => {
      projectsCombobox.focusSearchInput();
    },
  });

  const [search, setSearch] = useState("");

  const isSelfHosted = config.IS_SELF_HOSTED;

  const billingEnabled =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !config.IS_SELF_HOSTED;

  const canUpgrade = billingEnabled && ["free", "pro"].includes(org?.plan);

  const projectViews = (views || [])
    .map((v) => {
      const serialized = serializeLogic(v.data);

      const Icon = getIconComponent(v.icon);

      return {
        label: v.name,
        icon: Icon,
        link: `/logs?view=${v.id}&filters=${serialized}&type=${v.type}`,
        resource: "logs",
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const APP_MENU: MenuItem[] = [
    {
      label: "Observe",
      isSection: true,
      c: "blue",
      subMenu: [
        {
          label: "Dashboards",
          icon: IconTimeline,
          link: "/dashboards",
          resource: "analytics",
        },
        // Only for Mock Lunary for now
        ...(project?.id === "dedc86a5-6cba-481c-9ce5-8b6fa3dcd8e6"
          ? [
              {
                label: "Intelligence",
                icon: IconSparkles,
                link: "/intelligence",
                resource: "analytics",
              },
            ]
          : []),
        {
          label: "LLM",
          icon: IconBrandOpenai,
          link: "/logs?type=llm",
          resource: "logs",
        },
        {
          label: "Traces",
          icon: IconBinaryTree2,
          link: "/logs?type=trace",
          resource: "logs",
        },
        {
          label: "Conversations",
          icon: IconMessages,
          link: "/logs?type=thread",
          resource: "logs",
        },
        { label: "Users", icon: IconUsers, link: "/users", resource: "users" },
      ],
    },
    {
      label: "Build",
      c: "violet",
      subMenu: [
        {
          label: "Prompts",
          icon: IconNotebook,
          link: "/prompts",
          resource: "prompts",
        },
        {
          label: "Datasets",
          icon: IconDatabase,
          link: "/datasets",
          resource: "datasets",
          disabled: isSelfHosted
            ? org.license && !org.license.evalEnabled
            : false,
        },
        {
          label: "Checklists",
          icon: IconChecklist,
          link: "/checklists",
          resource: "checklists",
          disabled: isSelfHosted
            ? org.license && !org.license.evalEnabled
            : false,
        },
      ],
    },
  ];

  if (projectViews.length) {
    APP_MENU.push({
      label: "Smart Views",
      icon: IconListSearch,
      searchable: true,
      resource: "logs",
      subMenu: projectViews,
    });
  }

  async function createProject() {
    if (org.plan === "free" && projects.length >= 3) {
      return openUpgrade("projects");
    }

    setCreateProjectLoading(true);

    const name = `Project #${projects.length + 1}`;
    try {
      const { id } = await insert({ name });
      analytics.track("Create Project", {
        name,
      });

      setCreateProjectLoading(false);
      setProjectId(id);
      router.push(`/settings`);
    } catch (error) {
      console.error(error);
    } finally {
      setCreateProjectLoading(false);
    }
  }

  // Select first project if none selected
  useEffect(() => {
    if (!project && projects?.length && !loading) {
      setProjectId(projects[0].id);
    }
  }, [project, projects, loading, setProjectId]);

  const projectOptions = projects
    ?.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => (
      <Combobox.Option value={item.id} key={item.id}>
        {item.name}
      </Combobox.Option>
    ));

  return (
    <Flex
      className="sidebar"
      justify="space-between"
      align="start"
      w={200}
      mah="100vh"
      direction="column"
      style={{
        overflowY: "auto",
        borderRight: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Stack w="100%" gap={0}>
        <Box w="100%">
          <Group wrap="nowrap" my="xs" pb="xs" mx="xs" justify="space-between">
            <Combobox
              store={projectsCombobox}
              withinPortal={false}
              onOptionSubmit={async (id) => {
                if (router.pathname.startsWith("/dashboards/")) {
                  await router.push("/dashboards");
                }

                if (router.pathname.startsWith("/prompts/")) {
                  await router.push("/prompts");
                }

                setProjectId(id);
                projectsCombobox.closeDropdown();
              }}
              styles={{
                dropdown: { minWidth: "fit-content", maxWidth: 600 },
              }}
            >
              <Combobox.Target>
                <InputBase
                  component="button"
                  size="xs"
                  variant="unstyled"
                  w={"100%"}
                  fw={500}
                  fz="xl"
                  type="button"
                  style={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                  pointer
                  leftSection={
                    <ThemeIcon size={19} ml={-4} variant="light">
                      <IconAnalyze size={15} />
                    </ThemeIcon>
                  }
                  rightSection={<Combobox.Chevron />}
                  onClick={() => projectsCombobox.toggleDropdown()}
                  rightSectionPointerEvents="none"
                >
                  <Tooltip label={project?.name}>
                    {project?.name ? (
                      <span
                        style={{
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          height: "100%",
                          display: "block",
                        }}
                      >
                        {project.name}
                      </span>
                    ) : (
                      <Input.Placeholder>Select project</Input.Placeholder>
                    )}
                  </Tooltip>
                </InputBase>
              </Combobox.Target>
              <Combobox.Dropdown w={400}>
                <Combobox.Search
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder={"Type to filter..."}
                  style={{
                    top: 0,
                    zIndex: 2,
                    position: "sticky",
                  }}
                />
                <Combobox.Options>
                  {projectOptions?.length > 0 ? (
                    projectOptions
                  ) : (
                    <Combobox.Empty>No projects found</Combobox.Empty>
                  )}
                </Combobox.Options>
                <Combobox.Footer>
                  <Button
                    loading={createProjectLoading}
                    onClick={createProject}
                    data-testid="new-project"
                    variant="light"
                    fullWidth
                    leftSection={<IconPlus size={12} />}
                  >
                    Create Project
                  </Button>
                </Combobox.Footer>
              </Combobox.Dropdown>
            </Combobox>
            {hasAccess(user.role, "settings", "read") && (
              <ActionIcon
                variant="default"
                size="sm"
                component={Link}
                href="/settings"
              >
                <IconSettings size={14} stroke={1} />
              </ActionIcon>
            )}
          </Group>

          {user &&
            APP_MENU.filter((item) => !item.disabled).map((item) => {
              return <MenuSection item={item} key={item.label} />;
            })}
        </Box>
      </Stack>

      {user && (
        <>
          <Box w="100%">
            {canUpgrade && (
              <NavLink
                label="Unlock all features"
                onClick={() => openUpgrade("features")}
                fw={700}
                c="pink.9"
                style={{
                  backgroundColor: "var(--mantine-color-red-1)",
                  borderRadius: 6,
                  padding: 7,
                  margin: 10,
                  width: "calc(100% - 20px)",
                }}
                leftSection={
                  <IconSparkles
                    color={"var(--mantine-color-red-9)"}
                    size={16}
                  />
                }
              />
            )}
            <Group p="sm" justify="space-between">
              {!notificationDismissed && (
                <Notification
                  pl="10"
                  mb="lg"
                  classNames={{ closeButton: styles.closeButton }}
                  color="transparent"
                  title={<Text size="sm">Star Lunary</Text>}
                  w="100%"
                  withBorder
                  style={{ boxShadow: "none" }}
                  onClose={() => {
                    setNotificationDismissed(true);
                    analytics.track("Github Notification Dismissed", { user });
                  }}
                >
                  <Text my="sm" size="sm">
                    Help grow the community on GitHub
                  </Text>
                  <Anchor
                    target="_blank"
                    href="https://github.com/lunary-ai/lunary"
                    onClick={() =>
                      analytics.track("Github Notification Link Clicked", {
                        user,
                      })
                    }
                  >
                    <img
                      alt="Lunary Github stars"
                      src="https://img.shields.io/github/stars/lunary-ai/lunary?label=lunary&amp;style=social"
                    />
                  </Anchor>
                </Notification>
              )}
              <Menu>
                <Menu.Target>
                  <ActionIcon
                    variant="outline"
                    color="gray"
                    radius="xl"
                    size={26}
                  >
                    <IconHelpSmall size={60} stroke={1.5} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {process.env.NEXT_PUBLIC_CRISP_ID && (
                    <Menu.Item
                      leftSection={<IconMessage2 size={14} />}
                      onClick={() => {
                        $crisp?.push(["do", "chat:open"]);
                      }}
                    >
                      Feedback
                    </Menu.Item>
                  )}
                  <Menu.Item
                    component="a"
                    href="https://lunary.ai/docs"
                    leftSection={<IconHelpOctagon size={14} />}
                  >
                    Documentation
                  </Menu.Item>
                  <Menu.Item
                    component="a"
                    href="https://lunary.ai/changelog"
                    leftSection={<IconActivity size={14} />}
                  >
                    Changelog
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <Menu closeOnItemClick={false}>
                <Menu.Target data-testid="account-sidebar-item">
                  <ActionIcon variant="subtle" radius="xl" size={32}>
                    <UserAvatar size={26} profile={user} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item>
                    <Stack gap={0}>
                      <Text
                        mb={-3}
                        size="xs"
                        style={{
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user?.name}
                      </Text>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user?.email}
                      </Text>
                    </Stack>
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconPaint opacity={0.6} size={14} />}
                  >
                    <SegmentedControl
                      value={colorScheme}
                      size="xs"
                      onChange={setColorScheme}
                      data={[
                        { value: "auto", label: "Auto" },
                        {
                          value: "light",
                          label: (
                            <IconSun
                              style={{ position: "relative", top: 2 }}
                              size={15}
                            />
                          ),
                        },
                        {
                          value: "dark",
                          label: (
                            <IconMoon
                              style={{ position: "relative", top: 2 }}
                              size={15}
                            />
                          ),
                        },
                      ]}
                    />
                  </Menu.Item>
                  {billingEnabled &&
                    hasAccess(user.role, "billing", "read") && (
                      <>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={
                            <IconCreditCard opacity={0.6} size={14} />
                          }
                          onClick={() => router.push("/billing")}
                        >
                          Usage & Billing
                        </Menu.Item>
                      </>
                    )}
                  {hasAccess(user.role, "teamMembers", "list") && (
                    <Menu.Item
                      leftSection={<IconUsers opacity={0.6} size={14} />}
                      onClick={() => router.push("/team")}
                    >
                      Team
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    c="red"
                    data-testid="logout-button"
                    onClick={() => auth.signOut()}
                    leftSection={<IconLogout size={14} />}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Box>
        </>
      )}
    </Flex>
  );
}
