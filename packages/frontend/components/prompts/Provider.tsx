import { jsonrepair } from "jsonrepair"

import {
  Button,
  Checkbox,
  Group,
  JsonInput,
  Modal,
  NumberInput,
  Select,
  Text,
} from "@mantine/core"

import { notifications } from "@mantine/notifications"

import { MODELS, Provider } from "shared"
import { useState } from "react"

export const ParamItem = ({ name, value }) => (
  <Group justify="space-between">
    <Text size="sm">{name}</Text>
    {typeof value === "string" || typeof value === "number" ? (
      <Text size="sm">{value}</Text>
    ) : (
      value
    )}
  </Group>
)

const isNullishButNotZero = (val: any) =>
  val === undefined || val === null || val === ""

export default function ProviderEditor({
  value,
  onChange,
}: {
  value: Provider
  onChange: (value: Provider) => void
}) {
  const [tempJSON, setTempJSON] = useState<any>("")
  const [jsonModalOpened, setJsonModalOpened] = useState(false)

  const configHandler = (key: string, isCheckbox?: boolean) => ({
    size: "xs",
    [isCheckbox ? "checked" : "value"]: isNullishButNotZero(
      value?.config?.[key],
    )
      ? isCheckbox
        ? false
        : ""
      : value?.config?.[key], // empty string is important to reset the value)
    onChange: (val) => {
      // Handle checkboxes
      if (isCheckbox) val = val.currentTarget.checked

      if (isNullishButNotZero(val)) val = undefined // handle empty strings and booleans

      onChange({
        ...value,
        config: {
          ...value.config,
          [key]: val,
        },
      })
    },
  })

  return (
    <>
      <ParamItem
        name="Model"
        value={
          <Select
            data={MODELS.map((model) => ({
              value: model.id,
              label: model.name,
            }))}
            w={250}
            size="xs"
            searchable
            inputMode="search"
            value={value?.model}
            onChange={(model) => {
              onChange({
                ...value,
                model,
              })
            }}
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
            {...configHandler("temperature")}
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
            {...configHandler("max_tokens")}
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
            {...configHandler("frequency_penalty")}
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
            {...configHandler("presence_penalty")}
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
            {...configHandler("top_p")}
          />
        }
      />

      <ParamItem
        name="Stream"
        value={<Checkbox {...configHandler("stream", true)} />}
      />

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
              <Group mt="sm" align="right">
                <Button
                  ml="auto"
                  size="xs"
                  variant="default"
                  onClick={() => {
                    try {
                      const empty = !tempJSON?.trim().length

                      if (!empty && tempJSON?.trim()[0] !== "[") {
                        throw new Error("Not an array")
                      }

                      const repaired = empty
                        ? undefined
                        : JSON.parse(jsonrepair(tempJSON.trim()))

                      if (
                        !empty &&
                        repaired.find(
                          (item) =>
                            item.type !== "function" || !item.function.name,
                        )
                      ) {
                        throw new Error("All items must have a function type")
                      }

                      onChange({
                        ...value,
                        config: {
                          ...value.config,
                          tools: empty ? undefined : repaired,
                        },
                      })
                      setJsonModalOpened(false)
                    } catch (e) {
                      console.error(e)
                      notifications.show({
                        title:
                          "Please enter a valid OpenAI tools array. " +
                          e.message,
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
              </Group>
            </Modal>
            <Button
              size="compact-xs"
              variant="outline"
              onClick={() => {
                setTempJSON(JSON.stringify(value?.config?.tools, null, 2))
                setJsonModalOpened(true)
              }}
            >
              Edit
            </Button>
          </>
        }
      />
    </>
  )
}
