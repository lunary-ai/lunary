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
  switch (metric) {
    case "error":
    case "feedback":
      return `${value}%`;
    case "cost":
      return `$${value}`;
    default:
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
  // state -------------------------------------------------------------------
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([
    {
      id: "1745933423983",
      createdAt: "2025-04-29T13:30:23.983Z",
      status: "healthy",
      name: "Error rate",
      threshold: 5,
      metric: "error",
      timeFrameMinutes: 10,
      email: "admin@example.com",
      webhookUrl: "https://hooks.example.com/error-rate",
    },
  ]);

  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([
    {
      id: "hist1",
      alertId: "1745933423983",
      startTime: "2025-04-28T10:00:00Z",
      endTime: "2025-04-28T10:05:00Z",
      trigger: 8,
      status: "resolved",
    },
    {
      id: "hist2",
      alertId: "1745933423983",
      startTime: "2025-04-27T18:12:00Z",
      endTime: "2025-04-27T18:17:00Z",
      trigger: 11,
      status: "resolved",
    },
    {
      id: "hist3",
      alertId: "1745933423983",
      startTime: "2025-04-26T09:20:00Z",
      endTime: "2025-04-26T09:28:00Z",
      trigger: 7,
      status: "resolved",
    },
    {
      id: "hist4",
      alertId: "1745933423983",
      startTime: "2025-04-25T14:40:00Z",
      endTime: "2025-04-25T14:46:00Z",
      trigger: 9,
      status: "resolved",
    },
  ]);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [current, setCurrent] = useState<Alert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);

  // open modal via query -----------------------------------------------------
  useEffect(() => {
    const q = router.query;
    if (q.modal === "create") openCreate();
    if (q.modal === "edit" && typeof q.id === "string") {
      const target = activeAlerts.find((a) => a.id === q.id);
      if (target) openEdit(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query]);

  // helpers -----------------------------------------------------------------
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

  const handleSave = (data: Omit<Alert, "id" | "createdAt" | "status">) => {
    if (modalMode === "create") {
      const newAlert: Alert = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: "healthy",
        ...data,
      };
      setActiveAlerts([newAlert, ...activeAlerts]);
    } else if (modalMode === "edit" && current) {
      const updated = { ...current, ...data } as Alert;
      setActiveAlerts(
        activeAlerts.map((a) => (a.id === current.id ? updated : a)),
      );
    }
    setModalMode(null);
    setCurrent(null);
    router.replace("/alerts", undefined, { shallow: true });
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setAlertHistory([
        {
          id: Date.now().toString(),
          alertId: deleteTarget.id,
          startTime: deleteTarget.createdAt,
          endTime: new Date().toISOString(),
          trigger: deleteTarget.threshold,
          status: "resolved",
        },
        ...alertHistory,
      ]);
      // remove
      setActiveAlerts(activeAlerts.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  // -------------------------------------------------------------------------
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
                      <Table.Td>{formatThreshold("error", h.trigger)}</Table.Td>
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
const AlertForm: React.FC<{
  initial: Alert | null;
  onCancel: () => void;
  onSave: (data: Omit<Alert, "id" | "createdAt" | "status">) => void;
}> = ({ initial, onCancel, onSave }) => {
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
};

export default AlertsPage;
