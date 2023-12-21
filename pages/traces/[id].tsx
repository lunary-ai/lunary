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
  ThemeIcon,
  Title,
} from "@mantine/core"

import DurationBadge from "@/components/Blocks/DurationBadge"
import TokensBadge from "@/components/Blocks/TokensBadge"
import StatusBadge from "@/components/Blocks/StatusBadge"

import { useRelatedRuns, useRun } from "@/utils/dataHooks"
import { capitalize, formatCost } from "@/utils/format"
import RunInputOutput from "@/components/Blocks/RunInputOutput"
import { getColorForRunType } from "../../utils/colors"
import {
  IconCode,
  IconMessage,
  IconMessages,
  IconRobot,
  IconTool,
} from "@tabler/icons-react"
import RunsChat from "@/components/Blocks/RunChat"

const typeIcon = {
  convo: IconMessages,
  thread: IconMessages,
  chat: IconMessage,
  agent: IconRobot,
  llm: IconCode,
  tool: IconTool,
}

const TraceTree = ({
  isFirst,
  focused,
  parentId,
  runs,
  onSelect,
  firstDate,
}) => {
  // each run contains a child_runs array containing the ids of the runs it spawned

  const run = runs.find((run) => run.id === parentId)

  const timeAfterFirst =
    new Date(run.created_at).getTime() - new Date(firstDate).getTime()

  const color = getColorForRunType(run?.type)

  const showStatus = !["convo", "thread", "chat"].includes(run?.type)

  const Icon = typeIcon[run?.type]

  const isActive = run.id === focused

  return (
    <Group>
      {!isFirst && <Text>&emsp;</Text>}
      <div>
        <Group
          mb="sm"
          onClick={() => onSelect(run.id)}
          style={{ cursor: "pointer" }}
        >
          {showStatus && <StatusBadge minimal status={run.status} />}

          <Badge
            variant={isActive ? "filled" : "outline"}
            color={color}
            pl={0}
            pr={5}
            leftSection={
              Icon && (
                <ThemeIcon variant="subtle" color={color} size="sm" radius="lg">
                  <Icon strokeWidth={2} size={13} />
                </ThemeIcon>
              )
            }
          >
            {run?.type}
          </Badge>

          {run.name && (
            <Code color={`var(--mantine-color-${color}-light)`}>
              {run.name}
            </Code>
          )}

          {run.ended_at && (
            <DurationBadge createdAt={run.created_at} endedAt={run.ended_at} />
          )}

          {run?.type === "llm" && run.cost && (
            <Badge variant="outline" color="gray">
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
              new Date(b.created_at).getTime(),
          )
          .map((run) => (
            <TraceTree
              key={run.id}
              parentId={run.id}
              focused={focused}
              runs={runs}
              onSelect={onSelect}
              firstDate={firstDate}
            />
          ))}
      </div>
    </Group>
  )
}

const RenderRun = ({ run, relatedRuns }) => {
  const directChilds = relatedRuns
    ?.filter((r) => r.parent_run === run.id)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

  if (run?.type === "chat") return <RunsChat runs={[run]} />
  if (run?.type === "thread") return <RunsChat runs={directChilds} />
  return <RunInputOutput initialRun={run} />
}

export default function AgentRun({}) {
  const router = useRouter()
  const { id } = router.query

  const [focused, setFocused] = useState(id)

  const { run } = useRun(id as string)

  useEffect(() => {
    if (run) setFocused(run.id)
  }, [run])

  const { relatedRuns } = useRelatedRuns(id as string)

  if (!run) return <>Loading...</>

  const totalTokens = relatedRuns?.reduce((acc, run) => {
    if (run?.type === "llm") {
      return acc + run.completion_tokens + run.prompt_tokens
    }
    return acc
  }, 0)

  const totalCost = relatedRuns?.reduce((acc, run) => {
    if (run?.type === "llm") {
      return acc + run.cost
    }
    return acc
  }, 0)

  const focusedRun = relatedRuns?.find((run) => run.id === focused)

  return (
    <Stack>
      <Title order={1}>
        {capitalize(run?.type)} Trace {run.name ? `(${run.name})` : ""}
      </Title>
      <Group>
        {run.status && <StatusBadge status={run.status} />}
        <Text>{`Started at ${new Date(run.created_at).toLocaleString()}`}</Text>
        <TokensBadge tokens={totalTokens} />
        {totalCost && (
          <Badge variant="outline" color="gray">
            {formatCost(totalCost)}
          </Badge>
        )}
        {run.ended_at && (
          <DurationBadge createdAt={run.created_at} endedAt={run.ended_at} />
        )}
      </Group>

      <Grid align="start">
        <Grid.Col span={6}>
          <Card withBorder>
            <Title order={2} mb="md">
              Trace
            </Title>

            {relatedRuns && (
              <TraceTree
                isFirst
                focused={focused}
                onSelect={setFocused}
                parentId={id}
                runs={relatedRuns}
                firstDate={run.created_at}
              />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card
            withBorder
            style={{
              position: "sticky",
              top: 85,
              maxHeight: "calc(100vh - 90px)",
              overflow: "auto",
            }}
          >
            <RenderRun run={focusedRun} relatedRuns={relatedRuns} />
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
