import { RenderCheckNode } from "@/components/checks/Picker"
import EVALUATOR_TYPES from "@/utils/evaluators"
import { theme } from "@/utils/theme"
import {
  Card,
  Container,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core"
import { IconCircleCheck, IconCirclePlus } from "@tabler/icons-react"
import { useState } from "react"

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

  const evaluatorTypes = Object.values(EVALUATOR_TYPES)

  function onChange() {}
  return (
    <Container>
      <Stack gap="lg">
        <Group align="center">
          <Title>New Evaluator</Title>
        </Group>

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

        <RenderCheckNode
          minimal={false}
          node={evaluatorTypes[0]}
          disabled={false}
          setNode={(newNode) => {
            // onChange(newNode as CheckLogic)
          }}
          removeNode={() => {
            // onChange(["AND"])
          }}
          checks={evaluatorTypes}
        />
      </Stack>
    </Container>
  )
}
