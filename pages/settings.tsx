import CopyText from "@/components/CopyText"
import { useCurrentApp } from "@/utils/supabaseHooks"
import { Stack, Text, Title } from "@mantine/core"

export default function AppAnalytics() {
  const { app } = useCurrentApp()

  return (
    <Stack>
      <Title>{app?.name}</Title>
      <Text>
        App ID for tracking: <CopyText value={app?.id} />
      </Text>
    </Stack>
  )
}
