import ResultsMatrix from "@/components/evals/ResultsMatrix"
import CheckPicker from "@/components/checks/Picker"
import {
  useChecklist,
  useDataset,
  useEvaluation,
  useProjectSWR,
} from "@/utils/dataHooks"
import {
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconDatabase } from "@tabler/icons-react"
import Link from "next/link"

import { useRouter } from "next/router"
import { useState } from "react"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

export default function EvalResults() {
  const router = useRouter()
  const [groupBy, setGroupBy] = useState<"none" | "provider" | "prompt">("none")
  const id = router.query.id as string

  const { data, isLoading: loading } = useProjectSWR(
    id && `/evaluations/result/${id}`,
  )

  const { evaluation } = useEvaluation(id)

  const { checklist } = useChecklist(evaluation?.checklistId)
  const { dataset } = useDataset(evaluation?.datasetId)

  const uniqueProviders = Array.from(
    new Set(data?.map((result) => JSON.stringify(result.provider))),
  )

  const uniquePrompts = Array.from(
    new Set(data?.map((result) => result.promptId)),
  )

  return (
    <Container size="100%">
      <Stack>
        <Anchor href="/evaluations">← Back to Evaluations</Anchor>

        <Group>
          <Title>Evaluation </Title>
          <Badge variant="light" color="green">
            complete
          </Badge>
        </Group>

        <Card withBorder>
          <Stack>
            {checklist && (
              <Group>
                <Text>Checklist:</Text>
                <CheckPicker value={checklist.data} disabled />
              </Group>
            )}
            {dataset && (
              <Group>
                <Text>Dataset:</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconDatabase size={12} />}
                  component={Link}
                  href={`/datasets/${evaluation?.datasetId}`}
                >
                  {dataset.slug}
                </Button>
              </Group>
            )}
          </Stack>
        </Card>

        <Group>
          <Text>Group results by:</Text>
          <SegmentedControl
            w={200}
            size="xs"
            data={[
              {
                value: "none",
                label: "None",
              },
              {
                value: "provider",
                label: "Model",
              },
              {
                value: "prompt",
                label: "Prompt",
              },
            ]}
            value={groupBy}
            onChange={(value) =>
              setGroupBy(value as "none" | "provider" | "prompt")
            }
          />
        </Group>

        {loading ? (
          <Loader />
        ) : (
          <>
            {data?.length > 0 ? (
              <Stack gap="xl">
                {groupBy === "none" && <ResultsMatrix data={data} />}
                {groupBy === "provider" &&
                  uniqueProviders.map((model) => (
                    <ResultsMatrix
                      key={model}
                      data={data.filter(
                        (result) => JSON.stringify(result.provider) === model,
                      )}
                    />
                  ))}
                {groupBy === "prompt" &&
                  uniquePrompts.map((promptId) => (
                    <ResultsMatrix
                      key={promptId}
                      data={data.filter(
                        (result) => result.promptId === promptId,
                      )}
                    />
                  ))}
              </Stack>
            ) : (
              <p>No data</p>
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
