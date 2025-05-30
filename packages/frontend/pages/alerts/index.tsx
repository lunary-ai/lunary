import React, { useState, useEffect } from "react";
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
} from "@mantine/core";
import { IconBell, IconPencil, IconTrash, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useAlerts, useAlert, useAlertHistory } from "@/utils/dataHooks/alerts";

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

// types ---------------------------------------------------------------------
export interface Alert {
  id: string;
  name: string;
  status: "healthy" | "triggered" | "disabled";
  threshold: number;
  metric: Metric;
  timeFrameMinutes: number;
  email: string; // single email
  webhookUrl: string;
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

function AlertsPage() {
  const router = useRouter();

  // data hooks for alerts and history
  const {
    alerts: activeAlerts,
    isLoading: loadingAlerts,
    create,
    isCreating,
    mutate: mutateAlerts,
  } = useAlerts();
  const {
    history: alertHistory,
    isLoading: loadingHistory,
    mutate: mutateHistory,
  } = useAlertHistory();

  // state for modal & selected
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [current, setCurrent] = useState<Alert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);

  // hook for updating current alert
  const { update } = useAlert(current?.id || "");
  // hook for deleting selected alert
  const { remove: deleteAlert } = useAlert(deleteTarget?.id || "");

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

  // handle save
  async function handleSave(data: Omit<Alert, "id" | "createdAt" | "status">) {
    // omit empty optional fields to satisfy backend zod schema
    const payload = {
      name: data.name,
      threshold: data.threshold,
      metric: data.metric,
      timeFrameMinutes: data.timeFrameMinutes,
      ...(data.email ? { email: data.email } : {}),
      ...(data.webhookUrl ? { webhookUrl: data.webhookUrl } : {}),
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

  // show loading state if needed
  if (loadingAlerts) {
    return <Text>Loading alerts...</Text>;
  }

  return (
    <Stack style={{ gap: 24, padding: 16 }}>
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
          <Button onClick={openCreate}>
            <IconPlus size={16} style={{ marginRight: 8 }} />
            Create Alert
          </Button>
        </Stack>
      ) : (
        <>
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
          <ScrollArea>
            <Card p="0" withBorder>
              <Table highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th>Threshold</Table.Th>
                    <Table.Th>Metric</Table.Th>
                    <Table.Th>Time Frame</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Webhook</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {activeAlerts.map((alert) => (
                    <Table.Tr key={alert.id}>
                      <Table.Td>{alert.name}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            alert.status === "healthy"
                              ? "green"
                              : alert.status === "triggered"
                                ? "red"
                                : "gray"
                          }
                        >
                          <span style={{ textTransform: "capitalize" }}>
                            {alert.status}
                          </span>
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {new Date(alert.createdAt).toLocaleString()}
                      </Table.Td>
                      <Table.Td>
                        {formatThreshold(alert.metric, alert.threshold)}
                      </Table.Td>
                      <Table.Td>{alert.metric}</Table.Td>
                      <Table.Td>{alert.timeFrameMinutes}m</Table.Td>
                      <Table.Td>{alert.email}</Table.Td>
                      <Table.Td>{alert.webhookUrl}</Table.Td>
                      <Table.Td>
                        <Group style={{ display: "flex", gap: 8 }}>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openEdit(alert)}
                          >
                            <IconPencil size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            color="red"
                            size="xs"
                            onClick={() => openDelete(alert)}
                          >
                            <IconTrash size={16} />
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </ScrollArea>
          <Title order={3}>Alert History</Title>
          <ScrollArea>
            <Card p="0" withBorder>
              <Table highlightOnHover striped>
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
                  {alertHistory.map((h) => (
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
                  ))}
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
}: {
  initial: Alert | null;
  onCancel: () => void;
  onSave: (data: Omit<Alert, "id" | "createdAt" | "status">) => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [threshold, setThreshold] = useState(
    initial ? initial.threshold.toString() : "5",
  );
  const [metric, setMetric] = useState<Metric>(initial?.metric || "error");
  const [timeFrame, setTimeFrame] = useState(
    initial ? initial.timeFrameMinutes.toString() : "10",
  );
  const [email, setEmail] = useState(initial?.email || "");
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      threshold: parseFloat(threshold),
      metric,
      timeFrameMinutes: parseInt(timeFrame, 10),
      email,
      webhookUrl,
    });
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
        <TextInput
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <TextInput
          label="Webhook URL"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.currentTarget.value)}
        />
        <Group style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </Group>
      </Stack>
    </form>
  );
}

export default AlertsPage;
