import { useContext, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconArrowRight,
  IconDatabase,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import Router from "next/router";
import { ProjectContext } from "@/utils/context";
import {
  DatasetV2,
  useCreateDatasetV2,
  useDatasetsV2,
  useOrg,
} from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";

const PAGE_SIZE = 20;

function CreateDatasetModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (dataset: DatasetV2) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { createDataset, creating } = useCreateDatasetV2();

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setError(null);

    try {
      const dataset = await createDataset({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
      });

      if (dataset) {
        onCreated(dataset as DatasetV2);
        setName("");
        setDescription("");
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group wrap="nowrap" gap="xs">
          <IconDatabase size={16} />
          <Text fw={500}>Create dataset</Text>
        </Group>
      }
      centered
      size="lg"
    >
      <Stack>
        <TextInput
          label="Name"
          placeholder="My evaluation dataset"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          error={error}
          required
          autoFocus
        />
        <TextInput
          label="Description"
          placeholder="Optional context for this dataset"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={creating} onClick={handleSubmit}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function DatasetsV2Page() {
  const { projectId } = useContext(ProjectContext);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { org } = useOrg();

  useEffect(() => {
    if (org?.useLegacyDatasets) {
      Router.replace("/legacy-datasets");
    }
  }, [org?.useLegacyDatasets]);

  if (org?.useLegacyDatasets) {
    return null;
  }

  const {
    datasets,
    pagination,
    isLoading,
    isValidating,
    mutate,
  } = useDatasetsV2({
    page,
    pageSize: PAGE_SIZE,
  });

  const isEmptyState =
    !isLoading && !isValidating && datasets && datasets.length === 0;

  const totalPages = pagination.totalPages || 0;

  function openDeleteModal(dataset: DatasetV2) {
    modals.openConfirmModal({
      title: "Delete dataset",
      centered: true,
      confirmProps: { color: "red" },
      children: (
        <Text size="sm">
          Are you sure you want to delete{" "}
          <Text span fw={600}>
            {dataset.name}
          </Text>
          ? This action is permanent.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        if (!projectId) {
          return;
        }

        await fetcher.delete(
          `/datasets-v2/${dataset.id}?projectId=${projectId}`,
        );
        mutate();
      },
    });
  }

  const filteredDatasets = useMemo(() => {
    if (!search.trim()) {
      return datasets || [];
    }
    const term = search.trim().toLowerCase();
    return (datasets || []).filter((dataset) =>
      dataset.name.toLowerCase().includes(term),
    );
  }, [datasets, search]);

  const rows = useMemo(() => {
    return filteredDatasets.map((dataset) => (
      <Table.Tr key={dataset.id}>
        <Table.Td>
          <Stack gap={4}>
            <Group gap="xs">
              <Anchor
                component={Link}
                href={`/datasets/${dataset.id}`}
                fw={600}
                size="sm"
              >
                {dataset.name}
              </Anchor>
              {dataset.itemCount > 0 && (
                <Badge variant="light" size="sm">
                  {dataset.itemCount} item
                  {dataset.itemCount === 1 ? "" : "s"}
                </Badge>
              )}
            </Group>
            {dataset.description && (
              <Text size="xs" c="dimmed">
                {dataset.description}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              Created {new Date(dataset.createdAt).toLocaleString()}
            </Text>
          </Stack>
        </Table.Td>
        <Table.Td width={180}>
          <Group gap="xs" justify="flex-end">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => openDeleteModal(dataset)}
            >
              <IconTrash size={16} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              onClick={() => Router.push(`/datasets/${dataset.id}`)}
            >
              <IconArrowRight size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>
    ));
  }, [filteredDatasets]);

  const showFilteredEmpty =
    !isLoading &&
    !isEmptyState &&
    filteredDatasets.length === 0 &&
    search.trim().length > 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Stack gap={0}>
          <Title order={2}>Datasets V2</Title>
          <Text size="sm" c="dimmed">
            Organize evaluation samples per project and edit them inline.
          </Text>
        </Stack>
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => setCreateOpen(true)}
        >
          New dataset
        </Button>
      </Group>

      <TextInput
        placeholder="Search datasets by name"
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(1);
        }}
      />

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : showFilteredEmpty ? (
        <Stack align="center" py="5rem">
          <IconDatabase size={42} stroke={1.2} />
          <Stack gap={4} align="center">
            <Text fw={600}>No datasets found</Text>
            <Text c="dimmed" size="sm" ta="center">
              Try a different name.
            </Text>
          </Stack>
        </Stack>
      ) : isEmptyState ? (
        <Stack align="center" py="5rem">
          <IconDatabase size={42} stroke={1.2} />
          <Stack gap={4} align="center">
            <Text fw={600}>No datasets yet</Text>
            <Text c="dimmed" size="sm" ta="center">
              Create a dataset to start organizing your evaluation samples.
            </Text>
          </Stack>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Create dataset
          </Button>
        </Stack>
      ) : (
        <Stack gap="md">
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Dataset</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
          {totalPages > 1 && (
            <Pagination
              value={page}
              onChange={setPage}
              total={totalPages}
              size="sm"
            />
          )}
        </Stack>
      )}

      <CreateDatasetModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(dataset) => {
          setCreateOpen(false);
          mutate();
          Router.push(`/datasets/${dataset.id}`);
        }}
      />
    </Stack>
  );
}
