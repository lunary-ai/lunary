import React, { useState, useEffect, useMemo, useContext } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  ScrollArea,
  Table,
  Badge,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Card,
  TagsInput,
  Tooltip,
  Popover,
  Menu,
  ActionIcon,
  SegmentedControl,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconSearch,
  IconPencil,
  IconPlus,
  IconSend,
  IconTrash,
  IconDotsVertical,
  IconCopy,
  IconPlayerPlay,
  IconMail,
  IconWorld,
  IconBellOff,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import {
  useAlerts,
  useAlert,
  useAlertHistory,
  AlertWebhookTestResponse,
} from "@/utils/dataHooks/alerts";
import { ProjectContext } from "@/utils/context";
import { fetcher } from "@/utils/fetcher";

export type Metric =
  | "error"
  | "cost"
  | "feedback"
  | "latency_p50"
  | "latency_p75"
  | "latency_p90"
  | "latency_p95"
  | "latency_p99";

const metricOptions: { value: Metric; label: string }[] = [
  { value: "error", label: "Error (%)" },
  { value: "cost", label: "Cost ($)" },
  { value: "feedback", label: "Feedback (%)" },
  { value: "latency_p50", label: "Latency (p50, s)" },
  { value: "latency_p75", label: "Latency (p75, s)" },
  { value: "latency_p90", label: "Latency (p90, s)" },
  { value: "latency_p95", label: "Latency (p95, s)" },
  { value: "latency_p99", label: "Latency (p99, s)" },
];

