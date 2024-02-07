import Steps from "@/components/Blocks/Steps"
import FilterPicker from "@/components/Filters/Picker"
import Paywall from "@/components/Layout/Paywall"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import { useProject } from "@/utils/dataHooks"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  Badge,
  Button,
  Chip,
  Container,
  Fieldset,
  Group,
  Modal,
  MultiSelect,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { IconFlask2Filled } from "@tabler/icons-react"
import { useRouter } from "next/router"
import { useState } from "react"
import { Evaluation, FilterLogic, MODELS, Prompt, Variation } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

function AddPromptModal({ opened, setOpened, onAdd }) {
  // const [value, setValue] = useState("")
  const [prompt, setPrompt] = useState([
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
    {
      role: "user",
      content: "What is the capital city of {{country}}",
    },
  ])

  const [variations, handlers] = useListState<Variation>([
    {
      variables: {},
    },
  ])

  const variables = usePromptVariables(prompt)

  const hasVariables = Object.keys(variables).length > 0

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      size="xl"
      title="Add a new prompt"
    >
      <Stack>
        <PromptEditor
          onChange={(value) => setPrompt(value)}
          value={prompt}
          isText={false}
        />

        {/* Show this if variables in prompt, add the possibility to add variations of the variables */}
        {hasVariables && (
          <>
            <Text size="sm" c="dimmed">
              Experiment with various configurations in the prompt:
            </Text>
          </>
        )}
        {variations.map((variation, index) => (
          <Fieldset
            variant="filled"
            key={index}
            legend={hasVariables && `Variation ${index + 1}`}
          >
            <Stack>
              {Object.keys(variables).map((variable) => (
                <Textarea
                  key={variable}
                  label={`{{${variable}}}`}
                  value={variation[variable]}
                  autosize
                  maxRows={6}
                  minRows={1}
                  onChange={(e) => {
                    const oldVariables = variations[index].variables
                    const newVariables = {
                      ...oldVariables,
                      [variable]: e.currentTarget.value,
                    }
                    handlers.setItemProp(index, "variables", newVariables)
                  }}
                />
              ))}
              <Textarea
                label="Context (optional)"
                description="Helps in assessing the factual accuracy and relevance of the LLM's response."
                required={false}
                autosize
                maxRows={6}
                minRows={3}
                value={variation.context}
                onChange={(e) =>
                  handlers.setItemProp(index, "context", e.currentTarget.value)
                }
              />

              <Textarea
                label="Ideal output (optional)"
                description="Useful for assessing the proximity of the LLM response to an anticipated output."
                required={false}
                autosize
                maxRows={6}
                minRows={3}
                value={variation.idealOutput}
                onChange={(e) =>
                  handlers.setItemProp(
                    index,
                    "idealOutput",
                    e.currentTarget.value,
                  )
                }
              />
            </Stack>
          </Fieldset>
        ))}

        {hasVariables && (
          <Button
            variant="outline"
            onClick={() =>
              handlers.append({
                variables: Object.keys(variables).reduce(
                  (acc, key) => ({ ...acc, [key]: "" }),
                  {},
                ),
              })
            }
          >
            Add variation
          </Button>
        )}

        <Button
          display="inline-block"
          ml="auto"
          onClick={() => {
            onAdd({
              content: prompt,
              variations,
            })

            setOpened(false)
          }}
        >
          Add prompt
        </Button>
      </Stack>
    </Modal>
  )
}

export default function NewEvaluation() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [checks, setChecks] = useState<FilterLogic | []>([])
  const [models, setModels] = useState(["gpt-4-turbo-preview", "gpt-3.5-turbo"])

  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [promptModalOpened, setPromptModalOpened] = useState(false)

  const { project } = useProject()

  async function startEval() {
    setLoading(true)

    const res = await errorHandler(
      fetcher.post(`/evaluations?projectId=${project.id}`, {
        arg: evaluation,
      }),
    )

    setLoading(false)

    if (!res.evaluationId) return

    router.push(`/evaluations/${res.evaluationId}`)
  }

  const evaluation: Evaluation = {
    prompts,
    models,
    checks,
  }

  const canStartEvaluation =
    models.length > 0 && models.length > 0 && checks.length > 0

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
            Compare different prompts and models to find the best performing
            combinations.
          </Text>

          <Steps ml={-59}>
            <Steps.Step n={1} label="Dataset">
              <Text size="lg" mb="md">
                Add prompts with variations of variables to test.
              </Text>
              <AddPromptModal
                opened={promptModalOpened}
                setOpened={setPromptModalOpened}
                onAdd={(prompt) => {
                  setPrompts((prompts) => [...prompts, prompt])
                }}
              />
              <Button
                variant="light"
                onClick={() => setPromptModalOpened(true)}
              >
                Add prompt
              </Button>
              <Group mt="xl">
                <Chip.Group>
                  {evaluation.prompts?.map((prompt, i) => (
                    <Chip color="blue">Prompt #{i + 1}</Chip>
                  ))}
                </Chip.Group>
              </Group>
            </Steps.Step>
            <Steps.Step n={2} label="Models">
              <Text size="lg" mb="md">
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
              <Text size="lg" mb="md">
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
