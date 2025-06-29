import { getColorForRole } from "@/utils/colors";
import {
  ActionIcon,
  Box,
  Button,
  Code,
  Flex,
  Group,
  HoverCard,
  Paper,
  Select,
  Space,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import {
  IconCircleMinus,
  IconCopy,
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
import { useClipboard } from "@mantine/hooks";
import { openConfirmModal } from "@mantine/modals";
import AppUserAvatar from "../blocks/AppUserAvatar";
import { AudioPlayer } from "./AudioPlayer";
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
      editable={false}
      onChange={() => {}}
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
                  title: <Text size="lg" fw={700}>Are you sure?</Text>,
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

  // Check if text is valid JSON for assistant messages
  const isAssistantJson = useMemo(() => {
    if (data.role !== "assistant" || !text || typeof text !== "string") {
      return false;
    }
    try {
      JSON.parse(text.trim());
      return true;
    } catch {
      return false;
    }
  }, [data.role, text]);

  if (editable) {
    return (
      <Code className={classes.textMessage}>
        <ProtectedText>
          <Textarea
            value={data.content || data.text}
            placeholder="Content"
            data-testid="prompt-chat-editor"
            onChange={(e) => onChange({ ...data, content: e.target.value })}
            {...ghostTextAreaStyles}
          />
        </ProtectedText>
      </Code>
    );
  } else if (data.citations) {
    const displayedText = compact ? text?.substring(0, 150) : text;
    const elements: React.ReactNode[] = [];
    const regex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(displayedText)) !== null) {
      if (match.index > lastIndex) {
        const segment = displayedText.slice(lastIndex, match.index);
        elements.push(
          <ProtectedText key={`text-${elements.length}`}>
            <HighlightPii text={segment} piiDetection={piiDetection} />
          </ProtectedText>,
        );
      }
      const idx = parseInt(match[1], 10) - 1;
      if (data.citations[idx]) {
        elements.push(
          <a
            key={`citation-${elements.length}`}
            href={data.citations[idx]}
            target="_blank"
            className={classes.citationLink}
          >
            [{match[1]}]
          </a>,
        );
      } else {
        elements.push(match[0]);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < displayedText.length) {
      const segment = displayedText.slice(lastIndex);
      elements.push(
        <ProtectedText key={`text-${elements.length}`}>
          <HighlightPii text={segment} piiDetection={piiDetection} />
        </ProtectedText>,
      );
    }
    return (
      <Code className={classes.textMessage}>
        <Text size="sm">{elements}</Text>
      </Code>
    );
  } else if (isAssistantJson) {
    // Use RenderJson for prettified JSON display
    return (
      <Code className={classes.textMessage}>
        <RenderJson data={text.trim()} compact={compact} piiDetection={piiDetection} />
      </Code>
    );
  } else {
    return (
      <Code className={classes.textMessage}>
        <ProtectedText>
          <HighlightPii
            text={
              compact
                ? text?.substring(0, 150) // truncate text to render less
                : text
            }
            piiDetection={piiDetection}
          />
        </ProtectedText>
      </Code>
    );
  }
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

// Based on OpenAI's ChatCompletionContentPart
type ChatMessageBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      imageUrl: { url: string };
    }
  | {
      type: "input_audio";
      inputAudio: { data: string; format: "wav" | "mp3" };
    };

function BlockMessage({
  data,
  compact,
}: {
  data: {
    content: ChatMessageBlock[];
  };
  compact: boolean;
}) {
  return (
    <Code className={classes.textMessage}>
      <Stack gap={compact ? 4 : "sm"}>
        {data.content.map((item, index) => {
          if (item.type === "text") {
            return <ProtectedText key={index}>{item.text}</ProtectedText>;
          } else if (item.type === "image_url") {
            return compact ? (
              <MiniatureImage key={index} src={item.imageUrl.url} />
            ) : (
              <ResponsiveImage key={index} src={item.imageUrl.url} />
            );
          } else if (item.type === "input_audio") {
            return (
              <AudioPlayer
                key={index}
                src={`data:audio/${item.inputAudio.format};base64,${item.inputAudio.data}`}
                compact={compact}
              />
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
  const hasBlockContent = Array.isArray(data?.content);
  const hasFunctionCall = data?.functionCall;
  const hasToolCalls = data?.toolCalls || data?.tool_calls;
  const hasAudio = data?.audio;
  const hasRefusal = data?.refusal && data?.content === null;

  if (hasRefusal) {
    return (
      <Paper
        p="xs"
        bg="red.1"
        c="red.8"
        withBorder
        styles={{
          root: {
            borderColor: "var(--mantine-color-red-3)",
          },
        }}
      >
        <Text size="sm" fs="italic">
          {data.refusal}
        </Text>
      </Paper>
    );
  }

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

      {hasAudio && (
        <Code className={classes.textMessage}>
          <AudioPlayer
            src={
              data.audio.data
                ? `data:audio/${data.audio.format || "wav"};base64,${data.audio.data}`
                : undefined
            }
            compact={compact}
            transcript={data.audio.transcript}
          />
        </Code>
      )}

      {hasBlockContent && <BlockMessage data={data} compact={compact} />}

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
      data={["system", "user", "assistant", "tool", "developer"]}
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
  const clipboard = useClipboard({ timeout: 500 });

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
      pt="0"
      className={`${classes.paper} ${compact ? classes.compact : ""}`}
      bg={`var(--mantine-color-${color}-${
        scheme === "light" ? 2 : color === "gray" ? 7 : 9
      })`}
      {...props}
    >
      {!compact && (
        <Group justify="space-between" py="4px">
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
              mt="2px"
              size="xs"
            >
              {data.role === "api" ? "Api Response" : data.role}
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
              <ActionIcon
                variant="subtle"
                size="sm"
                color="black"
                onClick={() => {
                  clipboard.copy(
                    JSON.stringify(data.content, null, 2) ||
                      JSON.stringify(data.text, null, 2) ||
                      JSON.stringify(data.toolCalls, null, 2),
                  );
                }}
              >
                <IconCopy size="15px" />
              </ActionIcon>
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

function UserAvatarWithInfo({ user }) {
  return (
    <HoverCard width={"auto"} position="bottom" withArrow shadow="md">
      <HoverCard.Target>
        {/* `HoverCard.Target` dosen't work with `AppUserAvatar` as a direct child */}
        <Group>
          <AppUserAvatar size="md" user={user} />
        </Group>
      </HoverCard.Target>
      <HoverCard.Dropdown style={{ pointerEvents: "none" }}>
        <Text size="sm" ta={"center"}>
          <Title size={"small"}>{user.externalId} </Title>
        </Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function MessageIcon({ role, color, user }) {
  if (role === "user" && user) {
    return <UserAvatarWithInfo user={user} />;
  } else {
    const Icon = ROLE_ICONS[role || "assistant"];
    if (Icon)
      return (
        <ThemeIcon size={36} mt={6} variant="light" radius="xl" color={color}>
          <Icon size={24} />
        </ThemeIcon>
      );
  }
}

// Used for chat replays
export function BubbleMessage({ role, content, extra, enrichments, user }) {
  const alignLeft = ["ai", "assistant", "bot", "tool", "system"].includes(role);

  const Icon = ROLE_ICONS[role || "assistant"];

  const color = getColorForRole(role);

  if (!content) {
    return;
  }

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
        <MessageIcon role={role} user={user} color={color} />
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
