import { useCurrentApp } from "@/utils/supabaseHooks"
import { Badge, Card, Loader, Stack, Table, Text, Title } from "@mantine/core"
import { useRouter } from "next/router"

export default function AppAnalytics() {
  const { app } = useCurrentApp()

  return (
    <Stack>
      <Title>Your App</Title>
      <p>App ID for tracking: {app?.id}</p>
    </Stack>
  )
}
