import { useEffect, useState } from "react"
import { useRouter } from "next/router"

import {
  Badge,
  Card,
  Code,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core"

import DurationBadge from "@/components/Blocks/DurationBadge"
import TokensBadge from "@/components/Blocks/TokensBadge"
import SmartViewer from "@/components/Blocks/SmartViewer"
import StatusBadge from "@/components/Blocks/StatusBadge"

import { useRelatedRuns, useRun } from "@/utils/dataHooks"
import { capitalize, formatCost } from "@/utils/format"

const typeColor = {
  llm: "yellow",
  chain: "blue",
  agent: "violet",
  tool: "grape",
}

const TraceTree = ({ parentId, runs, onSelect, firstDate }) => {
  // each run contains a child_runs array containing the ids of the runs it spawned

  const run = runs.find((run) => run.id === parentId)

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

          {run.name && <Code color={typeColor[run.type]}>{run.name}</Code>}
          <Badge variant="outline" color={typeColor[run.type]}>
            {run.type}
          </Badge>
          {run.ended_at && (
            <DurationBadge createdAt={run.created_at} endedAt={run.ended_at} />
          )}
          {run.type === "llm" && run.cost && (
            <Badge variant="outline" color="dark">
              {formatCost(run.cost)}
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

  useEffect(() => {
    if (run) {
      setFocused(run.id)
    }
  }, [run])

  const { relatedRuns } = useRelatedRuns(id as string)

  if (!run) return <>Loading...</>

  const totalTokens = relatedRuns?.reduce((acc, run) => {
    if (run.type === "llm") {
      return acc + run.completion_tokens + run.prompt_tokens
    }
    return acc
  }, 0)

  const totalCost = relatedRuns?.reduce((acc, run) => {
    if (run.type === "llm") {
      return acc + run.cost
    }
    return acc
  }, 0)

  const focusedRun = relatedRuns?.find((run) => run.id === focused)

  return (
    <Stack>
      <Title order={1}>
        {capitalize(run.type)} Trace {run.name ? `(${run.name})` : ""}
      </Title>
      <Group>
        <StatusBadge status={run.status} />
        <Text>{`Started at ${new Date(run.created_at).toLocaleString()}`}</Text>
        <TokensBadge tokens={totalTokens} />
        {totalCost && (
          <Badge variant="outline" color="dark">
            {formatCost(totalCost)}
          </Badge>
        )}
        {run.ended_at && (
          <DurationBadge createdAt={run.created_at} endedAt={run.ended_at} />
        )}
      </Group>

      <Grid>
        <Grid.Col span={6}>
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
        <Grid.Col span={6}>
          <Card withBorder>
            {focusedRun && (
              <Stack>
                <Group>
                  <Text weight="bold">Input</Text>
                  {focusedRun.type === "llm" && (
                    <TokensBadge tokens={focusedRun.prompt_tokens} />
                  )}
                </Group>
                <SmartViewer data={focusedRun.input} />
                {(focusedRun.output || focusedRun.error) && (
                  <>
                    <Group>
                      <Text weight="bold">Output</Text>
                      {focusedRun.type === "llm" && (
                        <TokensBadge tokens={focusedRun.completion_tokens} />
                      )}
                    </Group>
                    <SmartViewer
                      data={focusedRun.output}
                      error={focusedRun.error}
                    />
                  </>
                )}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
