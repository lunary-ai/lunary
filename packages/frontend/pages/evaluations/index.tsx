import Steps from "@/components/Blocks/Steps"
import FilterPicker from "@/components/Filters/Picker"
import Paywall from "@/components/Layout/Paywall"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import { useEvaluations, useProject, useTemplates } from "@/utils/dataHooks"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  ActionIcon,
  Badge,
  Button,
  Chip,
  Container,
  Divider,
  Fieldset,
  Group,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  rem,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import {
  IconCopy,
  IconDotsVertical,
  IconFlask2Filled,
  IconHistory,
  IconSettings,
} from "@tabler/icons-react"
import Router, { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { FilterLogic, MODELS } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

type Variation = {
  variables: any
  context?: string
  idealOutput?: string
}

function HistoryModal({ opened, setOpened }) {
  const { evaluations, isLoading } = useEvaluations()

  // TODO: scroll
  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      size="xl"
      withCloseButton={false}
      padding="xl"
    >
      <Title mb="lg" order={2}>
        Past evaluations
      </Title>
      {isLoading && <Loader />}
      <Stack gap="xl">
        {evaluations.map((evaluation, i) => (
          <>
            <Group justify="space-between">
              <Stack gap="0">
                <Group>
                  <Title order={3} size="16px">
                    {evaluation.name}
                  </Title>
                  <Badge variant="light" radius="sm" color="green" size="xs">
                    Complete
                  </Badge>
                </Group>
                <Text size="14px" mt="6" c="dimmed">
                  Created by {evaluation.ownerName}
                </Text>
              </Stack>

              <Group>
                <Button
                  onClick={() => Router.push(`/evaluations/${evaluation.id}`)}
                  variant="light"
                >
                  View results
                </Button>
                <Menu withArrow shadow="sm" position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="transparent">
                      <IconDotsVertical size={24} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconCopy size={16} />}>
                      Duplicate
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>

            {evaluations.length !== i + 1 && <Divider />}
          </>
        ))}
      </Stack>
    </Modal>
  )
}

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

export default function Evals() {
  const { templates } = useTemplates()
  const [loading, setLoading] = useState(false)

  const [historyModalOpened, setHistoryModalOpened] = useState(false)
  const [promptModalOpened, setPromptModalOpened] = useState(false)

  const [evaluation, setEvaluation] = useState<{
    prompts: any[]
    variables: any[]
    models: string[]
    checks: FilterLogic
  }>({
    prompts: [],
    variables: [],
    models: ["gpt-4-turbo-preview", "gpt-3.5-turbo"],
    checks: ["AND"],
  })

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

    Router.push(`/evaluations/${res.evaluationId}`)
  }

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

            <Group>
              <HistoryModal
                opened={historyModalOpened}
                setOpened={setHistoryModalOpened}
              />
              <Button
                leftSection={<IconHistory size={12} />}
                variant="light"
                onClick={() => setHistoryModalOpened(true)}
              >
                History
              </Button>
              {/* <Button
                leftSection={<IconDatabase size={12} />}
                variant="light"
                disabled
                color="violet"
                onClick={() => {
                  Router.push("/datasets")
                }}
              >
                Datasets
              </Button> */}
            </Group>
          </Group>

          <Text size="xl" mb="md">
            Compare different prompts and models to find the best performing
            combinations.
          </Text>

          <Steps>
            <Steps.Step n={1} label="Dataset">
              <Text size="lg" mb="md">
                Add prompts with variations of variables to test.
              </Text>
              <AddPromptModal
                opened={promptModalOpened}
                setOpened={setPromptModalOpened}
                onAdd={(prompt) => {
                  setEvaluation({
                    ...evaluation,
                    prompts: [...evaluation.prompts, { ...prompt }],
                  })
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
                {/* <Button variant="light" href="/prompts" component={Link}>
                  New template
                </Button>
                <Button variant="purple" disabled href="/logs" component={Link}>
                  Import from logs
                </Button> */}
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
                value={evaluation.models}
                onChange={(value) =>
                  setEvaluation({ ...evaluation, models: value })
                }
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
                value={evaluation.checks}
                onChange={(value) =>
                  setEvaluation({ ...evaluation, checks: value })
                }
              />
            </Steps.Step>
          </Steps>

          <Button
            size="md"
            display="inline-block"
            loading={loading}
            ml="auto"
            variant="gradient"
            leftSection={<IconFlask2Filled size={14} />}
            onClick={() => startEval()}
          >
            Start Evaluation
          </Button>
        </Stack>
      </Container>
    </Paywall>
  )
}
