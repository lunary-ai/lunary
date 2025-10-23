import {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Modal,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  Menu,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/router";
import { modals } from "@mantine/modals";
import {
  IconCopy,
  IconDotsVertical,
  IconFolders,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { formatCompactFromNow } from "@/utils/format";
import {
  DatasetSort,
  DatasetV2,
  useDatasetsV2,
  useDatasetV2Mutations,
} from "@/utils/dataHooks/dataset";

const SORT_OPTIONS: Array<{ label: string; value: DatasetSort }> = [
  { label: "Newest", value: "newest" },
  { label: "A → Z", value: "alphabetical" },
  { label: "Most items", value: "items" },
  { label: "Last updated", value: "updated" },
];

function getOwnerInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (
      (parts[0][0] ?? "").toUpperCase() +
      (parts[parts.length - 1][0] ?? "").toUpperCase()
    );
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "—";
}

function DatasetRow({
  dataset,
  onRefresh,
}: {
  dataset: DatasetV2;
  onRefresh: () => void;
}) {
  const router = useRouter();

  const { duplicateDataset, deleteDataset, isDuplicating, isDeleting } =
    useDatasetV2Mutations(dataset.id);

  const handleOpen = () => {
    router.push(`/datasets/v2/${dataset.id}`);
  };

  const handleDuplicate = async (event: MouseEvent) => {
    event.stopPropagation();
    try {
      await duplicateDataset(undefined, {
        onSuccess(newDataset) {
          notifications.show({
            title: "Dataset duplicated",
            message: `“${newDataset.name}” was created from “${dataset.name}”.`,
            color: "green",
          });
          onRefresh();
        },
      });
    } catch (error) {
      // errors are surfaced by the fetcher notification handler
    }
  };

  const handleDelete = (event: MouseEvent) => {
    event.stopPropagation();

    modals.openConfirmModal({
      title: "Delete dataset?",
      confirmProps: { color: "red" },
      labels: { confirm: "Delete", cancel: "Cancel" },
      centered: true,
      children: (
        <Text size="sm">
          This will permanently delete &ldquo;{dataset.name}&rdquo; and all of
          its items. You cannot undo this action.
        </Text>
      ),
      onConfirm: async () => {
        try {
          await deleteDataset(undefined, {
            onSuccess() {
              notifications.show({
                title: "Dataset deleted",
                message: `“${dataset.name}” has been removed.`,
                color: "green",
              });
              onRefresh();
            },
          });
        } catch (error) {
          // handled by fetcher
        }
      },
    });
  };

  return (
    <Table.Tr onClick={handleOpen} style={{ cursor: "pointer" }}>
      <Table.Td w="25%">
        <Text fw={600}>{dataset.name}</Text>
      </Table.Td>
      <Table.Td w="30%">
        {dataset.description ? (
          <Tooltip
            label={dataset.description}
            disabled={dataset.description.length < 80}
            withArrow
          >
            <Text size="sm" c="dimmed" lineClamp={1}>
              {dataset.description}
            </Text>
          </Tooltip>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        )}
      </Table.Td>
      <Table.Td w="10%">
        <Text size="sm" fw={600}>
          {dataset.itemCount ?? 0}{" "}
          {(dataset.itemCount ?? 0) === 1 ? "item" : "items"}
        </Text>
      </Table.Td>
      <Table.Td w="15%">
        <Tooltip label={new Date(dataset.updatedAt).toLocaleString()}>
          <Text size="sm">{formatCompactFromNow(dataset.updatedAt)}</Text>
        </Tooltip>
      </Table.Td>
      <Table.Td w="15%">
        <Group gap="xs">
          <Avatar size="sm" radius="xl">
            {getOwnerInitials(dataset.ownerName, dataset.ownerEmail)}
          </Avatar>
          <Text size="sm">
            {dataset.ownerName || dataset.ownerEmail || "—"}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td w="5%" onClick={(event) => event.stopPropagation()}>
        <Group justify="flex-end">
          <MenuActions
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            isDuplicating={isDuplicating}
            isDeleting={isDeleting}
          />
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

function MenuActions({
  onDuplicate,
  onDelete,
  isDuplicating,
  isDeleting,
}: {
  onDuplicate: (event: MouseEvent) => void;
  onDelete: (event: MouseEvent) => void;
  isDuplicating: boolean;
  isDeleting: boolean;
}) {
  return (
    <Menu shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" aria-label="Dataset actions">
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconCopy size={16} />}
          onClick={onDuplicate}
          disabled={isDuplicating || isDeleting}
        >
          Duplicate
        </Menu.Item>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
          disabled={isDeleting || isDuplicating}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

type UploadData = {
  name: string;
  format: "csv" | "jsonl";
  content: string;
  size: number;
  rowCount: number;
};

type CreateDatasetPayload = {
  name: string;
  description: string;
  file?: UploadData;
};

function CreateDatasetModal({
  opened,
  onClose,
  onSubmit,
  isSubmitting,
  isImporting,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDatasetPayload) => Promise<void>;
  isSubmitting: boolean;
  isImporting: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!opened) {
      setName("");
      setDescription("");
      setUploadData(null);
      setUploadError(null);
      setIsReadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [opened]);

  const handleClose = () => {
    if (isSubmitting || isImporting) return;
    setName("");
    setDescription("");
    setUploadData(null);
    setUploadError(null);
    onClose();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "csv" && extension !== "jsonl") {
      setUploadError("Only CSV and JSONL files are supported");
      setUploadData(null);
      event.target.value = "";
      return;
    }

    setUploadError(null);
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result ?? "";
      const content =
        typeof result === "string" ? result.replace(/^\uFEFF/, "") : "";
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setUploadError("The selected file is empty");
        setUploadData(null);
        setIsReadingFile(false);
        event.target.value = "";
        return;
      }

      const rowCount =
        extension === "csv" ? Math.max(lines.length - 1, 0) : lines.length;

      setUploadData({
        name: file.name,
        format: extension as "csv" | "jsonl",
        content,
        size: file.size,
        rowCount,
      });
      setIsReadingFile(false);
      event.target.value = "";
    };

    reader.onerror = () => {
      setUploadError("Failed to read the selected file");
      setUploadData(null);
      setIsReadingFile(false);
      event.target.value = "";
    };

    reader.readAsText(file);
  };

  const handleRemoveFile = () => {
    setUploadData(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        file: uploadData ?? undefined,
      });
      setName("");
      setDescription("");
      setUploadData(null);
      setUploadError(null);
    } catch (error) {
      // submission errors handled upstream
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create dataset"
      centered
    >
      <Stack gap="sm">
        <TextInput
          label="Name"
          placeholder="Evaluation dataset"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          required
          disabled={isSubmitting || isImporting}
          data-autofocus
        />
        <Textarea
          label="Description"
          placeholder="Optional context for collaborators"
          minRows={3}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          disabled={isSubmitting || isImporting}
        />
        <Stack gap="xs">
          <input
            type="file"
            hidden
            ref={fileInputRef}
            accept=".csv,.jsonl"
            onChange={handleFileChange}
          />
          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || isImporting || isReadingFile}
          >
            {uploadData ? "Replace file" : "Upload CSV or JSONL"}
          </Button>
          {uploadError && (
            <Text size="xs" c="red">
              {uploadError}
            </Text>
          )}
          {uploadData && (
            <Group gap="xs">
              <Badge variant="light">{uploadData.format.toUpperCase()}</Badge>
              <Text size="sm">{uploadData.name}</Text>
              <Text size="xs" c="dimmed">
                {uploadData.rowCount}{" "}
                {uploadData.rowCount === 1 ? "row" : "rows"}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={handleRemoveFile}
                aria-label="Remove file"
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
          )}
        </Stack>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={handleClose}
            disabled={isSubmitting || isImporting}
          >
            Cancel
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleSubmit}
            loading={isSubmitting || isImporting || isReadingFile}
            disabled={!name.trim() || isReadingFile}
          >
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function LoadingSkeleton() {
  return (
    <Table verticalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Items</Table.Th>
          <Table.Th>Last updated</Table.Th>
          <Table.Th>Owner</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Array.from({ length: 5 }).map((_, index) => (
          <Table.Tr key={index}>
            <Table.Td>
              <Skeleton height={16} width="60%" />
            </Table.Td>
            <Table.Td>
              <Skeleton height={14} width="85%" />
            </Table.Td>
            <Table.Td>
              <Skeleton height={14} width={40} />
            </Table.Td>
            <Table.Td>
              <Skeleton height={14} width="50%" />
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Skeleton height={32} width={32} radius="xl" />
                <Skeleton height={14} width={80} />
              </Group>
            </Table.Td>
            <Table.Td>
              <Skeleton height={14} width={24} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function PrimaryEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <ThemeIcon variant="light" radius="xl" size={64}>
          <IconFolders size={32} />
        </ThemeIcon>
        <Title order={3}>Your datasets will appear here</Title>
        <Text size="sm" c="dimmed" ta="center">
          Create a dataset to label, annotate, and evaluate your data. cases.
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={onCreate}
          variant="default"
        >
          Create
        </Button>
        <Button
          component="a"
          href="https://lunary.ai/docs/datasets"
          target="_blank"
          rel="noreferrer"
          variant="subtle"
        >
          Documentation
        </Button>
      </Stack>
    </Center>
  );
}

function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <Title order={4}>No datasets match your search</Title>
        <Text size="sm" c="dimmed" ta="center">
          Try another keyword or reset your filters to see all datasets.
        </Text>
        <Button variant="default" onClick={onClear}>
          Clear filters
        </Button>
      </Stack>
    </Center>
  );
}

