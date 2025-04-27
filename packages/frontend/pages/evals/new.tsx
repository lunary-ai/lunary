import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconDatabase,
  IconFileUpload,
  IconLayoutDashboard,
  IconApi,
  IconPlus,
} from "@tabler/icons-react";
import { useDataset, useDatasets, useProjectMutation } from "@/utils/dataHooks";
import { useEvals } from "@/utils/dataHooks/evals";
import { fetcher } from "@/utils/fetcher";
import { useRouter } from "next/router";

interface DatasetPromptRow {
  id: string;
  messages: any;
}

export default function NewEvalPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const { datasets, isLoading: loadingDatasets } = useDatasets();
  const [datasetId, setDatasetId] = useState<string>("");
  const { dataset: datasetDetail, loading: loadingDatasetDetail } =
    useDataset(datasetId);

  const [criteria, setCriteria] = useState<any[]>([]);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState({
    name: "",
    metric: "exact_match",
    threshold: "",
  });

  const { createEval, isCreating } = useEvals();
  const { trigger: createCriterion } = useProjectMutation(
    "/evals/criteria",
    fetcher.post,
  );

  const [evalName, setEvalName] = useState("");
  const [evalDescription, setEvalDescription] = useState("");

  const handleCreateEval = async () => {
    if (!datasetId || !criteria.length) return;

    const evalRes: any = await createEval({
      name: evalName || "evaluation",
      datasetId,
      description: evalDescription,
    });

    await Promise.all(
      criteria.map((c) =>
        createCriterion({
          evalId: evalRes.id,
          name: c.name,
          metric: c.metric,
          threshold: c.threshold ? Number(c.threshold) : null,
        }),
      ),
    );

    router.push(`/evals/${evalRes.id}`);
  };

  const dataSourceCards = (
    <Stack gap="sm">
      <DataSourceCard
        icon={<IconDatabase size={20} />}
        label="import dataset"
        disabled={false}
        selected={!!datasetId}
      >
        <Select
          placeholder="select dataset"
          searchable
          data={(datasets || []).map((d: any) => ({
            value: d.id,
            label: d.slug,
          }))}
          value={datasetId}
          onChange={(v) => setDatasetId(v || "")}
        />
      </DataSourceCard>

      <DataSourceCard
        icon={<IconLayoutDashboard size={20} />}
        label="try new models"
        disabled
      />
      <DataSourceCard
        icon={<IconPlus size={20} />}
        label="create new data"
        disabled
      />
      <DataSourceCard
        icon={<IconFileUpload size={20} />}
        label="upload a file"
        disabled
      />
      <DataSourceCard
        icon={<IconApi size={20} />}
        label="use the api"
        disabled
      />
    </Stack>
  );

  const datasetPreview = (
    <Box style={{ flex: 1 }}>
      {loadingDatasetDetail ? (
        <Center mt="xl">
          <Loader />
        </Center>
      ) : datasetDetail && datasetDetail.prompts?.length ? (
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>input</th>
            </tr>
          </thead>
          <tbody>
            {datasetDetail.prompts.map((p: DatasetPromptRow) => (
              <tr key={p.id}>
                <td>
                  {typeof p.messages === "string"
                    ? p.messages.slice(0, 80)
                    : p.messages[p.messages.length - 1]?.content.slice(0, 80)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Center mt="xl">
          <Text color="dimmed">select a dataset to preview</Text>
        </Center>
      )}
    </Box>
  );

  const criteriaList = (
    <Stack gap="xs">
      {criteria.map((c, idx) => (
        <Card key={idx} shadow="sm" radius="md" withBorder>
          <Group justify="space-between">
            <Text fw={500}>{c.name}</Text>
            <Text size="sm" color="dimmed">
              {c.metric}
            </Text>
          </Group>
        </Card>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={() => setCriteriaModalOpen(true)}
      >
        add criterion
      </Button>
    </Stack>
  );

  /* ─────────── step content ─────────────────────── */
  const stepContent = [
    <>
      <Group align="flex-start" gap="lg" wrap="nowrap">
        <Box style={{ width: 260 }}>
          {loadingDatasets ? <Loader /> : dataSourceCards}
        </Box>
        {datasetPreview}
      </Group>
      <Group mt="md" justify="right">
        <Button disabled={!datasetId} onClick={() => setStep(1)}>
          next
        </Button>
      </Group>
    </>,
    <>
      <Group align="flex-start" gap="lg" wrap="nowrap">
        <Box style={{ width: 260 }}>{criteriaList}</Box>
        {datasetPreview}
      </Group>
      <Group mt="md" justify="right">
        <Button variant="default" onClick={() => setStep(0)}>
          back
        </Button>
        <Button disabled={!criteria.length} onClick={() => setStep(2)}>
          next
        </Button>
      </Group>
    </>,
    <>
      <Stack gap="md">
        <TextInput
          label="evaluation name"
          required
          value={evalName}
          onChange={(e) => setEvalName(e.currentTarget.value)}
        />
        <TextInput
          label="description"
          value={evalDescription}
          onChange={(e) => setEvalDescription(e.currentTarget.value)}
        />
        <Text size="sm">
          <strong>dataset:</strong>{" "}
          {datasets?.find((d: any) => d.id === datasetId)?.slug}
        </Text>
        <Text size="sm">
          <strong>criteria:</strong> {criteria.length}
        </Text>
      </Stack>
      <Group mt="md" justify="right">
        <Button variant="default" onClick={() => setStep(1)}>
          back
        </Button>
        <Button
          loading={isCreating}
          onClick={handleCreateEval}
          disabled={!evalName || !datasetId || !criteria.length}
        >
          create evaluation
        </Button>
      </Group>
    </>,
  ];

  return (
    <Stack px="lg" py="md" style={{ height: "100%" }}>
      <Title order={2}>new evaluation</Title>
      {stepContent[step]}

      <Modal
        opened={criteriaModalOpen}
        onClose={() => setCriteriaModalOpen(false)}
        title="add criterion"
        centered
      >
        <Stack>
          <TextInput
            label="name"
            value={criteriaForm.name}
            onChange={(e) =>
              setCriteriaForm({ ...criteriaForm, name: e.currentTarget.value })
            }
          />
          <Select
            label="metric"
            data={[
              { value: "exact_match", label: "exact match" },
              { value: "rouge", label: "rouge" },
              { value: "bleu", label: "bleu" },
              { value: "cosine", label: "cosine similarity" },
            ]}
            value={criteriaForm.metric}
            onChange={(v) =>
              setCriteriaForm({ ...criteriaForm, metric: v || "exact_match" })
            }
          />
          <TextInput
            label="threshold (optional)"
            value={criteriaForm.threshold}
            onChange={(e) =>
              setCriteriaForm({
                ...criteriaForm,
                threshold: e.currentTarget.value,
              })
            }
          />
          <Group justify="right">
            <Button
              variant="default"
              onClick={() => setCriteriaModalOpen(false)}
            >
              cancel
            </Button>
            <Button
              onClick={() => {
                if (!criteriaForm.name) return;
                setCriteria([...criteria, criteriaForm]);
                setCriteriaForm({
                  name: "",
                  metric: "exact_match",
                  threshold: "",
                });
                setCriteriaModalOpen(false);
              }}
            >
              add
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function DataSourceCard({ icon, label, disabled, selected, children }: any) {
  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={(theme) => ({
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: selected ? theme.colors.gray[8] : undefined,
      })}
    >
      <Group align="center" gap="xs" mb="xs">
        {icon}
        <Text fw={500}>{label}</Text>
      </Group>
      {children}
    </Card>
  );
}
