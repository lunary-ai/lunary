import { useEffect, useMemo, useState } from "react"
import { jsonrepair } from "jsonrepair"

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Grid,
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
import TemplateInputArea from "@/components/Blocks/Prompts/TemplateInputArea"
import TemplateList, {
  defaultTemplateVersion,
} from "@/components/Blocks/Prompts/TemplateMenu"
import { notifications } from "@mantine/notifications"
import { generateSlug } from "random-word-slugs"
import {
  useOrg,
  useTemplates,
  useTemplate,
  useTemplateVersion,
  useUser,
  useProjects,
  useCurrentProject,
} from "@/utils/dataHooks"
import { fetcher } from "@/utils/fetcher"
import Empty from "@/components/Layout/Empty"

const availableModels = [
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-16k",
  "google/gemini-pro",
  "openai/gpt-4-32k",
  "claude-2",
  "claude-2.0",
  "claude-instant-v1",
  "open-orca/mistral-7b-openorca",
  "mistralai/mixtral-8x7b-instruct",
  "mistralai/mistral-7b-instruct",
  "teknium/openhermes-2.5-mistral-7b",
  "perplexity/pplx-70b-chat",
  "perplexity/pplx-7b-chat",
  "openchat/openchat-7b",
  "google/palm-2-chat-bison",
  "meta-llama/llama-2-13b-chat",
  "meta-llama/llama-2-70b-chat",
]

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

// const FEATURE_LIST = [
//   "Edit captured requests live",
//   "Optimize prompts",
//   "Share results with your team",
//   "Test brand-new models such as Mistral, Claude v2, Bison & more.",
// ]

function Playground() {
  const router = useRouter()

  // const [template, setTemplate] = useLocalStorage<any>({
  //   key: "template",
  // })

  // const [templateVersion, setTemplateVersion] = useLocalStorage<any>({
  //   key: "tp-version",
  //   default: defaultTemplateVersion,
  // })

  const { templates } = useTemplates()

  const { currentProject } = useCurrentProject()

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

  useEffect(() => {
    if (!currentProject) return

    const { clone, id } = router.query

    // check if we want to clone an existing run
    if (id) {
      const fetchTemplate = async () => {
        setLoading(true)

        const data = await fetcher.get(
          `/projects/${currentProject?.id}/template_versions/${id}`,
        )

        if (data) {
          setTemplateVersion(data)
          setTemplate(data.template)
        }

        setLoading(false)
      }

      fetchTemplate()
    } else if (clone) {
      const fetchRun = async () => {
        setLoading(true)
        const run = await fetcher.get(
          `/projects/${currentProject?.id}/runs/${clone}/`,
        )

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
  }, [currentProject])

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
          slug: generateSlug(2),
          mode: "openai",
          orgId: org?.id,
          ...data,
        })

        setTemplate(newTemplate)
        setTemplateVersion(newTemplate?.versions[0])
      }
    }

    setHasChanges(false)

    mutate()
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
          orgId: org?.id,
          ...data,
        })

        setTemplate(newTemplate)
        setTemplateVersion(newTemplate?.versions[0])
      } else {
        const newVersion = await insertVersion(data)

        console.log(newVersion)
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

    analytics.track("RunPlayground", {
      model,
    })

    if (!org?.playAllowance) {
      return openUpgrade("playground")
    }

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
          },
          body: JSON.stringify({
            content: templateVersion.content,
            extra: templateVersion.extra,
            testValues: templateVersion.testValues,
          }),
        },
      )

      const reader = fetchResponse?.body?.getReader()

      if (!reader) {
        throw new Error("Error creating a stream from the response.")
      }

      let responseMessage = {
        content: "",
        role: "assistant",
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
          console.log({ item })
          const parsedLine = JSON.parse(item)

          setOutput(parsedLine.choices[0]?.message)
          setOutputTokens(parsedLine.tokens)
        }

        // if (streamedResponse.startsWith('{"function_call":')) {
        //   // While the function call is streaming, it will be a string.
        //   responseMessage["function_call"] = streamedResponse
        // } else {
        //   responseMessage["content"] = streamedResponse
        // }

        // setOutput({
        //   role: "assistant",
        //   content: responseMessage.content,
        //   toolCalls: responseMessage.toolCalls,
        // })

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

  // Parse variables from the content template (handlebars parsing)
  const variables = useMemo(() => {
    const variables = {}
    const variableRegex = /{{([^}]+)}}/g
    let contentArray = Array.isArray(templateVersion?.content)
      ? templateVersion?.content
      : [templateVersion?.content]

    contentArray.forEach((message) => {
      let match
      let messageText = typeof message === "string" ? message : message?.content
      while ((match = variableRegex.exec(messageText)) !== null) {
        variables[match[1].trim()] = ""
      }
    })

    return variables
  }, [templateVersion])

  return (
    <Empty
      enable={!templates?.length && !router.query.clone}
      title="Create prompt templates"
      features={[
        "Collaborate with non-technical people",
        "Clean up your source-code",
        "Easily roll-back to previous versions",
      ]}
      Icon={IconBracketsAngle}
      buttonLabel="Create first template"
      onClick={() => {}}
    >
      <Grid
        w="100%"
        overflow="hidden"
        styles={{
          inner: {
            flexWrap: "nowrap",
            height: "calc(100vh - var(--navbar-size))",
          },
        }}
      >
        <Grid.Col
          span={2}
          style={{ borderRight: "1px solid rgba(120, 120, 120, 0.1)" }}
        >
          <TemplateList
            activeTemplate={template}
            switchTemplate={setTemplate}
            activeVersion={templateVersion}
            switchTemplateVersion={switchTemplateVersion}
          />
        </Grid.Col>
        <Grid.Col
          span={7}
          p="xl"
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
        </Grid.Col>
        <Grid.Col span={3} p="xl">
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
                disabled={loading || (!templateVersion?.isDraft && !hasChanges)}
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
                      data={availableModels.filter((model) =>
                        template?.mode === "openai"
                          ? model.includes("gpt-")
                          : true,
                      )}
                      w={250}
                      searchable
                      autoCorrect="off"
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
                      gap={0}
                    >
                      <Badge
                        key={variable}
                        maw={90}
                        variant="outline"
                        style={{ textTransform: "none" }}
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
        </Grid.Col>
      </Grid>
    </Empty>
  )
}

export default Playground
