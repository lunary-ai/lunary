import { jsonrepair } from "jsonrepair";

import {
  ActionIcon,
  Anchor,
  Button,
  Checkbox,
  Group,
  JsonInput,
  Modal,
  NumberInput,
  Popover,
  Select,
  Slider,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import {
  IconAdjustments,
  IconChevronDown,
  IconInfoCircle,
  IconTools,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AnthropicThinkingConfig,
  FIXED_TEMPERATURE_VALUE,
  Model,
  OldProvider,
  getOpenAIReasoningEfforts,
  requiresFixedTemperature,
  supportsAnthropicThinking,
  supportsOpenAIThinking,
} from "shared";
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

export const ParamItem = ({
  name,
  value,
  description,
  displayValue,
  onValueChange,
  min,
  max,
  step,
  precision,
  disabled = false,
}) => (
  <Stack gap={4} mt="sm">
    <Group gap="0" justify="space-between">
      <Text size="sm" fw="bold">
        {name}
      </Text>
      {displayValue !== undefined && onValueChange ? (
        <NumberInput
          value={displayValue}
          onChange={disabled ? undefined : onValueChange}
          min={min}
          max={max}
          step={step}
          w={120}
          size="xs"
          variant="unstyled"
          disabled={disabled}
          styles={{
            input: {
              textAlign: "right",
              height: 24,
            },
          }}
        />
      ) : displayValue !== undefined ? (
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

const isOpenAIModel = (model: string | Model): boolean => {
  if (!model) return false;
  const modelId = typeof model === "string" ? model : model.id;
  return modelId.startsWith("gpt") || modelId.includes("o1");
};

const jsonSchemaExamples = [
  {
    value: "math_response",
    label: "math_response",
    schema: {
      name: "math_response",
      strict: true,
      schema: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                explanation: {
                  type: "string",
                },
                output: {
                  type: "string",
                },
              },
              required: ["explanation", "output"],
              additionalProperties: false,
            },
          },
          final_answer: {
            type: "string",
          },
        },
        additionalProperties: false,
        required: ["steps", "final_answer"],
      },
    },
  },
  {
    value: "paper_metadata",
    label: "paper_metadata",
    schema: {
      name: "paper_metadata",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          authors: {
            type: "array",
            items: {
              type: "string",
            },
          },
          abstract: {
            type: "string",
          },
          keywords: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["title", "authors", "abstract", "keywords"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    value: "moderation",
    label: "moderation",
    schema: {
      name: "content_compliance",
      schema: {
        type: "object",
        properties: {
          violates: {
            type: "boolean",
            description: "Indicates whether the content violates policies.",
          },
          violation_categories: {
            type: "array",
            description:
              "Categories under which the content violates policies.",
            items: {
              type: "string",
              enum: ["sexual", "violence", "self_harm"],
            },
          },
          violation_reason: {
            type: "string",
            description: "Explanation of why the content violates policies.",
          },
        },
        required: ["violates", "violation_categories", "violation_reason"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

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
  const [jsonSchemaModalOpened, setJsonSchemaModalOpened] = useState(false);
  const [tempJsonSchema, setTempJsonSchema] = useState<string>("");

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

  const selectedModelId = useMemo(() => {
    const model = value?.model;
    if (!model) return "";
    if (typeof model === "string") return model;
    if (typeof model === "object" && model !== null) {
      if (typeof (model as any).id === "string") return (model as any).id;
      if (typeof (model as any).model === "string") return (model as any).model;
      if (typeof (model as any).name === "string") return (model as any).name;
    }
    return String(model);
  }, [value?.model]);

  const fixedTemperature = requiresFixedTemperature(selectedModelId);
  const openAIThinkingSupported = supportsOpenAIThinking(selectedModelId);
  const anthropicThinkingSupported = supportsAnthropicThinking(selectedModelId);

  const reasoningOptions = useMemo(
    () =>
      getOpenAIReasoningEfforts().map((option) => ({
        value: option,
        label: option === "none" ? "Default" : option,
      })),
    [],
  );

  const reasoningEffortValue = value?.config?.reasoning_effort ?? "none";
  const thinkingConfig = (value?.config?.thinking || undefined) as
    | AnthropicThinkingConfig
    | undefined;
  const thinkingEnabled = thinkingConfig?.type === "enabled";

  const updateConfig = useCallback(
    (partial: Record<string, any>) => {
      const nextConfig: Record<string, any> = {
        ...value.config,
        ...partial,
      };

      Object.keys(partial).forEach((key) => {
        if (partial[key] === undefined) {
          delete nextConfig[key];
        }
      });

      onChange({
        ...value,
        config: nextConfig,
      });
    },
    [onChange, value],
  );

  useEffect(() => {
    if (!fixedTemperature) return;
    if (value?.config?.temperature === FIXED_TEMPERATURE_VALUE) return;

    updateConfig({ temperature: FIXED_TEMPERATURE_VALUE });
  }, [fixedTemperature, updateConfig, value?.config?.temperature]);

  useEffect(() => {
    if (openAIThinkingSupported) return;
    if (!value?.config?.reasoning_effort) return;
    updateConfig({ reasoning_effort: undefined });
  }, [openAIThinkingSupported, updateConfig, value?.config?.reasoning_effort]);

  useEffect(() => {
    if (anthropicThinkingSupported) return;
    if (!value?.config?.thinking) return;
    updateConfig({ thinking: undefined });
  }, [anthropicThinkingSupported, updateConfig, value?.config?.thinking]);

  function handleModelSelectChange(model: Model) {
    const modelId = model.id;
    const previousModelId = selectedModelId;

    const isPreviousProviderOpenAI =
      previousModelId.startsWith("gpt") ||
      previousModelId.includes("mistral");
    const isNewProviderOpenAI =
      modelId.startsWith("gpt") || modelId.includes("mistral");

    const isPreviousProviderAnthropic = previousModelId.startsWith("claude");
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
    const nextConfig: Record<string, any> = {
      ...value.config,
      tools: updatedTools,
      temperature: requiresFixedTemperature(modelId)
        ? FIXED_TEMPERATURE_VALUE
        : value.config.temperature,
    };

    if (!supportsOpenAIThinking(modelId)) {
      delete nextConfig.reasoning_effort;
    }

    if (!supportsAnthropicThinking(modelId)) {
      delete nextConfig.thinking;
    }

    onChange({
      ...value,
      model: modelId,
      config: nextConfig,
    });
  }

  return (
    <Stack gap={0}>
      {!hideModel && (
        <Stack gap={0}>
          <ParamItem
            name="Model"
            value={
              <Group gap={4}>
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
                    <Stack gap="lg">
                      {isOpenAIModel(value?.model) && (
                        <Group justify="space-between">
                          <Text size="sm" fw="bold">
                            Response format
                          </Text>
                          <Select
                            size="xs"
                            styles={{
                              input: { minHeight: "auto", height: 28 },
                              wrapper: { width: 120 },
                            }}
                            placeholder="Select"
                            data={[
                              { value: "text", label: "text" },
                              { value: "json_object", label: "json_object" },
                              { value: "json_schema", label: "json_schema" },
                            ]}
                            value={
                              value?.config?.response_format?.type || "text"
                            }
                            onChange={(val) => {
                              if (val === "json_schema") {
                                // Update config immediately to reflect json_schema is selected
                                onChange({
                                  ...value,
                                  config: {
                                    ...value.config,
                                    response_format: {
                                      type: "json_schema",
                                      json_schema:
                                        value?.config?.response_format
                                          ?.json_schema,
                                    },
                                  },
                                });
                                // Prepare modal data
                                setTempJsonSchema(
                                  value?.config?.response_format?.json_schema
                                    ? JSON.stringify(
                                        value.config.response_format
                                          .json_schema,
                                        null,
                                        2,
                                      )
                                    : "",
                                );
                                // Open modal after a small delay to ensure popover doesn't interfere
                                setTimeout(
                                  () => setJsonSchemaModalOpened(true),
                                  100,
                                );
                              } else {
                                onChange({
                                  ...value,
                                  config: {
                                    ...value.config,
                                    response_format:
                                      val === "text"
                                        ? undefined
                                        : { type: val },
                                  },
                                });
                              }
                            }}
                          />
                        </Group>
                      )}
                      {!fixedTemperature && (
                        <ParamItem
                          name="Temperature"
                          displayValue={value?.config?.temperature || 0}
                          onValueChange={(val) => {
                            onChange({
                              ...value,
                              config: {
                                ...value.config,
                                temperature: val,
                              },
                            });
                          }}
                          min={0}
                          max={2}
                          step={0.01}
                          precision={2}
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
                      )}
                      <ParamItem
                        name="Max tokens"
                        displayValue={value?.config?.max_tokens || 1}
                        onValueChange={(val) => {
                          onChange({
                            ...value,
                            config: {
                              ...value.config,
                              max_tokens: val,
                            },
                          });
                        }}
                        min={1}
                        max={32768}
                        step={1}
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
                          onValueChange={(val) => {
                            onChange({
                              ...value,
                              config: {
                                ...value.config,
                                top_p: val,
                              },
                            });
                          }}
                          min={0}
                          max={1}
                          step={0.01}
                          precision={2}
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
                      {openAIThinkingSupported && (
                        <Group justify="space-between" align="center" mt="sm">
                          <Text size="sm" fw="bold">
                            Reasoning effort
                          </Text>
                          <Select
                            w={120}
                            data={reasoningOptions}
                            value={reasoningEffortValue}
                            onChange={(val) => {
                              const effort = (val ?? "none") as any;
                              updateConfig({
                                reasoning_effort:
                                  effort === "none" ? undefined : effort,
                              });
                            }}
                            size="xs"
                            allowDeselect={false}
                          />
                        </Group>
                      )}
                      {anthropicThinkingSupported && (
                        <Stack gap={4} mt="sm">
                          <Group justify="space-between" align="center">
                            <Text size="sm" fw="bold">
                              Thinking
                            </Text>
                            <Checkbox
                              size="xs"
                              label="Enable"
                              checked={thinkingEnabled}
                              onChange={(event) => {
                                const checked = event.currentTarget.checked;
                                if (!checked) {
                                  updateConfig({ thinking: undefined });
                                  return;
                                }
                                const budget =
                                  thinkingConfig?.budget_tokens ?? 2048;
                                updateConfig({
                                  thinking: {
                                    type: "enabled",
                                    budget_tokens: budget,
                                  },
                                });
                              }}
                            />
                          </Group>
                          {thinkingEnabled && (
                            <NumberInput
                              label="Budget tokens"
                              withAsterisk
                              min={1}
                              value={thinkingConfig?.budget_tokens ?? 2048}
                              onChange={(val) => {
                                const numeric =
                                  typeof val === "number" ? val : Number(val);
                                if (Number.isNaN(numeric) || numeric <= 0) {
                                  updateConfig({
                                    thinking: {
                                      type: "enabled",
                                      budget_tokens: undefined,
                                    },
                                  });
                                  return;
                                }
                                updateConfig({
                                  thinking: {
                                    type: "enabled",
                                    budget_tokens: numeric,
                                  },
                                });
                              }}
                              size="xs"
                            />
                          )}
                        </Stack>
                      )}
                      {!hideStream && (
                        <Group justify="space-between">
                          <Text size="sm">Stream</Text>
                          <Checkbox {...configHandler("stream", true)} />
                        </Group>
                      )}
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
                {!hideToolCalls && (
                  <>
                    <Modal
                      size="lg"
                      opened={jsonModalOpened}
                      onClose={() => setJsonModalOpened(false)}
                      title={
                        <Group>
                          <Text size="lg" fw={700}>
                            Tool Calls Definition
                          </Text>
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
                                title:
                                  "Please enter valid tool calls. " + e.message,
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
                    <Tooltip
                      label={`Edit tool calls${value?.config?.tools?.length ? ` (${value.config.tools.length})` : ""}`}
                    >
                      <ActionIcon
                        size="lg"
                        variant="default"
                        onClick={() => {
                          setTempJSON(
                            JSON.stringify(value?.config?.tools, null, 2),
                          );
                          setJsonModalOpened(true);
                        }}
                      >
                        <IconTools size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
              </Group>
            }
          />
          <Group gap={8} mt="sm" wrap="wrap" align="center">
            {isOpenAIModel(value?.model) && (
              <Group gap={4} wrap="nowrap" align="center">
                <Text size="xs" c="dark.6" lh={1}>
                  text.format:
                </Text>
                <Text
                  size="xs"
                  c="blue.6"
                  lh={1}
                  style={{ cursor: "pointer" }}
                  onClick={() => setParamsPopoverOpened(true)}
                >
                  {value?.config?.response_format?.type || "text"}
                </Text>
              </Group>
            )}
            {openAIThinkingSupported && (
              <Group gap={4} wrap="nowrap" align="center">
                <Text size="xs" c="dark.6" lh={1}>
                  reasoning:
                </Text>
                <Text
                  size="xs"
                  c="blue.6"
                  lh={1}
                  style={{ cursor: "pointer" }}
                  onClick={() => setParamsPopoverOpened(true)}
                >
                  {reasoningEffortValue === "none"
                    ? "default"
                    : reasoningEffortValue}
                </Text>
              </Group>
            )}
            <Group gap={4} wrap="nowrap" align="center">
              <Text size="xs" c="dark.6" lh={1}>
                temperature:
              </Text>
              <Text
                size="xs"
                c="blue.6"
                lh={1}
                style={{ cursor: "pointer" }}
                onClick={() => setParamsPopoverOpened(true)}
              >
                {value?.config?.temperature ?? 0}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap" align="center">
              <Text size="xs" c="dark.6" lh={1}>
                max_tokens:
              </Text>
              <Text
                size="xs"
                c="blue.6"
                lh={1}
                style={{ cursor: "pointer" }}
                onClick={() => setParamsPopoverOpened(true)}
              >
                {value?.config?.max_tokens ?? 1}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap" align="center">
              <Text size="xs" c="dark.6" lh={1}>
                top_p:
              </Text>
              <Text
                size="xs"
                c="blue.6"
                lh={1}
                style={{ cursor: "pointer" }}
                onClick={() => setParamsPopoverOpened(true)}
              >
                {value?.config?.top_p ?? 0}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap" align="center">
              <Text size="xs" c="dark.6" lh={1}>
                stream:
              </Text>
              <Text
                size="xs"
                c="blue.6"
                lh={1}
                style={{ cursor: "pointer" }}
                onClick={() => setParamsPopoverOpened(true)}
              >
                {value?.config?.stream ? "true" : "false"}
              </Text>
            </Group>
            {anthropicThinkingSupported && (
              <Group gap={4} wrap="nowrap" align="center">
                <Text size="xs" c="dark.6" lh={1}>
                  thinking:
                </Text>
                <Text
                  size="xs"
                  c="blue.6"
                  lh={1}
                  style={{ cursor: "pointer" }}
                  onClick={() => setParamsPopoverOpened(true)}
                >
                  {thinkingEnabled
                    ? `enabled${thinkingConfig?.budget_tokens ? ` (${thinkingConfig.budget_tokens})` : ""}`
                    : "disabled"}
                </Text>
              </Group>
            )}
          </Group>
        </Stack>
      )}

      {/* JSON Schema Modal - Outside of popover to prevent closing issues */}
      <Modal
        size="lg"
        opened={jsonSchemaModalOpened}
        onClose={() => setJsonSchemaModalOpened(false)}
        title={
          <Text size="lg" fw={700}>
            Add response format
          </Text>
        }
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Use a JSON schema to define the structure of the model's response
            format.{" "}
            <Anchor
              href="https://platform.openai.com/docs/guides/structured-outputs?api-mode=chat"
              target="_blank"
              size="sm"
            >
              Learn more.
            </Anchor>
          </Text>

          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw="bold">
                Definition
              </Text>
              <Select
                size="xs"
                placeholder="Examples"
                data={jsonSchemaExamples}
                onChange={(val) => {
                  const example = jsonSchemaExamples.find(
                    (ex) => ex.value === val,
                  );
                  if (example) {
                    setTempJsonSchema(JSON.stringify(example.schema, null, 2));
                  }
                }}
                clearable
                rightSection={<IconChevronDown size={14} />}
              />
            </Group>

            <JsonInput
              autosize
              minRows={10}
              maxRows={20}
              placeholder={JSON.stringify(
                jsonSchemaExamples[0].schema,
                null,
                2,
              )}
              value={tempJsonSchema}
              onChange={(val) => setTempJsonSchema(val)}
            />
          </Stack>
        </Stack>
        <Group mt="md" justify="flex-end">
          <Button
            size="sm"
            variant="default"
            onClick={() => setJsonSchemaModalOpened(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              try {
                const empty = !tempJsonSchema?.trim().length;

                if (empty) {
                  // If empty, just keep the type as json_schema without schema
                  onChange({
                    ...value,
                    config: {
                      ...value.config,
                      response_format: { type: "json_schema" },
                    },
                  });
                } else {
                  const parsed = JSON.parse(tempJsonSchema.trim());
                  onChange({
                    ...value,
                    config: {
                      ...value.config,
                      response_format: {
                        type: "json_schema",
                        json_schema: parsed,
                      },
                    },
                  });
                }
                setJsonSchemaModalOpened(false);
              } catch (e) {
                console.error(e);
                notifications.show({
                  title: "Invalid JSON Schema",
                  message: "Please enter a valid JSON schema.",
                  color: "red",
                });
              }
            }}
          >
            Save
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
