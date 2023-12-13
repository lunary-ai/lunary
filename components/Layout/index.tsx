import { useEffect, ReactNode } from "react"
import {
  AppShell,
  Box,
  Center,
  Loader,
  useMantineColorScheme,
} from "@mantine/core"
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
    "/reset-password",
  ].find((path) => router.pathname.startsWith(path))

  const { profile, loading, error } = useProfile()

  const { session, isLoading, supabaseClient } = useSessionContext()

  const isLLMCallPage = router.pathname.startsWith("/llm-calls/[id]")
  const isPublicPage = isLLMCallPage && !session

  const [appId, setAppId] = useLocalStorage({
    key: "appId",
    defaultValue: null,
  })

  const colorScheme = useColorScheme()

  useEffect(() => {
    if (isAuthPage || isPublicPage || session || isLoading) return

    if (!profile && !loading && error) {
      // If the profile failed to load, force sign out and redirect to login
      supabaseClient.auth.signOut().then(() => {
        Router.push("/login")
      })
    } else {
      Router.push("/login")
    }
  }, [
    session,
    isLoading,
    router.pathname,
    profile,
    loading,
    error,
    isAuthPage,
    supabaseClient,
    isPublicPage,
  ])

  if (!isAuthPage && ((!profile && loading) || (!session && isLoading))) {
    return (
      <Center h="100vh" w="100vw">
        <Loader />
      </Center>
    )
  }

  if (!session && !isAuthPage && !isPublicPage) return null
  return (
    <>
      <Notifications position="top-right" />
      <ModalsProvider modals={{ upgrade: UpgradeModal }}>
        <AppContext.Provider value={{ appId, setAppId }}>
          <AppShell
            mih={"100vh"}
            header={{ height: 60 }}
            navbar={{
              width: 80,
              breakpoint: "0",
              collapsed: { mobile: isAuthPage, desktop: isAuthPage },
            }}
            className={profile?.org.limited ? "limited" : ""}
            style={{
              backgroundColor: colorScheme === "dark" ? "#181818" : "#fafafa",
              color: colorScheme === "dark" ? "#eee" : "#333",
            }}
          >
            <ErrorBoundary
              onAfterReportDialogSubmitHandler={() => Router.reload()}
              onAfterReportDialogCancelHandler={() => Router.reload()}
            >
              {!isAuthPage && !isPublicPage && <Navbar />}
              {!isAuthPage && !isPublicPage && <Sidebar />}
              <AppShell.Main>
                <Box p="24">{children}</Box>
              </AppShell.Main>
            </ErrorBoundary>
          </AppShell>
        </AppContext.Provider>
      </ModalsProvider>
    </>
  )
}
