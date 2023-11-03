import { Button, Group, Stack, Text, Tooltip } from "@mantine/core"
import SmartViewer from "./SmartViewer"
import TokensBadge from "./TokensBadge"
import { IconInfoCircle, IconPencilShare, IconShare } from "@tabler/icons-react"
import Link from "next/link"

const isChatMessages = (obj) => {
  return Array.isArray(obj)
    ? obj.every((m) => typeof m.text === "string" && typeof m.role === "string")
    : false
}

// This is the component that renders the input and output of a run
// It also allow redirecting to the playground or sharing the run

const ParamItem = ({ name, value }) => (
  <Group>
    <Text size="sm">{name}: </Text>
    {typeof value === "string" || typeof value === "number" ? (
      <Text size="sm">{value}</Text>
    ) : (
      value
    )}
  </Group>
)

export default function RunInputOutput({ run }) {
  const canEnablePlayground =
    run.type === "llm" && run.input && isChatMessages(run.input)

  return (
    <Stack>
      {run.type === "llm" && (
        <Group position="apart" align="start">
          <Stack>
            <ParamItem name="Model" value={run.name} />

            {typeof run.params?.temperature !== "undefined" && (
              <ParamItem name="Temperature" value={run.params?.temperature} />
            )}

            {typeof run.params?.max_tokens !== "undefined" && (
              <ParamItem name="Max tokens" value={run.params?.max_tokens} />
            )}
          </Stack>

          {canEnablePlayground && (
            <Button
              variant="outline"
              size="xs"
              w="fit-content"
              display="inline"
              rightIcon={<IconPencilShare size={14} />}
              component={Link}
              href={`/play/${run.id}`}
            >
              Open in playground
            </Button>
          )}
        </Group>
      )}

      <Group position="apart">
        <Text weight="bold" size="sm">
          Input
        </Text>
        {run.prompt_tokens && <TokensBadge tokens={run.prompt_tokens} />}
      </Group>

      <SmartViewer data={run.input} />

      {(run.input || run.error) && (
        <>
          <Group position="apart">
            <Text weight="bold" size="sm">
              {run.error ? "Error" : "Output"}
            </Text>
            {run.completion_tokens && (
              <TokensBadge tokens={run.completion_tokens} />
            )}
          </Group>
          <SmartViewer data={run.output} error={run.error} />
        </>
      )}
    </Stack>
  )
}