function DatasetV2List() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [sort, setSort] = useState<DatasetSort>("newest");
  const [isModalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const {
    datasets,
    isLoading,
    isValidating,
    mutate,
    createDataset,
    isCreating,
    importDatasetItems,
  } = useDatasetsV2({
    search: debouncedSearch,
    sort,
  });
  const [isImporting, setIsImporting] = useState(false);

  const hasSearch = Boolean(debouncedSearch);
  const isEmpty = datasets.length === 0;

  const handleCreate = async ({
    name,
    description,
    file,
  }: CreateDatasetPayload) => {
    const payload = {
      name,
      description: description ? description : null,
    };

    let created = await createDataset(payload);

    if (!created) {
      return;
    }

    notifications.show({
      title: "Dataset created",
      message: `“${created.name}” is ready to use.`,
      color: "green",
    });

    if (file && created.id) {
      setIsImporting(true);
      try {
        const result = await importDatasetItems(created.id, {
          format: file.format,
          content: file.content,
        });
        if (result?.insertedCount) {
          notifications.show({
            title: "Items imported",
            message: `Added ${result.insertedCount} ${
              result.insertedCount === 1 ? "item" : "items"
            } to “${created.name}”.`,
            color: "green",
          });
        }
      } catch (error) {
        // error notification handled by fetcher
      } finally {
        setIsImporting(false);
      }
    } else if (created.id) {
      setIsImporting(true);
      try {
        const placeholderContent = Array.from({ length: 5 })
          .map(() => JSON.stringify({ input: "", expected_output: null }))
          .join("\n");
        await importDatasetItems(created.id, {
          format: "jsonl",
          content: placeholderContent,
        });
      } catch (error) {
        notifications.show({
          title: "Placeholder rows",
          message:
            "Dataset was created but default rows could not be added automatically.",
          color: "yellow",
        });
      } finally {
        setIsImporting(false);
      }
    }

    await mutate();
    closeModal();
    if (created.id) {
      router.push(`/datasets/v2/${created.id}`);
    }
  };

  const controls = (
    <Group align="center" justify="space-between">
      <TextInput
        placeholder="Search datasets"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        w="50%"
      />
      <Group gap="sm">
        {isValidating && !isLoading && (
          <Group gap={4}>
            <Loader size="xs" />
            <Text size="xs" c="dimmed">
              Updating…
            </Text>
          </Group>
        )}
        <Select
          placeholder="Sort"
          aria-label="Sort datasets"
          data={SORT_OPTIONS}
          value={sort}
          onChange={(value) => {
            setSort((value as DatasetSort) ?? "newest");
          }}
          withinPortal
          comboboxProps={{ withinPortal: true }}
          style={{ width: 200 }}
        />
      </Group>
    </Group>
  );

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <Group align="center" justify="space-between">
          <Title order={2}>Datasets</Title>
          <Button
            variant="default"
            leftSection={<IconPlus size={12} />}
            onClick={openModal}
          >
            Create
          </Button>
        </Group>
        {controls}

        {isLoading ? (
          <LoadingSkeleton />
        ) : isEmpty ? (
          hasSearch ? (
            <FilterEmptyState
              onClear={() => {
                setSearch("");
              }}
            />
          ) : (
            <PrimaryEmptyState onCreate={openModal} />
          )
        ) : (
          <Table highlightOnHover verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th>Last updated</Table.Th>
                <Table.Th>Owner</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {datasets.map((dataset) => (
                <DatasetRow
                  key={dataset.id}
                  dataset={dataset}
                  onRefresh={() => mutate()}
                />
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <CreateDatasetModal
        opened={isModalOpen}
        onClose={closeModal}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
        isImporting={isImporting}
      />
    </Container>
  );
}

export default DatasetV2List;
