import { useCallback, useEffect, useRef, useState } from "react"
import { jsonrepair } from "jsonrepair"

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Group,
  JsonInput,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core"
import { useHotkeys } from "@mantine/hooks"
import {
  IconBolt,
  IconBracketsAngle,
  IconCheck,
  IconDeviceFloppy,
  IconGitCommit,
  IconInfoCircle,
} from "@tabler/icons-react"
import { useRouter } from "next/router"
import analytics from "../../utils/analytics"
import { openUpgrade } from "@/components/Layout/UpgradeModal"
import HotkeysInfo from "@/components/Blocks/HotkeysInfo"
import TemplateInputArea from "@/components/Prompts/TemplateInputArea"
import TemplateList, {
  defaultTemplateVersion,
} from "@/components/Prompts/TemplateMenu"
import { notifications } from "@mantine/notifications"
import { generateSlug } from "random-word-slugs"
import {
  useOrg,
  useTemplates,
  useTemplate,
  useTemplateVersion,
  useUser,
  useProject,
} from "@/utils/dataHooks"
import { fetcher } from "@/utils/fetcher"
import Empty from "@/components/Layout/Empty"

import { MODELS } from "shared"
import { usePromptVariables } from "@/utils/promptsHooks"
import { openConfirmModal } from "@mantine/modals"

const ParamItem = ({ name, value }) => (
  <Group justify="space-between">
    <Text size="sm">{name}</Text>
    {typeof value === "string" || typeof value === "number" ? (
      <Text size="sm">{value}</Text>
    ) : (
      value
    )}
  </Group>
)

function confirmDiscard(onDiscard) {
  return openConfirmModal({
    title: "Discard changes?",
    confirmProps: { color: "red" },
    children: (
      <Text size="sm">
        You have unsaved changes. Are you sure you want to discard them?
      </Text>
    ),
    labels: { confirm: "Confirm", cancel: "Cancel" },
    onConfirm() {
      onDiscard()
    },
  })
}

