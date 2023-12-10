import SmartViewer from "@/components/Blocks/SmartViewer"
import { ChatMessage } from "@/components/Blocks/SmartViewer/Message"
import Paywall from "@/components/Layout/Paywall"
import { useCurrentApp, useProfile, useTemplates } from "@/utils/dataHooks"
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Kbd,
  Loader,
  NavLink,
  NumberInput,
  Pill,
  ScrollArea,
  Select,
  Stack,
  Text,
} from "@mantine/core"
import { useHotkeys, useLocalStorage } from "@mantine/hooks"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import {
  IconBolt,
  IconCircleMinus,
  IconCirclePlus,
  IconDeviceFloppy,
  IconHelp,
  IconPlayerPlayFilled,
  IconPlus,
  IconTemplate,
} from "@tabler/icons-react"
import { useRouter } from "next/router"
import { useEffect, useMemo, useState } from "react"
import analytics from "../../utils/analytics"
import { openUpgrade } from "@/components/Layout/UpgradeModal"
import { generateSlug } from "random-word-slugs"
import { formatDistance, formatDistanceToNow } from "date-fns"
import HotkeysInfo from "@/components/Blocks/HotkeysInfo"

const availableModels = [
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-16k",
  "openai/gpt-4-32k",
  "claude-2",
  "claude-2.0",
  "claude-instant-v1",
  "open-orca/mistral-7b-openorca",
  "mistralai/mistral-7b-instruct",
  "teknium/openhermes-2.5-mistral-7b",
  "perplexity/pplx-70b-chat",
  "perplexity/pplx-7b-chat",
  "openchat/openchat-7b",
  "google/palm-2-chat-bison",
  "meta-llama/llama-2-13b-chat",
  "meta-llama/llama-2-70b-chat",
]

function createChunkDecoder() {
  const decoder = new TextDecoder()

  return function (chunk: Uint8Array | undefined): string {
    if (!chunk) return ""
    return decoder.decode(chunk, { stream: true })
  }
}

function convertOpenAImessage(msg) {
  return {
    role: msg.role.replace("assistant", "ai"),
    text: msg.content,
    functionCall: msg.function_call,
  }
}

interface ParamInputItemProps {
  name: string
  value: number | string
  type: "number" | "select"
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  data?: { value: string; label: string }[] // For select input
  onChange: (value: number | string) => void
}

const ParamInputItem: React.FC<ParamInputItemProps> = ({
  name,
  value,
  type,
  min,
  max,
  step,
  defaultValue,
  size = "xs",
  data,
  onChange,
}) => {
  let inputElement = null

  if (type === "number") {
    inputElement = (
      <NumberInput
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        size={size}
        value={value as number}
        onChange={onChange}
        w={90}
      />
    )
  } else if (type === "select") {
    inputElement = (
      <Select
        size={size}
        data={data || []}
        value={value as string}
        onChange={onChange}
        w={250}
        searchable
        autoCorrect="off"
        inputMode="search"
      />
    )
  }

  return <ParamItem name={name} value={inputElement} />
}

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

const defaultTemplate = {
  content: [
    { text: "You are an helpful assistant.", role: "system" },
    { text: "Hi!", role: "user" },
  ],
  extra: {
    model: "gpt-4-1106-preview",
    temperature: 1.0,
    max_tokens: 1000,
    frequency_penalty: 0,
    presence_penalty: 0,
    top_p: 1,
  },
  error: null,
}

const FEATURE_LIST = [
  "Edit captured requests live",
  "Optimize prompts",
  "Share results with your team",
  "Test brand-new models such as Mistral, Claude v2, Bison & more.",
]

