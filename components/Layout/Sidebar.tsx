import {
  Navbar,
  ActionIcon,
  Stack,
  Tooltip,
  ThemeIcon,
  Menu,
} from "@mantine/core"

import {
  IconActivity,
  IconBrandOpenai,
  IconCreditCard,
  IconFile,
  IconGraph,
  IconLogout,
  IconMessages,
  IconRefresh,
  IconListTree,
  IconSettings,
  IconStethoscope,
  IconUsers,
  IconBolt,
  IconPlayerPlay,
} from "@tabler/icons-react"

import { useSessionContext } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"
import { useProfile } from "@/utils/dataHooks"
import UserAvatar from "@/components/Blocks/UserAvatar"
import Link from "next/link"
import { modals } from "@mantine/modals"

const menu = [
  { label: "Analytics", icon: IconGraph, link: "/analytics" },
  { label: "Generations", icon: IconBrandOpenai, link: "/generations" },
  { label: "Traces", icon: IconListTree, link: "/traces" },
  { label: "Users", icon: IconUsers, link: "/users" },
  { label: "Chats", icon: IconMessages, link: "/chats" },
  { label: "Playground", icon: IconPlayerPlay, link: "/play" },
  { label: "Evaluations", icon: IconStethoscope, link: "/evaluations" },
  { label: "Settings", icon: IconSettings, link: "/settings" },
]

function NavbarLink({ icon: Icon, label, link, active }) {
  return (
    <Tooltip label={label} withArrow position="right">
      <Link href={link}>
        <ThemeIcon
          variant={active ? "filled" : "light"}
          color={"blue.4"}
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
    <Navbar height="calc(100vh - 45px)" width={{ base: 80 }} px="md" py="xl">
      <Navbar.Section grow>
        <Stack spacing="xl" align="center">
          {links}
        </Stack>
      </Navbar.Section>

      {profile && (
        <Navbar.Section py="sm">
          <Stack spacing="sm" align="center">
            <Menu
              trigger="hover"
              shadow="md"
              width={200}
              position="top"
              withArrow
            >
              <Menu.Target>
                <ActionIcon>
                  <UserAvatar profile={profile} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown ml="lg">
                <Menu.Label>LLMonitor</Menu.Label>
                <Menu.Item
                  icon={<IconActivity size={16} />}
                  component={Link}
                  target="_blank"
                  href="https://feedback.llmonitor.com/roadmap"
                >
                  Roadmap
                </Menu.Item>

                <Menu.Item
                  icon={<IconRefresh size={16} />}
                  component={Link}
                  target="_blank"
                  href="https://feedback.llmonitor.com/changelog"
                >
                  Changelog
                </Menu.Item>

                <Menu.Item
                  icon={<IconFile size={16} />}
                  component="a"
                  target="_blank"
                  href="https://llmonitor.com/docs"
                >
                  Documentation
                </Menu.Item>

                <Menu.Label>Account</Menu.Label>
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                  <>
                    {profile?.org.plan === "free" && (
                      <Menu.Item
                        onClick={() =>
                          modals.openContextModal({
                            modal: "upgrade",
                            size: 900,
                            innerProps: {},
                          })
                        }
                        color="purple"
                        icon={<IconBolt size={16} />}
                      >
                        Upgrade
                      </Menu.Item>
                    )}

                    <Menu.Item
                      icon={<IconCreditCard size={16} />}
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
                  icon={<IconLogout size={16} />}
                  onClick={() => {
                    supabaseClient.auth.signOut().then(() => {
                      Router.push("/login")
                    })
                  }}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Stack>
        </Navbar.Section>
      )}
    </Navbar>
  )
}
