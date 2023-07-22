import { useRun } from "@/utils/supabaseHooks"
import { Badge, Select, Spoiler, Stack, Title } from "@mantine/core"
import { useRouter } from "next/router"

export default function AgentRun({}) {
  const router = useRouter()
  const { id } = router.query

  const { run } = useRun(id as string)

  return (
    <div>
      <Title order={1}>Agent Run</Title>
    </div>
  )
}
