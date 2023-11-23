import { useEffect, ReactNode } from "react"
import { AppShell, Center, Loader, useMantineColorScheme } from "@mantine/core"
import { Notifications } from "@mantine/notifications"

import { useSessionContext } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"

import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import { AppContext } from "@/utils/context"

import { useColorScheme, useLocalStorage } from "@mantine/hooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"
import { useProfile } from "../../utils/dataHooks"
import { ErrorBoundary } from "@highlight-run/next/client"

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

  const { profile, loading, error } = useProfile()

  const { session, isLoading, supabaseClient } = useSessionContext()

  const [appId, setAppId] = useLocalStorage({
    key: "appId",
    defaultValue: null,
  })

  const colorScheme = useColorScheme()

  useEffect(() => {
    if (!session && !isLoading && !isAuthPage) {
      Router.push("/login")
    } else if (session && !profile && !loading && error && !isAuthPage) {
      // If the profile failed to load, force sign out and redirect to login
      supabaseClient.auth.signOut().then(() => {
        Router.push("/login")
      })
    }
  }, [session, isLoading, router.pathname, profile, loading, error])

  if (!session && !isAuthPage) return null

  if ((!profile && loading) || (!session && isLoading)) {
    return (
      <Center h="100vh" w="100vw">
        <Loader />
      </Center>
    )
  }

  return (
    <>
      <Notifications position="top-right" />
      <ModalsProvider modals={{ upgrade: UpgradeModal }}>
        <AppContext.Provider value={{ appId, setAppId }}>
          <AppShell
            mih={"100vh"}
            padding={"xl"}
            className={profile?.org.limited ? "limited" : ""}
            header={!isAuthPage && <Navbar />}
            navbar={!isAuthPage && appId && <Sidebar />}
            sx={{
              backgroundColor: colorScheme === "dark" ? "#181818" : "#fafafa",
              color: colorScheme === "dark" ? "#eee" : "#333",
            }}
          >
            <ErrorBoundary
              onAfterReportDialogSubmitHandler={() => Router.reload()}
              onAfterReportDialogCancelHandler={() => Router.reload()}
            >
              {children}
            </ErrorBoundary>
          </AppShell>
        </AppContext.Provider>
      </ModalsProvider>
    </>
  )
}