function Playground() {
  const router = useRouter()

  const { templates } = useTemplates()

  const { project } = useProject()

  const [template, setTemplate] = useState<any>()
  const [templateVersion, setTemplateVersion] = useState<any>(
    defaultTemplateVersion,
  )

  const [hasChanges, setHasChanges] = useState(false)

  const { insert, mutate } = useTemplates()
  const { insertVersion } = useTemplate(template?.id)
  const { update: updateVersion } = useTemplateVersion(templateVersion?.id)

  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<any>(null)
  const [outputTokens, setOutputTokens] = useState<any>(null)
  const [error, setError] = useState(null)
  const [tempJSON, setTempJSON] = useState<any>("")
  const [jsonModalOpened, setJsonModalOpened] = useState(false)

  const [rename, setRename] = useState(null)

  useHotkeys([
    [
      "mod+S",
      () => {
        if (hasChanges) saveTemplate()
      },
    ],
    [
      "mod+Enter",
      () => {
        if (!streaming) runPlayground()
      },
    ],
  ])

  const { mutate: revalidateUser } = useUser()
  const { org } = useOrg()

  // make sure to only fetch once
  const ref = useRef({ done: false })

  useEffect(() => {
    if (!project || ref.current?.done) return

    const { clone, id } = router.query

    // check if we want to clone an existing run
    if (id) {
      ref.current.done = true

      const fetchTemplate = async () => {
        setLoading(true)

        const data = await fetcher.get(
          `/template_versions/${id}?projectId=${project?.id}`,
        )

        if (data) {
          setTemplateVersion(data)
          setTemplate(data.template)
        }

        setLoading(false)
      }

      fetchTemplate()
    } else if (clone) {
      ref.current.done = true
      const fetchRun = async () => {
        setLoading(true)
        const run = await fetcher.get(`/runs/${clone}?projectId=${project?.id}`)

        if (run?.input) {
          setTemplateVersion({ ...templateVersion, content: run.input })
        }

        setLoading(false)

        // remove the query params
        router.push("/prompts")
      }

      fetchRun()
    } else {
      setTemplate({ mode: "openai" })
      setTemplateVersion(defaultTemplateVersion)
    }
  }, [project, router.query])

  useEffect(() => {
    setHasChanges(false)
  }, [template?.id])

  // Save as draft without deploying
  const saveTemplate = async () => {
    if (templateVersion.isDraft) {
      await updateVersion({
        ...templateVersion,
        extra: templateVersion.extra,
        content: templateVersion.content,
      })
    } else {
      const data = {
        testValues: templateVersion.testValues,
        content: templateVersion.content,
        extra: templateVersion.extra,
        isDraft: true,
      }

      if (template?.id) {
        const newVersion = await insertVersion(data)

        setTemplateVersion(newVersion)
      } else {
        const newTemplate = await insert({
          slug: generateSlug(),
          mode: "openai",
          ...data,
        })

        setTemplate(newTemplate)
        setTemplateVersion(newTemplate?.versions[0])
      }
    }

    setHasChanges(false)

    mutate()
  }

  const confirmDiscard = useCallback(
    (onProceed) => {
      if (hasChanges) {
        return openConfirmModal({
          title: "Discard changes?",
          confirmProps: { color: "red" },

          children: (
            <Text size="sm">
              You have unsaved changes. Are you sure you want to discard them?
            </Text>
          ),
          labels: { confirm: "Confirm", cancel: "Cancel" },
          onConfirm() {
            onProceed()
            setHasChanges(false)
          },
        })
      }

      onProceed()
    },
    [hasChanges],
  )

  const createTemplate = async () => {
    confirmDiscard(async () => {
      const slug = generateSlug(2)
      const newTemplate = await insert({
        mode: "openai",
        slug,
        ...defaultTemplateVersion,
      })
      setTemplate(newTemplate)
      setRename(newTemplate.id)
      switchTemplateVersion(newTemplate.versions[0])
      mutate()
    })
  }

  // Deploy the template
  const commitTemplate = async () => {
    if (templateVersion.isDraft) {
      await updateVersion({
        ...templateVersion,
        isDraft: false,
      })

      setTemplateVersion({ ...templateVersion, isDraft: false })
    } else {
      const data = {
        testValues: templateVersion.testValues,
        content: templateVersion.content,
        extra: templateVersion.extra,
        isDraft: false,
      }

      if (!template?.id) {
        const newTemplate = await insert({
          slug: generateSlug(2),
          mode: "openai",
          ...data,
        })

        setTemplate(newTemplate)
        setTemplateVersion(newTemplate?.versions[0])
      } else {
        const newVersion = await insertVersion(data)

        setTemplateVersion(newVersion)
      }
    }

    notifications.show({
      title: "Template deployed",
      icon: <IconCheck size={24} />,
      message: "A new version of your template is now being served.",
      color: "teal",
    })

    setHasChanges(false)

    mutate()
  }

  const runPlayground = async () => {
    const model = template.extra?.model

    if (org?.plan === "free" || !org?.playAllowance) {
      return openUpgrade("playground")
    }

    analytics.track("RunPlayground", {
      model,
    })

    setError(null)
    setOutput(null)
    setOutputTokens(0)
    setStreaming(true)

    try {
      const fetchResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/orgs/${org?.id}/playground`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          },
          body: JSON.stringify({
            content: templateVersion.content,
            extra: templateVersion.extra,
            variables: templateVersion.testValues,
          }),
        },
      )

      const reader = fetchResponse?.body?.getReader()

      if (!reader) {
        throw new Error("Error creating a stream from the response.")
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        // // Update the chat state with the new message tokens.
        const chunk = decoder.decode(value, { stream: true }).trim().split("\n")

        for (const item of chunk) {
          const parsedLine = JSON.parse(item)

          setOutput(parsedLine.choices[0]?.message)
          setOutputTokens(parsedLine.tokens)
        }

        // The request has been aborted, stop reading the stream.
        // if (abortControllerRef.current === null) {
        // reader.cancel()
        // break
        // }
      }
    } catch (e) {
      console.error(e)
      setError(e)
    }

    revalidateUser()

    setStreaming(false)
  }

  // reset output when the template or template version changes
  useEffect(() => {
    setOutput(null)
    setOutputTokens(0)
  }, [
    template?.id,
    templateVersion?.id,
    template?.mode,
    templateVersion?.extra?.model,
  ])

  const switchTemplateVersion = (v) => {
    setTemplateVersion(v)
    router.push(`/prompts/${v.id}`)
  }

  const extraHandler = (key: string, isCheckbox?: boolean) => ({
    size: "xs",
    [isCheckbox ? "checked" : "value"]:
      templateVersion?.extra?.[key] || (isCheckbox ? false : ""), // empty string is important to reset the value
    onChange: (value) => {
      // Handle checkboxes
      if (isCheckbox) value = value.currentTarget.checked

      setHasChanges(true)

      if (!value) value = undefined // handle empty strings and booleans

      setTemplateVersion({
        ...templateVersion,
        extra: { ...templateVersion.extra, [key]: value },
      })
    },
  })

  const variables = usePromptVariables(templateVersion?.content)

  return (
    <Empty
      enable={templates && !templates.length && !router.query.clone}
      title="Create prompt templates"
      features={[
        "Collaborate with non-technical people",
        "Clean up your source-code",
        "Easily roll-back to previous versions",
        "Test models such as Mistral, Claude v2, Bison & more.",
      ]}
      Icon={IconBracketsAngle}
      buttonLabel="Create first template"
      onClick={createTemplate}
    >
      <Flex w="100%" h="100%">
        <Box
          flex={`0 0 230px`}
          py="sm"
          style={{ borderRight: "1px solid rgba(120, 120, 120, 0.1)" }}
        >
          <TemplateList
            rename={rename}
            createTemplate={createTemplate}
            setRename={setRename}
            activeTemplate={template}
            activeVersion={templateVersion}
            switchTemplateVersion={(t, v) => {
              const proceed = () => {
                setTemplate(t)
                switchTemplateVersion(v)
              }

              // means we are deleting the template and already went through confirm
              if (!t) return proceed()

              confirmDiscard(() => {
                proceed()
              })
            }}
          />
        </Box>
        <Box
          p="xl"
          flex="1"
          style={{ borderRight: "1px solid rgba(120, 120, 120, 0.1)" }}
        >
          <Box mah="100%" style={{ overflowY: "auto" }}>
            <TemplateInputArea
              template={templateVersion}
              setTemplate={setTemplateVersion}
              saveTemplate={saveTemplate}
              setHasChanges={setHasChanges}
              output={output}
              outputTokens={outputTokens}
              error={error}
            />
          </Box>
        </Box>
        <Box p="xl">
          <Stack style={{ zIndex: 0 }}>
            <Group>
              <Button
                leftSection={<IconDeviceFloppy size={18} />}
                size="xs"
                loading={loading}
                disabled={loading || (template?.id && !hasChanges)}
                variant="outline"
                // rightSection={
                // <HotkeysInfo hot="S" size="sm" style={{ marginTop: -4 }} />
                // }
                onClick={saveTemplate}
              >
                Save changes
              </Button>

              <Button
                leftSection={<IconGitCommit size={18} />}
                size="xs"
                loading={loading}
                disabled={loading || !(templateVersion?.isDraft || hasChanges)}
                variant="filled"
                onClick={commitTemplate}
              >
                Deploy
              </Button>
            </Group>

            <ParamItem
              name="Template Mode"
              value={
                <SegmentedControl
                  size="xs"
                  disabled={loading || !templateVersion?.isDraft}
                  data={[
                    {
                      value: "openai",
                      label: "OpenAI",
                    },
                    {
                      value: "custom",
                      label: "Custom Chat",
                    },
                    {
                      value: "text",
                      label: "Text",
                    },
                  ]}
                  value={template?.mode}
                  onChange={(value) => {
                    const newTemplateVersion = { ...templateVersion }
                    if (template?.mode === "text" && value !== "text") {
                      // Switching from text to custom/openai
                      newTemplateVersion.content = [
                        { role: "user", content: templateVersion.content },
                      ]
                    } else if (template?.mode !== "text" && value === "text") {
                      // Switching from custom/openai to text
                      const firstUserMessage = templateVersion.content[0]

                      newTemplateVersion.content =
                        firstUserMessage?.content || ""
                    }
                    setTemplateVersion(newTemplateVersion)

                    setTemplate({ ...template, mode: value })
                  }}
                />
              }
            />

            {template?.mode !== "text" && (
              <>
                <ParamItem
                  name="Model"
                  value={
                    <Select
                      data={MODELS.filter((model) =>
                        template?.mode === "openai"
                          ? model.id.includes("gpt-")
                          : true,
                      ).map((model) => ({
                        value: model.id,
                        label: model.name,
                      }))}
                      w={250}
                      searchable
                      inputMode="search"
                      {...extraHandler("model")}
                    />
                  }
                />

                <ParamItem
                  name="Temperature"
                  value={
                    <NumberInput
                      min={0}
                      max={2}
                      step={0.1}
                      decimalScale={2}
                      style={{ zIndex: 0 }}
                      w={90}
                      {...extraHandler("temperature")}
                    />
                  }
                />

                <ParamItem
                  name="Max tokens"
                  value={
                    <NumberInput
                      min={1}
                      max={32000}
                      step={100}
                      w={90}
                      {...extraHandler("max_tokens")}
                    />
                  }
                />

                <ParamItem
                  name="Freq. Penalty"
                  value={
                    <NumberInput
                      min={-2}
                      max={2}
                      decimalScale={2}
                      step={0.1}
                      w={90}
                      {...extraHandler("frequency_penalty")}
                    />
                  }
                />

                <ParamItem
                  name="Pres. Penalty"
                  value={
                    <NumberInput
                      min={-2}
                      max={2}
                      decimalScale={2}
                      step={0.1}
                      w={90}
                      {...extraHandler("presence_penalty")}
                    />
                  }
                />

                <ParamItem
                  name="Top P"
                  value={
                    <NumberInput
                      min={0.1}
                      max={1}
                      decimalScale={2}
                      step={0.1}
                      w={90}
                      {...extraHandler("top_p")}
                    />
                  }
                />

                <ParamItem
                  name="Stream"
                  value={<Checkbox {...extraHandler("stream", true)} />}
                />

                {template?.mode === "openai" && (
                  <ParamItem
                    name="Tool Calls"
                    value={
                      <>
                        <Modal
                          size="lg"
                          opened={jsonModalOpened}
                          onClose={() => setJsonModalOpened(false)}
                          title="Tool Calls Definition"
                        >
                          <JsonInput
                            autosize
                            mr="sm"
                            placeholder={`[{
  type: "function",
  function: {
    name: "get_current_weather",
    description: "Get the current weather in a given location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA",
        },
        unit: { type: "string", enum: ["celsius", "fahrenheit"] },
      },
    },
  },
}]`}
                            // defaultValue={tempJSON}
                            value={tempJSON}
                            onChange={(val) => {
                              setTempJSON(val)
                            }}
                          />
                          <Button
                            mt="sm"
                            ml="auto"
                            onClick={() => {
                              try {
                                const empty = !tempJSON?.trim().length

                                if (!empty && tempJSON?.trim()[0] !== "[") {
                                  throw "Not an array"
                                }

                                setHasChanges(true)
                                setTemplateVersion({
                                  ...templateVersion,
                                  extra: {
                                    ...templateVersion.extra,
                                    tools: tempJSON?.trim().length
                                      ? JSON.parse(jsonrepair(tempJSON.trim()))
                                      : undefined,
                                  },
                                })
                                setJsonModalOpened(false)
                              } catch (e) {
                                console.error(e)
                                notifications.show({
                                  title:
                                    "Error parsing JSON. Please enter a valid OpenAI tools array.",
                                  message: "Click here to open the docs.",
                                  color: "red",
                                  onClick: () =>
                                    window.open(
                                      "https://platform.openai.com/docs/guides/function-calling",
                                      "_blank",
                                    ),
                                })
                              }
                            }}
                          >
                            Save
                          </Button>
                        </Modal>
                        <Button
                          size="compact-xs"
                          variant="outline"
                          onClick={() => {
                            setTempJSON(
                              JSON.stringify(
                                templateVersion?.extra?.tools,
                                null,
                                2,
                              ),
                            )
                            setJsonModalOpened(true)
                          }}
                        >
                          Edit
                        </Button>
                      </>
                    }
                  />
                )}
              </>
            )}

            {template && (
              <Card shadow="sm" p="sm" my="md">
                <Group mb="md" align="center" justify="space-between">
                  <Text size="sm" fw="bold">
                    Variables
                  </Text>
                  <Tooltip label="Add variables to your template in the {{ mustache }} format">
                    <IconInfoCircle size={16} />
                  </Tooltip>
                </Group>
                {!Object.keys(variables).length && (
                  <Text c="dimmed" size="sm">
                    {`Add variables to your template: {{variable}}`}
                  </Text>
                )}
                <Stack>
                  {Object.keys(variables).map((variable) => (
                    <Group
                      key={variable}
                      align="center"
                      justify="space-between"
                      gap={6}
                    >
                      <Badge
                        key={variable}
                        maw={200}
                        variant="outline"
                        tt="none"
                      >
                        {variable}
                      </Badge>
                      <Textarea
                        size="xs"
                        w={220}
                        radius="sm"
                        rows={1}
                        placeholder="Test Value"
                        value={templateVersion?.testValues?.[variable]}
                        onChange={(e) => {
                          setTemplateVersion({
                            ...templateVersion,
                            testValues: {
                              ...templateVersion.testValues,
                              [variable]: e.currentTarget.value,
                            },
                          })
                        }}
                      />
                    </Group>
                  ))}
                </Stack>
              </Card>
            )}

            {template?.mode !== "text" && (
              <Button
                leftSection={<IconBolt size="16" />}
                size="sm"
                disabled={loading}
                onClick={runPlayground}
                loading={streaming}
                rightSection={
                  <HotkeysInfo
                    hot="Enter"
                    size="sm"
                    style={{ marginTop: -4 }}
                  />
                }
              >
                {template?.id ? "Test template" : "Run"}
              </Button>
            )}
          </Stack>
        </Box>
      </Flex>
    </Empty>
  )
}

export default Playground
