import {
  Navbar,
  ActionIcon,
  Stack,
  Tooltip,
  ThemeIcon,
  Menu,
} from "@mantine/core"

import {
  IconBrandOpenai,
  IconFileInvoice,
  IconGraph,
  IconLogout,
  IconRobot,
  IconSettings,
  IconStethoscope,
  IconUsers,
} from "@tabler/icons-react"

import { useSessionContext, useUser } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"
import { useProfile } from "@/utils/supabaseHooks"
import UserAvatar from "@/components/Blocks/UserAvatar"
import Link from "next/link"
import { useContext } from "react"
import { AppContext } from "@/utils/context"

const menu = [
  { label: "Analytics", icon: IconGraph, link: "/analytics" },
  { label: "Traces", icon: IconRobot, link: "/agents" },
  { label: "Generations", icon: IconBrandOpenai, link: "/generations" },
  { label: "Tests", icon: IconStethoscope, link: "/tests" },
  { label: "Users", icon: IconUsers, link: "/users" },
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
          <Icon size="1.1rem" />
        </ThemeIcon>
      </Link>
    </Tooltip>
  )
}

export default function Sidebar() {
  const router = useRouter()

  const { supabaseClient } = useSessionContext()

  const { profile } = useProfile()

  const { app } = useContext(AppContext)

  const isActive = (link: string) => router.pathname === link

  const links = menu.map((item) => (
    <NavbarLink {...item} active={isActive(item.link)} key={item.label} />
  ))

  return (
    <Navbar height="calc(100vh - 45px)" width={{ base: 80 }} px="md" py="xl">
      <Navbar.Section grow>
        {app && (
          <Stack spacing="xl" align="center">
            {links}
          </Stack>
        )}
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
                <Menu.Label>Account</Menu.Label>
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                  <Menu.Item
                    icon={<IconFileInvoice size={16} />}
                    onClick={() => {
                      Router.push("/billing")
                    }}
                  >
                    Billing
                  </Menu.Item>
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
