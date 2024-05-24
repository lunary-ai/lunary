import { getColorForRole } from "@/utils/colors"
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
} from "@mantine/core"
import {
  IconInfoCircle,
  IconRobot,
  IconTool,
  IconTrash,
  IconUser,
} from "@tabler/icons-react"
import Image from "next/image"
import ProtectedText from "../blocks/ProtectedText"
import { RenderJson } from "./RenderJson"

import { useColorScheme } from "@mantine/hooks"
import { circularPro } from "@/utils/theme"
import { useEffect } from "react"

import { openConfirmModal } from "@mantine/modals"

const ghostTextAreaStyles = {
  variant: "unstyled",
  p: 0,
  styles: {
    root: {
      fontFamily: "inherit",
      fontSize: "inherit",
    },
    input: {
      padding: "0 !important",
      fontFamily: "inherit",
      fontSize: "inherit",
    },
  },
  autosize: true,
  minRows: 1,
  width: "100%",
}

function RenderFunction({
  color,
  editable,
  onChange,
  compact,
  codeBg,
  data,
  type,
}) {
  const fontColor = type === "functionCall" ? "#40c057" : "inherit"

  return (
    <Code block bg={codeBg}>
      <Text
        w={300}
        component="div"
        fz={14}
        h={18}
        styles={{
          root: {
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          },
        }}
        c={color}
        style={{ fontFamily: circularPro.style.fontFamily }}
        mb={compact ? 4 : "xs"}
        mt={compact ? -6 : 0}
      >
        <Text fz="inherit" span c={fontColor}>{`function call: `}</Text>

        {editable ? (
          <TextInput
            value={data?.name}
            size="compact-xs"
            variant="filled"
            opacity={0.7}
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
          <Text c={fontColor} span fw="bold" size="sm">
            {data?.name}
          </Text>
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
          <RenderJson compact={compact} data={data?.arguments} />
        </pre>
      )}
    </Code>
  )
}

function FunctionCallMessage({ data, color, compact, codeBg }) {
  return (
    <RenderFunction
      color={color}
      data={data}
      compact={compact}
      codeBg={codeBg}
      type="functionCall"
    />
  )
}

function ToolCallsMessage({
  toolCalls,
  editable,
  onChange,
  color,
  compact,
  codeBg,
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
                  opacity={0.5}
                  radius="sm"
                  onChange={(e) => {
                    const newToolCalls = [...toolCalls]
                    newToolCalls[index].id = e.target.value
                    onChange(newToolCalls)
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
            onChange={(newData) => {
              const newToolCalls = [...toolCalls]
              newToolCalls[index].function = newData
              onChange(newToolCalls)
            }}
            color={color}
            compact={compact}
            data={toolCall.function}
            codeBg={codeBg}
            type="toolCall"
          />

          {editable && (
            <ActionIcon
              color="red"
              pos="absolute"
              size={22}
              top={16}
              right={-8}
              onClick={() => {
                openConfirmModal({
                  title: "Are you sure?",
                  confirmProps: { color: "red" },
                  labels: {
                    cancel: "Cancel",
                    confirm: "Delete",
                  },
                  onConfirm: () => {
                    const newToolCalls = [...toolCalls]
                    newToolCalls.splice(index, 1)
                    onChange(newToolCalls)
                  },
                })
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Box>
      ))}
    </>
  )
}

function TextMessage({ data, onChange = () => {}, editable = false, codeBg }) {
  return (
    <Code block bg={codeBg}>
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
          data.content || data.text
        )}
      </ProtectedText>
    </Code>
  )
}

function ResponsiveImage({ src }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "500px" }}>
      <Image src={src} alt="Image" fill />
    </div>
  )
}

function MiniatureImage({ src }) {
  return (
    <div style={{ position: "relative", width: "40px", height: "40px" }}>
      <Image src={src} alt="Image" fill />
    </div>
  )
}

function ImageMessage({ data, codeBg, compact }) {
  return (
    <Code block bg={codeBg}>
      <Stack gap={compact ? "5" : "md"}>
        {data.content.map((item, index) => {
          if (item.type === "text") {
            return <ProtectedText key={index}>{item.text}</ProtectedText>
          } else if (item.type === "image_url") {
            return compact ? (
              <MiniatureImage src={item.imageUrl.url} />
            ) : (
              <ResponsiveImage src={item.imageUrl.url} />
            )
          }
          return null
        })}
      </Stack>
    </Code>
  )
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
  )
}

