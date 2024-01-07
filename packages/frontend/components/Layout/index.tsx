import { AppShell, Box, Center, Loader } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { ReactNode, useEffect } from "react"

import { useSessionContext } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"

import { ProjectContext } from "@/utils/context"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

import { useOrg, useUser } from "@/utils/dataHooks"
import { ErrorBoundary } from "@highlight-run/next/client"
import { useColorScheme, useLocalStorage } from "@mantine/hooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const isAuthPage = !![
    "/login",
    "/signup",
    "/join",
    "/magic-login",
    "/request-password-reset",
    "/update-password",
    "/reset-password",
    "/maintenance",
  ].find((path) => router.pathname.startsWith(path))

  const { user, isLoading: loading, error } = useUser()
  const { org } = useOrg()

  const {
    session,
    isLoading: isSupaLoading,
    supabaseClient,
  } = useSessionContext()

  const isPromptPage = router.pathname.startsWith("/prompt")

  const isLLMCallPage = router.pathname.startsWith("/logs/[id]")
  const isPublicPage = isLLMCallPage && !session

  const [appId, setAppId] = useLocalStorage({
    key: "appId",
    defaultValue: null,
  })

  const colorScheme = useColorScheme()

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "on" &&
      router.pathname !== "/maintenance"
    ) {
      Router.push("/maintenance")
    }

    if (isAuthPage || isPublicPage || session || isSupaLoading) return

    if (!user && !loading && error) {
      // If the profile failed to load, force sign out and redirect to login
      supabaseClient.auth.signOut().then(() => {
        Router.push("/login")
      })
    } else {
      Router.push("/login")
    }
  }, [
    session,
    isSupaLoading,
    router.pathname,
    user,
    loading,
    error,
    isAuthPage,
    supabaseClient,
    isPublicPage,
  ])

  if (!isAuthPage && ((!user && loading) || (!session && isSupaLoading))) {
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
        <ProjectContext.Provider
          value={{ projectId: appId, setProjectId: setAppId }}
        >
          <AppShell
            mih={"100vh"}
            header={{ height: 60 }}
            navbar={{
              width: 80,
              breakpoint: "0",
              collapsed: { mobile: isAuthPage, desktop: isAuthPage },
            }}
            className={org?.limited ? "limited" : ""}
            style={{
              backgroundColor: colorScheme === "dark" ? "#181818" : "#fafafa",
              color: colorScheme === "dark" ? "#eee" : "#333",
            }}
          >
            {!isAuthPage && !isPublicPage && <Navbar />}
            {!isAuthPage && !isPublicPage && <Sidebar />}
            <AppShell.Main>
              <Box p={isPromptPage ? 0 : 24}>{children}</Box>
            </AppShell.Main>
          </AppShell>
        </ProjectContext.Provider>
      </ModalsProvider>
    </>
  )
}
