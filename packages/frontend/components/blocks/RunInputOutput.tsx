import config from "@/utils/config";
import { useDatasets, useOrg, useRun, useUser } from "@/utils/dataHooks";
import errorHandler from "@/utils/errors";
import { formatCost } from "@/utils/format";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Menu,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
  ThemeIcon,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { CodeHighlight } from "@mantine/code-highlight";
import "@mantine/code-highlight/styles.css";
import { notifications } from "@mantine/notifications";
import {
  IconBinaryTree2,
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconEyeClosed,
  IconFileMusic,
  IconInfoCircle,
  IconPencilShare,
  IconSpeakerphone,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { hasAccess } from "shared";
import SmartViewer from "../SmartViewer";
import FunctionIcon from "../SmartViewer/function-icon";
import AppUserAvatar from "./AppUserAvatar";
import CopyText, { SuperCopyButton } from "./CopyText";
import ErrorBoundary from "./ErrorBoundary";
import Feedbacks from "./Feedbacks";
import TokensBadge from "./TokensBadge";

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
            value.map((v, i) => {
              const isPrimitive =
                typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean";
              const label = isPrimitive ? String(v) : JSON.stringify(v);
              return (
                <Badge key={i} variant="outline" mr="xs">
                  {label}
                </Badge>
              );
            })
          ) : (
            JSON.stringify(value)
          )}
        </Text>
      )}
    </Group>
  );
};

const safeStringify = (value: unknown) => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error("Failed to stringify tool definition", error);
    return null;
  }
};

const openToolModal = (displayName: string, definition: any) => {
  const json = safeStringify(definition);

  modals.open({
    centered: true,
    size: "xl",
    radius: "md",
    withCloseButton: true,
    title: (
      <Group gap="sm" align="center">
        <ThemeIcon size={28} radius="md" color="green" variant="filled">
          <FunctionIcon size={18} />
        </ThemeIcon>
        <Text fw={600}>{displayName}</Text>
      </Group>
    ),
    children: json ? (
      <Stack gap="sm">
        <Box pos="relative">
          <CopyButton value={json} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip
                withArrow
                label={copied ? "Copied definition" : "Copy JSON"}
                position="left"
              >
                <ActionIcon
                  variant="light"
                  color={copied ? "teal" : "gray"}
                  onClick={copy}
                  aria-label={copied ? "Definition copied" : "Copy definition"}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 2,
                  }}
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
          <CodeHighlight
            withCopyButton={false}
            language="json"
            code={json}
            style={{
              borderRadius: "var(--mantine-radius-md)",
              fontSize: 13,
            }}
          />
        </Box>
      </Stack>
    ) : (
      <Text size="sm" c="dimmed">
        No schema available for this tool.
      </Text>
    ),
  });
};

const renderToolBadge = (
  name: string,
  definition: any,
  key?: string | number,
  ariaLabel = "View tool definition",
) => (
  <Badge
    key={key ?? name}
    maw={220}
    variant="light"
    color="green"
    radius="sm"
    leftSection={<FunctionIcon size={14} />}
    style={{ cursor: "pointer" }}
    onClick={() => openToolModal(name, definition)}
    aria-label={`${ariaLabel} ${name}`}
    mr="xs"
  >
    <Code style={{ fontSize: 11, fontWeight: 500 }}>{name}()</Code>
  </Badge>
);

function normalizeTools(tools: any): any[] {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools;
  if (typeof tools === "string") {
    try {
      const parsed = JSON.parse(tools);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      return [{ name: tools }];
    } catch {
      return [{ name: tools }];
    }
  }
  if (typeof tools === "object") return [tools];
  return [];
}

function getToolDefinition(tool: any) {
  return tool?.function || tool?.toolSpec || tool;
}

const toReadableName = (toolObject: any) => {
  const value = toolObject?.name?.Name || toolObject?.name || "Unknown";
  return typeof value === "string" ? value : String(value);
};

function RenderTools({ tools }) {
  const normalized = normalizeTools(tools);
  if (!normalized.length) return null;

  return normalized.map((tool, index) => {
    const toolObject = getToolDefinition(tool);
    const name = toReadableName(toolObject);
    return renderToolBadge(name, toolObject, index);
  });
}

function RenderToolChoice({ toolChoice }: { toolChoice: any }) {
  if (!toolChoice) return null;

  const parseChoice = (value: any) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const parsed = parseChoice(toolChoice);

  if (Array.isArray(parsed)) {
    return parsed.map((entry, index) => {
      const normalized = parseChoice(entry);
      if (normalized?.type === "function") {
        const definition = normalized.function || normalized;
        const name = definition?.name || "Unknown";
        return renderToolBadge(
          name,
          definition,
          `tool-choice-${index}`,
          "View tool choice definition",
        );
      }

      return (
        <Badge
          key={`tool-choice-${index}`}
          variant="outline"
          color="gray"
          mr="xs"
        >
          {typeof normalized === "string"
            ? normalized
            : safeStringify(normalized) || "Unknown"}
        </Badge>
      );
    });
  }

  if (parsed?.type === "function") {
    const definition = parsed.function || parsed;
    const name = definition?.name || "Unknown";
    return renderToolBadge(
      name,
      definition,
      "tool-choice",
      "View tool choice definition",
    );
  }

  if (typeof parsed === "string") {
    return (
      <Badge variant="outline" color="gray">
        {parsed}
      </Badge>
    );
  }

  const fallback = safeStringify(parsed);
  return fallback ? (
    <Badge variant="outline" color="gray">
      {fallback}
    </Badge>
  ) : null;
}

