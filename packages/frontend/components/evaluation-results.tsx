"use client"

import { useState } from "react"
import { Paper, Tabs, Badge, Progress, Collapse, Group, Text, Stack, ActionIcon } from "@mantine/core"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import type { EvaluationResult, EvaluatorConfig } from "@/types/evaluator-types"

interface EvaluationResultsProps {
  results: Record<string, EvaluationResult> | undefined
  evaluators: EvaluatorConfig[]
  expanded?: boolean
}

export function EvaluationResults({ results, evaluators, expanded = false }: EvaluationResultsProps) {
  const [isOpen, setIsOpen] = useState(expanded)

  if (!results || Object.keys(results).length === 0) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "green"
    if (score >= 0.6) return "yellow"
    return "red"
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return "green"
    if (score >= 0.6) return "yellow"
    return "red"
  }

  const averageScore =
    Object.values(results).reduce((sum, result) => sum + result.score, 0) / Object.values(results).length

  return (
    <div>
      <Group
        p="xs"
        bg="gray.0"
        style={{
          borderRadius: "4px",
          cursor: "pointer",
          border: "1px solid #e9ecef",
        }}
        justify="space-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Group>
          <Badge color={getScoreBadgeColor(averageScore)}>{(averageScore * 100).toFixed(0)}%</Badge>
          <Text size="xs" fw={500}>
            Evaluation Results
          </Text>
        </Group>
        <ActionIcon variant="subtle" size="sm">
          {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </ActionIcon>
      </Group>

      <Collapse in={isOpen}>
        <Paper p="md" mt="xs" withBorder>
          <Tabs defaultValue="summary">
            <Tabs.List>
              <Tabs.Tab value="summary">Summary</Tabs.Tab>
              <Tabs.Tab value="detailed">Detailed</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="summary" pt="xs">
              <Stack gap="xs" mt="md">
                {Object.entries(results).map(([evaluatorId, result]) => {
                  const evaluator = evaluators.find((e) => e.id === evaluatorId)
                  if (!evaluator) return null

                  return (
                    <Group key={evaluatorId} grow>
                      <Text size="xs" truncate title={evaluator.name} w={100}>
                        {evaluator.name}:
                      </Text>
                      <Progress value={result.score * 100} color={getScoreColor(result.score)} size="sm" />
                      <Text size="xs" fw={500} w={40} ta="right">
                        {(result.score * 100).toFixed(0)}%
                      </Text>
                    </Group>
                  )
                })}

                <Group grow pt="xs" style={{ borderTop: "1px solid #e9ecef" }}>
                  <Text size="xs" fw={500} w={100}>
                    Overall:
                  </Text>
                  <Progress value={averageScore * 100} color={getScoreColor(averageScore)} size="sm" />
                  <Text size="xs" fw={500} w={40} ta="right">
                    {(averageScore * 100).toFixed(0)}%
                  </Text>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="detailed" pt="xs">
              <Stack gap="md" mt="md">
                {Object.entries(results).map(([evaluatorId, result]) => {
                  const evaluator = evaluators.find((e) => e.id === evaluatorId)
                  if (!evaluator) return null

                  return (
                    <Stack key={evaluatorId} gap="xs">
                      <Group justify="space-between">
                        <Text size="xs" fw={500}>
                          {evaluator.name}
                        </Text>
                        <Badge color={getScoreBadgeColor(result.score)}>{(result.score * 100).toFixed(0)}%</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {result.feedback}
                      </Text>
                    </Stack>
                  )
                })}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Collapse>
    </div>
  )
}
