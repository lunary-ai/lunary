import FiltersModal from "@/components/Blocks/FiltersModal"
import Paywall from "@/components/Layout/Paywall"
import { useTemplates } from "@/utils/dataHooks"
import {
  Badge,
  Button,
  Container,
  Group,
  MultiSelect,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useSetState } from "@mantine/hooks"
import { IconDatabase, IconFlask2Filled, IconPlus } from "@tabler/icons-react"
import Router from "next/router"
import { useState } from "react"
import { MODELS } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function Radar() {
  const { templates } = useTemplates()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [modalOpened, setModalOpened] = useState(false)

  return (
    <Paywall
      plan="unlimited"
      feature="Evaluations"
      Icon={IconFlask2Filled}
      description="Experiment with different models and parameters to find the best performing combinations."
      list={FEATURE_LIST}
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Evaluations</Title>
              <Badge variant="light" color="violet">
                Alpha
              </Badge>
            </Group>

            <Group>
              <Button
                leftSection={<IconDatabase size={12} />}
                variant="light"
                color="violet"
                onClick={() => {
                  Router.push("/datasets")
                }}
              >
                Datasets
              </Button>
            </Group>
          </Group>

          <Text size="xl" mb="md">
            Create evaluation matrix to compare different prompts, variables and
            optimize.
          </Text>

          <Text>Select a prompt template to get started.</Text>

          <Group>
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="light"
                color="blue"
                onClick={() => {
                  setSelected(template)
                  setModalOpened(true)
                }}
              >
                {template.name}
              </Button>
            ))}
          </Group>

          <Text>
            Select the models you want to evaluate (currently limited to 3)
          </Text>

          <MultiSelect
            data={MODELS.map((model) => ({
              value: model.id,
              label: model.name,
            }))}
            maxValues={3}
            value={selectedModels}
            onChange={setSelectedModels}
          />

          <Text>Define the assertions you want to test.</Text>

          <Button>Start</Button>

          {/* 
          <FiltersModal
            opened={modalOpened}
            defaultSelected={selected}
            setOpened={setModalOpened}
            save={setSelected}
          /> */}
        </Stack>
      </Container>
    </Paywall>
  )
}
