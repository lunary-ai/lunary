import { Box, Flex, Menu, NavLink, Stack, Text, ThemeIcon } from "@mantine/core"

import {
  IconActivity,
  IconAnalyze,
  IconBolt,
  IconChevronRight,
  IconCreditCard,
  IconFlask2Filled,
  IconHelpOctagon,
  IconListSearch,
  IconLogout,
  IconMessage2,
  IconPlayerPlay,
  IconSettings,
  IconShieldBolt,
  IconTimeline,
  IconUsers,
} from "@tabler/icons-react"

import UserAvatar from "@/components/blocks/UserAvatar"
import { useOrg, useUser } from "@/utils/dataHooks"
import Link from "next/link"
import { useRouter } from "next/router"
import { openUpgrade } from "./UpgradeModal"

import analytics from "@/utils/analytics"
import { Button, Combobox, Input, InputBase, useCombobox } from "@mantine/core"

import { IconPlus } from "@tabler/icons-react"

import { useAuth } from "@/utils/auth"
import { useProject, useProjects } from "@/utils/dataHooks"
import { useEffect, useState } from "react"
import { ResourceName, hasAccess, hasReadAccess } from "shared"

const APP_MENU: {
  label: string
  icon: any
  link: string
  resource: ResourceName
}[] = [
  {
    label: "Analytics",
    icon: IconTimeline,
    link: "/analytics",
    resource: "analytics",
  },
  {
    label: "Logs",
    icon: IconListSearch,
    link: "/logs",
    resource: "logs",
  },
  { label: "Users", icon: IconUsers, link: "/users", resource: "users" },
  {
    label: "Prompts",
    icon: IconPlayerPlay,
    link: "/prompts",
    resource: "prompts",
  },
  {
    label: "Radars",
    icon: IconShieldBolt,
    link: "/radars",
    resource: "radars",
  },
  {
    label: "Evaluations",
    icon: IconFlask2Filled,
    link: "/evaluations",
    resource: "evaluations",
  },
  // { label: "Datasets", icon: IconDatabase, link: "/datasets", resource: "datasets" },
  {
    label: "Settings & Keys",
    icon: IconSettings,
    link: "/settings",
    resource: "apiKeys",
  },
]

function NavbarLink({ icon: Icon, label, link, soon, onClick, c }) {
  const router = useRouter()

  const active = router.pathname.startsWith(link)

  return (
    <NavLink
      component={!onClick ? Link : "button"}
      href={link}
      w="100%"
      onClick={onClick}
      c={c}
      label={`${label}${soon ? " (soon)" : ""}`}
      disabled={soon}
      active={active}
      leftSection={
        <ThemeIcon
          variant={active ? "light" : "subtle"}
          color={active ? c || "blue" : c || "blue.4"}
          size="sm"
        >
          <Icon size={14} />
        </ThemeIcon>
      }
    />
  )
}

