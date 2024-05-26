import CheckPicker, { RenderCheckNode } from "@/components/checks/Picker"
import EVALUATOR_TYPES from "@/utils/evaluators"
import { theme } from "@/utils/theme"
import {
  Button,
  Card,
  Container,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core"
import { IconCircleCheck, IconCirclePlus } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { CheckLogic, LogicElement } from "shared"

function EvaluatorCard({
  evaluator,
  isSelected,
  onItemClick,
}: {
  onItemClick: (type: string) => void
  isSelected: boolean
  evaluator: any
}) {
  return (
    <Card
      key={evaluator.id}
      onClick={() => !evaluator.soon && onItemClick(evaluator.id)}
      withBorder={isSelected}
      opacity={evaluator.soon ? 0.5 : 1}
      style={{ justifyContent: "center" }}
    >
      <Tooltip label={evaluator.description} hidden={!evaluator.description}>
        <UnstyledButton disabled={evaluator.soon}>
          <Flex
            justify="right"
            pos="absolute"
            top="6px"
            right="6px"
            h="30"
            w="30"
          >
            {isSelected ? (
              <IconCircleCheck size="20" color="#4589df" />
            ) : (
              <IconCirclePlus size="20" color="#bfc4cd" />
            )}
          </Flex>

          <Stack align="center" gap="0" pt={5} maw="100%" justify="center">
            <evaluator.icon
              color={theme.colors[evaluator.color][7]}
              size="22px"
            />
            <Text size="sm" mt={9} fw="500" ta="center">
              {evaluator.name}
            </Text>
            {evaluator.soon && (
              <Text size="xs" mb={-4} mt={0} fw="500" c="dimmed">
                coming soon
              </Text>
            )}
          </Stack>
        </UnstyledButton>
      </Tooltip>
    </Card>
  )
}

export default function NewRealtimeEvaluator() {
  const [evaluatorType, setEvaluatorType] = useState<string>()
  const [evaluatorParams, setEvaluatorParams] = useState<any>({})
  const [evaluatorViewFilter, setEvaluatorViewFilter] = useState<CheckLogic>([
    "AND",
    { id: "type", params: { type: "llm" } },
  ])

  const evaluatorTypes = Object.values(EVALUATOR_TYPES)

  const selectedEvaluator = evaluatorTypes.find(
    (evaluator) => evaluator.id === evaluatorType,
  )

  const hasParams = selectedEvaluator?.params?.length

  const IconComponent = selectedEvaluator?.icon

  useEffect(() => {
    if (selectedEvaluator) {
      setEvaluatorParams({
        id: selectedEvaluator.id,
        params: selectedEvaluator.params.reduce((acc, param) => {
          if (param.id) {
            acc[param.id] = param.defaultValue
          }
          return acc
        }, {}),
      })
    }
  }, [selectedEvaluator])

  function createEvaluator() {
    console.log({ evaluatorType, evaluatorParams, evaluatorViewFilter })
  }

  return (
    <Container>
      <Stack gap="xl">
        <Group align="center">
          <Title>Add Evaluator</Title>
        </Group>

        <Stack>
          <Text>Select the type of evaluator you want to add:</Text>

          <SimpleGrid cols={5} spacing="md">
            {evaluatorTypes
              .sort((a, b) => (a.soon ? 1 : -1))
              .map((evaluator) => (
                <EvaluatorCard
                  key={evaluator.id}
                  evaluator={evaluator}
                  isSelected={evaluatorType === evaluator.id}
                  onItemClick={setEvaluatorType}
                />
              ))}
          </SimpleGrid>
        </Stack>

        {!!hasParams && (
          <Stack>
            <Text>Configure the evaluator:</Text>

            <RenderCheckNode
              node={evaluatorParams}
              minimal={false}
              setNode={(newNode) => {
                setEvaluatorParams(newNode as CheckLogic)
              }}
              checks={[selectedEvaluator]}
            />
          </Stack>
        )}

        <Card style={{ overflow: "visible" }} shadow="md" p="lg">
          <Stack>
            <Tooltip label="Only real-time evaluators are available at the moment">
              <Group w="fit-content">
                <Switch
                  size="lg"
                  label="Enable real-time evaluation ✨"
                  onLabel="ON"
                  offLabel="OFF"
                  checked={true}
                />
              </Group>
            </Tooltip>

            <Text>Select the logs to apply to:</Text>

            <CheckPicker
              minimal
              value={evaluatorViewFilter}
              onChange={setEvaluatorViewFilter}
              restrictTo={(filter) =>
                ["tags", "type", "users", "metadata"].includes(filter.id)
              }
            />

            <Text>
              Estimated logs:{" "}
              <Text span fw="bold">
                1000
              </Text>
            </Text>
          </Stack>
        </Card>

        <Group justify="end">
          <Button
            disabled={!selectedEvaluator}
            onClick={() => {
              createEvaluator()
            }}
            leftSection={IconComponent && <IconComponent size={16} />}
            size="md"
            variant="default"
          >
            {selectedEvaluator
              ? `Create ${selectedEvaluator.name} Evaluator`
              : "Create"}
          </Button>
        </Group>
      </Stack>
    </Container>
  )
}
