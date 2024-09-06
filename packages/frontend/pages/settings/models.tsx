import { useModelMappings } from "@/utils/dataHooks/models";
import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Flex,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";

import { IconTrash } from "@tabler/icons-react";

export default function Models() {
  const { models, insert, isInserting, mutate } = useModelMappings();

  const form = useForm({
    initialValues: {
      name: "gpt-4o",
      pattern: "^(gpt-4o)$",
      unit: "TOKENS",
      inputCost: 1,
      outputCost: 1,
      tokenizer: "openai",
      startDate: new Date(),
    },

    validate: {
      name: (value) => (value.length < 3 ? "Name is too short" : undefined),
      pattern: (value) =>
        value.length < 3 ? "Pattern is too short" : undefined,
      unit: (value) => (!value ? "Unit is required" : undefined),
      inputCost: (value) =>
        value < 0 ? "Input cost must be greater than 0" : undefined,
      outputCost: (value) =>
        value < 0 ? "Output cost must be greater than 0" : undefined,
      tokenizer: (value) => (!value ? "Tokenizer is required" : undefined),
    },
  });

  async function handleInsert() {
    try {
      await insert(form.values);
    } catch (error) {
      console.error(error);
    }
  }

  async function removeMapping(id) {
    modals.openConfirmModal({
      title: "Please confirm your action",
      confirmProps: { color: "red" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this model mapping? This action cannot
          be undone.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onConfirm: async () => {
        await errorHandler(fetcher.delete(`/models/${id}`));
        mutate();
      },
    });
  }

  return (
    <Container>
      <Stack>
        <Title order={1}>Cost Mappings</Title>
        <Text>Add custom models and cost mappings to your project.</Text>
        <Card withBorder>
          <SimpleGrid cols={3} spacing="md">
            <TextInput
              label="Model Name"
              description="Name of the model"
              placeholder="Enter model name"
              required
              key={form.key("name")}
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Pattern (Regex)"
              placeholder="Enter the pattern regex"
              description="Case insensitive by default"
              required
              key={form.key("pattern")}
              {...form.getInputProps("pattern")}
            />
            <Select
              label="Tokenizer"
              placeholder="Select tokenizer"
              required
              description="Tokenizer used for token counting"
              disabled={form.values.unit === "MILLISECONDS"}
              key={form.key("tokenizer")}
              {...form.getInputProps("tokenizer")}
              data={[
                { value: "openai", label: "OpenAI" },
                { value: "anthropic", label: "Anthropic" },
                { value: "google", label: "Google" },
                { value: "mistral", label: "Mistral" },
                { value: "", label: "None" },
              ]}
            />
            <Select
              label="Unit"
              placeholder="Select unit"
              defaultValue="TOKENS"
              description="Unit of measurement"
              data={[
                { value: "TOKENS", label: "Tokens" },
                { value: "CHARACTERS", label: "Characters" },
                // { value: "MILLISECONDS", label: "Duration" }, disabled for now
              ]}
              key={form.key("unit")}
              {...form.getInputProps("unit")}
            />
            <NumberInput
              label="Input Cost"
              placeholder="Enter input cost in USD"
              description={
                form.values.unit === "MILLISECONDS"
                  ? "Cost per second"
                  : "Cost per million"
              }
              required
              key={form.key("inputCost")}
              {...form.getInputProps("inputCost")}
            />
            <NumberInput
              label="Output Cost"
              placeholder="Enter output cost in USD"
              description={
                form.values.unit === "MILLISECONDS"
                  ? "Cost per second"
                  : "Cost per million"
              }
              disabled={form.values.unit === "MILLISECONDS"}
              required
              key={form.key("outputCost")}
              {...form.getInputProps("outputCost")}
            />
          </SimpleGrid>

          <Flex justify="flex-end" w="100%" mt="md">
            <Button
              loading={isInserting}
              style={{ float: "right" }}
              variant="default"
              size="sm"
              onClick={() => handleInsert()}
            >
              Add Model Mapping
            </Button>
          </Flex>
        </Card>
        <Card withBorder p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>Regex</Table.Th>
                <Table.Th>Unit</Table.Th>
                <Table.Th>Apply Date</Table.Th>
                <Table.Th>Input $ / M</Table.Th>
                <Table.Th>Output $ / M</Table.Th>
                <Table.Th>Tokenizer</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {models?.map((model) => (
                <Table.Tr key={model.id}>
                  <Table.Td>
                    {model.orgId ? (
                      <Tooltip label="Custom mapping defined by you. Takes precedence over default.">
                        <Badge color="pink" variant="light">
                          custom
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Price defined by Lunary. Can be overwritten.">
                        <Badge color="cyan" variant="light">
                          default
                        </Badge>
                      </Tooltip>
                    )}
                  </Table.Td>
                  <Table.Td>{model.name}</Table.Td>
                  <Table.Td>
                    <Code>{model.pattern}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{model.unit}</Text>
                  </Table.Td>
                  <Table.Td>
                    {model.startDate
                      ? new Date(model.startDate).toLocaleDateString()
                      : "-"}
                  </Table.Td>
                  <Table.Td>${model.inputCost}</Table.Td>
                  <Table.Td>${model.outputCost}</Table.Td>
                  <Table.Td>{model.tokenizer}</Table.Td>
                  {model.orgId && (
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        ml={-10}
                        onClick={() => removeMapping(model.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Container>
  );
}