export default function Sidebar() {
  const auth = useAuth()
  const router = useRouter()
  const { project, setProjectId } = useProject()

  const { user } = useUser()
  const { org } = useOrg()
  const { projects, isLoading: loading, insert } = useProjects()

  const [createProjectLoading, setCreateProjectLoading] = useState(false)

  const combobox = useCombobox()

  const billingEnabled =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_IS_SELF_HOSTED

  const orgMenu = [
    {
      label: "Upgrade",
      onClick: openUpgrade,
      c: "violet",
      icon: IconBolt,
      disabled: !billingEnabled || !["free", "pro"].includes(org?.plan),
      resource: "billing",
    },
    {
      label: "Usage & Billing",
      link: "/billing",
      icon: IconCreditCard,
      disabled: !billingEnabled,
      resource: "billing",
    },
    {
      link: "/team",
      label: "Team",
      icon: IconUsers,
      resource: "teamMembers",
    },
  ]

  async function createProject() {
    if (org.plan === "free" && projects.length >= 3) {
      return openUpgrade("projects")
    }

    setCreateProjectLoading(true)

    const name = `Project #${projects.length + 1}`
    try {
      const { id } = await insert({ name })
      analytics.track("Create Project", {
        name,
      })

      setCreateProjectLoading(false)
      setProjectId(id)
      router.push(`/settings`)
    } catch (error) {
      console.error(error)
    } finally {
      setCreateProjectLoading(false)
    }
  }

  // Select first project if none selected
  useEffect(() => {
    if (!project && projects?.length && !loading) {
      setProjectId(projects[0].id)
    }
  }, [project, projects, loading, setProjectId])

  return (
    <Flex
      justify="space-between"
      align="start"
      w={200}
      direction="column"
      style={{
        borderRight: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Stack w="100%" gap={0}>
        <Box w="100%">
          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(id) => {
              setProjectId(id)
              combobox.closeDropdown()
            }}
          >
            <Combobox.Target>
              <InputBase
                component="button"
                size="xs"
                mx="xs"
                my="xs"
                w="auto"
                type="button"
                pointer
                leftSection={<IconAnalyze size={16} />}
                rightSection={<Combobox.Chevron />}
                onClick={() => combobox.toggleDropdown()}
                rightSectionPointerEvents="none"
              >
                {project?.name || (
                  <Input.Placeholder>Select project</Input.Placeholder>
                )}
              </InputBase>
            </Combobox.Target>
            <Combobox.Dropdown>
              <Combobox.Options>
                {projects?.map((item) => (
                  <Combobox.Option value={item.id} key={item.id}>
                    {item.name}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
              <Combobox.Footer>
                <Button
                  loading={createProjectLoading}
                  size="xs"
                  onClick={createProject}
                  data-testid="new-project"
                  variant="light"
                  fullWidth
                  leftSection={<IconPlus size={12} />}
                >
                  Create project
                </Button>
              </Combobox.Footer>
            </Combobox.Dropdown>
          </Combobox>

          {user &&
            APP_MENU.filter((item) =>
              hasReadAccess(user.role, item.resource),
            ).map((item) => <NavbarLink {...item} key={item.label} />)}
        </Box>
        {user &&
          (hasAccess(user.role, "billing", "read") ||
            hasAccess(user.role, "teamMembers", "read")) && (
            <Box w="100%" mt="xl">
              <Text
                ml="xs"
                h={20}
                fz={12}
                fw={700}
                style={{
                  textTransform: "uppercase",
                }}
              >
                {org?.name}
              </Text>

              {orgMenu
                .filter((item) => hasAccess(user.role, item.resource, "read"))
                .filter((item) => !item.disabled)
                .map((item) => (
                  <NavbarLink {...item} key={item.label} />
                ))}
            </Box>
          )}
      </Stack>

      {user && (
        <>
          <Box w="100%">
            <NavLink
              component={Link}
              href="https://lunary.ai/changelog"
              label="Changelog"
              leftSection={<IconActivity size={14} />}
            />

            {process.env.NEXT_PUBLIC_CRISP_ID && (
              <NavLink
                onClick={() => {
                  $crisp.push(["do", "chat:open"])
                }}
                label="Help & Feedback"
                leftSection={<IconMessage2 size={14} />}
              />
            )}
            <NavLink
              component="a"
              href="https://lunary.ai/docs"
              label="Documentation"
              leftSection={<IconHelpOctagon size={14} />}
            />

            <Menu width={200}>
              <Menu.Target>
                <NavLink
                  color="red"
                  h={50}
                  data-testid="account-sidebar-item"
                  leftSection={<UserAvatar size={24} profile={user} />}
                  rightSection={<IconChevronRight size={16} opacity={0.5} />}
                  label={
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
                  }
                />
              </Menu.Target>
              <Menu.Dropdown>
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
          </Box>
        </>
      )}
    </Flex>
  )
}
