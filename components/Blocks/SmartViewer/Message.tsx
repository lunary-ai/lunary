import {
  Code,
  Flex,
  Paper,
  Select,
  Space,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"
import { IconRobot, IconUser } from "@tabler/icons-react"
import { getColorForRole } from "@/utils/colors"
import ProtectedText from "../ProtectedText"
import { RenderJson } from "./RenderJson"

import { circularPro } from "../../../pages/_app"

const RenderFunction = ({ color, compact, codeBg, data, type }) => {
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

      <RenderJson compact={compact} data={data?.arguments} />
    </Code>
  )
}

// Use for logging AI chat queries
// Editable is used for the playground
export function ChatMessage({
  data,
  editable = false,
  onChange,
  compact = false,
}: {
  data: any
  editable?: boolean
  onChange?: any
  compact?: boolean
}) {
  const scheme = useColorScheme()
  const color = getColorForRole(data?.role)

  const codeBg = `rgba(${scheme === "dark" ? "0,0,0" : "255,255,255"},0.6)`

  return (
    <Paper
      p={compact ? 0 : 12}
      pt={compact ? 0 : 8}
      mah={compact ? 60 : undefined}
      style={{
        overflow: "hidden",
        backgroundColor: `var(--mantine-color-${color}-${
          scheme === "light" ? 2 : color === "gray" ? 7 : 9
        })`,
        borderRadius: 8,
      }}
    >
      {!compact && (
        <Text
          mb={5}
          size="xs"
          color={color + "." + (scheme === "dark" ? 2 : 8)}
        >
          {editable ? (
            <Select
              variant="unstyled"
              size="xs"
              w={75}
              withCheckIcon={false}
              styles={{
                input: {
                  color: "inherit",
                },
              }}
              value={data?.role}
              data={["ai", "assistant", "user", "system", "function", "tool"]}
              onChange={(role) => onChange({ ...data, role })}
            />
          ) : (
            data?.role
          )}
        </Text>
      )}

      {data?.functionCall ? (
        <RenderFunction
          color={color}
          data={data?.functionCall}
          compact={compact}
          codeBg={codeBg}
          type="functionCall"
        />
      ) : data?.toolCalls ? (
        data?.toolCalls.map((toolCall, index) => (
          <RenderFunction
            key={index}
            color={color}
            compact={compact}
            data={toolCall.function}
            codeBg={codeBg}
            type="functionCall"
          />
        ))
      ) : (
        typeof data?.text === "string" && (
          <Code block bg={codeBg}>
            <ProtectedText>
              {editable ? (
                <Textarea
                  value={data?.text}
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
                  onChange={(e) => onChange({ ...data, text: e.target.value })}
                  style={{ width: "100%" }}
                />
              ) : (
                data?.text
              )}
            </ProtectedText>
          </Code>
        )
      )}

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

// Used for chat replays
export function BubbleMessage({ role, content, extra }) {
  const isBot = ["ai", "assistant"].includes(role)

  return (
    <>
      <Flex direction={isBot ? "row" : "row-reverse"} align="center" gap="md">
        <ThemeIcon
          size={36}
          variant="light"
          radius="xl"
          color={isBot ? "blue" : "pink"}
        >
          {isBot ? <IconRobot size={24} /> : <IconUser size={24} />}
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