function formatThreshold(metric: Metric, value: number) {
  if (metric === "error" || metric === "feedback") {
    return `${value}%`;
  } else if (metric === "cost") {
    return `$${value}`;
  } else {
    return `${value}s`;
  }
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "Unknown";

  const seconds = Math.floor(Math.abs(diff) / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function formatExactTime(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

type RecipientKind = "email" | "webhook";

const SLACK_WEBHOOK_REGEX = /https:\/\/hooks\.slack\.com\/services\//i;

function SlackIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 127 127"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <path
        d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z"
        fill="#E01E5A"
      />
      <path
        d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z"
        fill="#36C5F0"
      />
      <path
        d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z"
        fill="#2EB67D"
      />
      <path
        d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z"
        fill="#ECB22E"
      />
    </svg>
  );
}

function isSlackWebhook(value: string) {
  return SLACK_WEBHOOK_REGEX.test(value);
}

function partitionWebhooks(urls: string[]) {
  const slack: string[] = [];
  const generic: string[] = [];
  urls.forEach((raw) => {
    const value = raw?.trim();
    if (!value) return;
    if (isSlackWebhook(value)) slack.push(value);
    else generic.push(value);
  });
  return { slack, generic };
}

function recipientIcon(value: string, kind: RecipientKind) {
  if (kind === "email") {
    return <IconMail size={14} stroke={1.5} />;
  }
  if (isSlackWebhook(value)) {
    return <SlackIcon />;
  }
  return <IconWorld size={14} stroke={1.5} />;
}

function RecipientSummary({
  items,
  kind,
  label,
  color,
  icon,
}: {
  items: string[];
  kind: RecipientKind;
  label?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  if (!items.length) {
    return <Text c="dimmed">—</Text>;
  }

  const resolvedLabel =
    label ?? (kind === "email" ? "Emails" : "Webhooks");
  const badgeColor = color ?? (kind === "email" ? "blue" : "grape");
  const badgeIcon =
    icon ??
    (kind === "webhook" && items.some(isSlackWebhook)
      ? <SlackIcon />
      : recipientIcon(items[0], kind));

  return (
    <Popover position="bottom-start" trapFocus={false} shadow="md">
      <Popover.Target>
        <Badge
          color={badgeColor}
          variant="light"
          leftSection={badgeIcon}
          style={{ cursor: "pointer" }}
        >
          {items.length} {resolvedLabel.toLowerCase()}
        </Badge>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={6}>
          {items.map((value) => (
            <Group key={value} gap={8} wrap="nowrap">
              {recipientIcon(value, kind)}
              <Text size="sm" style={{ wordBreak: "break-word" }}>
                {value}
              </Text>
            </Group>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function StatusDisplay({
  status,
  lastTriggeredAt,
}: {
  status: Alert["status"];
  lastTriggeredAt?: string;
}) {
  const color =
    status === "triggered"
      ? "red"
      : status === "disabled"
        ? "gray"
        : "green";

  return (
    <Stack gap={4}>
      <Badge color={color} variant="light">
        <span style={{ textTransform: "capitalize" }}>{status}</span>
      </Badge>
      {lastTriggeredAt ? (
        <Tooltip label={formatExactTime(lastTriggeredAt)} withArrow>
          <Text size="xs" c="dimmed">
            Last triggered {formatRelativeTime(lastTriggeredAt)}
          </Text>
        </Tooltip>
      ) : (
        <Text size="xs" c="dimmed">
          No triggers yet
        </Text>
      )}
    </Stack>
  );
}

// types ---------------------------------------------------------------------
export interface Alert {
  id: string;
  name: string;
  status: "healthy" | "triggered" | "disabled";
  threshold: number;
  metric: Metric;
  timeFrameMinutes: number;
  emails: string[];
  webhookUrls: string[];
  createdAt: string;
}
export interface AlertHistory {
  id: string;
  alertId: string;
  startTime: string;
  endTime: string;
  trigger: number;
  status: "resolved" | "ongoing";
}

type EditableAlert = Omit<Alert, "id" | "createdAt" | "status">;

type AugmentedAlert = Alert & {
  lastTriggeredAt?: string;
  slackWebhookUrls: string[];
  genericWebhookUrls: string[];
};

type AlertWebhookTestInput = Pick<
  EditableAlert,
  "name" | "metric" | "threshold" | "timeFrameMinutes" | "webhookUrls"
>;

type AlertWebhookTester = (
  payload: AlertWebhookTestInput,
) => Promise<AlertWebhookTestResponse>;

function AlertsPage() {
  const router = useRouter();
  const { projectId } = useContext(ProjectContext);

  // data hooks for alerts and history
  const {
    alerts: activeAlerts,
    isLoading: loadingAlerts,
    create,
    isCreating,
    mutate: mutateAlerts,
    testWebhooks,
    isTestingWebhooks,
  } = useAlerts();
  const {
    history: alertHistory,
    mutate: mutateHistory,
  } = useAlertHistory();

  // state for modals & filters
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [current, setCurrent] = useState<Alert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "healthy" | "triggered" | "disabled"
  >("all");

  // hook for updating current alert
  const { update, isUpdating } = useAlert(current?.id || "");
  // hook for deleting current alert
  const { remove: deleteAlert } = useAlert(deleteTarget?.id || "");
  const isSaving =
    modalMode === "create"
      ? isCreating
      : modalMode === "edit"
        ? isUpdating
        : false;

  const lastTriggeredMap = useMemo(() => {
    const map = new Map<string, string>();
    alertHistory.forEach((entry) => {
      if (!entry.alertId) return;
      if (!entry.startTime) return;
      const existing = map.get(entry.alertId);
      if (!existing || new Date(entry.startTime) > new Date(existing)) {
        map.set(entry.alertId, entry.startTime);
      }
    });
    return map;
  }, [alertHistory]);

  const augmentedAlerts: AugmentedAlert[] = useMemo(
    () =>
      activeAlerts.map((alert) => {
        const { slack, generic } = partitionWebhooks(alert.webhookUrls);
        return {
          ...alert,
          slackWebhookUrls: slack,
          genericWebhookUrls: generic,
          lastTriggeredAt: lastTriggeredMap.get(alert.id),
        };
      }),
    [activeAlerts, lastTriggeredMap],
  );

  const filteredAlerts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return augmentedAlerts.filter((alert) => {
      const matchesStatus =
        statusFilter === "all" ? true : alert.status === statusFilter;
      const matchesSearch =
        term.length === 0 ||
        alert.name.toLowerCase().includes(term) ||
        alert.metric.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [augmentedAlerts, searchTerm, statusFilter]);

  // open modal via query
  useEffect(() => {
    const { modal, id } = router.query;
    if (modal === "create") openCreate();
    if (modal === "edit" && typeof id === "string") {
      const target = activeAlerts.find((a) => a.id === id);
      if (target) openEdit(target);
    }
  }, [router.query, activeAlerts]);

  // helpers
  const openCreate = () => {
    setCurrent(null);
    setModalMode("create");
  };
  const openEdit = (alert: Alert) => {
    setCurrent(alert);
    setModalMode("edit");
  };
  const openDelete = (alert: Alert) => {
    setDeleteTarget(alert);
  };

  async function handleDuplicate(alert: AugmentedAlert) {
    const emails = alert.emails
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const webhooks = [...alert.slackWebhookUrls, ...alert.genericWebhookUrls]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    try {
      await create({
        name: `${alert.name} (copy)`,
        threshold: alert.threshold,
        metric: alert.metric,
        timeFrameMinutes: alert.timeFrameMinutes,
        emails,
        webhookUrls: webhooks,
      });
      await mutateAlerts();
      showNotification({
        title: "Alert duplicated",
        message: `"${alert.name}" duplicated successfully.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      showNotification({
        title: "Failed to duplicate alert",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    }
  }

  async function handleTestAlert(alert: AugmentedAlert) {
    const webhookUrls = [...alert.slackWebhookUrls, ...alert.genericWebhookUrls]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (webhookUrls.length === 0) {
      showNotification({
        title: "No webhooks configured",
        message: "Add a webhook to this alert before sending a test.",
        color: "yellow",
        icon: <IconAlertTriangle size={16} />,
      });
      return;
    }

    try {
      const { successCount, failureCount, results } = await triggerWebhookTest({
        name: alert.name,
        metric: alert.metric,
        threshold: alert.threshold,
        timeFrameMinutes: alert.timeFrameMinutes,
        webhookUrls,
      });

      if (failureCount === 0) {
        showNotification({
          title: "Webhook test sent",
          message: `Delivered to ${successCount} webhook${successCount === 1 ? "" : "s"}.`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
        return;
      }

      const failed = results.filter((result) => !result.ok);
      const detail =
        failed.length > 0
          ? `${failed[0].url}${
              failed[0].error
                ? `: ${failed[0].error}`
                : failed[0].status
                  ? `: HTTP ${failed[0].status}`
                  : ""
            }`
          : "Check the target service logs.";

      showNotification({
        title:
          successCount === 0
            ? "Webhook test failed"
            : "Webhook test partially delivered",
        message:
          successCount === 0
            ? detail
            : `${successCount} succeeded, ${failureCount} failed. ${detail}`,
        color: successCount === 0 ? "red" : "orange",
        icon: <IconAlertTriangle size={16} />,
      });
    } catch (error) {
      showNotification({
        title: "Webhook test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    }
  }

  async function toggleAlertStatus(alert: AugmentedAlert) {
    if (!projectId) {
      showNotification({
        title: "Project not selected",
        message: "Select a project before updating alerts.",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
      return;
    }

    const nextStatus = alert.status === "disabled" ? "healthy" : "disabled";
    const isDisabling = nextStatus === "disabled";

    try {
      await fetcher.patch(`/alerts/${alert.id}?projectId=${projectId}`, {
        arg: { status: nextStatus },
      });
      await mutateAlerts();
      await mutateHistory();
      showNotification({
        title: `Alert ${isDisabling ? "disabled" : "enabled"}`,
        message: `"${alert.name}" has been ${isDisabling ? "disabled" : "re-enabled"}.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      showNotification({
        title: "Failed to update alert",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    }
  }

  // handle save
  async function handleSave(data: EditableAlert) {
    const emails = data.emails
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const webhookUrls = data.webhookUrls
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const payload = {
      name: data.name,
      threshold: data.threshold,
      metric: data.metric,
      timeFrameMinutes: data.timeFrameMinutes,
      emails,
      webhookUrls,
    };
    if (modalMode === "create") {
      await create(payload);
    } else if (modalMode === "edit" && current) {
      await update(payload);
    }
    await mutateAlerts();
    await mutateHistory();
    setModalMode(null);
    setCurrent(null);
    router.replace("/alerts", undefined, { shallow: true });
  }

  // handle delete
  async function handleDelete() {
    if (deleteTarget) {
      const { id } = deleteTarget;
      await deleteAlert();
      await mutateAlerts();
      await mutateHistory();
      setDeleteTarget(null);
    }
  }

  const triggerWebhookTest: AlertWebhookTester = (payload) =>
    testWebhooks(payload) as Promise<AlertWebhookTestResponse>;

  // show loading state if needed
  if (loadingAlerts) {
    return <Text>Loading alerts...</Text>;
  }

  return (
    <Stack style={{ gap: 24, padding: 16 }}>
      <Group
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title order={2}>Active Alerts</Title>
        <Button
          leftSection={<IconPlus size={12} />}
          variant="default"
          onClick={openCreate}
        >
          Create Alert
        </Button>
      </Group>

      {activeAlerts.length === 0 ? (
        <Stack
          style={{
            alignItems: "center",
            justifyContent: "center",
            height: 400,
          }}
        >
          <IconBell size={64} color="gray" />
          <Title order={3}>Create Your First Alert</Title>
          <Text style={{ color: "#868e96", textAlign: "center", fontSize: 14 }}>
            Set up alerts to get notified when metrics cross thresholds.
          </Text>
        </Stack>
      ) : (
        <>
          <Group align="center" gap="md" wrap="wrap">
            <TextInput
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              placeholder="Search alerts"
              leftSection={<IconSearch size={16} />}
              style={{ maxWidth: 280 }}
            />
            <SegmentedControl
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(
                  value as "all" | "healthy" | "triggered" | "disabled",
                )
              }
              data={[
                { value: "all", label: "All" },
                { value: "triggered", label: "Triggered" },
                { value: "healthy", label: "Healthy" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          </Group>

          <ScrollArea>
            <Card p="0" withBorder>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Metric</Table.Th>
                    <Table.Th>Threshold</Table.Th>
                    <Table.Th>Window</Table.Th>
                    <Table.Th>Recipients</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredAlerts.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text ta="center" c="dimmed">
                          No alerts match your filters.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <Table.Tr key={alert.id}>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text fw={600}>{alert.name}</Text>
                            <Tooltip
                              label={formatExactTime(alert.createdAt)}
                              withArrow
                            >
                              <Text size="xs" c="dimmed">
                                Created {formatRelativeTime(alert.createdAt)}
                              </Text>
                            </Tooltip>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <StatusDisplay
                            status={alert.status}
                            lastTriggeredAt={alert.lastTriggeredAt}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Badge color="cyan" variant="light">
                            {alert.metric}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="violet" variant="outline">
                            {formatThreshold(alert.metric, alert.threshold)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text>{alert.timeFrameMinutes} min</Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={6}>
                            {alert.emails.length > 0 && (
                              <RecipientSummary
                                items={alert.emails}
                                kind="email"
                              />
                            )}
                            {alert.slackWebhookUrls.length > 0 && (
                              <RecipientSummary
                                items={alert.slackWebhookUrls}
                                kind="webhook"
                                label="Slack"
                                color="pink"
                                icon={<SlackIcon />}
                              />
                            )}
                            {alert.genericWebhookUrls.length > 0 && (
                              <RecipientSummary
                                items={alert.genericWebhookUrls}
                                kind="webhook"
                              />
                            )}
                            {alert.emails.length === 0 &&
                              alert.slackWebhookUrls.length === 0 &&
                              alert.genericWebhookUrls.length === 0 && (
                                <Text c="dimmed">—</Text>
                              )}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Menu shadow="sm" width={220} withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Label>Alert</Menu.Label>
                              <Menu.Item
                                leftSection={<IconPencil size={14} />}
                                onClick={() => openEdit(alert)}
                              >
                                Edit
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconCopy size={14} />}
                                onClick={() => handleDuplicate(alert)}
                              >
                                Duplicate
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconPlayerPlay size={14} />}
                                onClick={() => handleTestAlert(alert)}
                              >
                                Test Webhooks
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconBellOff size={14} />}
                                onClick={() => toggleAlertStatus(alert)}
                              >
                                {alert.status === "disabled" ? "Enable" : "Disable"}
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                onClick={() => openDelete(alert)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Card>
          </ScrollArea>
        </>
      )}

      {activeAlerts.length > 0 && (
        <>
          <Title order={3}>Alert History</Title>
          <ScrollArea>
            <Card p="0" withBorder>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Start</Table.Th>
                    <Table.Th>End</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Trigger</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {alertHistory.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text ta="center" c="dimmed">
                          No alert history yet.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    alertHistory.map((h) => (
                      <Table.Tr key={h.id}>
                        <Table.Td>
                          {new Date(h.startTime).toLocaleString()}
                        </Table.Td>
                        <Table.Td>
                          {new Date(h.endTime).toLocaleString()}
                        </Table.Td>
                        <Table.Td>
                          {activeAlerts.find((a) => a.id === h.alertId)?.name ||
                            "—"}
                        </Table.Td>
                        <Table.Td>{h.trigger}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={h.status === "resolved" ? "green" : "yellow"}
                          >
                            {h.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Card>
          </ScrollArea>
        </>
      )}
      {/* Create/Edit Modal */}
      <Modal
        opened={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === "create" ? "Create Alert" : "Edit Alert"}
      >
        <AlertForm
          initial={current}
          onCancel={() => setModalMode(null)}
          onSave={handleSave}
          onTestWebhooks={triggerWebhookTest}
          isTestingWebhooks={isTestingWebhooks}
          isSaving={Boolean(isSaving)}
        />
      </Modal>
      {/* Delete Confirmation */}
      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
      >
        <Text>
          Delete alert {deleteTarget?.name}? This action can’t be undone.
        </Text>
        <Group
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Form component
function AlertForm({
  initial,
  onCancel,
  onSave,
  onTestWebhooks,
  isTestingWebhooks,
  isSaving,
}: {
  initial: Alert | null;
  onCancel: () => void;
  onSave: (data: EditableAlert) => void;
  onTestWebhooks: AlertWebhookTester;
  isTestingWebhooks: boolean;
  isSaving: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [threshold, setThreshold] = useState(
    initial ? initial.threshold.toString() : "5",
  );
  const [metric, setMetric] = useState<Metric>(initial?.metric || "error");
  const [timeFrame, setTimeFrame] = useState(
    initial ? initial.timeFrameMinutes.toString() : "10",
  );
  const [emails, setEmails] = useState<string[]>(initial?.emails || []);
  const [slackWebhooks, setSlackWebhooks] = useState<string[]>(() =>
    initial ? partitionWebhooks(initial.webhookUrls).slack : [],
  );
  const [webhookUrls, setWebhookUrls] = useState<string[]>(() =>
    initial ? partitionWebhooks(initial.webhookUrls).generic : [],
  );

  const sanitizeList = (values: string[]) =>
    values.map((value) => value.trim()).filter((value) => value.length > 0);

  const handleSlackChange = (values: string[]) => {
    const trimmed = sanitizeList(values);
    const valid: string[] = [];
    const invalid: string[] = [];
    trimmed.forEach((value) =>
      isSlackWebhook(value) ? valid.push(value) : invalid.push(value),
    );
    if (invalid.length > 0) {
      showNotification({
        title: "Slack webhook required",
        message:
          "Slack webhooks must start with https://hooks.slack.com/services/.",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    }
    setSlackWebhooks(valid);
  };

  const handleWebhookChange = (values: string[]) => {
    setWebhookUrls(sanitizeList(values));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      threshold: parseFloat(threshold),
      metric,
      timeFrameMinutes: parseInt(timeFrame, 10),
      emails,
      webhookUrls: [...slackWebhooks, ...webhookUrls],
    });
  }

  async function handleWebhookTest() {
    const combinedWebhooks = [...slackWebhooks, ...webhookUrls]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (combinedWebhooks.length === 0) {
      showNotification({
        title: "Add a webhook URL",
        message: "Enter at least one webhook URL before sending a test.",
        color: "yellow",
        icon: <IconAlertTriangle size={16} />,
      });
      return;
    }

    const trimmedName = name.trim();
    const normalizedName = trimmedName.length > 0 ? trimmedName : undefined;
    const thresholdValue = parseFloat(threshold);
    const normalizedThreshold = Number.isNaN(thresholdValue)
      ? undefined
      : thresholdValue;
    const timeFrameValue = parseInt(timeFrame, 10);
    const normalizedTimeFrame = Number.isNaN(timeFrameValue)
      ? undefined
      : timeFrameValue;

    try {
      const { successCount, failureCount, results } = await onTestWebhooks({
        name: normalizedName,
        metric,
        threshold: normalizedThreshold,
        timeFrameMinutes: normalizedTimeFrame,
        webhookUrls: combinedWebhooks,
      });

      if (failureCount === 0) {
        showNotification({
          title: "Webhook test sent",
          message: `Delivered to ${successCount} webhook${successCount === 1 ? "" : "s"}.`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
        return;
      }

      const failed = results.filter((result) => !result.ok);
      const [firstFailure] = failed;
      const detail = firstFailure
        ? `${firstFailure.url}${
            firstFailure.error
              ? `: ${firstFailure.error}`
              : firstFailure.status
                ? `: HTTP ${firstFailure.status}`
                : ""
          }`
        : "Check the target service logs.";

      showNotification({
        title:
          successCount === 0
            ? "Webhook test failed"
            : "Webhook test partially delivered",
        message:
          successCount === 0
            ? detail
            : `${successCount} succeeded, ${failureCount} failed. ${detail}`,
        color: successCount === 0 ? "red" : "orange",
        icon: <IconAlertTriangle size={16} />,
      });
    } catch (error) {
      showNotification({
        title: "Webhook test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack style={{ gap: 16 }}>
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={50}
          required
          autoFocus
        />
        <Select
          label="Metric"
          data={metricOptions}
          value={metric}
          onChange={(v) => v && setMetric(v as Metric)}
        />
        <Group wrap="nowrap">
          <NumberInput
            label="Threshold"
            value={parseFloat(threshold)}
            onChange={(v) => v !== undefined && setThreshold(v.toString())}
            min={0}
            required
          />
          <Select
            label="Time Frame (minutes)"
            data={[5, 10, 15, 30, 60].map((n) => ({
              value: n.toString(),
              label: n.toString(),
            }))}
            value={timeFrame}
            onChange={(v) => v && setTimeFrame(v)}
          />
        </Group>
        <TagsInput
          label="Emails"
          description="Recipients will receive alert notifications."
          data={[]}
          value={emails}
          onChange={setEmails}
          splitChars={[",", ";", " "]}
          placeholder="Add email and press Enter"
          clearable
          withinPortal
          allowDuplicates={false}
        />
        <TagsInput
          label="Slack Webhooks"
          description="Only Slack incoming webhook URLs are allowed."
          data={[]}
          value={slackWebhooks}
          onChange={handleSlackChange}
          splitChars={[",", ";", " "]}
          placeholder="https://hooks.slack.com/services/..."
          clearable
          withinPortal
          allowDuplicates={false}
        />
        <TagsInput
          label="Webhook URLs"
          description="Each webhook will receive a POST payload when the alert triggers."
          data={[]}
          value={webhookUrls}
          onChange={handleWebhookChange}
          splitChars={[",", ";", " "]}
          placeholder="Add webhook URL and press Enter"
          clearable
          withinPortal
          allowDuplicates={false}
        />
        <Group style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleWebhookTest}
            loading={isTestingWebhooks}
            leftSection={<IconSend size={14} />}
          >
            Test Webhooks
          </Button>
          <Button type="submit" loading={isSaving}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default AlertsPage;
