import { RenderCheckNode } from "@/components/checks/Picker"
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
import { useState } from "react"
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
      withBorder
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
            <Text size="xs" mt={7} fw="500" ta="center">
              {evaluator.name}
            </Text>
            {evaluator.soon && (
              <Text size="xs" mb={-4} mt={7} fw="500" c="dimmed">
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
  const [evaluatorParams, setEvaluatorParams] = useState<any>(["AND"])

  const evaluatorTypes = Object.values(EVALUATOR_TYPES)

  const selectedEvaluator = evaluatorTypes.find(
    (evaluator) => evaluator.id === evaluatorType,
  )

  const hasParams = selectedEvaluator?.params?.length

  const IconComponent = selectedEvaluator?.icon

  function onChange() {}

  console.log([selectedEvaluator])

  return (
    <Container>
      <Stack gap="lg">
        <Group align="center">
          <Title>Add Evaluator</Title>
        </Group>

        <Tooltip label="Only real-time evaluators are available at the moment">
          <Group w="fit-content">
            <Switch
              size="xl"
              label="Realtime"
              onLabel="ON"
              offLabel="OFF"
              checked={true}
            />
          </Group>
        </Tooltip>

        <Text>Select the type of evaluator you want to add:</Text>

        <SimpleGrid cols={5} spacing="md">
          {evaluatorTypes.map((evaluator) => (
            <EvaluatorCard
              key={evaluator.id}
              evaluator={evaluator}
              isSelected={evaluatorType === evaluator.id}
              onItemClick={setEvaluatorType}
            />
          ))}
        </SimpleGrid>

        {!!hasParams && (
          <>
            <Text>Configure the evaluator:</Text>

            <RenderCheckNode
              node={evaluatorParams}
              setNode={(newNode) => {
                console.log({ newNode })
                setEvaluatorParams(newNode as CheckLogic)
              }}
              removeNode={() => {}}
              checks={[selectedEvaluator]}
            />
          </>
        )}

        <Group justify="end">
          <Button
            disabled={!selectedEvaluator}
            onClick={() => {}}
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
