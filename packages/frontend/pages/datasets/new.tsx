import PromptVariableEditor from "@/components/Blocks/PromptVariableEditor"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import { useDataset, useDatasets } from "@/utils/dataHooks"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  Badge,
  Button,
  Container,
  Fieldset,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { useRouter } from "next/router"
import { generateSlug } from "random-word-slugs"
import { useEffect, useState } from "react"
import { Variation } from "shared"

const defaultPrompt = [
  {
    role: "system",
    content: "You are a helpful assistant.",
  },
  {
    role: "user",
    content: "",
  },
]

export default function NewDataset() {
  const router = useRouter()
  const { insert: insertDataset, isInserting } = useDatasets()
  const [prompt, setPrompt] = useState(defaultPrompt)
  const promptVariables = usePromptVariables(prompt)

  const [variations, handlers] = useListState<Variation>([
    { variables: promptVariables },
  ])

  useEffect(() => {
    let i = 0
    for (const variation of variations) {
      console.log(variation)
      const filteredVariables = {}

      for (const key of Object.keys(promptVariables)) {
        if (promptVariables[key] === "") {
          filteredVariables[key] = variation.variables[key]
        }
      }

      handlers.setItem(i, { ...variation, variables: filteredVariables })
      i++
    }
  }, [promptVariables])

  const hasVariables = Object.keys(promptVariables).length > 0

  return (
    <Container>
      <Stack gap="lg">
        <Group align="center" justify="space-between">
          <Group align="center">
            <Title>Create Dataset</Title>
            <Badge variant="light" color="violet">
              Alpha
            </Badge>
          </Group>
          <Text size="lg" mb="md">
            Datasets are collections of prompts that you can use as a basis for
            evaluations.
          </Text>
        </Group>
        <PromptEditor
          onChange={(value) => setPrompt(value)}
          value={prompt}
          isText={false}
        />

        {variations.map((variation, i) => (
          <Fieldset
            variant="filled"
            key={i}
            legend={hasVariables && `Variation ${i + 1}`}
          >
            <Stack>
              <PromptVariableEditor
                variables={variation.variables}
                updateVariable={(variable, value) => {
                  const oldVariables = variations[i].variables
                  const newVariables = {
                    ...oldVariables,
                    [variable]: value,
                  }
                  handlers.setItemProp(i, "variables", newVariables)
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
                onChange={(e) =>
                  handlers.setItemProp(i, "idealOutput", e.currentTarget.value)
                }
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

        <Button
          display="inline-block"
          ml="auto"
          loading={isInserting}
          onClick={async () => {
            const { datasetId } = await insertDataset({
              slug: generateSlug(2),
              prompt,
              variations,
            })
            router.push(`/datasets/${datasetId}`)
          }}
        >
          Add prompt
        </Button>
      </Stack>
    </Container>
  )
}