const PARAMS = [
  { key: "temperature", name: "Temperature" },
  { key: "maxTokens", name: "Max tokens" },
  { key: "maxCompletionTokens", name: "Max completion tokens" },
  { key: "topP", name: "Top P" },
  { key: "topK", name: "Top K" },
  {
    key: "audio",
    name: "Audio",
    render: (value) => (
      <Group gap={4}>
        {value.voice && (
          <Badge
            leftSection={<IconSpeakerphone size={14} />}
            pl={7}
            variant="light"
            color="grape"
          >
            Voice: {value.voice}
          </Badge>
        )}
        {value.format && (
          <Badge
            leftSection={<IconFileMusic size={14} />}
            variant="light"
            pl={7}
            color="violet"
          >
            {value.format}
          </Badge>
        )}
      </Group>
    ),
  },
  { key: "modalities", name: "Modalities" },
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
  {
    key: "toolChoice",
    name: "Tool Choice",
    render: (value) => <RenderToolChoice toolChoice={value} />,
  },
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
  const { run, updateVisibility, updateFeedback, deleteRun } = useRun(
    initialRun?.id,
    initialRun,
  );
  const [selectedDataset, setSelectedDataset] = useState<string | null>("");

  const [selectedRunId, setSelectedRunId] = useQueryState<string | undefined>(
    "selected",
    parseAsString,
  );
  const [shouldMutate, setShouldMutate] = useQueryState<boolean | undefined>(
    "mutate",
    parseAsBoolean,
  );

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

  function openModal() {
    modals.openConfirmModal({
      title: "Delete Log",
      children: (
        <Text size="sm">Are you sure you want to delete this Log?</Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await errorHandler(deleteRun());
        setSelectedRunId(null);
        setShouldMutate(true);
      },
    });
  }

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

                  <Menu data-testid="selected-run-menu">
                    <Menu.Target>
                      <ActionIcon variant="default">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {hasAccess(user.role, "logs", "updateVisibility") && (
                        <Menu.Item
                          data-testid="toggle-run-visibility"
                          leftSection={
                            run.isPublic ? (
                              <IconEyeClosed size={16} />
                            ) : (
                              <IconEye size={16} />
                            )
                          }
                          onClick={async () => {
                            const newIsPublic = !run.isPublic;
                            await updateVisibility(newIsPublic);
                            if (newIsPublic) {
                              const url = `${window.location.origin}/logs/${run.id}`;
                              await navigator.clipboard.writeText(url);

                              notifications.show({
                                title: "Run is now public",
                                message: "Link copied to clipboard",
                                icon: <IconCheck />,
                                color: "green",
                                position: "bottom-right",
                              });
                            } else {
                              notifications.show({
                                title: "Run is now private",
                                message: "",
                                icon: <IconCheck />,
                                color: "green",
                                position: "bottom-right",
                              });
                            }
                          }}
                        >
                          {run.isPublic ? "Make private" : "Make public"}
                        </Menu.Item>
                      )}
                      {canEnablePlayground && (
                        <Menu.Item
                          leftSection={<IconPencilShare size={16} />}
                          component={Link}
                          href={`/prompts/${run.templateVersionId || `?clone=` + run.id}`}
                        >
                          {run.templateVersionId
                            ? "Open template"
                            : "Open in Playground"}
                        </Menu.Item>
                      )}
                      {hasAccess(user.role, "logs", "delete") && (
                        <Menu.Item
                          leftSection={
                            <IconTrash
                              size={16}
                              color="var(--mantine-color-red-filled)"
                            />
                          }
                          onClick={openModal}
                        >
                          <Text c="red">Delete</Text>
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
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

                    {run.cost && (
                      <ParamItem
                        name="Cost"
                        value={run.cost}
                        render={(value) => (
                          <Badge variant="outline" miw="65px" color="grape">
                            {formatCost(value)}
                          </Badge>
                        )}
                      />
                    )}

                    {run.user && (
                      <ParamItem
                        name="User"
                        value={run.user}
                        render={(user) => (
                          <AppUserAvatar
                            size="sm"
                            user={user}
                            withName
                            withLink
                          />
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
                      .filter(
                        ([key]) =>
                          key !== "enrichment" && key !== "parentRunId",
                      )
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

                    {run.scores && Boolean(run.scores.length) && (
                      <Group mt="md" gap="xs">
                        <Title size="md">Scores</Title>
                        <Tooltip
                          label={
                            "Custom scores that have been reported via the SDK"
                          }
                        >
                          <IconInfoCircle size={16} opacity={0.5} />
                        </Tooltip>
                      </Group>
                    )}
                    {run.scores?.map((score, i) => (
                      <Badge key={i} variant="outline" color="blue">
                        {score.label}: {score.value}
                      </Badge>
                    ))}
                  </Stack>

                  <Group>
                    {canEnablePlayground && !withShare && (
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

        {run?.type !== "llm" &&
          (run?.tags?.length > 0 ||
            Object.keys(run.metadata || {}).some(
              (key) => key !== "enrichment" && key !== "parentRunId",
            )) && (
            <Card withBorder radius="md">
              <Stack gap={10}>
                {run?.tags?.length > 0 && (
                  <ParamItem name="Tags" value={run.tags} />
                )}
                {Object.entries(run.metadata || {})
                  .filter(
                    ([key]) => key !== "enrichment" && key !== "parentRunId",
                  )
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
            </Card>
          )}

        <Group justify="space-between">
          <Text fw="bold" size="sm">
            Input
          </Text>
          {run?.tokens?.prompt && (
            <TokensBadge
              tokens={run.tokens?.prompt}
              cachedTokens={run.tokens.cachedPrompt}
            />
          )}
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
