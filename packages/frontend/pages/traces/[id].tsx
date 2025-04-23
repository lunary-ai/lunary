"use client";

import { useState } from "react";
import DurationBadge from "@/components/blocks/DurationBadge";
import RunInputOutput from "@/components/blocks/RunInputOutput";
import StatusBadge from "@/components/blocks/StatusBadge";
import TokensBadge from "@/components/blocks/TokensBadge";
import { useProjectSWR, useRun, useUser } from "@/utils/dataHooks";
import { capitalize, formatCost } from "@/utils/format";
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  Kbd,
  Loader,
  Menu,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight, // added for collapsed state
  IconChevronUp,
  IconCloudDownload,
  IconCode,
  IconDotsVertical,
  IconFlame,
  IconLink,
  IconMessage,
  IconMessages,
  IconRobot,
  IconSpeakerphone,
  IconTimeline,
  IconTool,
  IconTrash,
  IconTree,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getColorForRunType } from "../../utils/colors";

import RunsChat from "@/components/blocks/RunChat";
import errorHandler from "@/utils/errors";
import { useHotkeys } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { hasAccess } from "shared";

const typeIcon = {
  convo: IconMessages,
  chain: IconLink,
  thread: IconMessages,
  chat: IconMessage,
  agent: IconRobot,
  llm: IconCode,
  tool: IconTool,
  retriever: IconCloudDownload,
  "custom-event": IconSpeakerphone,
};

