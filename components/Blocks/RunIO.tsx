import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core"
import SmartViewer from "./SmartViewer"
import TokensBadge from "./TokensBadge"
import { useEffect, useState } from "react"
import { IconBolt, IconCirclePlus } from "@tabler/icons-react"

import { ChatMessage } from "./SmartViewer/Message"
import { useCurrentApp } from "@/utils/dataHooks"

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

const isChatMessages = (obj) => {
  return Array.isArray(obj)
    ? obj.every((m) => typeof m.text === "string" && typeof m.role === "string")
    : false
}

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

// This is the component that renders the input and output of a run
// It also contain the logic for the playground
// Which allows re-running the input of a run to experiment with prompt variations

const ParamItem = ({ name, value }) => (
  <Group>
    <Text size="sm">{name}</Text>
    {typeof value === "string" || typeof value === "number" ? (
      <Text size="sm">{value}</Text>
    ) : (
      value
    )}
  </Group>
)

export default function RunInputOutput({ run }) {
  const [tempRun, setTempRun] = useState(JSON.parse(JSON.stringify(run)))
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [model, setModel] = useState("gpt-3.5-turbo")

  const canEnablePlayground =
    run.type === "llm" && run.input && isChatMessages(run.input)

  const { app } = useCurrentApp()

  const runPlayground = async () => {
    setLoading(true)

    // Then you can use AnthropicStream like this:
    const fetchResponse = await fetch("/api/generation/playground", {
      method: "POST",
      body: JSON.stringify({ run: tempRun, model, appId: app.id }),
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

      setTempRun({
        ...tempRun,
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

      setTempRun({
        ...tempRun,
        output: convertOpenAImessage(responseMessage),
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    setTempRun(JSON.parse(JSON.stringify(run)))
  }, [run])

  const runToRender = tempRun ? tempRun : run

  return (
    <Stack>
      {canEnablePlayground && (
        <ParamItem
          name="Playground (edit & re-run)"
          value={
            <Switch
              size="sm"
              w={40}
              checked={editMode}
              onChange={() => setEditMode(!editMode)}
            />
          }
        />
      )}

      <ParamItem
        name="Model"
        value={
          editMode ? (
            <Select
              size="xs"
              data={availableModels}
              value={model}
              w={200}
              onChange={setModel}
              searchable
              inputMode="search"
            />
          ) : (
            runToRender.name
          )
        }
      />

      {(typeof runToRender.params?.temperature !== "undefined" || editMode) && (
        <ParamItem
          name="Temperature"
          value={
            editMode ? (
              <NumberInput
                min={0}
                max={2}
                step={0.1}
                precision={2}
                size="xs"
                value={runToRender.params?.temperature}
                w={150}
                onChange={(value) =>
                  setTempRun({
                    ...tempRun,
                    params: { ...tempRun.params, temperature: value },
                  })
                }
              />
            ) : (
              runToRender.params?.temperature
            )
          }
        />
      )}

      {(typeof runToRender.params?.max_tokens !== "undefined" || editMode) && (
        <ParamItem
          name="Max tokens"
          value={
            editMode ? (
              <NumberInput
                min={1}
                max={32000}
                step={100}
                size="xs"
                value={runToRender.params?.max_tokens}
                w={150}
                onChange={(value) =>
                  setTempRun({
                    ...tempRun,
                    params: { ...tempRun.params, max_tokens: value },
                  })
                }
              />
            ) : (
              runToRender.params?.max_tokens
            )
          }
        />
      )}

      <Group position="apart">
        <Text weight="bold" size="sm">
          Input
        </Text>
        {!editMode && run.prompt_tokens && (
          <TokensBadge tokens={run.prompt_tokens} />
        )}

        {editMode && (
          <Button
            leftIcon={<IconBolt size={16} />}
            size="xs"
            onClick={runPlayground}
            loading={loading}
          >
            Re-run
          </Button>
        )}
      </Group>
      <div id="input">
        {editMode && canEnablePlayground ? (
          <Stack>
            {isChatMessages(runToRender?.input) &&
              runToRender?.input?.map((message, i) => (
                <ChatMessage
                  data={message}
                  key={i}
                  editable={true}
                  onChange={(newMessage) => {
                    const newInput = tempRun.input
                    newInput[i] = newMessage
                    setTempRun({
                      ...tempRun,
                      input: newInput,
                    })
                  }}
                />
              ))}
          </Stack>
        ) : (
          <SmartViewer data={run.input} />
        )}

        {editMode && (
          <ActionIcon
            mx="auto"
            mt="xs"
            onClick={() =>
              setTempRun({
                ...tempRun,
                input: [...tempRun.input, { text: " ", role: "user" }],
              })
            }
          >
            <IconCirclePlus size={16} />
          </ActionIcon>
        )}
      </div>
      {(runToRender.input || runToRender.error) && (
        <>
          <Group position="apart">
            <Text weight="bold" size="sm">
              {runToRender.error ? "Error" : "Output"}
            </Text>
            {!editMode && runToRender.completion_tokens && (
              <TokensBadge tokens={runToRender.completion_tokens} />
            )}
          </Group>
          <SmartViewer data={runToRender.output} error={runToRender.error} />
        </>
      )}
    </Stack>
  )
}
