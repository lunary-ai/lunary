import { Box, Flex, NavLink, Stack, Text, ThemeIcon } from "@mantine/core"

import {
  IconActivity,
  IconAnalyze,
  IconBolt,
  IconCreditCard,
  IconFile,
  IconFlask2Filled,
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
import { signOut } from "@/utils/auth"
import { useOrg, useUser } from "@/utils/dataHooks"
import Link from "next/link"
import Router, { useRouter } from "next/router"
import { openUpgrade } from "./UpgradeModal"

import analytics from "@/utils/analytics"
import { Button, Combobox, Input, InputBase, useCombobox } from "@mantine/core"

import { IconPlus } from "@tabler/icons-react"

import { useCurrentProject, useProjects } from "@/utils/dataHooks"
import { useEffect, useState } from "react"

const menu = [
  { label: "Analytics", icon: IconTimeline, link: "/analytics" },
  { label: "Logs", icon: IconListSearch, link: "/logs" },
  { label: "Radar", icon: IconShieldBolt, link: "/radar" },
  { label: "Evaluations", icon: IconFlask2Filled, link: "/evals" },
  { label: "Users", icon: IconUsers, link: "/users" },
  { label: "Prompts", icon: IconPlayerPlay, link: "/prompts" },
  { label: "Settings", icon: IconSettings, link: "/settings" },
]

function NavbarLink({ icon: Icon, label, link, active }) {
  return (
    <NavLink
      component={Link}
      href={link}
      w="100%"
      label={label}
      active={active}
      leftSection={
        <ThemeIcon
          variant={active ? "light" : "subtle"}
          color={active ? "blue" : "blue.4"}
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
  const { currentProject, setCurrentProjectId } = useCurrentProject()

  const { user, mutate } = useUser()
  const { org } = useOrg()
  const { projects, isLoading: loading, insert } = useProjects()

  const [createProjectLoading, setCreateProjectLoading] = useState(false)

  const combobox = useCombobox()

  const isActive = (link: string) => router.pathname.startsWith(link)

  const links = menu.map((item) => (
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
    setCurrentProjectId(id)

    Router.push(`/settings`)
  }

  // Select first project if none selected
  useEffect(() => {
    if (!currentProject && projects?.length && !loading) {
      setCurrentProjectId(projects[0].id)
    }
  }, [currentProject, projects, loading, setCurrentProjectId])

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
      <Box w="100%">
        {!loading && user && projects?.length && (
          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(id) => {
              setCurrentProjectId(id)
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
                {currentProject?.name || (
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

      {user && (
        <Box w="100%">
          {/* <NavLink
            component={Link}
            href="https://feedback.lunary.ai/roadmap"
            label="Roadmap"
            leftSection={<IconActivity size="16" />}
          /> */}
          <NavLink
            component={Link}
            href="https://lunary.ai/changelog"
            label="Changelog"
            leftSection={<IconActivity size={14} />}
          />
          <NavLink
            onClick={() => {
              $crisp.push(["do", "chat:open"])
            }}
            label="Help & Feedback"
            leftSection={<IconMessage2 size={14} />}
          />
          <NavLink
            component="a"
            href="https://lunary.ai/docs"
            label="Documentation"
            leftSection={<IconFile size={14} />}
          />
          {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
            <>
              {["free", "pro"].includes(org?.plan) && (
                <NavLink
                  label="Upgrade"
                  onClick={() => openUpgrade()}
                  c="purple"
                  leftSection={<IconBolt size={14} />}
                />
              )}
              <NavLink
                label="Billing"
                c="blue"
                onClick={() => {
                  Router.push("/billing")
                }}
                leftSection={<IconCreditCard size={14} />}
              />
            </>
          )}

          <NavLink
            style={{
              borderTop: "1px solid var(--mantine-color-default-border)",
            }}
            h={50}
            leftSection={<UserAvatar size={32} profile={user} />}
            label={
              <Stack gap={0}>
                <Text my={-5}>{user?.name}</Text>
                <Text size="xs" c="dimmed">
                  {user?.email}
                </Text>
              </Stack>
            }
          >
            <NavLink
              label="Logout"
              c="red"
              onClick={() => signOut()}
              leftSection={<IconLogout size={14} />}
            />
          </NavLink>
        </Box>
      )}
    </Flex>
  )
}
