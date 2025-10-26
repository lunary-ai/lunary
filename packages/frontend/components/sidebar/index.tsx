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
  useMantineColorScheme,
} from "@mantine/core";

import {
  IconActivity,
  IconBell,
  IconBinaryTree2,
  IconChecklist,
  IconCompass,
  IconCreditCard,
  IconDatabase,
  IconFilterCog,
  IconFlask2,
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
  IconShieldHalf,
  IconSparkles,
  IconSun,
  IconTerminal2,
  IconTimeline,
  IconUsers,
} from "@tabler/icons-react";

import UserAvatar from "@/components/blocks/UserAvatar";
import { useOrg, useUser } from "@/utils/dataHooks";
import Link from "next/link";
import { useRouter } from "next/router";
import { openUpgrade } from "../layout/UpgradeModal";

import analytics from "@/utils/analytics";

import { useAuth } from "@/utils/auth";
import config from "@/utils/config";
import { useProject, useProjects } from "@/utils/dataHooks";
import { useViews } from "@/utils/dataHooks/views";
import { show } from "@intercom/messenger-js-sdk";
import { useDisclosure, useFocusTrap, useLocalStorage } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { ResourceName, hasAccess, hasReadAccess, serializeLogic } from "shared";
import DashboardsSidebarButton from "../analytics/DashboardsSidebarButton";
import { getIconComponent } from "../blocks/IconPicker";
import { ProjectDropdown } from "./project-dropdown";
import { SidebarLink } from "./sidebar-link";
import styles from "./sidebar.module.css";

type MenuItem = {
  label: string;
  icon?: any;
  link?: string;
  resource?: ResourceName;
  disabled?: boolean;
  searchable?: boolean;
  isSection?: boolean;
  subMenu?: MenuItem[];
  isAlpha?: boolean;
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

  if (filtered.filter((item) => !item.disabled).length === 0) {
    return null;
  }

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
              <SidebarLink {...subItem} key={subItem.link || subItem.label} />
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

  const handleSelectProject = useCallback(
    async (id: string) => {
      if (router.pathname.startsWith("/dashboards/")) {
        await router.push("/dashboards");
      }

      if (router.pathname.startsWith("/prompts/")) {
        await router.push("/prompts");
      }

      setProjectId(id);
    },
    [router, setProjectId],
  );

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
      label: "",
      isSection: true,
      subMenu: [
        {
          label: "Dashboards",
          icon: IconTimeline,
          link: "/dashboards",
          resource: "analytics",
        },
      ],
    },

    {
      label: "Explore",
      isSection: true,
      subMenu: [
        {
          label: "Logs",
          icon: IconTerminal2,
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
      label: "Optimize",
      subMenu: [
        {
          label: "Prompts",
          icon: IconNotebook,
          link: "/prompts",
          resource: "prompts",
        },
        {
          label: "Evaluators",
          icon: IconCompass,
          link: "/evaluators",
          resource: "evaluations",
        },
        {
          label: "Datasets",
          icon: IconDatabase,
          link: org?.datasetV2Enabled ? "/datasets/v2" : "/datasets",
          resource: "datasets",
          disabled: isSelfHosted
            ? org.license && !org.license.evalEnabled
            : false,
        },
        {
          label: "Tests",
          icon: IconFlask2,
          link: "/tests",
          resource: "evaluations", // TODO: use tests resource when available
          // disabled: !org?.datasetV2Enabled,
        },
        {
          label: "Checklists",
          icon: IconChecklist,
          link: "/checklists",
          resource: "checklists",
          disabled: isSelfHosted
            ? org.license && !org.license.evalEnabled
            : org.beta
              ? true
              : false,
        },
      ],
    },
    {
      label: "Protect",
      isSection: true,
      subMenu: [
        {
          label: "Data Rules",
          icon: IconFilterCog,
          link: "/data-rules",
          resource: "enrichments",
          disabled: !org.beta,
        },
        {
          label: "Alerts",
          icon: IconBell,
          link: "/alerts",
          resource: "enrichments",
          disabled: !org.beta,
        },
        {
          label: "Guardrails",
          icon: IconShieldHalf,
          link: "/guardrails",
          resource: "enrichments",
          disabled: !org.beta,
          isAlpha: true,
        },
      ],
    },
  ];

  if (projectViews.length) {
    APP_MENU.push({
      label: "Views",
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
            <ProjectDropdown
              project={project}
              projects={projects}
              onSelect={handleSelectProject}
              onCreateProject={createProject}
              createProjectLoading={createProjectLoading}
            />
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
                  <Menu.Item
                    leftSection={<IconMessage2 size={14} />}
                    onClick={() => {
                      config.IS_CLOUD && show();
                    }}
                  >
                    Feedback
                  </Menu.Item>
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
