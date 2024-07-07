import { useModelMappings } from "@/utils/dataHooks/models"
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Flex,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  TooltipFloating,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { IconTrash } from "@tabler/icons-react"

export default function Models() {
  const { models, insert, isInserting, remove } = useModelMappings()

  const form = useForm({
    initialValues: {
      name: "gpt-4-preview",
      pattern: "(?i)^(gpt-4-preview)$",
      unit: "TOKENS",
      inputCost: 0.01,
      outputCost: 0.01,
      tokenizer: "openai",
      startDate: new Date(),
    },

    validate: {},
  })

  async function handleInsert() {
    try {
      await insert(form.values)
    } catch (error) {
      console.error(error)
    }
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
              placeholder="Enter model name"
              required
              key={form.key("name")}
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Match Regex"
              placeholder="Enter match regex"
              required
              key={form.key("pattern")}
              {...form.getInputProps("pattern")}
            />
            <Select
              label="Tokenizer"
              placeholder="Select tokenizer"
              required
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
              data={[
                { value: "TOKENS", label: "Tokens" },
                { value: "CHARACTERS", label: "Characters" },
                { value: "MILLISECONDS", label: "Milliseconds" },
              ]}
              key={form.key("unit")}
              {...form.getInputProps("unit")}
            />
            <NumberInput
              label="Input Cost"
              placeholder="Enter input cost in USD"
              required
              key={form.key("inputCost")}
              {...form.getInputProps("inputCost")}
            />
            <NumberInput
              label="Output Cost"
              placeholder="Enter output cost in USD"
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
              Add Model
            </Button>
          </Flex>
        </Card>
        <Card withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Model Name</Table.Th>
                <Table.Th>Match Regex</Table.Th>
                <Table.Th>Unit</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>
                  Input Cost
                  <br />/ M
                </Table.Th>
                <Table.Th>
                  Output Cost
                  <br />/ M
                </Table.Th>
                <Table.Th>Tokenizer</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {models?.map((model) => (
                <Table.Tr key={model.id}>
                  <Table.Td>
                    {model.orgId ? (
                      <Tooltip label="Custom mapping defined by you. Takes precedence over default.">
                        <Badge color="pink">custom</Badge>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Price defined by Lunary. Can be overwritten.">
                        <Badge color="blue">default</Badge>
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
                        onClick={() => remove(model.id)}
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
  )
}
