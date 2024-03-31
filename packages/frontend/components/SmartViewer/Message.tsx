import { getColorForRole } from "@/utils/colors"
import {
  Box,
  Code,
  Flex,
  Paper,
  Select,
  Space,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core"
import {
  IconInfoCircle,
  IconRobot,
  IconTool,
  IconUser,
} from "@tabler/icons-react"
import Image from "next/image"
import ProtectedText from "../blocks/ProtectedText"
import { RenderJson } from "./RenderJson"
import { circularPro } from "@/pages/_app"
import { useColorScheme } from "@mantine/hooks"

function RenderFunction({ color, compact, codeBg, data, type }) {
  const fontColor = type === "functionCall" ? "#40c057" : "inherit"

  return (
    <Code block bg={codeBg}>
      <Text
        w={300}
        size="12px"
        c={color}
        style={{ fontFamily: circularPro.style.fontFamily }}
        mb={compact ? 4 : "xs"}
        mt={compact ? -6 : 0}
      >
        <Text span c={fontColor}>{`function call: `}</Text>
        <Text c={fontColor} span fw="bolder">
          {data?.name}
        </Text>
      </Text>
      <pre>
        <RenderJson compact={compact} data={data?.arguments} />
      </pre>
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

function ToolCallsMessage({ toolCalls, color, compact, codeBg }) {
  return (
    <>
      {toolCalls.map((toolCall, index) => (
        <RenderFunction
          key={index}
          color={color}
          compact={compact}
          data={toolCall.function}
          codeBg={codeBg}
          type="toolCall"
        />
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
            variant="unstyled"
            p={0}
            styles={{
              root: {
                fontFamily: "inherit",
                fontSize: "inherit",
              },
              input: {
                padding: "0 !important",
                fontFamily: "inherit",
                fontSize: "inherit",
              },
            }}
            autosize
            minRows={1}
            data-testid="prompt-chat-editor"
            onChange={(e) => onChange({ ...data, content: e.target.value })}
            style={{ width: "100%" }}
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

function ChatMessageContent({
  data,
  color,
  compact,
  codeBg,
  onChange,
  editable,
}) {
  return (
    <>
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
          compact={compact}
          codeBg={codeBg}
        />
      )}
    </>
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
      data={["ai", "assistant", "user", "system", "function", "tool"]}
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
