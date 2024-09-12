import { jsonrepair } from "jsonrepair";

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  JsonInput,
  Modal,
  NavLink,
  NumberInput,
  Popover,
  Select,
  Text,
  Tooltip,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { MODELS, Provider } from "shared";
import { useState } from "react";
import Link from "next/link";
import { IconInfoCircle, IconTools } from "@tabler/icons-react";

function convertOpenAIToolsToAnthropic(openAITools) {
  return openAITools.map((openAITool) => {
    const openAIFunction = openAITool.function;

    if (!openAIFunction) {
      return openAITool;
    }

    const anthropicTool = {
      name: openAIFunction.name,
      description: openAIFunction.description,
      input_schema: {
        type: "object",
        properties: {},
        required: openAIFunction.parameters.required || [],
      },
    };

    for (const [key, value] of Object.entries(
      openAIFunction.parameters.properties,
    )) {
      anthropicTool.input_schema.properties[key] = {
        type: value.type,
        description: value.description,
      };
    }

    return anthropicTool;
  });
}

function convertAnthropicToolsToOpenAI(anthropicTools) {
  return anthropicTools.map((anthropicTool) => ({
    type: "function",
    function: {
      name: anthropicTool.name,
      description: anthropicTool.description,
      parameters: {
        type: "object",
        properties: anthropicTool.input_schema.properties,
        required: anthropicTool.input_schema.required,
      },
    },
  }));
}

export const ParamItem = ({ name, value, description }) => (
  <Group justify="space-between">
    <Group gap={5}>
      <Text size="sm">{name}</Text>
      {description && (
        <Tooltip label={description}>
          <IconInfoCircle size={14} />
        </Tooltip>
      )}
    </Group>
    {typeof value === "string" || typeof value === "number" ? (
      <Text size="sm">{value}</Text>
    ) : (
      value
    )}
  </Group>
);

const validateToolCalls = (toolCalls: any[]) => {
  if (!Array.isArray(toolCalls)) return false;

  const isNameDescriptionFormat = toolCalls.every(
    (t) => t.name && t.description && t.input_schema,
  );
  const isFunctionTypeFormat = toolCalls.every(
    (t) => t.type === "function" && t.function?.name,
  );

  return isNameDescriptionFormat || isFunctionTypeFormat;
};

const isNullishButNotZero = (val: any) =>
  val === undefined || val === null || val === "";

export default function ProviderEditor({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (value: Provider) => void;
}) {
  const [tempJSON, setTempJSON] = useState<any>("");
  const [jsonModalOpened, setJsonModalOpened] = useState(false);

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
      if (isCheckbox) val = val.currentTarget.checked;

      if (isNullishButNotZero(val)) val = undefined; // handle empty strings and booleans

      onChange({
        ...value,
        config: {
          ...value.config,
          [key]: val,
        },
      });
    },
  });

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
              if (!model || !value.model) {
                return;
              }
              // Handle conversion between OpenAI and Anthropic tools format
              const isPreviousProviderOpenAI =
                value.model.startsWith("gpt") ||
                value.model.includes("mistral");
              const isNewProviderOpenAI =
                model.startsWith("gpt") || model.includes("mistral");

              const isPreviousProviderAnthropic =
                value.model.startsWith("claude");

              const isNewProviderAnthropic = model.startsWith("claude");

              let updatedTools = value.config.tools;

              if (
                isPreviousProviderOpenAI &&
                isNewProviderAnthropic &&
                value.config.tools
              ) {
                updatedTools = convertOpenAIToolsToAnthropic(
                  value.config.tools,
                );
              } else if (
                isPreviousProviderAnthropic &&
                isNewProviderOpenAI &&
                value.config.tools
              ) {
                updatedTools = convertAnthropicToolsToOpenAI(
                  value.config.tools,
                );
              }

              onChange({
                ...value,
                model,
                config: {
                  ...value.config,
                  tools: updatedTools,
                },
              });
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
              title={
                <Group>
                  Tool Calls Definition
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconTools size={14} />}
                    component={Link}
                    href="https://lunary.ai/tool-calls-generator"
                    target="_blank"
                  >
                    Tool Calls Generator
                  </Button>
                </Group>
              }
            >
              <JsonInput
                autosize
                placeholder={`[
  {
    "type": "function",
    "function": {
      "name": "get_current_weather",
      "description": "Get the current weather in a given location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA"
          },
          "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
        }
      }
    }
  }
]`}
                value={tempJSON}
                onChange={(val) => {
                  setTempJSON(val);
                }}
              />
              <Group mt="sm" align="right">
                <Button
                  ml="auto"
                  size="xs"
                  variant="default"
                  onClick={() => {
                    try {
                      const empty = !tempJSON?.trim().length;

                      if (!empty && tempJSON?.trim()[0] !== "[") {
                        throw new Error("Not an array");
                      }

                      const repaired = empty
                        ? undefined
                        : JSON.parse(jsonrepair(tempJSON.trim()));

                      if (!empty && !validateToolCalls(repaired)) {
                        throw new Error("Invalid tool calls format");
                      }

                      onChange({
                        ...value,
                        config: {
                          ...value.config,
                          tools: empty ? undefined : repaired,
                        },
                      });
                      setJsonModalOpened(false);
                    } catch (e) {
                      console.error(e);
                      notifications.show({
                        title: "Please enter valid tool calls. " + e.message,
                        message: "Click here to open the docs.",
                        color: "red",
                        onClick: () =>
                          window.open(
                            "https://platform.openai.com/docs/guides/function-calling",
                            "_blank",
                          ),
                      });
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
                setTempJSON(JSON.stringify(value?.config?.tools, null, 2));
                setJsonModalOpened(true);
              }}
            >
              {`Edit ${value?.config?.tools?.length ? `(${value.config.tools.length})` : ""}`}
            </Button>
          </>
        }
      />
    </>
  );
}
