import { useCurrentApp } from "@/utils/supabaseHooks"
import {
  Anchor,
  Badge,
  Box,
  Card,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useQuery } from "@supabase-cache-helpers/postgrest-swr"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import dynamic from "next/dynamic"

const HorizontalBar = dynamic(() => import("@/components/HorizontalBar"), {
  ssr: false,
})

const ModelTokens = () => {
  const supabaseClient = useSupabaseClient()
  const { app } = useCurrentApp()

  const { data: models, isLoading } = useQuery(
    app
      ? supabaseClient.rpc("get_tokens_by_model", {
          app_id: app.id,
          days: 7,
        })
      : null
  )

  return (
    <Card title="Model usage">
      <Text weight="bold">Models</Text>
      {isLoading && <Text>Loading...</Text>}

      {models && (
        <HorizontalBar
          data={models}
          keys={["completion_tokens", "prompt_tokens"]}
          indexBy={"model"}
        />
      )}
    </Card>
  )
}

export default function Analytics() {
  return (
    <Stack>
      <Title>Analytics</Title>
      <SimpleGrid cols={3} spacing="md">
        <ModelTokens />
        <Card title="Model usage">
          <Text weight="bold">Usage</Text>
          Chart usage over 7 days
        </Card>
        <Card title="Model usage">
          <Text weight="bold">Latency</Text>
          Agent latency over 7 days
        </Card>
      </SimpleGrid>
    </Stack>
  )
}
