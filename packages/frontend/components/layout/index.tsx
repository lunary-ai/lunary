import { Box, Flex, Loader } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { ReactNode, useEffect } from "react"

import { useRouter } from "next/router"

import { ProjectContext } from "@/utils/context"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

import { useAuth } from "@/utils/auth"
import { useOrg, useUser } from "@/utils/dataHooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"
import { useColorScheme, useLocalStorage } from "@mantine/hooks"
import analytics from "@/utils/analytics"

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()

  const isAuthPage = !![
    "/login",
    "/signup",
    "/join",
    "/request-password-reset",
    "/reset-password",
  ].find((path) => router.pathname.startsWith(path))

  const isSignupLastStep =
    router.pathname === "/signup" && router.query.step === "3"

  const isMaintenanceMode =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "on" &&
    router.pathname !== "/maintenance"

  const isLLMCallPage = router.pathname.startsWith("/logs/[id]")

  const isPublicPage = isLLMCallPage

  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (isMaintenanceMode) {
      router.push("/maintenance")
      return
    }

    if (isAuthPage && isSignedIn && !isSignupLastStep) {
      router.push("/")
      return
    }

    if (!isAuthPage && !isSignedIn && !isPublicPage) {
      router.push("/login")
      return
    }
  }, [isSignedIn])
  const { user, loading: userLoading } = useUser()

  const { org } = useOrg()

  const isPromptPage = router.pathname.startsWith("/prompt")

  // TODO: use the custom hook
  const [projectId, setProjectId] = useLocalStorage({
    key: "projectId",
    defaultValue: null,
  })
  const colorScheme = useColorScheme()

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.name,
      })
    }
  }, [user])

  if (!isAuthPage && !isPublicPage && (!user || !org)) {
    return (
      <Flex align="center" justify="center" h="100vh">
        <Loader />
      </Flex>
    )
  }

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
                backgroundColor:
                  colorScheme === "light" ? "#fcfcfc" : "inherit",
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
