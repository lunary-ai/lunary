import Steps from "@/components/Blocks/Steps"
import FilterPicker from "@/components/Filters/Picker"
import Paywall from "@/components/Layout/Paywall"
import { useDatasets, useProject } from "@/utils/dataHooks"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"

import {
  Anchor,
  Badge,
  Button,
  Chip,
  Container,
  Group,
  MultiSelect,
  Progress,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core"
import { IconFlask2Filled } from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useState } from "react"
import { Evaluation, FilterLogic, MODELS, Prompt } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function NewEvaluation() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [checks, setChecks] = useState<FilterLogic>(["AND"])
  const [models, setModels] = useState(["gpt-4-turbo-preview", "gpt-3.5-turbo"])
  const [datasetId, setDatasetId] = useState<string | null>()

  const [loading, setLoading] = useState(false)

  const [progress, setProgress] = useState(0)

  const router = useRouter()

  const { project } = useProject()
  const { datasets } = useDatasets()

  async function startEval() {
    setLoading(true)

    const timeEstimate = models.length * prompts.length * 5
    console.log("timeEstimate", timeEstimate)
    setProgress(0)

    let interval = setInterval(() => {
      setProgress((progress) =>
        Math.min(100, progress + 100 / timeEstimate, 100),
      )
    }, 1000)

    const res = await errorHandler(
      fetcher.post(`/evaluations?projectId=${project.id}`, {
        arg: { datasetId, checks, models },
      }),
    )

    clearInterval(interval)

    setLoading(false)

    if (!res.evaluationId) return

    router.push(`/evaluations/${res.evaluationId}`)
  }

  const evaluation: Evaluation = {
    prompts,
    models,
    checks,
  }

  const canStartEvaluation = datasetId && models.length > 0 && checks.length > 1

  return (
    <Paywall
      plan="unlimited"
      feature="Evaluations"
      Icon={IconFlask2Filled}
      description="Experiment with different models and parameters to find the best performing combinations."
      list={FEATURE_LIST}
    >
      <Container>
        <Stack align="right" gap="lg">
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Evaluations</Title>
              <Badge variant="light" color="violet">
                Alpha
              </Badge>
            </Group>
          </Group>

          <Text size="xl" mb="md">
            Compare prompts with different models to craft the perfect prompt.
          </Text>

          <Steps>
            <Steps.Step n={1} label="Dataset">
              <Text size="lg" mb="md" mt={-6}>
                Add prompts with variations of variables to test.
              </Text>

              <Select
                placeholder="Select a Dataset"
                onChange={(datasetId) => setDatasetId(datasetId)}
                data={datasets.map((dataset) => ({
                  label: dataset.slug,
                  value: dataset.id,
                }))}
              />
              <Anchor href="/datasets/new" mt="sm">
                + new dataset
              </Anchor>

              <Group mt="xl">
                <Chip.Group>
                  {evaluation.prompts?.map((prompt, i) => (
                    <Chip color="blue" key={i}>
                      Prompt #{i + 1}
                    </Chip>
                  ))}
                </Chip.Group>
              </Group>
            </Steps.Step>
            <Steps.Step n={2} label="Models">
              <Text size="lg" mb="md" mt={-6}>
                Select the models you want to compare.
              </Text>
              <MultiSelect
                data={MODELS.map((model) => ({
                  value: model.id,
                  label: model.name,
                }))}
                maxValues={3}
                value={models}
                onChange={(newModels) => setModels(newModels)}
              />
            </Steps.Step>
            <Steps.Step n={3} label="Checks">
              <Text size="lg" mb="md" mt={-6}>
                Define the checks that will result in a{" "}
                <Text c="green" span fw="bold">
                  PASS
                </Text>
                .
              </Text>
              <FilterPicker
                restrictTo={(filter) => !filter.disableInEvals}
                value={checks}
                onChange={(checks) => setChecks(checks)}
              />
            </Steps.Step>
          </Steps>

          {loading && progress > 0 && (
            <Progress radius="md" size="lg" value={progress} animated />
          )}

          <Tooltip
            label="You need to add at least one prompt, one model, and one check to start an Evaluation"
            w="300"
            multiline
            events={{ hover: !canStartEvaluation, focus: true, touch: false }}
          >
            <Button
              size="md"
              display="inline-block"
              loading={loading}
              ml="auto"
              variant="gradient"
              disabled={!canStartEvaluation}
              leftSection={<IconFlask2Filled size={14} />}
              onClick={() => startEval()}
            >
              Start Evaluation
            </Button>
          </Tooltip>
        </Stack>
      </Container>
    </Paywall>
  )
}
