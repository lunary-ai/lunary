import SmartViewer from "@/components/Blocks/SmartViewer"
import { ChatMessage } from "@/components/Blocks/SmartViewer/Message"
import { useCurrentApp, useTeam } from "@/utils/dataHooks"
import { Database } from "@/utils/supaTypes"
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"
import { modals } from "@mantine/modals"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { IconBolt, IconCircleMinus, IconCirclePlus } from "@tabler/icons-react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

const availableModels = [
  "gpt-4",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "openai/gpt-4-32k",
  "claude-2",
  "mistralai/mistral-7b-instruct",
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

const ParamItem = ({ name, value }) => (
  <Group position="apart">
    <Text size="sm">{name}</Text>
    {typeof value === "string" || typeof value === "number" ? (
      <Text size="sm">{value}</Text>
    ) : (
      value
    )}
  </Group>
)

const defaultRun = {
  input: [
    { text: "You are an helpful assistant.", role: "system" },
    { text: " ", role: "user" },
  ],

  error: null,
}

function Playground() {
  const router = useRouter()
  const supabaseClient = useSupabaseClient()

  const [run, setRun] = useLocalStorage({
    key: "p-run",
    defaultValue: defaultRun,
  })

  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)

  const { team } = useTeam()

  const [model, setModel] = useLocalStorage({
    key: "p-model",
    defaultValue: "gpt-3.5-turbo",
  })

  const { app } = useCurrentApp()

  // check if we have a run id in the optional 'id' param

  useEffect(() => {
    const { id } = router.query
    if (id) {
      const fetchRun = async () => {
        setLoading(true)
        const { data, error } = await supabaseClient
          .from("run")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          return console.error(error)
        }

        if (data) setRun(data)

        setLoading(false)
        // remove the id from the url

        router.push("/play")
      }

      fetchRun()
    }
  }, [router.query])

  const mutate = (data) => {
    setRun((r) => ({
      ...r,
      ...data,
    }))
  }

  const runPlayground = async () => {
    if (team?.playAllowances <= 0) {
      modals.openContextModal({
        modal: "upgrade",
        size: 800,
        innerProps: {},
      })
    }

    setStreaming(true)

    const fetchResponse = await fetch("/api/generation/playground", {
      method: "POST",
      body: JSON.stringify({ run, model, appId: app.id }),
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

      mutate({
        output: convertOpenAImessage(responseMessage),
      })

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

      mutate({
        output: convertOpenAImessage(responseMessage),
      })
    }

    setStreaming(false)
  }

  return (
    <Container size="lg">
      <Grid>
        <Grid.Col span={9}>
          <Card withBorder>
            {loading ? (
              <Loader />
            ) : (
              <Stack>
                <Text weight="bold" size="sm">
                  Input
                </Text>
                {run?.input?.map((message, i) => (
                  <Box pos="relative" key={i}>
                    <ChatMessage
                      data={message}
                      key={i}
                      editable={true}
                      onChange={(newMessage) => {
                        const newInput = run.input
                        newInput[i] = newMessage
                        mutate({
                          input: newInput,
                        })
                      }}
                    />
                    <ActionIcon
                      pos="absolute"
                      top={4}
                      right={4}
                      size="sm"
                      color="red"
                      onClick={() => {
                        const newInput = run.input
                        newInput.splice(i, 1)
                        mutate({
                          input: newInput,
                        })
                      }}
                    >
                      <IconCircleMinus size={12} />
                    </ActionIcon>
                  </Box>
                ))}

                <ActionIcon
                  mx="auto"
                  mt="xs"
                  onClick={() =>
                    mutate({
                      input: [...run.input, { text: " ", role: "user" }],
                    })
                  }
                >
                  <IconCirclePlus size={16} />
                </ActionIcon>

                {(run.input || run.error) && (
                  <>
                    <Group position="apart">
                      <Text weight="bold" size="sm">
                        {run.error ? "Error" : "Output"}
                      </Text>
                    </Group>
                    <SmartViewer data={run.output} error={run.error} />
                  </>
                )}
              </Stack>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder style={{ overflow: "visible" }}>
            <Stack>
              <ParamItem
                name="Model"
                value={
                  <Select
                    size="xs"
                    data={availableModels}
                    value={model}
                    w={150}
                    onChange={setModel}
                    searchable
                    autoCorrect={false}
                    inputMode="search"
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
                    precision={2}
                    size="xs"
                    value={run.params?.temperature}
                    w={100}
                    onChange={(value) =>
                      mutate({
                        params: { ...run.params, temperature: value },
                      })
                    }
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
                    value={run.params?.max_tokens}
                    w={100}
                    onChange={(value) =>
                      mutate({
                        params: { ...run.params, max_tokens: value },
                      })
                    }
                  />
                }
              />

              <ParamItem
                name="Frequency Penalty"
                value={
                  <NumberInput
                    min={-2}
                    max={2}
                    defaultValue={0}
                    precision={2}
                    step={0.1}
                    size="xs"
                    value={run.params?.frequency_penalty}
                    w={100}
                    onChange={(value) =>
                      mutate({
                        params: { ...run.params, frequency_penalty: value },
                      })
                    }
                  />
                }
              />

              <ParamItem
                name="Presency Penalty"
                value={
                  <NumberInput
                    min={-2}
                    max={2}
                    precision={2}
                    step={0.1}
                    defaultValue={0}
                    size="xs"
                    value={run.params?.presence_penalty}
                    w={100}
                    onChange={(value) =>
                      mutate({
                        params: { ...run.params, presence_penalty: value },
                      })
                    }
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
                    precision={2}
                    step={0.1}
                    size="xs"
                    value={run.params?.top_p}
                    w={100}
                    onChange={(value) =>
                      mutate({
                        params: { ...run.params, top_p: value },
                      })
                    }
                  />
                }
              />

              <Button
                leftIcon={<IconBolt size={16} />}
                size="xs"
                disabled={loading}
                onClick={runPlayground}
                loading={streaming}
              >
                Run
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  )
}

export default Playground
