import config from "@/utils/config";
import { useDatasets, useOrg, useRun, useUser } from "@/utils/dataHooks";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  HoverCard,
  Menu,
  ScrollArea,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBinaryTree2,
  IconCheck,
  IconDotsVertical,
  IconEye,
  IconEyeClosed,
  IconPencilShare,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { hasAccess } from "shared";
import SmartViewer from "../SmartViewer";
import AppUserAvatar from "./AppUserAvatar";
import CopyText, { SuperCopyButton } from "./CopyText";
import ErrorBoundary from "./ErrorBoundary";
import Feedbacks from "./Feedbacks";
import TokensBadge from "./TokensBadge";
import { modals } from "@mantine/modals";
import errorHandler from "@/utils/errors";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

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
  const { run, update, updateFeedback, deleteRun } = useRun(
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

                  {hasAccess(user.role, "logs", "update") && (
                    <Menu data-testid="selected-run-menu">
                      <Menu.Target>
                        <ActionIcon variant="default">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
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
                            await update({ ...run, isPublic: newIsPublic });
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
