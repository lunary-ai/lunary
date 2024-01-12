import { AppShell, Box, Center, Loader } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { ReactNode, useEffect } from "react"

import Router, { useRouter } from "next/router"

import { ProjectContext } from "@/utils/context"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

import { useOrg, useUser } from "@/utils/dataHooks"
import { useColorScheme, useLocalStorage } from "@mantine/hooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"
import SessionReact, {
  useSessionContext,
} from "supertokens-auth-react/recipe/session"
import SuperTokensReact from "supertokens-auth-react"
import { signOut } from "@/utils/auth"

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

  const { user, loading: userLoading, error } = useUser()
  const { org } = useOrg()

  const session = useSessionContext()

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

    if (
      isAuthPage ||
      isPublicPage ||
      session.loading ||
      session.doesSessionExist
    )
      return

    Router.push("/login")
    if (!user && !userLoading && error) {
      signOut()
    } else {
      Router.push("/login")
    }
  }, [
    session,
    router.pathname,
    user,
    userLoading,
    error,
    isAuthPage,
    isPublicPage,
  ])

  if (!isAuthPage && ((!user && userLoading) || session.loading)) {
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
