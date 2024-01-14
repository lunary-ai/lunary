import Steps from "@/components/Blocks/Steps"
import FilterPicker, { SavedFilterData } from "@/components/Filters/Picker"
import Paywall from "@/components/Layout/Paywall"
import { useTemplates } from "@/utils/dataHooks"
import {
  Badge,
  Button,
  Chip,
  Container,
  Group,
  MultiSelect,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useSetState } from "@mantine/hooks"
import {
  IconDatabase,
  IconFlask2Filled,
  IconHistory,
} from "@tabler/icons-react"
import Link from "next/link"
import Router from "next/router"
import { MODELS } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function Evals() {
  const { templates } = useTemplates()

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
            <Steps.Step n={1} label="Prompt">
              <Text size="lg" mb="md">
                We recommend using a template as a starting point.
              </Text>
              <Group>
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
              </Group>
            </Steps.Step>
            <Steps.Step n={2} label="Models">
              <Text size="lg" mb="md">
                Select the models you want to compare. Limited to 2 while in
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
