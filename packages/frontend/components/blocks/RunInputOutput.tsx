import { useRun, useUser } from "@/utils/dataHooks"
import {
  Badge,
  Button,
  Card,
  Group,
  HoverCard,
  ScrollArea,
  Stack,
  Switch,
  Text,
} from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconPencilShare } from "@tabler/icons-react"
import Link from "next/link"
import { hasAccess } from "shared"
import SmartViewer from "../SmartViewer"
import CopyText, { SuperCopyButton } from "./CopyText"
import ErrorBoundary from "./ErrorBoundary"
import TokensBadge from "./TokensBadge"

const isChatMessages = (obj) => {
  return Array.isArray(obj)
    ? obj.every(isChatMessages)
    : (typeof obj.text === "string" && typeof obj.role === "string") ||
        typeof obj.content === "string"
}

// This is the component that renders the input and output of a run
// It also allow redirecting to the playground or sharing the run

const ParamItem = ({
  name,
  value,
  render,
  color = "blue",
}: {
  name: string
  value: any
  render?: (value: any) => React.ReactNode
  color?: string
}) => {
  return (
    <Group>
      <Text size="sm">{name}: </Text>
      {render ? (
        render(value)
      ) : (
        <Text size="sm">
          {typeof value === "string" || typeof value === "number" ? (
            <Badge variant="outline" tt="none" color={color}>
              {value}
            </Badge>
          ) : Array.isArray(value) ? (
            value.map((v, i) => (
              <Badge key={i} variant="outline" tt="none">
                {v}
              </Badge>
            ))
          ) : (
            JSON.stringify(value)
          )}
        </Text>
      )}
    </Group>
  )
}

// tools format: [
//   {
//     "type": "function",
//     "function": {
//       "name": "translate",
//       "description": "Translate a text from one language to another",
//       "parameters": {
//         "type": "object",
//         "properties": {
//           "to": {
//             "type": "string"
//           },
//           "from": {
//             "type": "string"
//           },
//           "text": {
//             "type": "string"
//           }
//         },
//        "required": ["to", "from", "text"]
//       }
//     }
//   }
// ]

function RenderTools({ tools }) {
  return tools?.map((tool, i) => {
    return (
      <HoverCard key={i}>
        <HoverCard.Target>
          <Badge color="pink" variant="outline" tt="none">
            {tool.function?.name}
          </Badge>
        </HoverCard.Target>
        <HoverCard.Dropdown miw={400}>
          <ScrollArea.Autosize mah={300}>
            <Stack>
              {tool.function?.description && (
                <Text size="sm">{tool.function?.description}</Text>
              )}
              <Text size="sm">
                <pre>{JSON.stringify(tool.function?.parameters, null, 2)}</pre>
              </Text>
            </Stack>
          </ScrollArea.Autosize>
        </HoverCard.Dropdown>
      </HoverCard>
    )
  })
}

const PARAMS = [
  { key: "temperature", name: "Temperature" },
  { key: "maxTokens", name: "Max tokens" },
  { key: "topP", name: "Top P" },
  { key: "topK", name: "Top K" },
  { key: "logitBias", name: "Logit bias" },
  { key: "presencePenalty", name: "Presence penalty" },
  { key: "frequencyPenalty", name: "Frequency penalty" },
  { key: "stop", name: "Stop" },
  { key: "seed", name: "Seed" },
  {
    key: "tools",
    name: "Tools",
    render: (value) => <RenderTools tools={value} />,
  },
  { key: "toolChoice", name: "Tool Choice" },
]

export default function RunInputOutput({
  initialRun,
  withPlayground = true,
  withShare = false,
}) {
  const { user } = useUser()
  const { run, update } = useRun(initialRun?.id, initialRun)

  const canEnablePlayground =
    withPlayground &&
    run?.type === "llm" &&
    run?.input &&
    isChatMessages(run?.input) &&
    hasAccess(user.role, "prompts", "read")

  return (
    <ErrorBoundary>
      <Stack>
        {run?.type === "llm" && (
          <>
            {withShare && (
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm">
                    Copy{" "}
                    <Text span fw="bold">
                      {run?.isPublic ? "public" : "private"}
                    </Text>{" "}
                    URL to share {run?.isPublic ? "" : "with your team"}
                  </Text>
                  <SuperCopyButton
                    value={
                      run?.isPublic
                        ? `${window.location.origin}/logs/${run.id}`
                        : `${window.location.origin}/logs?selected=${run.id}`
                    }
                  />
                </Group>
                {hasAccess(user.role, "logs", "update") && (
                  <Switch
                    label={
                      <Text
                        size="sm"
                        mr="sm"
                        data-testid="make-log-public-switch"
                      >
                        Make public
                      </Text>
                    }
                    checked={run.isPublic}
                    color={run.isPublic ? "red" : "blue"}
                    onChange={async (e) => {
                      const checked = e.currentTarget.checked as boolean
                      update({ ...run, isPublic: checked })
                      if (checked) {
                        const url = `${window.location.origin}/logs/${run.id}`
                        await navigator.clipboard.writeText(url)

                        notifications.show({
                          top: 100,
                          title: "Run is now public",
                          message: "Link copied to clipboard",
                        })
                      }
                    }}
                  />
                )}
              </Group>
            )}

            <Card withBorder radius="md">
              <Group justify="space-between" align="start">
                <Stack gap="xs">
                  <ParamItem
                    name="Model"
                    value={run.name}
                    render={(value) => (
                      <Badge variant="light" tt="none" color="blue">
                        {value}
                      </Badge>
                    )}
                  />

                  {PARAMS.map(
                    ({ key, name, render }) =>
                      typeof run.params?.[key] !== "undefined" && (
                        <ParamItem
                          key={key}
                          name={name}
                          color="grey"
                          value={run.params?.[key]}
                          render={render}
                        />
                      ),
                  )}

                  {run.tags?.length > 0 && (
                    <ParamItem name="Tags" value={run.tags} />
                  )}

                  {Object.entries(run.metadata || {}).map(([key, value]) => {
                    if (!value || value.hasOwnProperty("toString")) {
                      return null
                    }

                    return (
                      <ParamItem
                        key={key}
                        name={key}
                        color="blue"
                        value={value}
                        render={(value) => (
                          <CopyText ml={0} value={value.toString()} />
                        )}
                      />
                    )
                  })}
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
                {run.error
                  ? "Error"
                  : run.type === "retriever"
                    ? "Documents"
                    : "Output"}
              </Text>
              {run.tokens?.completion && (
                <TokensBadge tokens={run.tokens?.completion} />
              )}
            </Group>
            <SmartViewer data={run.output} error={run.error} />
          </>
        )}
      </Stack>
    </ErrorBoundary>
  )
}
