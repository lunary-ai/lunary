import { Container, AppShell } from "@mantine/core"

import { IconDashboard, IconHome, IconSearch } from "@tabler/icons-react"

import { useSessionContext, useUser } from "@supabase/auth-helpers-react"

import Router, { useRouter } from "next/router"
import { useEffect, useState, ReactNode } from "react"
import Navbar from "@/components/Navbar"

import { Notifications } from "@mantine/notifications"

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()

  const { session, isLoading } = useSessionContext()

  useEffect(() => {
    if (
      !session &&
      !isLoading &&
      !["/login", "/signup"].includes(router.pathname)
    ) {
      Router.push("/login")
    }
  }, [session, isLoading, router.pathname])

  return (
    <>
      <Notifications position="top-right" />

      <AppShell header={<Navbar />} sx={{ backgroundColor: "#fafafa" }}>
        <Container size={800}>{children}</Container>
      </AppShell>
    </>
  )
}
