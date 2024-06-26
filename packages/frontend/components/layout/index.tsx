import { Box, Flex, Loader, useComputedColorScheme } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { ReactNode, useEffect } from "react"

import { useRouter } from "next/router"

import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

import analytics from "@/utils/analytics"
import { useAuth } from "@/utils/auth"
import { useOrg, useProject, useUser } from "@/utils/dataHooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user } = useUser()
  const { org } = useOrg()

  const colorScheme = useComputedColorScheme()
  const { isSignedIn } = useAuth()

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

  const isPromptPage = router.pathname.startsWith("/prompt")

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.name,
      })
    }
  }, [user])

  useEffect(() => {
    const handleRouteChangeStart = (url, { shallow }) => {
      console.log(
        `App is changing to: ${url}, Event: routeChangeStart, Shallow: ${shallow}`,
      )
    }

    const handleRouteChangeComplete = (url, { shallow }) => {
      console.log(
        `App changed to: ${url}, Event: routeChangeComplete, Shallow: ${shallow}`,
      )
    }

    const handleRouteChangeError = (err, url, { shallow }) => {
      console.warn(
        `App encountered an error while changing to: ${url}, Event: routeChangeError, Shallow: ${shallow}, Error: ${err}, Cancelled: ${err.cancelled}`,
      )
    }

    const handleBeforeHistoryChange = (url, { shallow }) => {
      console.log(
        `App is about to change the browser's history to: ${url}, Event: beforeHistoryChange, Shallow: ${shallow}`,
      )
    }

    const handleHashChangeStart = (url, { shallow }) => {
      console.log(
        `App hash is changing to: ${url}, Event: hashChangeStart, Shallow: ${shallow}`,
      )
    }

    const handleHashChangeComplete = (url, { shallow }) => {
      console.log(
        `App hash changed to: ${url}, Event: hashChangeComplete, Shallow: ${shallow}`,
      )
    }

    router.events.on("routeChangeStart", handleRouteChangeStart)
    router.events.on("routeChangeComplete", handleRouteChangeComplete)
    router.events.on("routeChangeError", handleRouteChangeError)
    router.events.on("beforeHistoryChange", handleBeforeHistoryChange)
    router.events.on("hashChangeStart", handleHashChangeStart)
    router.events.on("hashChangeComplete", handleHashChangeComplete)

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart)
      router.events.off("routeChangeComplete", handleRouteChangeComplete)
      router.events.off("routeChangeError", handleRouteChangeError)
      router.events.off("beforeHistoryChange", handleBeforeHistoryChange)
      router.events.off("hashChangeStart", handleHashChangeStart)
      router.events.off("hashChangeComplete", handleHashChangeComplete)
    }
  }, [router])

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
              backgroundColor: colorScheme === "light" ? "#fcfcfc" : "inherit",
            }}
          >
            {!isAuthPage && !isPublicPage && <Navbar />}
            {children}
          </Box>
        </Flex>
      </ModalsProvider>
    </>
  )
}
