import { useDatasets, useOrg, useRun, useUser } from "@/utils/dataHooks";
import {
  Badge,
  Button,
  Card,
  Group,
  HoverCard,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { notifications, showNotification } from "@mantine/notifications";
import {
  IconBinaryTree2,
  IconCheck,
  IconPencilShare,
} from "@tabler/icons-react";
import Link from "next/link";
import { hasAccess } from "shared";
import SmartViewer from "../SmartViewer";
import CopyText, { SuperCopyButton } from "./CopyText";
import ErrorBoundary from "./ErrorBoundary";
import TokensBadge from "./TokensBadge";
import Feedbacks from "./Feedbacks";
import config from "@/utils/config";
import { useState } from "react";
import AppUserAvatar from "./AppUserAvatar";

const isChatMessages = (obj) => {
  return Array.isArray(obj)
    ? obj.every(isChatMessages)
    : (typeof obj.text === "string" && typeof obj.role === "string") ||
        typeof obj.content === "string";
};

const ParamItem = ({
  name,
  value,
  render,
  color = "blue",
}: {
  name: string;
  value: any;
  render?: (value: any) => React.ReactNode;
  color?: string;
}) => {
  return (
    <Group>
      <Text size="sm">{name}: </Text>
      {render ? (
        render(value)
      ) : (
        <Text size="sm">
          {typeof value === "string" || typeof value === "number" ? (
            <Badge variant="outline" color={color}>
              {value}
            </Badge>
          ) : Array.isArray(value) ? (
            value.map((v, i) => (
              <Badge key={i} variant="outline" mr="xs">
                {v}
              </Badge>
            ))
          ) : (
            JSON.stringify(value)
          )}
        </Text>
      )}
    </Group>
  );
};

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
    const toolObject = tool.function || tool.toolSpec; // toolSpec is for langchain I believe

    const spec = toolObject?.parameters || toolObject?.inputSchema;

    return (
      <HoverCard key={i}>
        <HoverCard.Target>
          <Badge maw="120px" color="pink" variant="outline">
            {toolObject?.name || "Unknown"}
          </Badge>
        </HoverCard.Target>
        <HoverCard.Dropdown maw={400}>
          <ScrollArea.Autosize mah={300}>
            <Stack>
              {toolObject?.description && (
                <Text size="sm">{toolObject?.description}</Text>
              )}
              {spec && (
                <Text size="sm">
                  <pre>{JSON.stringify(spec, null, 2)}</pre>
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </HoverCard.Dropdown>
      </HoverCard>
    );
  });
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
];

export default function RunInputOutput({
  initialRun,
  withFeedback = false,
  withImportToDataset = false,
  withPlayground = true,
  withOpenTrace = false,
  withShare = false,
  mutateLogs,
}) {
  const { user } = useUser();
  const { org } = useOrg();
  const { run, update, updateFeedback } = useRun(initialRun?.id, initialRun);
  const [selectedDataset, setSelectedDataset] = useState<string | null>("");

  const canEnablePlayground =
    withPlayground &&
    run?.type === "llm" &&
    run?.input &&
    isChatMessages(run?.input) &&
    hasAccess(user.role, "prompts", "read");

  const { datasets, insertPrompt } = useDatasets();

  const canImportToDataset = config.IS_SELF_HOSTED
    ? true
    : org?.plan === "team" || org?.plan === "custom";

  const shouldDisplayCard =
    run?.name ||
    run?.user ||
    Object.keys(run?.params || {}).length !== 0 ||
    run?.tags?.length > 0 ||
    run?.metadata ||
    canEnablePlayground;

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

                <Group>
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
                        const checked = e.currentTarget.checked as boolean;
                        update({ ...run, isPublic: checked });
                        if (checked) {
                          const url = `${window.location.origin}/logs/${run.id}`;
                          await navigator.clipboard.writeText(url);

                          notifications.show({
                            top: 100,
                            title: "Run is now public",
                            message: "Link copied to clipboard",
                          });
                        }
                      }}
                    />
                  )}
                  {canImportToDataset && withImportToDataset && (
                    <Select
                      searchable
                      size="xs"
                      placeholder="Add to dataset"
                      w={160}
                      value={selectedDataset}
                      data={datasets?.map((d) => ({
                        label: d.slug,
                        value: d.id,
                      }))}
                      onChange={async (value) => {
                        await insertPrompt({
                          datasetId: value,
                          messages: run.input,
                          idealOutput: run.output,
                        });
                        notifications.show({
                          title: "The run has been added to the dataset",
                          message: "",
                          icon: <IconCheck />,
                          color: "green",
                        });
                        setSelectedDataset(null);
                      }}
                    />
                  )}
                </Group>
              </Group>
            )}

            {shouldDisplayCard && (
              <Card withBorder radius="md">
                <Group justify="space-between" align="start">
                  <Stack gap={10}>
                    {run.name && (
                      <ParamItem
                        name="Model"
                        value={run.name}
                        render={(value) => (
                          <Badge variant="light" color="blue">
                            {value}
                          </Badge>
                        )}
                      />
                    )}

                    {run.user && (
                      <ParamItem
                        name="User"
                        value={run.user}
                        render={(user) => (
                          <AppUserAvatar size="sm" user={user} withName />
                        )}
                      />
                    )}

                    {PARAMS.map(
                      ({ key, name, render }) =>
                        typeof run.params?.[key] !== "undefined" &&
                        run.params[key] !== null && (
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

                    {Object.entries(run.metadata || {})
                      .filter(([key]) => key !== "enrichment")
                      .map(([key, value]) => {
                        if (!value || value.hasOwnProperty("toString")) {
                          return null;
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
                        );
                      })}
                  </Stack>

                  <Group>
                    {canEnablePlayground && (
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
                          : "Open in Playground"}
                      </Button>
                    )}
                    {run.traceId && withOpenTrace && (
                      <Button
                        variant="outline"
                        color="yellow"
                        size="xs"
                        w="fit-content"
                        display="inline"
                        rightSection={<IconBinaryTree2 size="14" />}
                        component={Link}
                        href={`/traces/${run.traceId}`}
                      >
                        Open parent Trace
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            )}
          </>
        )}

        {run?.type !== "llm" && (
          <Group>
            {run?.tags?.length > 0 && (
              <ParamItem name="Tags" value={run.tags} />
            )}
          </Group>
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
            <Group mt="lg" justify="space-between">
              <Text fw="bold" size="sm">
                {run.error
                  ? "Error"
                  : run.type === "retriever"
                    ? "Documents"
                    : "Output"}
              </Text>

              <Group>
                {withFeedback && (
                  <Feedbacks
                    feedback={run.feedback}
                    updateFeedback={async (feedback) => {
                      try {
                        await updateFeedback(feedback);
                        await mutateLogs();
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                  />
                )}
                {run.tokens?.completion && (
                  <TokensBadge tokens={run.tokens?.completion} />
                )}
              </Group>
            </Group>
            <SmartViewer data={run.output} error={run.error} />
          </>
        )}
      </Stack>
    </ErrorBoundary>
  );
}
