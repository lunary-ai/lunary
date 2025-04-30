import { useState, useEffect } from "react"
import {
  Button,
  Card,
  Checkbox,
  TextInput,
  NumberInput,
  Switch,
  Tabs,
  Modal,
  ScrollArea,
  Title,
  Text,
  Group,
  Stack,
  Select,
  ActionIcon,
} from "@mantine/core"
import { IconSettings, IconX } from "@tabler/icons-react"
import type { EvaluatorConfig } from "@/types/evaluator-types"

interface EvaluatorSettingsProps {
  evaluators: EvaluatorConfig[]
  onUpdateEvaluators: (evaluators: EvaluatorConfig[]) => void
}

export function EvaluatorSettings({ evaluators, onUpdateEvaluators }: EvaluatorSettingsProps) {
  const [opened, setOpened] = useState(false)
  const [localEvaluators, setLocalEvaluators] = useState<EvaluatorConfig[]>(evaluators)

  // Update local evaluators when props change
  useEffect(() => {
    setLocalEvaluators(evaluators)
  }, [evaluators])

  const handleToggleEvaluator = (id: string, enabled: boolean) => {
    setLocalEvaluators(
      localEvaluators.map((evaluator) => (evaluator.id === id ? { ...evaluator, enabled } : evaluator)),
    )
  }

  const handleUpdateParameter = (evaluatorId: string, parameterId: string, value: any) => {
    setLocalEvaluators(
      localEvaluators.map((evaluator) =>
        evaluator.id === evaluatorId
          ? {
              ...evaluator,
              parameters: {
                ...evaluator.parameters,
                [parameterId]: value,
              },
            }
          : evaluator,
      ),
    )
  }

  const handleSave = () => {
    onUpdateEvaluators(localEvaluators)
    setOpened(false)
  }

  const handleCancel = () => {
    setLocalEvaluators(evaluators)
    setOpened(false)
  }

  return (
    <>
      <Button variant="outline" leftSection={<IconSettings size={16} />} onClick={() => setOpened(true)}>
        Configure Evaluators
      </Button>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Configure Evaluators" size="xl">
        <Text size="sm" c="dimmed" mb="md">
          Select and configure evaluators to assess the quality of generated responses.
        </Text>

        <Tabs defaultValue="available">
          <Tabs.List>
            <Tabs.Tab value="available">Available Evaluators</Tabs.Tab>
            <Tabs.Tab value="enabled">Enabled Evaluators ({localEvaluators.filter((e) => e.enabled).length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="available" pt="md">
            <ScrollArea h={500} pr="md">
              <Stack gap="md">
                {localEvaluators.map((evaluator) => (
                  <Card
                    key={evaluator.id}
                    withBorder
                    padding="md"
                    style={{
                      borderColor: evaluator.enabled ? "#d1e7ff" : undefined,
                      backgroundColor: evaluator.enabled ? "#f0f7ff" : undefined,
                    }}
                  >
                    <Card.Section withBorder inheritPadding py="xs">
                      <Group justify="space-between">
                        <Title order={5}>{evaluator.name}</Title>
                        <Switch
                          checked={evaluator.enabled}
                          onChange={(event) => handleToggleEvaluator(evaluator.id, event.currentTarget.checked)}
                        />
                      </Group>
                    </Card.Section>

                    <Text size="sm" c="dimmed" mt="xs">
                      {evaluator.description}
                    </Text>

                    {evaluator.enabled && (
                      <Stack gap="md" mt="md">
                        {evaluator.parameterDefinitions.map((param) => (
                          <Stack key={param.id} gap="xs">
                            <Text size="sm" fw={500}>
                              {param.name}
                            </Text>
                            <Group align="flex-start">
                              {param.type === "boolean" ? (
                                <Checkbox
                                  checked={evaluator.parameters[param.id]}
                                  onChange={(event) =>
                                    handleUpdateParameter(evaluator.id, param.id, event.currentTarget.checked)
                                  }
                                />
                              ) : param.type === "number" ? (
                                <NumberInput
                                  value={evaluator.parameters[param.id]}
                                  min={param.min}
                                  max={param.max}
                                  step={0.1}
                                  onChange={(value) => handleUpdateParameter(evaluator.id, param.id, value)}
                                  w={100}
                                />
                              ) : param.type === "select" ? (
                                <Select
                                  value={evaluator.parameters[param.id].toString()}
                                  data={
                                    param.options?.map((option) => ({
                                      value: option.value.toString(),
                                      label: option.label,
                                    })) || []
                                  }
                                  onChange={(value) => handleUpdateParameter(evaluator.id, param.id, value)}
                                  w={160}
                                />
                              ) : (
                                <TextInput
                                  value={evaluator.parameters[param.id]}
                                  onChange={(event) =>
                                    handleUpdateParameter(evaluator.id, param.id, event.currentTarget.value)
                                  }
                                />
                              )}
                              <Text size="xs" c="dimmed">
                                {param.description}
                              </Text>
                            </Group>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="enabled" pt="md">
            <ScrollArea h={500} pr="md">
              {localEvaluators.filter((e) => e.enabled).length === 0 ? (
                <Text ta="center" py="xl" c="dimmed">
                  No evaluators enabled
                </Text>
              ) : (
                <Stack gap="md">
                  {localEvaluators
                    .filter((e) => e.enabled)
                    .map((evaluator) => (
                      <Card key={evaluator.id} withBorder padding="md">
                        <Card.Section withBorder inheritPadding py="xs">
                          <Group justify="space-between">
                            <Title order={5}>{evaluator.name}</Title>
                            <ActionIcon variant="subtle" onClick={() => handleToggleEvaluator(evaluator.id, false)}>
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        </Card.Section>

                        <Text size="sm" c="dimmed" mt="xs">
                          {evaluator.description}
                        </Text>

                        <Stack gap="md" mt="md">
                          {evaluator.parameterDefinitions.map((param) => (
                            <Stack key={param.id} gap="xs">
                              <Text size="sm" fw={500}>
                                {param.name}
                              </Text>
                              <Group align="flex-start">
                                {param.type === "boolean" ? (
                                  <Checkbox
                                    checked={evaluator.parameters[param.id]}
                                    onChange={(event) =>
                                      handleUpdateParameter(evaluator.id, param.id, event.currentTarget.checked)
                                    }
                                  />
                                ) : param.type === "number" ? (
                                  <NumberInput
                                    value={evaluator.parameters[param.id]}
                                    min={param.min}
                                    max={param.max}
                                    step={0.1}
                                    onChange={(value) => handleUpdateParameter(evaluator.id, param.id, value)}
                                    w={100}
                                  />
                                ) : param.type === "select" ? (
                                  <Select
                                    value={evaluator.parameters[param.id].toString()}
                                    data={
                                      param.options?.map((option) => ({
                                        value: option.value.toString(),
                                        label: option.label,
                                      })) || []
                                    }
                                    onChange={(value) => handleUpdateParameter(evaluator.id, param.id, value)}
                                    w={160}
                                  />
                                ) : (
                                  <TextInput
                                    value={evaluator.parameters[param.id]}
                                    onChange={(event) =>
                                      handleUpdateParameter(evaluator.id, param.id, event.currentTarget.value)
                                    }
                                  />
                                )}
                                <Text size="xs" c="dimmed">
                                  {param.description}
                                </Text>
                              </Group>
                            </Stack>
                          ))}
                        </Stack>
                      </Card>
                    ))}
                </Stack>
              )}
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="xl">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
      </Modal>
    </>
  )
}
