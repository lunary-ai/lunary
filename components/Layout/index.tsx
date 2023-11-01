import { useEffect, ReactNode } from "react"
import { AppShell } from "@mantine/core"
import { Notifications } from "@mantine/notifications"

import { useSessionContext } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"

import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import { AppContext } from "@/utils/context"

import { useLocalStorage } from "@mantine/hooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"
import { useTeam } from "@/utils/dataHooks"

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const isAuthPage = [
    "/login",
    "/signup",
    "/join",
    "/magic-login",
    "/request-password-reset",
    "/update-password",
  ].includes(router.pathname)

  const { team } = useTeam()

  const { session, isLoading } = useSessionContext()

  const [appId, setAppId] = useLocalStorage({
    key: "appId",
    defaultValue: null,
  })

  useEffect(() => {
    if (!session && !isLoading && !isAuthPage) {
      Router.push("/login")
    }
  }, [session, isLoading, router.pathname])

  if (!session && !isAuthPage) return null

  return (
    <>
      <Notifications position="top-right" />
      <ModalsProvider modals={{ upgrade: UpgradeModal }}>
        <AppContext.Provider value={{ appId, setAppId }}>
          <AppShell
            mih={"100vh"}
            padding={"xl"}
            className={team && team.limited ? "limited" : ""}
            header={!isAuthPage && <Navbar />}
            navbar={!isAuthPage && appId && <Sidebar />}
            sx={{ backgroundColor: "#fafafa" }}
          >
            {children}
          </AppShell>
        </AppContext.Provider>
      </ModalsProvider>
    </>
  )
}
