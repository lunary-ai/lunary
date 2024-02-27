import PromptVariableEditor from "@/components/Blocks/PromptVariableEditor"
import RenamableField from "@/components/Blocks/RenamableField"
import { PromptEditor } from "@/components/Prompts/PromptEditor"
import {
  useDataset,
  useDatasetPrompt,
  useDatasetPromptVariation,
} from "@/utils/dataHooks"
import { cleanSlug, formatCompactFromNow } from "@/utils/format"
import { usePromptVariables } from "@/utils/promptsHooks"
import {
  ActionIcon,
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
import { useDebouncedState } from "@mantine/hooks"
import { modals } from "@mantine/modals"
import { IconCircleMinus, IconPlus } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

function PromptVariation({ i, variationId, variables, onDelete, markSaved }) {
  const { variation, update, remove, mutate } =
    useDatasetPromptVariation(variationId)

  const { prompt } = useDatasetPrompt(variation?.promptId)

  const hasVariables = Object.keys(variables).length > 0

  const [debouncedVariation, setDebouncedVariation] = useDebouncedState(
    null,
    500,
  )

  // console.log("variables", variation?.variables)

  useEffect(() => {
    if (debouncedVariation) {
      update(debouncedVariation, {
        revalidate: false,
        optimisticData: (data) => ({ ...data, ...debouncedVariation }),
        onSuccess: () => {
          markSaved()
        },
      })
    }
  }, [debouncedVariation])

  useEffect(() => {
    if (!variation || !variables) return

    Object.keys(variables).forEach((key) => {
      if (typeof variation.variables[key] === "undefined") {
        setVariableValue(key, "")
      }
    })

    Object.keys(variation.variables).forEach((key) => {
      if (typeof variables[key] === "undefined") {
        setVariableValue(key, undefined)
      }
    })
  }, [variables])

  const setVariableValue = (variable, value) => {
    let updatedVariables = { ...variation?.variables }

    if (typeof value === "undefined") {
      delete updatedVariables[variable]
    } else {
      updatedVariables[variable] = value
    }

    const updatedVariation = { ...variation, variables: updatedVariables }
    mutate(updatedVariation, { revalidate: false })
    setDebouncedVariation(updatedVariation)
  }

  const setIdealOutput = (idealOutput) => {
    const updatedVariation = { ...variation, idealOutput }
    mutate(updatedVariation, { revalidate: false })
    setDebouncedVariation(updatedVariation)
  }

  return (
    <Fieldset
      variant="filled"
      pos="relative"
      legend={hasVariables && `Variation ${i + 1}`}
    >
      <Stack>
        <PromptVariableEditor
          variables={variation?.variables}
          updateVariable={(variable, value) => {
            setVariableValue(variable, value)
          }}
        />

        <Textarea
          label="Ideal output (optional)"
          description="Useful for assessing the proximity of the LLM response to an anticipated output."
          required={false}
          autosize
          maxRows={6}
          minRows={3}
          value={variation?.idealOutput || ""}
          onChange={(e) => setIdealOutput(e.target.value)}
        />
      </Stack>
      {prompt?.variations?.length > 1 && (
        <ActionIcon
          onClick={async () => {
            onDelete()
            await remove()
          }}
          pos="absolute"
          top={-25}
          right={-15}
          color="red"
          variant="subtle"
        >
          <IconCircleMinus size="12" />
        </ActionIcon>
      )}
    </Fieldset>
  )
}

function PromptTab({ isText, promptId, onDelete, markSaved }) {
  const {
    prompt,
    update,
    loading,
    remove,
    insertVariation,
    isInsertingVariation,
    mutate,
  } = useDatasetPrompt(promptId)

  const promptVariables = usePromptVariables(prompt?.messages)

  const [debouncedMessages, setDebouncedMessages] = useDebouncedState(null, 500)

  useEffect(() => {
    if (debouncedMessages) {
      update(
        { messages: debouncedMessages },
        {
          onSuccess: () => {
            markSaved()
          },
        },
      )
    }
  }, [debouncedMessages])

  const hasVariables = Object.keys(promptVariables).length > 0

  if (loading) {
    return <Loader />
  }

  return (
    <Stack>
      <PromptEditor
        onChange={(value) => {
          mutate({ ...prompt, messages: value }, { revalidate: false })
          setDebouncedMessages(value)
        }}
        value={prompt?.messages}
        isText={isText}
      />
      {prompt?.variations?.map((variation, i) => (
        <PromptVariation
          key={i}
          i={i}
          variables={promptVariables}
          markSaved={markSaved}
          variationId={variation.id}
          onDelete={() => {
            mutate({
              ...prompt,
              variations: prompt.variations.filter(
                (v) => v.id !== variation.id,
              ),
            })
          }}
        />
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
          loading={isInsertingVariation}
          onClick={async () => {
            const variation = await insertVariation({ variables: {}, promptId })
            mutate({
              ...prompt,
              variations: [...prompt.variations, variation],
            })
          }}
        >
          Add variable variation
        </Button>
      )}

      <Button
        size="compact-sm"
        onClick={async () => {
          modals.openConfirmModal({
            title: "Please confirm your action",
            confirmProps: { color: "red" },
            children: (
              <Text size="sm">
                Are you sure you want to delete this prompt? This action cannot
                be undone and the prompt data will be lost forever.
              </Text>
            ),
            labels: { confirm: "Confirm", cancel: "Cancel" },

            onConfirm: async () => {
              onDelete()
              await remove()
            },
          })
        }}
        color="red"
        variant="subtle"
        w="fit-content"
      >
        Remove prompt
      </Button>
    </Stack>
  )
}

export default function NewDataset() {
  const router = useRouter()

  const [activePrompt, setActivePrompt] = useState<string | null>(null)

  const datasetId = router.query.id as string
  const { dataset, loading, update, insertPrompt, mutate, isInsertingPrompt } =
    useDataset(datasetId)

  const [lastSaved, setLastSaved] = useState<number>(dataset?.updatedAt)

  useEffect(() => {
    if (
      (dataset?.prompts.length > 0 && !activePrompt) ||
      (activePrompt && !dataset?.prompts.find((p) => p.id === activePrompt))
    ) {
      setActivePrompt(dataset.prompts[0].id)
    }
  }, [dataset, activePrompt])

  function markSaved() {
    setLastSaved(Date.now())
  }

  if (loading) {
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
          <Group>
            <Group align="center">
              {dataset && (
                <RenamableField
                  style={{ cursor: "pointer" }}
                  order={2}
                  size={24}
                  defaultValue={dataset.slug}
                  onRename={(newName) => {
                    update(
                      { slug: cleanSlug(newName) },
                      {
                        optimisticData: (data) => ({
                          ...data,
                          slug: cleanSlug(newName),
                        }),
                      },
                    )
                  }}
                />
              )}
              <Badge variant="light" color="violet">
                Alpha
              </Badge>
              <Badge
                variant="light"
                radius="sm"
                color="blue"
                size="md"
                tt="none"
              >
                {`${dataset.format} dataset`}
              </Badge>
            </Group>
            {lastSaved && (
              <Text size="sm" c="dimmed">
                Last saved {formatCompactFromNow(lastSaved)}
              </Text>
            )}
          </Group>
          <Text size="lg" mb="md">
            A dataset is a collection of prompts that you can use as a basis for
            evaluations.
          </Text>
        </Stack>

        <Tabs value={activePrompt} onChange={setActivePrompt} variant="pills">
          <Group justify="space-between" mb="lg" wrap="nowrap">
            <Tabs.List>
              {dataset?.prompts.map((prompt, i) => (
                <Tabs.Tab value={prompt.id} key={i}>
                  {`Prompt ${i + 1}`}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Button
              leftSection={<IconPlus size={12} />}
              variant="outline"
              loading={isInsertingPrompt}
              onClick={async () => {
                const prompt = await insertPrompt(
                  { datasetId },
                  {
                    onSuccess: () => {
                      markSaved()
                    },
                  },
                )
                mutate({
                  ...dataset,
                  prompts: [...dataset.prompts, prompt],
                })
                setActivePrompt(prompt.id)
              }}
              size="sm"
            >
              Add Prompt
            </Button>
          </Group>

          {dataset?.prompts.map((prompt, i) => (
            <Tabs.Panel key={i} value={prompt.id}>
              <PromptTab
                promptId={prompt.id}
                isText={dataset?.format === "text"}
                markSaved={markSaved}
                onDelete={() => {
                  mutate({
                    ...dataset,
                    prompts: dataset.prompts.filter((p) => p.id !== prompt.id),
                  })
                }}
              />
            </Tabs.Panel>
          ))}
        </Tabs>

        {/* <Button
          display="inline-block"
          ml="auto"
          loading={isInserting || isUpdating}
          onClick={() => saveDataset()}
        >
          Save Dataset
        </Button> */}
      </Stack>
    </Container>
  )
}
