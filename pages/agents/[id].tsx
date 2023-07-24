import SmartViewer from "@/components/SmartViewer"
import JsonViewer from "@/components/SmartViewer/JsonViewer"
import StatusBadge from "@/components/StatusBadge"
import { useRun } from "@/utils/supabaseHooks"
import {
  Badge,
  Card,
  Code,
  Flex,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Spoiler,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core"
import { useQuery } from "@supabase-cache-helpers/postgrest-swr"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { IconClock } from "@tabler/icons-react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

const typeColor = {
  llm: "yellow",
  chain: "blue",
  agent: "violet",
  tool: "grape",
}

const TraceTree = ({ parentId, runs, onSelect, firstDate }) => {
  // each run contains a child_runs array containing the ids of the runs it spawned

  const run = runs.find((run) => run.id === parentId)

  const duration = run?.ended_at
    ? new Date(run?.ended_at).getTime() - new Date(run?.created_at).getTime()
    : NaN

  const timeAfterFirst =
    new Date(run.created_at).getTime() - new Date(firstDate).getTime()

  return (
    <Group>
      <Text>&emsp;</Text>
      <div>
        <Group
          mb="sm"
          onClick={() => onSelect(run.id)}
          style={{ cursor: "pointer" }}
        >
          <StatusBadge minimal status={run.status} />

          <Code color={typeColor[run.type]}>{run.name}</Code>
          <Badge variant="outline" color={typeColor[run.type]}>
            {run.type}
          </Badge>
          {duration && (
            <Badge
              variant="outline"
              color="blue"
              pl={0}
              leftSection={
                <ThemeIcon variant="subtle" size="sm">
                  <IconClock size={12} />
                </ThemeIcon>
              }
              sx={{ textTransform: "none" }}
            >
              {(duration / 1000).toFixed(2)}s
            </Badge>
          )}

          <Text c="dimmed" fz="xs">
            T + {(timeAfterFirst / 1000).toFixed(2)}s
          </Text>
        </Group>

        {runs
          .filter((run) => run.parent_run === parentId)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
          .map((run) => (
            <TraceTree
              parentId={run.id}
              runs={runs}
              onSelect={onSelect}
              firstDate={firstDate}
            />
          ))}
      </div>
    </Group>
  )
}

export default function AgentRun({}) {
  const router = useRouter()
  const { id } = router.query

  const [focused, setFocused] = useState(id)

  const { run } = useRun(id as string)

  const supabaseClient = useSupabaseClient()

  useEffect(() => {
    if (run) {
      setFocused(run.id)
    }
  }, [run])

  const { data: relatedRuns } = useQuery(
    supabaseClient.rpc("get_related_runs", {
      run_id: id,
    })
  )

  const duration = run?.ended_at
    ? new Date(run?.ended_at).getTime() - new Date(run?.created_at).getTime()
    : NaN

  if (!run) return <>Loading...</>

  const focusedRun = relatedRuns?.find((run) => run.id === focused)

  return (
    <Stack>
      <Title order={1}>{run.name}</Title>
      <Group>
        <Badge color={run.status === "success" ? "green" : "red"}>
          {run.status}
        </Badge>
        <Text>
          {`Started at ${new Date(run.created_at).toLocaleString()} ${
            duration ? `and lasted ${(duration / 1000).toFixed(2)}s` : ""
          } `}
        </Text>
      </Group>

      <Grid>
        <Grid.Col span={5}>
          <Card withBorder>
            <Title order={2} mb="md">
              Trace
            </Title>
            {relatedRuns && (
              <TraceTree
                onSelect={setFocused}
                parentId={id}
                runs={relatedRuns}
                firstDate={run.created_at}
              />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={7}>
          <Card withBorder>
            {focusedRun && (
              <Stack>
                <Text>Input</Text>
                <SmartViewer data={focusedRun.input} />
                <Text>Output</Text>
                <SmartViewer
                  data={focusedRun.output}
                  error={focusedRun.error}
                />
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
