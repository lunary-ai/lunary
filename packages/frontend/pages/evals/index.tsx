import FiltersModal from "@/components/Blocks/FiltersModal"
import Paywall from "@/components/Layout/Paywall"
import { useTemplates } from "@/utils/dataHooks"
import {
  Badge,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useSetState } from "@mantine/hooks"
import { IconDatabase, IconFlask2Filled, IconPlus } from "@tabler/icons-react"
import Router from "next/router"
import { useState } from "react"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function Radar() {
  const { templates } = useTemplates()
  const [selected, setSelected] = useSetState({})
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
                leftSection={<IconPlus size={12} />}
                variant="light"
                color="blue"
                onClick={() => {
                  setModalOpened(true)
                }}
              >
                New
              </Button>
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
            Create evaluations
          </Text>

          <FiltersModal
            opened={modalOpened}
            defaultSelected={selected}
            setOpened={setModalOpened}
            save={setSelected}
          />
        </Stack>
      </Container>
    </Paywall>
  )
}
