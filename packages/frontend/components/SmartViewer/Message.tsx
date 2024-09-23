import { getColorForRole } from "@/utils/colors";
import {
  ActionIcon,
  Box,
  Button,
  Code,
  Flex,
  Group,
  Paper,
  Select,
  Space,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import {
  IconCircleMinus,
  IconInfoCircle,
  IconRobot,
  IconTool,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import ProtectedText from "../blocks/ProtectedText";
import { RenderJson } from "./RenderJson";
import classes from "./index.module.css";

import { useEffect, useMemo } from "react";

import { SentimentEnrichment2 } from "@/utils/enrichment";
import { getFlagEmoji, getLanguageName } from "@/utils/format";
import { openConfirmModal } from "@mantine/modals";
import HighlightPii from "./HighlightPii";

const ghostTextAreaStyles = {
  variant: "unstyled",
  classNames: {
    root: classes.ghostTextAreaRoot,
    input: classes.ghostTextArea,
  },

  autosize: true,
  minRows: 1,
  width: "100%",
};

function RenderFunction({
  color,
  editable,
  onChange,
  compact,
  data,
  piiDetection,
}) {
  return (
    <Code className={classes.textMessage}>
      <Text
        component="div"
        className={`${classes.functionCallText} ${
          compact ? classes.compact : ""
        }`}
        c={color}
      >
        <span>{`function: `}</span>

        {editable ? (
          <TextInput
            value={data?.name}
            size="compact-xs"
            variant="filled"
            styles={{
              input: {
                paddingInlineStart: 6,
              },
            }}
            placeholder="Function name"
            radius="sm"
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
        ) : (
          <b>{data?.name}</b>
        )}
      </Text>

      {editable ? (
        <>
          <Text size="xs">Arguments:</Text>
          <Textarea
            value={data?.arguments}
            placeholder="Arguments"
            onChange={(e) => onChange({ ...data, arguments: e.target.value })}
            {...ghostTextAreaStyles}
          />
        </>
      ) : (
        <pre style={{ marginBottom: 0 }}>
          <RenderJson
            compact={compact}
            data={data?.arguments}
            piiDetection={piiDetection}
          />
        </pre>
      )}
    </Code>
  );
}

function FunctionCallMessage({ data, color, compact, piiDetection }) {
  return (
    <RenderFunction
      color={color}
      data={data}
      compact={compact}
      piiDetection={piiDetection}
    />
  );
}

function ToolCallsMessage({
  toolCalls,
  editable,
  onChange,
  color,
  compact,
  piiDetection,
}) {
  return (
    <>
      {toolCalls.map((toolCall, index) => (
        <Box pos="relative" key={index}>
          {!compact && (
            <Group gap={4} align="center" mb="xs">
              <Text size="xs">ID:</Text>
              {editable ? (
                <TextInput
                  value={toolCall?.id}
                  size="compact-xs"
                  variant="filled"
                  styles={{
                    input: {
                      paddingInlineStart: 6,
                    },
                  }}
                  placeholder="Tool call ID"
                  opacity={0.8}
                  radius="sm"
                  onChange={(e) => {
                    const newToolCalls = [...toolCalls];
                    newToolCalls[index].id = e.target.value;
                    onChange(newToolCalls);
                  }}
                />
              ) : (
                <Text span size="xs">
                  {toolCall?.id}
                </Text>
              )}
            </Group>
          )}
          <RenderFunction
            key={index}
            editable={editable}
            piiDetection={piiDetection}
            onChange={(newData) => {
              const newToolCalls = [...toolCalls];
              newToolCalls[index].function = newData;
              onChange(newToolCalls);
            }}
            color={color}
            compact={compact}
            data={toolCall.function}
          />

          {editable && (
            <ActionIcon
              color="red"
              variant="transparent"
              className={classes.toolCallActionIcon}
              size="sm"
              pos="absolute"
              top="35px"
              right="2px"
              onClick={() => {
                openConfirmModal({
                  title: "Are you sure?",
                  confirmProps: { color: "red" },
                  labels: {
                    cancel: "Cancel",
                    confirm: "Delete",
                  },
                  onConfirm: () => {
                    const newToolCalls = [...toolCalls];
                    newToolCalls.splice(index, 1);
                    onChange(newToolCalls);
                  },
                });
              }}
            >
              <IconCircleMinus size="14" />
            </ActionIcon>
          )}
        </Box>
      ))}
    </>
  );
}

function TextMessage({
  data,
  compact,
  onChange = () => {},
  piiDetection,
  editable = false,
}) {
  const text = data.content || data.text;

  return (
    <Code className={classes.textMessage}>
      <ProtectedText>
        {editable ? (
          <Textarea
            value={data.content || data.text}
            placeholder="Content"
            data-testid="prompt-chat-editor"
            onChange={(e) => onChange({ ...data, content: e.target.value })}
            {...ghostTextAreaStyles}
          />
        ) : (
          <HighlightPii
            text={
              compact
                ? text?.substring(0, 150) // truncate text to render less
                : text
            }
            piiDetection={piiDetection}
          />
        )}
      </ProtectedText>
    </Code>
  );
}

function ResponsiveImage({ src }) {
  return (
    <div className={classes.responsiveImage}>
      <Image src={src} alt="Image" fill />
    </div>
  );
}

function MiniatureImage({ src }) {
  return (
    <div className={classes.miniatureImage}>
      <Image src={src} alt="Image" fill />
    </div>
  );
}

function ImageMessage({ data, compact }) {
  return (
    <Code className={classes.textMessage}>
      <Stack gap={compact ? "5" : "md"}>
        {data.content.map((item, index) => {
          if (item.type === "text") {
            return <ProtectedText key={index}>{item.text}</ProtectedText>;
          } else if (item.type === "image_url") {
            return compact ? (
              <MiniatureImage src={item.imageUrl.url} />
            ) : (
              <ResponsiveImage src={item.imageUrl.url} />
            );
          }
          return null;
        })}
      </Stack>
    </Code>
  );
}

function PropEditor({ value, onChange, editable, placeholder, label }) {
  return (
    <Group gap={4} wrap="nowrap">
      {label && <Text size="xs">{label}:</Text>}
      {editable ? (
        <TextInput
          value={value}
          size="xs"
          opacity={0.7}
          placeholder={placeholder}
          radius="sm"
          mb={5}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%" }}
        />
      ) : (
        <Text size="xs">{value}</Text>
      )}
    </Group>
  );
}

function ChatMessageContent({
  data,
  color,
  compact,
  piiDetection,
  onChange,
  editable,
}) {
  const textContent = data?.text || data?.content;
  const hasTextContent = typeof textContent === "string";
  const hasImageContent = Array.isArray(data?.content);
  const hasFunctionCall = data?.functionCall;
  const hasToolCalls = data?.toolCalls || data?.tool_calls;

  let renderTextMessage = hasTextContent && (!compact || !hasToolCalls);
  if (hasTextContent && textContent.length === 0 && !editable) {
    renderTextMessage = false;
  }

  return (
    <Stack gap="xs">
      {typeof data?.name === "string" && !compact && (
        // used for tools names
        <PropEditor
          value={data.name}
          onChange={(name) => onChange({ ...data, name })}
          editable={editable}
          placeholder={"Tool name"}
          label={"Name"}
        />
      )}

      {typeof data?.toolCallId === "string" && !compact && (
        // used for tools names
        <PropEditor
          value={data.toolCallId}
          onChange={(toolCallId) => onChange({ ...data, toolCallId })}
          editable={editable}
          placeholder={"Tool call ID"}
          label={"ID"}
        />
      )}

      {renderTextMessage && (
        <TextMessage
          data={data}
          compact={compact}
          piiDetection={piiDetection}
          onChange={onChange}
          editable={editable}
        />
      )}

      {hasImageContent && <ImageMessage data={data} compact={compact} />}

      {hasFunctionCall && (
        <FunctionCallMessage
          data={data.functionCall}
          color={color}
          compact={compact}
        />
      )}

      {hasToolCalls && (
        <ToolCallsMessage
          toolCalls={data.toolCalls || data.tool_calls}
          color={color}
          piiDetection={piiDetection}
          editable={editable}
          onChange={(toolCalls) => onChange({ ...data, toolCalls })}
          compact={compact}
        />
      )}

      {data?.role === "assistant" && editable && (
        <>
          <Button
            variant="subtle"
            color="green"
            size="xs"
            leftSection={<IconTool size={14} />}
            onClick={() => {
              onChange({
                ...data,
                toolCalls: [
                  ...(data.toolCalls || []),
                  {
                    id: "call_123",
                    function: {
                      arguments: `{"location": "San Francisco, CA"}`,
                      name: "get_current_weather",
                    },
                    type: "function",
                  },
                ],
              });
            }}
          >
            Add Tool Calls payload
          </Button>
        </>
      )}
    </Stack>
  );
}

function RoleSelector({ data, color, scheme, onChange }) {
  return (
    <Select
      className={classes.roleSelector}
      variant="unstyled"
      size="xs"
      allowDeselect={false}
      withCheckIcon={false}
      color={color}
      styles={{
        input: {
          color: color + "." + (scheme === "dark" ? 2 : 8),
        },
      }}
      value={data?.role}
      data={["system", "user", "assistant", "tool"]}
      onChange={(role) => onChange({ ...data, role })}
    />
  );
}

export function ChatMessage({
  data,
  editable = false,
  onChange,
  compact = false,
  ...props
}: {
  data: any;
  editable?: boolean;
  onChange?: any;
  compact?: boolean;
}) {
  const scheme = useComputedColorScheme();

  const color = getColorForRole(data?.role);

  if (data?.role === "AIMessageChunk") {
    // Fix for wrong name passed down inside the langchain SDK
    data.role = "assistant";
  }

  // Add/remove the 'id' and 'name' props required on tool calls
  useEffect(() => {
    if (!data || !editable) return;

    // Add/remove the 'name' props required on tool calls
    if (data.role === "tool" && typeof data.name !== "string") {
      onChange({ ...data, name: "some-tool-name" });
    } else if (
      data.role !== "tool" &&
      data.role !== "user" &&
      typeof data.name === "string"
    ) {
      // "user" messages can also have a name
      delete data.name;
      onChange(data);
    }

    if (data.role === "tool" && typeof data.toolCallId !== "string") {
      onChange({ ...data, toolCallId: "call_123" });
    } else if (data.role !== "tool" && typeof data.toolCallId === "string") {
      delete data.toolCallId;
      onChange(data);
    }

    if (
      data.role === "assistant" &&
      Array.isArray(data.toolCalls) &&
      data.toolCalls.length === 0
    ) {
      // remove the toolCalls array if it's empty, otherwise OpenAI returns an error
      delete data.toolCalls;
      onChange(data);
    }
  }, [data, editable]);

  const sentiment: {
    label: "positive" | "negative" | "neutral";
    score: number;
  } = useMemo(() => {
    return data?.enrichments?.find(
      (enrichment) => enrichment.type === "sentiment",
    )?.result;
  }, [data?.enrichments]);

  const piiDetection = useMemo(() => {
    return data?.enrichments?.find((enrichment) => enrichment.type === "pii")
      ?.result;
  }, [data?.enrichments]);

  const language = useMemo(() => {
    return data?.enrichments?.find(
      (enrichment) => enrichment.type === "language",
    )?.result;
  }, [data?.enrichments]);

  return (
    <Paper
      className={`${classes.paper} ${compact ? classes.compact : ""}`}
      bg={`var(--mantine-color-${color}-${
        scheme === "light" ? 2 : color === "gray" ? 7 : 9
      })`}
      {...props}
    >
      {!compact && (
        <Group justify="space-between">
          {editable ? (
            <RoleSelector
              data={data}
              onChange={onChange}
              color={color}
              scheme={scheme}
            />
          ) : (
            <Text
              c={color + "." + (scheme === "dark" ? 2 : 8)}
              mb={5}
              size="xs"
            >
              {data.role}
            </Text>
          )}
          {!editable && (
            <Group>
              {sentiment && <SentimentEnrichment2 sentiment={sentiment} />}
              {language && (
                <Tooltip
                  label={`${getLanguageName(language.isoCode)} (${Number(language.confidence.toFixed(3))})`}
                >
                  <Box>{getFlagEmoji(language.isoCode)}</Box>
                </Tooltip>
              )}
            </Group>
          )}
        </Group>
      )}
      <ChatMessageContent
        data={data}
        color={color}
        piiDetection={piiDetection}
        compact={compact}
        onChange={onChange}
        editable={editable}
      />
    </Paper>
  );
}

const ROLE_ICONS = {
  ai: IconRobot,
  assistant: IconRobot,
  user: IconUser,
  system: IconInfoCircle,
  function: IconTool,
  tool: IconTool,
};

// Used for chat replays
export function BubbleMessage({ role, content, extra, enrichments }) {
  const alignLeft = ["ai", "assistant", "bot", "tool", "system"].includes(role);

  const Icon = ROLE_ICONS[role || "assistant"];

  const color = getColorForRole(role);

  if (typeof content === "object") {
    if (role === "assistant") {
      content = content.output;
    } else {
      content = content.input;
    }
  }

  const piiDetection = useMemo(() => {
    return enrichments?.find((enrichment) => enrichment.type === "pii")?.result;
  }, [enrichments]);

  return (
    <>
      <Flex
        direction={alignLeft ? "row" : "row-reverse"}
        align="start"
        gap="md"
      >
        <ThemeIcon size={36} mt={6} variant="light" radius="xl" color={color}>
          {Icon && <Icon size={24} />}
        </ThemeIcon>
        <div>
          <Paper
            mb="xs"
            px="md"
            py={"sm"}
            radius="lg"
            shadow="sm"
            withBorder
            maw={430}
          >
            <span style={{ whiteSpace: "pre-line" }}>
              <HighlightPii text={content} piiDetection={piiDetection} />
            </span>
          </Paper>
          {extra}
        </div>
      </Flex>

      <Space h="lg" />
    </>
  );
}
