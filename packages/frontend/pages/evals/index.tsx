import Steps from "@/components/Blocks/Steps"
import FilterPicker from "@/components/Filters/Picker"
import Paywall from "@/components/Layout/Paywall"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import { useTemplates } from "@/utils/dataHooks"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  Badge,
  Button,
  Container,
  Fieldset,
  Group,
  Modal,
  MultiSelect,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core"
import { useListState, useSetState } from "@mantine/hooks"
import { IconFlask2Filled, IconHistory } from "@tabler/icons-react"
import Router from "next/router"
import { useEffect, useState } from "react"
import { MODELS, SavedFilterData } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

type Variation = {
  variables: any
  context?: string
  expected?: string
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
      content: "{{question}}",
    },
  ])

  const [variations, handlers] = useListState<Variation>([
    {
      variables: {},
    },
  ])

  const variables = usePromptVariables(prompt)

  const hasVariables = Object.keys(variables).length > 0

  useEffect(() => {
    if (hasVariables && !variations[0].variables) {
      handlers.setItemProp(
        0,
        "variables",
        Object.keys(variables).reduce(
          (acc, key) => ({ ...acc, [key]: "" }),
          {},
        ),
      )
    }
  }, [variables])

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      size="lg"
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
            <Text size="sm" color="gray">
              Test different variations of the variables in the prompt:
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
                <TextInput
                  key={variable}
                  label={`{{${variable}}}`}
                  value={variation[variable]}
                  onChange={(e) =>
                    handlers.setItemProp(index, variable, e.currentTarget.value)
                  }
                />
              ))}
              <Textarea
                label="Context (optional)"
                description="Can be used to evaluate if the LLM response is factually correct and on topic."
                required={false}
                value={variation.context}
                onChange={(e) =>
                  handlers.setItemProp(index, "context", e.currentTarget.value)
                }
              />

              <Textarea
                label="Gold / expected output (optional)"
                description="Can be used to evaluate if the LLM response is close to the expected output."
                required={false}
                value={variation.expected}
                onChange={(e) =>
                  handlers.setItemProp(index, "expected", e.currentTarget.value)
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
            Add variation of variables
          </Button>
        )}

        <Button
          display="inline-block"
          ml="auto"
          onClick={() =>
            onAdd({
              prompt,
              variations,
            })
          }
        >
          Add prompt
        </Button>
      </Stack>
    </Modal>
  )
}

export default function Evals() {
  const { templates } = useTemplates()

  const [promptModalOpened, setPromptModalOpened] = useState(false)

  const [evaluation, setEvaluation] = useSetState<{
    prompts: any[]
    variables: any[]
    models: string[]
    checks: SavedFilterData[]
  }>({
    prompts: [],
    variables: [],
    models: ["gpt-4-1106-preview", "gpt-3.5-turbo"],
    checks: [],
  })

  function startEval() {
    Router.push("/evals/results")
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
              <Button
                leftSection={<IconHistory size={12} />}
                variant="light"
                disabled
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
            Create evaluation matrix to benchmark different prompts, variables
            and optimize.
          </Text>

          <Steps>
            <Steps.Step n={1} label="Dataset">
              <Text size="lg" mb="md">
                Add prompts and variations of variables to test.
              </Text>
              <AddPromptModal
                opened={promptModalOpened}
                setOpened={setPromptModalOpened}
                onAdd={(prompt) => {
                  setEvaluation({
                    prompts: [...evaluation.prompts, prompt],
                  })
                }}
              />
              <Button
                variant="light"
                onClick={() => setPromptModalOpened(true)}
              >
                Add prompt
              </Button>
              {/* <Group>
                <Chip.Group>
                  {templates?.map((template) => (
                    <Chip
                      key={template.id}
                      color="blue"
                      onClick={() => {
                        setEvaluation({
                          prompts: [template.prompts],
                        })
                      }}
                    >
                      {template.name}
                    </Chip>
                  ))}
                </Chip.Group>
                <Button variant="light" href="/prompts" component={Link}>
                  New template
                </Button>
                <Button variant="purple" disabled href="/logs" component={Link}>
                  Import from logs
                </Button> 
              </Group> */}
            </Steps.Step>
            <Steps.Step n={2} label="Models">
              <Text size="lg" mb="md">
                Select the models you want to compare. Limited to 3 while in
                alpha.
              </Text>
              <MultiSelect
                data={MODELS.map((model) => ({
                  value: model.id,
                  label: model.name,
                }))}
                maxValues={2}
                value={evaluation.models}
                onChange={(value) => setEvaluation({ models: value })}
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
                defaultValue={evaluation.checks}
                onChange={(value) => setEvaluation({ checks: value })}
              />
            </Steps.Step>
          </Steps>

          <Button
            size="md"
            display="inline-block"
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
