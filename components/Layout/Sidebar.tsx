import {
  ActionIcon,
  Stack,
  Tooltip,
  ThemeIcon,
  Menu,
  AppShell,
  Group,
} from "@mantine/core"

import {
  IconActivity,
  IconCreditCard,
  IconFile,
  IconLogout,
  IconRefresh,
  IconSettings,
  IconUsers,
  IconBolt,
  IconPlayerPlay,
  IconFlask,
  IconActivityHeartbeat,
  IconTimeline,
  IconShieldBolt,
  IconListSearch,
} from "@tabler/icons-react"

import { useSessionContext } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"
import { useProfile } from "@/utils/dataHooks"
import UserAvatar from "@/components/Blocks/UserAvatar"
import Link from "next/link"
import { openUpgrade } from "./UpgradeModal"

const menu = [
  { label: "Analytics", icon: IconTimeline, link: "/analytics" },
  { label: "Logs", icon: IconListSearch, link: "/logs" },
  { label: "Evaluations", icon: IconShieldBolt, link: "/evaluations" },
  { label: "Users", icon: IconUsers, link: "/users" },
  { label: "Prompts", icon: IconPlayerPlay, link: "/prompts" },
  { label: "Settings", icon: IconSettings, link: "/settings" },
]

function NavbarLink({ icon: Icon, label, link, active }) {
  return (
    <Tooltip label={label} withArrow position="right">
      <Link href={link}>
        <ThemeIcon
          variant={active ? "filled" : "light"}
          color={active ? "blue" : "blue.4"}
          size="lg"
        >
          <Icon size="17px" />
        </ThemeIcon>
      </Link>
    </Tooltip>
  )
}

export default function Sidebar() {
  const router = useRouter()

  const { supabaseClient } = useSessionContext()

  const { profile } = useProfile()

  const isActive = (link: string) => router.pathname.startsWith(link)

  const links = menu.map((item) => (
    <NavbarLink {...item} active={isActive(item.link)} key={item.label} />
  ))

  return (
    <AppShell.Navbar
      px="md"
      py="xl"
      style={{ width: 80, justifyContent: "space-between" }}
    >
      <Group grow>
        <Stack gap="xl" align="center">
          {links}
        </Stack>
      </Group>

      {profile && (
        <Group py="sm" justify="center">
          <Stack gap="sm" align="center">
            <Menu
              trigger="hover"
              shadow="md"
              width="200"
              position="top"
              withArrow
            >
              <Menu.Target>
                <ActionIcon>
                  <UserAvatar profile={profile} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown ml="lg">
                <Menu.Label>Lunary</Menu.Label>
                <Menu.Item
                  leftSection={<IconActivity size="16" />}
                  component={Link}
                  target="_blank"
                  href="https://feedback.lunary.ai/roadmap"
                >
                  Roadmap
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconRefresh size="16" />}
                  component={Link}
                  target="_blank"
                  href="https://feedback.lunary.ai/changelog"
                >
                  Changelog
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconFile size="16" />}
                  component="a"
                  target="_blank"
                  href="https://lunary.ai/docs"
                >
                  Documentation
                </Menu.Item>

                <Menu.Label>Account</Menu.Label>
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                  <>
                    {["free", "pro"].includes(profile?.org.plan) && (
                      <Menu.Item
                        onClick={() => openUpgrade()}
                        color="violet"
                        leftSection={<IconBolt size="16" />}
                      >
                        Upgrade
                      </Menu.Item>
                    )}

                    <Menu.Item
                      leftSection={<IconCreditCard size="16" />}
                      onClick={() => {
                        Router.push("/billing")
                      }}
                    >
                      Billing
                    </Menu.Item>
                  </>
                )}

                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size="16" />}
                  onClick={() => {
                    supabaseClient.auth.signOut().then(() => {
                      // empty localstorage
                      window.localStorage.clear()

                      Router.push("/login")
                    })
                  }}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Stack>
        </Group>
      )}
    </AppShell.Navbar>
  )
}
