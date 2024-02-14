import PromptVariableEditor from "@/components/Blocks/PromptVariableEditor"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import { useDatasets } from "@/utils/dataHooks"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  Anchor,
  Badge,
  Button,
  Container,
  Fieldset,
  Group,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { usePathname } from "next/navigation"
import { useRouter } from "next/router"
import { generateSlug } from "random-word-slugs"
import { useEffect, useState } from "react"

const defaultPrompt = {
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
}

function PromptTab({ prompt, setPrompt }) {
  console.log(prompt)
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
    newVariations[index] = { ...newVariations[index], [variableName]: value }
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
    <>
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
    </>
  )
  {
    /* 

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
          onClick={() =>
            handlers.append({
              variables: Object.keys(promptVariables).reduce(
                (acc, key) => ({ ...acc, [key]: "" }),
                {},
              ),
            })
          }
        >
          Add variation
        </Button>
      )}


      
      */
  }
}

export default function NewDataset() {
  const router = useRouter()
  const pathname = usePathname()
  const { insert: insertDataset, isInserting } = useDatasets()

  const [activeTab, setActiveTab] = useState<string | null>("prompt-1")

  const [prompts, handlers] = useListState([defaultPrompt])

  const isEdit = pathname?.split("/")?.at(-1) === "new"
  const title = isEdit ? "Edit Dataset" : "Create Dataset"

  return (
    <Container>
      <Stack gap="lg">
        <Anchor href="/evaluations">← Back to evaluations</Anchor>
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

        <Button w="100" onClick={() => handlers.append(defaultPrompt)}>
          Add Prompt
        </Button>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            {prompts.map((prompt, i) => (
              <Tabs.Tab key={i} value={`prompt-${i + 1}`}>
                {`Prompt ${i + 1} `}
              </Tabs.Tab>
            ))}
          </Tabs.List>

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
            const { datasetId } = await insertDataset({
              slug: generateSlug(2),
              prompts,
            })
            router.push(`/datasets/${datasetId}`)
          }}
        >
          Save Dataset
        </Button>
      </Stack>
    </Container>
  )
}