const TemplateList = ({ activeTemplate, setActiveTemplate }) => {
  const { app } = useCurrentApp()
  const { profile } = useProfile()

  const { templates, loading, update, insert } = useTemplates()

  // each version is a different row
  // group them by slug
  const templatesGrouped = useMemo(() => {
    const grouped = templates?.reduce((acc, template) => {
      const index = acc.findIndex((group) => group[0].slug === template.slug)
      if (index === -1) {
        acc.push([template])
      } else {
        acc[index].push(template)
      }
      return acc
    }, [])
    return grouped?.sort(
      (a, b) => new Date(b[0].created_at) - new Date(a[0].created_at),
    )
  }, [templates])

  const createTemplate = async () => {
    const slug = generateSlug(2)
    const data = await insert([
      {
        ...defaultTemplate,
        name: slug,
        app_id: app.id,
        org_id: profile.org.id,
        version: 1,
        slug,
      },
    ])

    setActiveTemplate(data[0])
  }

  if (loading) return <Loader />

  return (
    <ScrollArea h="100%">
      <NavLink
        label="Your templates"
        rightSection={
          <ActionIcon
            size="xs"
            radius="sm"
            variant="outline"
            onClick={createTemplate}
          >
            <IconPlus size={12} />
          </ActionIcon>
        }
      />
      {templatesGrouped?.map((versionGroup, index) => (
        <NavLink
          key={index}
          active={activeTemplate?.slug === versionGroup[0].slug}
          label={versionGroup[0]?.name}
          opened={activeTemplate?.slug === versionGroup[0].slug}
          onClick={() => setActiveTemplate(versionGroup[0])}
        >
          <ScrollArea.Autosize mah="200px">
            {versionGroup
              .sort((a, b) => b.version - a.version)
              .map((template, i) => (
                <NavLink
                  key={template.id}
                  active={activeTemplate?.id === template.id}
                  label={
                    <Group gap={8}>
                      <Text>{`v${template.version}`}</Text>
                      {i === 0 && (
                        <Badge size="xs" color="blue" variant="outline">
                          Live
                        </Badge>
                      )}

                      <Text c="dimmed" span size="sm" ml="auto">
                        {formatDistanceToNow(new Date(template.created_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    </Group>
                  }
                  onClick={() => setActiveTemplate(template)}
                />
              ))}
          </ScrollArea.Autosize>
        </NavLink>
      ))}
    </ScrollArea>
  )
}

function Playground() {
  const router = useRouter()
  const supabaseClient = useSupabaseClient()
  const [template, setTemplate] = useLocalStorage({
    key: "p-template",
    defaultValue: defaultTemplate,
  })

  const [hasChanges, setHasChanges] = useState(false)

  const { insert, mutate } = useTemplates()

  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState(null)
  const [error, setError] = useState(null)

  useHotkeys([
    [
      "mod+S",
      () => {
        if (hasChanges) saveAsTemplate()
      },
    ],
    [
      "mod+Enter",
      () => {
        if (!streaming) runPlayground()
      },
    ],
  ])

  const { profile, mutate: revalidateProfile } = useProfile()

  const { app } = useCurrentApp()

  useEffect(() => {
    const { clone, id } = router.query

    // check if we want to clone an existing run
    if (id) {
      const fetchTemplate = async () => {
        setLoading(true)
        const { data } = await supabaseClient
          .from("template")
          .select("*")
          .eq("id", id)
          .single()
          .throwOnError()

        if (data) setTemplate(data)

        setLoading(false)
      }

      fetchTemplate()
    } else if (clone) {
      const fetchRun = async () => {
        setLoading(true)
        const { data } = await supabaseClient
          .from("run")
          .select("*")
          .eq("id", clone)
          .single()
          .throwOnError()

        if (!Array.isArray(data.input)) data.input = [data.input]

        if (data) setTemplate({ ...template, content: data.input })

        setLoading(false)
        // remove the id from t

        router.push("/prompts")
      }

      fetchRun()
    }
  }, [router.query, template])

  const saveAsTemplate = async () => {
    const newVersion = await insert([
      {
        name: template?.name || "New template",
        app_id: app.id,
        org_id: profile.org.id,
        version: template?.version + 1 || 1,
        slug: template?.slug || "new-template",
        content: template.content,
        extra: template.extra,
      },
    ])

    console.log(newVersion)

    setTemplate(newVersion[0])
    mutate()
  }

  const runPlayground = async () => {
    const model = template.extra?.model

    analytics.track("RunPlayground", {
      model,
      appId: app.id,
    })

    if (profile.org?.play_allowance <= 0) {
      openUpgrade("playground")
    }

    setStreaming(true)

    try {
      const fetchResponse = await fetch("/api/generation/playground", {
        method: "POST",
        body: JSON.stringify({
          content: template.content,
          extra: template.extra,
          appId: app.id,
        }),
      })

      const reader = fetchResponse.body.getReader()

      let streamedResponse = ""
      let responseMessage = {
        content: "",
        role: "assistant",
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        // Update the chat state with the new message tokens.
        streamedResponse += createChunkDecoder()(value)

        if (streamedResponse.startsWith('{"function_call":')) {
          // While the function call is streaming, it will be a string.
          responseMessage["function_call"] = streamedResponse
        } else {
          responseMessage["content"] = streamedResponse
        }

        setOutput(convertOpenAImessage(responseMessage))

        // The request has been aborted, stop reading the stream.
        // if (abortControllerRef.current === null) {
        // reader.cancel()
        // break
        // }
      }

      if (streamedResponse.startsWith('{"function_call":')) {
        // Once the stream is complete, the function call is parsed into an object.
        const parsedFunctionCall = JSON.parse(streamedResponse).function_call

        responseMessage["function_call"] = parsedFunctionCall

        setOutput(convertOpenAImessage(responseMessage))
      }
    } catch (e) {
      console.error(e)
      setError(e)
    }

    revalidateProfile()

    setStreaming(false)
  }

  const extraHandler = (key) => ({
    value: template?.extra?.[key],
    onChange: (value) => {
      setHasChanges(true)
      setTemplate({
        ...template,
        extra: { ...template.extra, [key]: value },
      })
    },
  })

  return (
    <Grid
      w="100%"
      overflow="hidden"
      styles={{
        inner: {
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
          setActiveTemplate={setTemplate}
        />
      </Grid.Col>
      <Grid.Col
        span={7}
        p="xl"
        style={{ borderRight: "1px solid rgba(120, 120, 120, 0.1)" }}
      >
        <ScrollArea h="100%">
          {loading ? (
            <Loader />
          ) : (
            <Stack>
              <Text fw="bold" size="sm">
                Input
              </Text>
              {Array.isArray(template?.content) &&
                template?.content?.map((message, i) => (
                  <Box pos="relative" key={i}>
                    <ChatMessage
                      data={message}
                      key={i}
                      editable={true}
                      onChange={(newMessage) => {
                        const newContent = [...template.content]
                        newContent[i] = newMessage
                        setTemplate({ ...template, content: newContent })
                        setHasChanges(true)
                      }}
                    />
                    <ActionIcon
                      pos="absolute"
                      top={4}
                      right={4}
                      size="sm"
                      color="red"
                      variant="transparent"
                      onClick={() => {
                        const newContent = [...template.content]
                        newContent.splice(i, 1)
                        setTemplate({ ...template, content: newContent })
                        setHasChanges(true)
                      }}
                    >
                      <IconCircleMinus size="12" />
                    </ActionIcon>
                  </Box>
                ))}

              <ActionIcon
                mx="auto"
                mt="xs"
                variant="transparent"
                color="gray"
                onClick={() => {
                  const newContent = [
                    ...template.content,
                    { text: " ", role: "user" },
                  ]
                  setTemplate({ ...template, content: newContent })
                }}
              >
                <IconCirclePlus size="16" />
              </ActionIcon>

              {(output || error) && (
                <>
                  <Text fw="bold" size="sm">
                    {error ? "Error" : "Output"}
                  </Text>

                  <SmartViewer data={output} error={error} />
                </>
              )}
            </Stack>
          )}
        </ScrollArea>
      </Grid.Col>
      <Grid.Col span={3} p="xl">
        <Stack style={{ zIndex: 0 }}>
          <Group>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              size="sm"
              loading={loading}
              disabled={loading || (template && !hasChanges)}
              variant="outline"
              rightSection={
                <HotkeysInfo hot="S" size="sm" style={{ marginTop: -4 }} />
              }
              onClick={saveAsTemplate}
            >
              {template ? "Deploy changes" : "Save as template"}
            </Button>
            <Button
              leftSection={<IconHelp size={18} />}
              size="xs"
              variant="outline"
            >
              How to use
            </Button>
          </Group>
          <ParamItem
            name="Model"
            value={
              <Select
                size="xs"
                data={availableModels}
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
                defaultValue={1.0}
                step={0.1}
                decimalScale={2}
                size="xs"
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
                defaultValue={1000}
                max={32000}
                step={100}
                size="xs"
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
                defaultValue={0}
                decimalScale={2}
                step={0.1}
                size="xs"
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
                defaultValue={0}
                size="xs"
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
                defaultValue={1}
                decimalScale={2}
                step={0.1}
                size="xs"
                w={90}
                {...extraHandler("top_p")}
              />
            }
          />

          <Button
            leftSection={<IconBolt size="16" />}
            size="sm"
            disabled={loading}
            onClick={runPlayground}
            loading={streaming}
            rightSection={
              <HotkeysInfo hot="Enter" size="sm" style={{ marginTop: -4 }} />
            }
          >
            Run
          </Button>
        </Stack>
      </Grid.Col>
    </Grid>
  )
}

export default Playground
