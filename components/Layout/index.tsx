import { Box, Flex } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { ReactNode, useEffect } from "react"

import { useSessionContext } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"

import { AppContext } from "@/utils/context"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

import { useTeam } from "@/utils/supabaseHooks"
import { useLocalStorage } from "@mantine/hooks"
import { ModalsProvider } from "@mantine/modals"
import UpgradeModal from "./UpgradeModal"

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
          <Flex
            direction="column"
            sx={{ height: "100vh", backgroundColor: "#fafafa" }}
            className={team?.limited ? "limited" : ""}
          >
            {!isAuthPage && <Navbar />}

            <Flex sx={{ flex: 1, overflow: "hidden" }}>
              {!isAuthPage && <Sidebar />}
              <Box p="20px" w="100%" sx={{ overflowY: "auto" }}>
                {children}
              </Box>
            </Flex>
          </Flex>
        </AppContext.Provider>
      </ModalsProvider>
    </>
  )
}
