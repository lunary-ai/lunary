import Steps from "@/components/Blocks/Steps"
import Paywall from "@/components/Layout/Paywall"
import { useChecklists, useDatasets, useProject } from "@/utils/dataHooks"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"

import {
  Anchor,
  Badge,
  Button,
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
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import { MODELS } from "shared"
import { ChecklistModal } from "./checklists"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function NewEvaluation() {
  const [checklistModal, setChecklistModal] = useState(false)

  const [models, setModels] = useState(["gpt-4-turbo-preview", "gpt-3.5-turbo"])
  const [datasetId, setDatasetId] = useState<string | null>()
  const [checklistId, setChecklistId] = useState<string | null>()

  const [loading, setLoading] = useState(false)

  const [progress, setProgress] = useState(0)

  const router = useRouter()

  const { project } = useProject()

  const { datasets, isLoading: datasetsLoading } = useDatasets()
  const { checklists, loading: checklistsLoading } = useChecklists("evaluation")

  // make sure to only fetch once
  const ref = useRef({ done: false })

  useEffect(() => {
    if (!project || ref.current?.done || datasetsLoading || checklistsLoading)
      return

    const { clone } = router.query

    if (clone) {
      ref.current.done = true
      const fetchEval = async () => {
        const cloneEval = await fetcher.get(
          `/evaluations/${clone}?projectId=${project?.id}`,
        )

        if (!cloneEval) return

        setDatasetId(cloneEval.datasetId)
        setModels(cloneEval.models)
        setChecklistId(cloneEval.checklistId)
      }

      fetchEval()
    }
  }, [project, router.query])

  async function startEval() {
    setLoading(true)

    const timeEstimate = models.length * 3 * 5

    setProgress(0)

    let interval = setInterval(() => {
      setProgress((progress) =>
        Math.min(100, progress + 100 / timeEstimate, 100),
      )
    }, 1000)

    const res = await errorHandler(
      fetcher.post(`/evaluations?projectId=${project.id}`, {
        arg: { datasetId, models, checklistId },
      }),
    )

    clearInterval(interval)

    setLoading(false)

    if (!res.evaluationId) return

    router.push(`/evaluations/${res.evaluationId}`)
  }

  const canStartEvaluation = datasetId && models.length > 0 && checklistId

  return (
    <Paywall
      plan="unlimited"
      feature="Evaluations"
      Icon={IconFlask2Filled}
      description="Experiment with different models and parameters to find the best performing combinations."
      list={FEATURE_LIST}
    >
      <ChecklistModal
        open={checklistModal}
        onClose={(id) => {
          setChecklistModal(false)
          if (id) setChecklistId(id)
        }}
      />
      <Container>
        <Stack align="right" gap="lg">
          <Anchor href="/evaluations">← Back to Evaluations</Anchor>
          <Group align="center">
            <Title>Magic Evaluation</Title>
            <Badge variant="light" color="violet">
              Alpha
            </Badge>
            <Badge variant="light" color="blue">
              no-code
            </Badge>
          </Group>

          <Text size="xl" mb="md">
            Compare prompts with different models to craft the perfect prompt.
          </Text>

          <Steps>
            <Steps.Step n={1} label="Dataset">
              <Text size="lg" mb="md" mt={-6}>
                Prompts with variations of variables to test.
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
                + new
              </Anchor>
            </Steps.Step>
            <Steps.Step n={2} label="Models">
              <Text size="lg" mb="md" mt={-6}>
                LLMs you want to compare.
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
            <Steps.Step n={3} label="Checklists">
              <Text size="lg" mb="md" mt={-6}>
                Assertions against which to run the dataset that will result in
                a{" "}
                <Text c="green" span fw="bold">
                  PASS
                </Text>
                .
              </Text>
              <Select
                placeholder="Select a preset checklist or create a new one."
                onChange={(datasetId) => setChecklistId(datasetId)}
                value={checklistId}
                data={checklists?.map((dataset) => ({
                  label: dataset.slug,
                  value: dataset.id,
                }))}
              />
              <Anchor href="#" mt="sm" onClick={() => setChecklistModal(true)}>
                + new
              </Anchor>
              {/* <FilterPicker
                restrictTo={(filter) => !filter.disableInEvals}
                value={checks}
                onChange={(checks) => setChecks(checks)}
              /> */}
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
