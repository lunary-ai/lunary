import { AppShell, Box, Center, Flex, Loader } from "@mantine/core"
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
import { useSessionContext } from "supertokens-auth-react/recipe/session"
import { signOut } from "@/utils/auth"
import analytics from "@/utils/analytics"

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

  const [projectId, setProjectId] = useLocalStorage({
    key: "projectId",
    defaultValue: null,
  })

  const colorScheme = useColorScheme()

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "on" &&
      router.pathname !== "/maintenance"
    ) {
      Router.replace("/maintenance")
    }

    if (
      isAuthPage ||
      isPublicPage ||
      session.loading ||
      session.doesSessionExist
    )
      return

    if (!user && !userLoading && error) {
      signOut()
    } else if (!user && !userLoading) {
      Router.push("/login")
      return
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

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.name,
      })
    }
  }, [user])

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
        <ProjectContext.Provider value={{ projectId, setProjectId }}>
          <Flex
            h={"100vh"}
            className={org?.limited ? "limited" : ""}
            style={{
              backgroundColor: "var(--mantine-color-body)",
              color: colorScheme === "dark" ? "#eee" : "#333",
            }}
          >
            {!isAuthPage && !isPublicPage && <Sidebar />}

            <Box
              p={isPromptPage ? 0 : 24}
              pos="relative"
              flex={1}
              style={{
                overflowY: "auto",
              }}
            >
              {!isAuthPage && !isPublicPage && <Navbar />}
              {children}
            </Box>
          </Flex>
        </ProjectContext.Provider>
      </ModalsProvider>
    </>
  )
}