function TraceTree({
  isFirst = false,
  isLastOfParent = false,
  focused,
  parentId,
  runs,
  onSelect,
  firstDate,
}) {
  const [collapsed, setCollapsed] = useState(false);

  // each run contains a child_runs array containing the ids of the runs it spawned
  const run = runs.find((run) => run.id === parentId);
  if (!run) {
    return null;
  }
  if (run.input === "__NOT_INGESTED__") {
    run.status = "filtered";
  }

  const color = getColorForRunType(run?.type);

  const showStatus = !["convo", "thread", "chat", "custom-event"].includes(
    run?.type,
  );

  const Icon = typeIcon[run?.type];

  const isActive = run.id === focused;

  const shownRuns = runs
    .filter((r) => r.parentRunId === parentId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return (
    <Group pos="relative" wrap="nowrap">
      {!isFirst && (
        <Box>
          {!isLastOfParent && (
            <svg
              width={20}
              strokeWidth={1}
              stroke="var(--mantine-color-gray-5)"
              fill="none"
              style={{
                position: "absolute",
                left: 1,
                top: -3,
                height: "calc(100% + 3px",
              }}
            >
              <line x1={10} y1="0" x2={10} y2="100%" />
            </svg>
          )}
          <svg
            width="38"
            height="38"
            style={{
              position: "absolute",
              left: 3,
              top: -20,
            }}
            viewBox="0 0 24 24"
            strokeWidth={1}
            strokeLinecap="square"
            stroke="var(--mantine-color-gray-5)"
            fill="none"
            strokeLinejoin="round"
          >
            <path
              d="M19 19h-6a8 8 0 0 1 -8 -8v-6"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <Text>&emsp;</Text>
        </Box>
      )}
      <div>
        <Group
          mb="sm"
          onClick={() => onSelect(run.id)}
          style={{ cursor: "pointer" }}
          wrap="nowrap"
        >
          {showStatus && (
            <Group gap="xs" wrap="nowrap">
              <StatusBadge minimal status={run.status} />
              {shownRuns.length > 0 && (
                <ActionIcon
                  variant="transparent"
                  styles={{
                    root: {
                      "--ai-hover": "var(--mantine-color-default-hover)",
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsed(!collapsed);
                  }}
                >
                  {collapsed ? (
                    <IconChevronRight size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )}
                </ActionIcon>
              )}
            </Group>
          )}

          <Badge
            variant={isActive ? "filled" : "outline"}
            color={color}
            pl={0}
            pr={5}
            maw="250px"
            miw="100px"
            leftSection={
              Icon && (
                <ThemeIcon
                  variant="subtle"
                  color={isActive ? "white" : color}
                  size="xs"
                  radius="lg"
                >
                  <Icon strokeWidth={2} size={13} />
                </ThemeIcon>
              )
            }
          >
            {run?.name || run?.type}
          </Badge>

          {run?.type === "llm" && run.cost && (
            <Badge variant="outline" color="gray" miw="65px">
              {formatCost(run.cost)}
            </Badge>
          )}

          {run.endedAt && (
            <Box miw="70px">
              <DurationBadge
                type={run.type}
                cached={run.metadata?.cache}
                createdAt={run.createdAt}
                endedAt={run.endedAt}
              />
            </Box>
          )}
        </Group>

        {/* Only render children if not collapsed */}
        {!collapsed &&
          shownRuns.map((childRun, k) => (
            <TraceTree
              key={childRun.id}
              isLastOfParent={k === shownRuns.length - 1}
              parentId={childRun.id}
              focused={focused}
              runs={runs}
              onSelect={onSelect}
              firstDate={firstDate}
            />
          ))}
      </div>
    </Group>
  );
}

// New component for the flamegraph visualization
function FlameGraph({ runs, focused, onSelect, rootId }) {
  // Calculate the total duration of the trace
  const rootRun = runs.find((run) => run.id === rootId);
  if (!rootRun || !rootRun.endedAt)
    return <Text>No timing data available</Text>;

  const startTime = new Date(rootRun.createdAt).getTime();
  const endTime = new Date(rootRun.endedAt).getTime();
  const totalDuration = endTime - startTime;

  // Function to recursively build the flamegraph data
  const buildFlameData = (parentId, depth = 0) => {
    const run = runs.find((r) => r.id === parentId);
    if (!run) return [];

    const runStart = new Date(run.createdAt).getTime();
    const runEnd = run.endedAt ? new Date(run.endedAt).getTime() : endTime;
    const runDuration = runEnd - runStart;

    // Calculate position and width as percentages
    const leftPos = ((runStart - startTime) / totalDuration) * 100;
    const widthPercent = (runDuration / totalDuration) * 100;

    // Get child runs
    const childRuns = runs
      .filter((r) => r.parentRunId === parentId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    // Build children recursively
    const children = childRuns.flatMap((child) =>
      buildFlameData(child.id, depth + 1),
    );

    return [
      {
        run,
        depth,
        left: leftPos,
        width: widthPercent,
        duration: runDuration,
      },
      ...children,
    ];
  };

  const flameData = buildFlameData(rootId);

  // Find the maximum depth for layout
  const maxDepth = Math.max(...flameData.map((item) => item.depth), 0);

  return (
    <Box style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      {/* Time markers */}
      <Box
        style={{
          height: "20px",
          position: "relative",
          marginBottom: "4px",
          borderBottom: "1px solid var(--mantine-color-gray-5)",
        }}
      >
        {[0, 25, 50, 75, 100].map((percent) => (
          <Text
            key={percent}
            size="xs"
            c="dimmed"
            style={{
              position: "absolute",
              left: `${percent}%`,
              transform: "translateX(-50%)",
            }}
          >
            {((totalDuration * percent) / 100 / 1000).toFixed(2)}s
          </Text>
        ))}
      </Box>

      {/* Flame graph blocks */}
      <Box style={{ height: `${(maxDepth + 1) * 30}px`, position: "relative" }}>
        {flameData.map((item, index) => {
          const color = getColorForRunType(item.run?.type);
          const isActive = item.run.id === focused;
          const Icon = typeIcon[item.run?.type];

          return (
            <Box
              key={`${item.run.id}-${index}`}
              style={{
                position: "absolute",
                left: `${item.left}%`,
                top: `${item.depth * 30}px`,
                width: `${Math.max(item.width, 0.5)}%`,
                height: "28px",
                backgroundColor: isActive
                  ? `var(--mantine-color-${color}-filled)`
                  : `var(--mantine-color-${color}-light)`,
                border: `1px solid var(--mantine-color-${color}-filled)`,
                borderRadius: "4px",
                cursor: "pointer",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                zIndex: isActive ? 10 : 1,
                minWidth: "40px",
              }}
              onClick={() => onSelect(item.run.id)}
              title={`${item.run.name || item.run.type} (${(item.duration / 1000).toFixed(2)}s)`}
            >
              <Group wrap="nowrap" p="2px" style={{ height: "100%" }}>
                {Icon && (
                  <ThemeIcon
                    variant="subtle"
                    color={isActive ? "white" : color}
                    size="xs"
                    radius="lg"
                  >
                    <Icon strokeWidth={2} size={13} />
                  </ThemeIcon>
                )}
                <Text size="xs" truncate>
                  {item.run.name || item.run.type}
                </Text>
                <Text size="xs" c={isActive ? "white" : "dimmed"}>
                  {(item.duration / 1000).toFixed(2)}s
                </Text>
              </Group>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function RenderRun({ run, relatedRuns }) {
  const directChilds = relatedRuns
    ?.filter((r) => r.parentRunId === run.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  if (run?.type === "custom-event") return run.name;
  if (run?.type === "chat") return <RunsChat runs={[run]} />;
  if (run?.type === "thread") return <RunsChat runs={directChilds} />;
  return <RunInputOutput initialRun={run} withFeedback={true} />;
}

export default function Trace({}) {
  const router = useRouter();
  const { id, checks, sortParams } = router.query;
  const { user } = useUser();

  const [focused, setFocused] = useState(id);
  const [viewMode, setViewMode] = useState("tree"); // "tree", "flame", or "timeline"

  const { run, deleteRun, runDeleted } = useRun(id as string);

  const { data: neighbors } = useProjectSWR(
    `/runs/${id}/neighbors?${checks}${sortParams}`,
  );

  useHotkeys([
    ["ArrowUp", handleUpClick],
    ["k", handleUpClick],
    ["ArrowDown", handleDownClick],
    ["j", handleDownClick],
  ]);

  function openModal() {
    modals.openConfirmModal({
      title: "Delete Trace",
      children: (
        <Text size="sm">
          Are you sure you want to delete this Trace? This action will
          permanently remove The trace and all its children. This cannot be
          undone.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await errorHandler(deleteRun());
        await router.replace("/logs?type=trace&mutate=true");
      },
    });
  }

  useEffect(() => {
    if (run) setFocused(run.id);
  }, [run]);

  const { data: relatedRuns } = useProjectSWR(
    !runDeleted && `/runs/${id}/related`,
  );

  if (!run) return <Loader />;

  const totalTokens = relatedRuns?.reduce((acc, run) => {
    if (run?.type === "llm") {
      return acc + run.completionTokens + run.promptTokens;
    }
    return acc;
  }, 0);

  const totalCost = relatedRuns?.reduce((acc, run) => {
    if (run?.type === "llm") {
      return acc + run.cost;
    }
    return acc;
  }, 0);

  const focusedRun = relatedRuns?.find((run) => run.id === focused);

  function handleDownClick() {
    if (neighbors?.previousId) {
      router.push({
        pathname: `/traces/${neighbors.previousId}`,
        query: { checks, sortParams },
      });
    }
  }

  function handleUpClick() {
    if (neighbors?.nextId) {
      router.push({
        pathname: `/traces/${neighbors.nextId}`,
        query: { checks, sortParams },
      });
    }
  }

  // Timeline visualization component
  function TimelineView({ runs, focused, onSelect, rootId }) {
    if (!runs || !runs.length) return <Text>No data available</Text>;

    // Find the root run
    const rootRun = runs.find((run) => run.id === rootId);
    if (!rootRun) return <Text>Root run not found</Text>;

    const startTime = new Date(rootRun.createdAt).getTime();
    const endTime = rootRun.endedAt
      ? new Date(rootRun.endedAt).getTime()
      : Date.now();
    const totalDuration = endTime - startTime;

    // Flatten the runs for timeline display
    const timelineItems = runs.map((run) => {
      const runStart = new Date(run.createdAt).getTime();
      const runEnd = run.endedAt ? new Date(run.endedAt).getTime() : endTime;

      // Find the parent to determine the depth
      const parentRun = runs.find((r) => r.id === run.parentRunId);
      const depth = getRunDepth(run, runs);

      return {
        run,
        depth,
        start: ((runStart - startTime) / totalDuration) * 100,
        width: ((runEnd - runStart) / totalDuration) * 100,
        duration: runEnd - runStart,
      };
    });

    // Group by depth for the timeline rows
    const maxDepth = Math.max(...timelineItems.map((item) => item.depth), 0);

    return (
      <Box style={{ width: "100%", overflowX: "auto" }}>
        {/* Time markers */}
        <Box
          style={{
            height: "20px",
            position: "relative",
            marginBottom: "4px",
            borderBottom: "1px solid var(--mantine-color-gray-5)",
          }}
        >
          {[0, 25, 50, 75, 100].map((percent) => (
            <Text
              key={percent}
              size="xs"
              c="dimmed"
              style={{
                position: "absolute",
                left: `${percent}%`,
                transform: "translateX(-50%)",
              }}
            >
              {((totalDuration * percent) / 100 / 1000).toFixed(2)}s
            </Text>
          ))}
        </Box>

        {/* Timeline rows */}
        <Stack spacing={4}>
          {Array.from({ length: maxDepth + 1 }).map((_, depth) => {
            const itemsAtDepth = timelineItems.filter(
              (item) => item.depth === depth,
            );

            return (
              <Group
                key={depth}
                position="apart"
                noWrap
                style={{ height: "28px", position: "relative" }}
              >
                <Box
                  style={{
                    width: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Text size="xs" truncate>
                    {itemsAtDepth.length > 0 ? itemsAtDepth[0].run.type : ""}
                  </Text>
                </Box>

                <Box style={{ flex: 1, position: "relative", height: "100%" }}>
                  {itemsAtDepth.map((item, idx) => {
                    const color = getColorForRunType(item.run?.type);
                    const isActive = item.run.id === focused;
                    const Icon = typeIcon[item.run?.type];

                    return (
                      <Box
                        key={`${item.run.id}-${idx}`}
                        style={{
                          position: "absolute",
                          left: `${item.start}%`,
                          top: 0,
                          width: `${Math.max(item.width, 0.5)}%`,
                          height: "100%",
                          backgroundColor: isActive
                            ? `var(--mantine-color-${color}-filled)`
                            : `var(--mantine-color-${color}-light)`,
                          border: `1px solid var(--mantine-color-${color}-filled)`,
                          borderRadius: "4px",
                          cursor: "pointer",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          minWidth: "40px",
                        }}
                        onClick={() => onSelect(item.run.id)}
                        title={`${item.run.name || item.run.type} (${(item.duration / 1000).toFixed(2)}s)`}
                      >
                        <Group wrap="nowrap" p="2px" style={{ height: "100%" }}>
                          {Icon && (
                            <ThemeIcon
                              variant="subtle"
                              color={isActive ? "white" : color}
                              size="xs"
                              radius="lg"
                            >
                              <Icon strokeWidth={2} size={13} />
                            </ThemeIcon>
                          )}
                          <Text size="xs" truncate>
                            {item.run.name || item.run.type}
                          </Text>
                        </Group>
                      </Box>
                    );
                  })}
                </Box>
              </Group>
            );
          })}
        </Stack>
      </Box>
    );
  }

  // Helper function to get the depth of a run in the tree
  function getRunDepth(run, allRuns) {
    let depth = 0;
    let currentRun = run;

    while (currentRun.parentRunId) {
      depth++;
      currentRun = allRuns.find((r) => r.id === currentRun.parentRunId);
      if (!currentRun) break;
    }

    return depth;
  }

  return (
    <Stack p="24px 24px 0 24px" h="100vh" gap="xl" id="trace-page">
      <Title order={1}>
        {capitalize(run?.type)} Trace {run.name ? `(${run.name})` : ""}
      </Title>
      <Group justify="space-between" pr="md">
        <Group>
          {run.status && <StatusBadge status={run.status} />}
          {run.createdAt && (
            <Text>{`Started at ${new Date(run.createdAt).toLocaleString()}`}</Text>
          )}
          <TokensBadge tokens={totalTokens} />
          {totalCost && (
            <Badge variant="outline" color="gray">
              {formatCost(totalCost)}
            </Badge>
          )}
          {run.endedAt && (
            <DurationBadge createdAt={run.createdAt} endedAt={run.endedAt} />
          )}
        </Group>
        <Group>
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            data={[
              {
                value: "tree",
                label: (
                  <Group spacing={4}>
                    <IconTree size={16} />
                    <Text size="sm">Tree</Text>
                  </Group>
                ),
              },
              {
                value: "flame",
                label: (
                  <Group spacing={4}>
                    <IconFlame size={16} />
                    <Text size="sm">Flame</Text>
                  </Group>
                ),
              },
              {
                value: "timeline",
                label: (
                  <Group spacing={4}>
                    <IconTimeline size={16} />
                    <Text size="sm">Timeline</Text>
                  </Group>
                ),
              },
            ]}
          />
          <Group gap="xs">
            {neighbors?.nextId && (
              <Tooltip
                py="8px"
                label={
                  <>
                    Navigate Up<Kbd ml="6px">K</Kbd>
                  </>
                }
              >
                <ActionIcon variant="default" onClick={handleUpClick}>
                  <IconChevronUp height="16px" />
                </ActionIcon>
              </Tooltip>
            )}
            {neighbors?.previousId && (
              <Tooltip
                py="8px"
                label={
                  <>
                    Navigate Down<Kbd ml="6px">J</Kbd>
                  </>
                }
              >
                <ActionIcon variant="default" onClick={handleDownClick}>
                  <IconChevronDown height="16px" />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          {hasAccess(user?.role, "logs", "delete") && (
            <Menu>
              <Menu.Target>
                <ActionIcon variant="default">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={
                    <IconTrash
                      size={16}
                      color="var(--mantine-color-red-filled)"
                    />
                  }
                  onClick={openModal}
                >
                  <Text c="red">Delete Trace</Text>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
      <Group style={{ flex: 1, minHeight: 0 }}>
        <Box
          style={{
            flex: viewMode === "tree" ? "0 0 600px" : "1 1 auto",
            overflowY: "auto",
            overflowX: "auto",
            height: "300px",
            width: "100%",
          }}
        >
          {relatedRuns && viewMode === "tree" && (
            <TraceTree
              isFirst
              focused={focused}
              onSelect={setFocused}
              parentId={id}
              runs={relatedRuns}
              firstDate={run.createdAt}
            />
          )}

          {relatedRuns && viewMode === "flame" && (
            <FlameGraph
              runs={relatedRuns}
              focused={focused}
              onSelect={setFocused}
              rootId={id}
            />
          )}

          {relatedRuns && viewMode === "timeline" && (
            <TimelineView
              runs={relatedRuns}
              focused={focused}
              onSelect={setFocused}
              rootId={id}
            />
          )}
        </Box>

        {/* Only show the detail panel in tree view or when there's enough space */}
        {(viewMode === "tree" || window.innerWidth > 1200) && (
          <Box
            style={{
              flex: viewMode === "tree" ? "1 1 400px" : "0 0 400px",
              overflowY: "auto",
              height: "100%",
              display:
                viewMode === "tree" || window.innerWidth > 1200
                  ? "block"
                  : "none",
            }}
          >
            <Box p="md">
              <Card
                withBorder
                style={{
                  position: "sticky",
                  top: 0,
                  maxHeight: "calc(100vh - 200px)",
                  overflow: "auto",
                }}
              >
                {focusedRun && (
                  <RenderRun run={focusedRun} relatedRuns={relatedRuns} />
                )}
              </Card>
            </Box>
          </Box>
        )}
      </Group>
    </Stack>
  );
}
