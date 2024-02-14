import PromptVariableEditor from "@/components/Blocks/PromptVariableEditor"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import { useDatasets, useDataset } from "@/utils/dataHooks"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  Anchor,
  Badge,
  Button,
  Container,
  Fieldset,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { IconPlus, IconCheck } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import { useRouter } from "next/router"
import { generateSlug } from "random-word-slugs"
import { useEffect, useState } from "react"

const DEFAULT_PROMPT = [
  {
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "",
      },
    ],
    variations: [
      {
        variables: {},
      },
    ],
  },
]

function PromptTab({ prompt, setPrompt }) {
  const { messages, variations } = prompt

  const promptVariables = usePromptVariables(messages)

  function setMessages(messages) {
    const newPrompt = { ...prompt, messages }
    setPrompt(newPrompt)
  }

  function setVariableValue(
    variableName: string,
    value: string,
    index: number,
  ) {
    const newVariations = [...variations]
    const newVariable = { [variableName]: value }
    newVariations[index] = {
      ...newVariations[index],
      variables: { ...newVariations[index].variables, ...newVariable },
    }
    setPrompt({ ...prompt, variations: newVariations })
  }

  function setIdealOutput(idealOutput) {
    const newPrompt = { ...prompt, idealOutput }
    setPrompt(newPrompt)
  }

  useEffect(() => {
    let i = 0
    const newVariations = []
    for (const variation of variations) {
      const filteredVariables = {}

      for (const key of Object.keys(promptVariables)) {
        if (promptVariables[key] === "") {
          filteredVariables[key] = variation.variables[key]
        }
      }

      newVariations.push({ ...variation, variables: filteredVariables })
      i++
    }

    setPrompt({
      ...prompt,
      variations: newVariations,
    })
  }, [promptVariables])

  const hasVariables = Object.keys(promptVariables).length > 0

  return (
    <Stack>
      <PromptEditor
        onChange={(value) => setMessages(value)}
        value={messages}
        isText={false}
      />
      {variations?.map((variation, i) => (
        <Fieldset
          variant="filled"
          key={i}
          legend={hasVariables && `Variation ${i + 1}`}
        >
          <Stack>
            <PromptVariableEditor
              variables={variation.variables}
              updateVariable={(variable, value) => {
                setVariableValue(variable, value, i)
                // const oldVariables = variations[i].variables
                // const newVariables = {
                //   ...oldVariables,
                //   [variable]: value,
                // }
                // handlers.setItemProp(i, "variables", newVariables)
              }}
            />

            <Textarea
              label="Ideal output (optional)"
              description="Useful for assessing the proximity of the LLM response to an anticipated output."
              required={false}
              autosize
              maxRows={6}
              minRows={3}
              value={variation.idealOutput}
              onChange={(e) => setIdealOutput(e.target.value)}
            />
          </Stack>
        </Fieldset>
      ))}
      {hasVariables && (
        <>
          <Text size="sm" c="dimmed">
            Experiment with various configurations in the prompt:
          </Text>
        </>
      )}
      {hasVariables && (
        <Button
          variant="outline"
          onClick={() => {
            const newVariation = { variables: promptVariables }
            setPrompt({ ...prompt, variations: [...variations, newVariation] })

            // const newVariables = promptVariables
            // const newVariations = [{ ...variations, variables: newVariables }]
            // variations.push(newVariations)

            // setPrompt({ ...prompt, variations: newVariations })
          }}
        >
          Add variation
        </Button>
      )}
    </Stack>
  )
}

export default function NewDataset() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    insert: insertDataset,
    isInserting,
    update: updateDataset,
  } = useDatasets()

  const [activeTab, setActiveTab] = useState<string | null>("prompt-1")

  const datasetId = router.query.id as string
  const { dataset, isLoading } = useDataset(datasetId)

  const [prompts, handlers] = useListState(DEFAULT_PROMPT)

  useEffect(() => {
    if (dataset?.prompt?.lengths) {
      const defaultPrompts = dataset?.prompts?.map((prompt) => ({
        messages: prompt.content,
        variations: prompt.variations,
      }))
      handlers.setState(defaultPrompts)
    }
  }, [dataset])

  const isEdit = pathname?.split("/")?.at(-1) !== "new"
  const title = isEdit ? "Edit Dataset" : "Create Dataset"

  if (isLoading) {
    return <Loader />
  }

  return (
    <Container>
      <Stack gap="lg">
        <Anchor
          href="#"
          onClick={(e) => {
            e.preventDefault()
            router.back()
          }}
        >
          ← Back
        </Anchor>
        <Stack>
          <Group align="center">
            <Title>{title}</Title>
            <Badge variant="light" color="violet">
              Alpha
            </Badge>
          </Group>
          <Text size="lg" mb="md">
            Datasets are collections of prompts that you can use as a basis for
            evaluations.
          </Text>
        </Stack>

        <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
          <Group justify="space-between" mb="lg">
            <Tabs.List>
              {prompts.map((_, i) => (
                <Tabs.Tab key={i} value={`prompt-${i + 1}`}>
                  {`Prompt ${i + 1} `}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Button
              leftSection={<IconPlus size={12} />}
              variant="outline"
              onClick={() => handlers.append(DEFAULT_PROMPT)}
              size="sm"
            >
              Add Prompt
            </Button>
          </Group>

          {prompts.map((prompt, i) => (
            <Tabs.Panel value={`prompt-${i + 1}`}>
              <PromptTab
                prompt={prompt}
                setPrompt={(prompt) => handlers.setItem(i, prompt)}
              />
            </Tabs.Panel>
          ))}
        </Tabs>

        <Button
          display="inline-block"
          ml="auto"
          loading={isInserting}
          onClick={async () => {
            if (!isEdit) {
              const { datasetId } = await insertDataset({
                slug: generateSlug(2),
                prompts,
              })
              notifications.show({
                icon: <IconCheck size={18} />,
                color: "teal",
                title: "Dataset save",
              })
              router.push(evaluations)
            } else {
              await updateDataset({
                id: router.query.id,
                prompts,
              })

              notifications.show({
                icon: <IconCheck size={18} />,
                color: "teal",
                title: "Dataset save",
              })
              router.push(`/evaluations`)
            }
          }}
        >
          Save Dataset
        </Button>
      </Stack>
    </Container>
  )
}
