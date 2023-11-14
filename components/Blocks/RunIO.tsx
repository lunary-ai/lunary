import {
  Badge,
  Button,
  Card,
  CopyButton,
  Group,
  Stack,
  Text,
} from "@mantine/core"
import SmartViewer from "./SmartViewer"
import TokensBadge from "./TokensBadge"
import { IconCheck, IconCopy, IconPencilShare } from "@tabler/icons-react"
import Link from "next/link"

const isChatMessages = (obj) => {
  return Array.isArray(obj)
    ? obj.every((m) => typeof m.text === "string" && typeof m.role === "string")
    : typeof obj.text === "string" && typeof obj.role === "string"
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
          <Badge variant="outline" style={{ textTransform: "none" }}>
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

export default function RunInputOutput({ run }) {
  const canEnablePlayground =
    run.type === "llm" && run.input && isChatMessages(run.input)

  return (
    <Stack>
      {run.type === "llm" && (
        <>
          <CopyButton
            value={`https://app.llmonitor.com/play/${run.id}`}
            timeout={2000}
          >
            {({ copied, copy }) => (
              <Button
                ml="auto"
                variant="link"
                size="xs"
                mb={-12}
                color={copied ? "teal" : "gray"}
                onClick={copy}
                leftIcon={
                  copied ? <IconCheck size="16px" /> : <IconCopy size="16px" />
                }
              >
                Copy link
              </Button>
            )}
          </CopyButton>
          <Card withBorder>
            <Group position="apart" align="start">
              <Stack spacing="xs">
                <ParamItem name="Model" value={run.name} />

                {Object.entries(PARAMS).map(
                  ([key, name]) =>
                    typeof run.params?.[key] !== "undefined" && (
                      <ParamItem name={name} value={run.params?.[key]} />
                    ),
                )}
              </Stack>

              {canEnablePlayground && (
                <Stack>
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
                </Stack>
              )}
            </Group>
          </Card>
        </>
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