function ChatMessageContent({
  data,
  color,
  compact,
  codeBg,
  onChange,
  editable,
}) {
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

      {(typeof data?.text === "string" ||
        typeof data?.content === "string") && (
        <TextMessage
          data={data}
          onChange={onChange}
          editable={editable}
          codeBg={codeBg}
        />
      )}

      {Array.isArray(data?.content) && (
        <ImageMessage data={data} codeBg={codeBg} compact={compact} />
      )}

      {data?.functionCall && (
        <FunctionCallMessage
          data={data.functionCall}
          color={color}
          compact={compact}
          codeBg={codeBg}
        />
      )}

      {(data?.toolCalls || data?.tool_calls) && (
        <ToolCallsMessage
          toolCalls={data.toolCalls || data.tool_calls}
          color={color}
          editable={editable}
          onChange={(toolCalls) => onChange({ ...data, toolCalls })}
          compact={compact}
          codeBg={codeBg}
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
              })
            }}
          >
            Add Tool Calls payload
          </Button>
        </>
      )}
    </Stack>
  )
}

function RoleSelector({ data, color, scheme, onChange }) {
  return (
    <Select
      variant="unstyled"
      size="xs"
      mb={5}
      mt={-2}
      w={80}
      allowDeselect={false}
      withCheckIcon={false}
      color={color}
      styles={{
        input: {
          opacity: 0.7,
          color: color + "." + (scheme === "dark" ? 2 : 8),
        },
      }}
      value={data?.role}
      data={["system", "user", "assistant", "tool"]}
      onChange={(role) => onChange({ ...data, role })}
    />
  )
}

export function ChatMessage({
  data,
  editable = false,
  onChange,
  compact = false,
  mah,
  ...props
}: {
  data: any
  editable?: boolean
  onChange?: any
  compact?: boolean
  mah?: number
}) {
  // TODO FIX
  // Flickering dark mode bug: this is due to scheme being 'light' for a few ms
  const scheme = useColorScheme()

  const color = getColorForRole(data?.role)

  const codeBg = scheme
    ? `rgba(${scheme === "dark" ? "0,0,0" : "255,255,255"},0.6)`
    : "transparent"

  // Add/remove the 'id' and 'name' props required on tool calls
  useEffect(() => {
    // Add/remove the 'name' props required on tool calls
    if (data.role === "tool" && editable && typeof data.name !== "string") {
      onChange({ ...data, name: "some-tool-name" })
    } else if (
      data.role !== "tool" &&
      data.role !== "user" &&
      typeof data.name === "string"
    ) {
      // "user" messages can also have a name
      delete data.name
      onChange(data)
    }

    if (
      data.role === "tool" &&
      editable &&
      typeof data.toolCallId !== "string"
    ) {
      onChange({ ...data, toolCallId: "call_123" })
    } else if (data.role !== "tool" && typeof data.toolCallId === "string") {
      delete data.toolCallId
      onChange(data)
    }

    if (
      data.role === "assistant" &&
      editable &&
      Array.isArray(data.toolCalls) &&
      data.toolCalls.length === 0
    ) {
      // remove the toolCalls array if it's empty, otherwise OpenAI returns an error
      delete data.toolCalls
      onChange(data)
    }
  }, [data])

  return (
    <Paper
      p={compact ? 0 : 12}
      pt={compact ? 0 : 8}
      mah={mah || (compact ? 80 : undefined)}
      style={{
        overflow: mah ? "scroll" : "hidden",
        backgroundColor: `var(--mantine-color-${color}-${
          scheme === "light" ? 2 : color === "gray" ? 7 : 9
        })`,
        borderRadius: 8,
      }}
      {...props}
    >
      {!compact && (
        <>
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
        </>
      )}

      <ChatMessageContent
        data={data}
        color={color}
        compact={compact}
        codeBg={codeBg}
        onChange={onChange}
        editable={editable}
      />

      <style jsx>{`
        :global(pre) {
          white-space: pre-wrap;
        }

        :global(pre code) {
          padding: 10px;
          display: block;
        }
      `}</style>
    </Paper>
  )
}

const ROLE_ICONS = {
  ai: IconRobot,
  assistant: IconRobot,
  user: IconUser,
  system: IconInfoCircle,
  function: IconTool,
  tool: IconTool,
}

// Used for chat replays
export function BubbleMessage({ role, content, extra }) {
  const alignLeft = ["ai", "assistant", "system"].includes(role)

  const Icon = ROLE_ICONS[role || "assistant"]

  const color = getColorForRole(role)

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
            <span style={{ whiteSpace: "pre-line" }}>{content}</span>
          </Paper>
          {extra}
        </div>
      </Flex>

      <Space h="lg" />
    </>
  )
}
