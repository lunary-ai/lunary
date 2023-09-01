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

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()

  const { session, isLoading } = useSessionContext()

  const [app, setApp] = useLocalStorage({
    key: "app",
    defaultValue: null,
  })

  const isAuthPage = ["/login", "/signup"].includes(router.pathname)

  useEffect(() => {
    if (!session && !isLoading && !isAuthPage) {
      Router.push("/login")
    }
  }, [session, isLoading, router.pathname])

  return (
    <>
      <Notifications position="top-right" />
      <ModalsProvider modals={{ upgrade: UpgradeModal }}>
        <AppContext.Provider value={{ app, setApp }}>
          <AppShell
            padding={"xl"}
            header={!isAuthPage && <Navbar />}
            navbar={session && <Sidebar />}
            sx={{ backgroundColor: "#fafafa" }}
          >
            {children}
          </AppShell>
        </AppContext.Provider>
      </ModalsProvider>
    </>
  )
}
