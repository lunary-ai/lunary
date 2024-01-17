import {
  Badge,
  Button,
  Card,
  Flex,
  Group,
  Stack,
  Switch,
  Text,
} from "@mantine/core"
import { IconPencilShare } from "@tabler/icons-react"
import Link from "next/link"
import SmartViewer from "../SmartViewer"
import TokensBadge from "./TokensBadge"
import { useRun } from "@/utils/dataHooks"
import { notifications } from "@mantine/notifications"

const isChatMessages = (obj) => {
  return Array.isArray(obj)
    ? obj.every(isChatMessages)
    : (typeof obj.text === "string" && typeof obj.role === "string") ||
        typeof obj.content === "string"
}

// This is the component that renders the input and output of a run
// It also allow redirecting to the playground or sharing the run

const ParamItem = ({ name, value }) => (
  <Group>
    <Text size="sm">{name}: </Text>
    <Text size="sm">
      {typeof value === "string" || typeof value === "number" ? (
        <Badge variant="outline" style={{ textTransform: "none" }}>
          {value}
        </Badge>
      ) : Array.isArray(value) ? (
        value.map((v) => (
          <Badge
            key={JSON.stringify(v)}
            variant="outline"
            style={{ textTransform: "none" }}
          >
            {v}
          </Badge>
        ))
      ) : (
        JSON.stringify(value)
      )}
    </Text>
  </Group>
)

const PARAMS = {
  temperature: "Temperature",
  max_tokens: "Max tokens",
  top_p: "Top P",
  top_k: "Top K",
  logit_bias: "Logit bias",
  presence_penalty: "Presence penalty",
  frequency_penalty: "Frequency penalty",
  stop: "Stop",
  seed: "Seed",
}

export default function RunInputOutput({
  initialRun,
  withPlayground = true,
  withShare = false,
}) {
  const { run, update } = useRun(initialRun?.id, initialRun)

  const canEnablePlayground =
    withPlayground &&
    run?.type === "llm" &&
    run?.input &&
    isChatMessages(run?.input)

  return (
    <Stack>
      {run?.type === "llm" && (
        <>
          {withShare && (
            <Flex justify="right">
              <Switch
                label="Make public"
                checked={run.isPublic}
                color={run.isPublic ? "red" : "blue"}
                onChange={async (e) => {
                  const checked = e.currentTarget.checked as boolean
                  update({ ...run, isPublic: checked })
                  if (checked) {
                    const url = `${window.location.origin}/logs/${run.id}`
                    await navigator.clipboard.writeText(url)

                    notifications.show({
                      title: "Run is now public",
                      message: "Link copied to clipboard",
                    })
                  }
                }}
              />
            </Flex>
          )}

          <Card withBorder radius="md">
            <Group justify="space-between" align="start">
              <Stack gap="xs">
                <ParamItem name="Model" value={run.name} />

                {Object.entries(PARAMS).map(
                  ([key, name]) =>
                    typeof run.params?.[key] !== "undefined" && (
                      <ParamItem
                        key={name}
                        name={name}
                        value={run.params?.[key]}
                      />
                    ),
                )}

                {run.tags?.length > 0 && (
                  <ParamItem name="Tags" value={run.tags} />
                )}
              </Stack>

              {canEnablePlayground && (
                <Stack>
                  <Button
                    variant="outline"
                    size="xs"
                    w="fit-content"
                    display="inline"
                    rightSection={<IconPencilShare size="14" />}
                    component={Link}
                    href={`/prompts/${
                      run.templateVersionId || `?clone=` + run.id
                    }`}
                  >
                    {run.templateVersionId
                      ? "Open template"
                      : "Open in playground"}
                  </Button>
                </Stack>
              )}
            </Group>
          </Card>
        </>
      )}

      <Group justify="space-between">
        <Text fw="bold" size="sm">
          Input
        </Text>
        {run?.tokens?.prompt && <TokensBadge tokens={run.tokens?.prompt} />}
      </Group>

      <SmartViewer data={run?.input} />

      {(run?.output || run?.error) && (
        <>
          <Group justify="space-between">
            <Text fw="bold" size="sm">
              {run.error ? "Error" : "Output"}
            </Text>
            {run.tokens?.completion && (
              <TokensBadge tokens={run.tokens?.completion} />
            )}
          </Group>
          <SmartViewer data={run.output} error={run.error} />
        </>
      )}
    </Stack>
  )
}
