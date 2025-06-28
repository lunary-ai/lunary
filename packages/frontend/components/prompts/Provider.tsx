import { jsonrepair } from "jsonrepair";

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  JsonInput,
  Modal,
  NumberInput,
  Popover,
  Slider,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import {
  IconAdjustments,
  IconInfoCircle,
  IconSettings,
  IconTools,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { Model, OldProvider } from "shared";
import ModelSelect from "./ModelSelect";

function convertOpenAIToolsToAnthropic(openAITools) {
  return openAITools.map((openAITool) => {
    const openAIFunction = openAITool.function;

    if (!openAIFunction) {
      return openAITool;
    }

    const anthropicTool = {
      name: openAIFunction.name,
      description: openAIFunction.description,
      input_schema: openAIFunction.parameters,
    };

    return anthropicTool;
  });
}

function convertAnthropicToolsToOpenAI(anthropicTools) {
  return anthropicTools.map((anthropicTool) => ({
    type: "function",
    function: {
      name: anthropicTool.name,
      description: anthropicTool.description,
      parameters: anthropicTool.input_schema,
    },
  }));
}

export const ParamItem = ({ name, value, description, displayValue }) => (
  <Stack gap={4}>
    <Group justify="space-between">
      <Group gap={5}>
        <Text size="sm" fw="bold">{name}</Text>
        {description && (
          <Tooltip label={description}>
            <IconInfoCircle size={14} />
          </Tooltip>
        )}
      </Group>
      {displayValue !== undefined ? (
        <Text size="sm" color="dimmed">
          {displayValue}
        </Text>
      ) : typeof value === "string" || typeof value === "number" ? (
        <Text size="sm">{value}</Text>
      ) : null}
    </Group>
    {typeof value !== "string" && typeof value !== "number" && value}
  </Stack>
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
  hideStream = false,
  hideTopP = false,
  hideToolCalls = false,
  hideModel = false,
}: {
  value: OldProvider;
  onChange: (value: OldProvider) => void;
  hideStream?: boolean;
  hideTopP?: boolean;
  hideToolCalls?: boolean;
  hideModel?: boolean;
}) {
  const [tempJSON, setTempJSON] = useState<any>("");
  const [jsonModalOpened, setJsonModalOpened] = useState(false);
  const [paramsPopoverOpened, setParamsPopoverOpened] = useState(false);
  const router = useRouter();

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

  function handleModelSelectChange(model: Model) {
    const modelId = model.id;

    const isPreviousProviderOpenAI =
      modelId.startsWith("gpt") || modelId.includes("mistral");
    const isNewProviderOpenAI =
      modelId.startsWith("gpt") || modelId.includes("mistral");

    const isPreviousProviderAnthropic = modelId.startsWith("claude");
    const isNewProviderAnthropic = modelId.startsWith("claude");

    let updatedTools = value.config.tools;

    if (
      isPreviousProviderOpenAI &&
      isNewProviderAnthropic &&
      value.config.tools
    ) {
      updatedTools = convertOpenAIToolsToAnthropic(value.config.tools);
    } else if (
      isPreviousProviderAnthropic &&
      isNewProviderOpenAI &&
      value.config.tools
    ) {
      updatedTools = convertAnthropicToolsToOpenAI(value.config.tools);
    }
    onChange({
      ...value,
      model,
      config: {
        ...value.config,
        tools: updatedTools,
      },
    });
  }

  return (
    <Stack gap={0}>
      {!hideModel && (
        <Stack gap={0}>
          <ParamItem
            name="Model"
            value={
              <Group gap="xs">
                <ModelSelect handleChange={handleModelSelectChange} />
                <Popover
              opened={paramsPopoverOpened}
              onChange={setParamsPopoverOpened}
              position="bottom-end"
              width={300}
              withArrow
            >
              <Popover.Target>
                <ActionIcon
                  size="lg"
                  variant="default"
                  onClick={() => setParamsPopoverOpened((o) => !o)}
                >
                  <IconAdjustments size={18} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="md">
                  <ParamItem
                    name="Temperature"
                    displayValue={value?.config?.temperature || 0}
                    value={
                      <Slider
                        min={0}
                        max={2}
                        step={0.01}
                        precision={2}
                        style={{ zIndex: 0 }}
                        w="100%"
                        {...configHandler("temperature")}
                      />
                    }
                  />
                  <ParamItem
                    name="Max tokens"
                    displayValue={value?.config?.max_tokens || 1}
                    value={
                      <Slider
                        min={1}
                        max={32768}
                        step={1}
                        w="100%"
                        {...configHandler("max_tokens")}
                      />
                    }
                  />
                  {!hideTopP && (
                    <ParamItem
                      name="Top P"
                      displayValue={value?.config?.top_p || 0}
                      value={
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          precision={2}
                          w="100%"
                          {...configHandler("top_p")}
                        />
                      }
                    />
                  )}
                  {!hideStream && (
                    <Group justify="space-between">
                      <Text size="sm">Stream</Text>
                      <Checkbox {...configHandler("stream", true)} />
                    </Group>
                  )}
                  {!hideToolCalls && (
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

                                    if (
                                      !empty &&
                                      !validateToolCalls(repaired)
                                    ) {
                                      throw new Error(
                                        "Invalid tool calls format",
                                      );
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
                                      title:
                                        "Please enter valid tool calls. " +
                                        e.message,
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
                              setTempJSON(
                                JSON.stringify(value?.config?.tools, null, 2),
                              );
                              setJsonModalOpened(true);
                            }}
                          >
                            {`Edit ${value?.config?.tools?.length ? `(${value.config.tools.length})` : ""}`}
                          </Button>
                        </>
                      }
                    />
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
              </Group>
            }
          />
        </Stack>
      )}
    </Stack>
  );
}
