import { Box, Flex, NavLink, Stack, Text, ThemeIcon } from "@mantine/core"

import {
  IconActivity,
  IconAnalyze,
  IconBolt,
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

import UserAvatar from "@/components/Blocks/UserAvatar"
import { useOrg, useUser } from "@/utils/dataHooks"
import Link from "next/link"
import Router, { useRouter } from "next/router"
import { openUpgrade } from "./UpgradeModal"

import analytics from "@/utils/analytics"
import { Button, Combobox, Input, InputBase, useCombobox } from "@mantine/core"

import { IconPlus } from "@tabler/icons-react"

import { useProject, useProjects } from "@/utils/dataHooks"
import { useEffect, useState } from "react"
import { useAuth } from "@/utils/auth"
import { useColorScheme } from "@mantine/hooks"

const APP_MENU = [
  { label: "Analytics", icon: IconTimeline, link: "/analytics" },
  { label: "Logs", icon: IconListSearch, link: "/logs" },
  { label: "Users", icon: IconUsers, link: "/users" },
  { label: "Prompts", icon: IconPlayerPlay, link: "/prompts" },
  { label: "Radars", icon: IconShieldBolt, link: "/radars" },
  { label: "Evaluations", icon: IconFlask2Filled, link: "/evaluations" },
  { label: "Settings & Keys", icon: IconSettings, link: "/settings" },
]

function NavbarLink({ icon: Icon, label, link, active, soon, onClick, c }) {
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
  const router = useRouter()
  const auth = useAuth()
  const { project, setProjectId } = useProject()

  const { user, mutate } = useUser()
  const { org } = useOrg()
  const scheme = useColorScheme()
  const { projects, isLoading: loading, insert } = useProjects()

  const [createProjectLoading, setCreateProjectLoading] = useState(false)

  const combobox = useCombobox()

  const isActive = (link: string) => router.pathname.startsWith(link)

  const links = APP_MENU.map((item) => (
    <NavbarLink {...item} active={isActive(item.link)} key={item.label} />
  ))

  const createProject = async () => {
    if (org.plan === "free" && projects.length >= 2) {
      return openUpgrade("projects")
    }

    setCreateProjectLoading(true)

    const name = `Project #${projects.length + 1}`
    const { id } = await insert({ name })

    analytics.track("Create Project", {
      name,
    })

    setCreateProjectLoading(false)
    setProjectId(id)

    Router.push(`/settings`)
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
          {!loading && user && projects?.length && (
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
                    <Input.Placeholder>Select Project</Input.Placeholder>
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
                    variant="light"
                    fullWidth
                    leftSection={<IconPlus size={12} />}
                  >
                    Create project
                  </Button>
                </Combobox.Footer>
              </Combobox.Dropdown>
            </Combobox>
          )}

          {links}
        </Box>
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

          {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
            <>
              {["free", "pro"].includes(org?.plan) && (
                <NavbarLink
                  label="Upgrade"
                  onClick={() => openUpgrade()}
                  c="purple"
                  icon={IconBolt}
                />
              )}
              <NavbarLink
                label="Usage & Billing"
                link="/billing"
                icon={IconCreditCard}
              />
            </>
          )}

          <NavbarLink link="/team" label="Team" icon={IconUsers} />
        </Box>
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

            <NavLink
              color="red"
              h={50}
              bg="var(--mantine-color-default-border)"
              leftSection={<UserAvatar size={32} profile={user} />}
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
            >
              <NavLink
                label="Logout"
                c="red"
                onClick={() => auth.signOut()}
                leftSection={<IconLogout size={14} />}
              />
            </NavLink>
          </Box>
        </>
      )}
    </Flex>
  )
}
