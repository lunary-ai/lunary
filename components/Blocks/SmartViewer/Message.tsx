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
import { IconRobot, IconUser } from "@tabler/icons-react"
import ProtectedText from "../ProtectedText"
import { RenderJson } from "./RenderJson"
import { useColorScheme } from "@mantine/hooks"

const typesColors = {
  ai: "green",
  human: "blue",
  user: "blue",
  error: "red",
  function: "violet",
  tool: "violet",
  system: "gray",
}

const RenderFunction = ({ color, compact, codeBg, data }) => {
  return (
    <Code block bg={codeBg}>
      <Text w={300} color={color} mb={compact ? 2 : "xs"} mt={compact ? -6 : 0}>
        {`function call: `}
        <Text span weight="bolder">
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

  const color = typesColors[data?.role] || "gray"

  const codeBg = `rgba(${scheme === "dark" ? "0,0,0" : "255,255,255"},0.6)`

  return (
    <Paper
      p={compact ? 0 : 12}
      pt={compact ? 0 : 8}
      mah={compact ? 60 : undefined}
      sx={(theme) => ({
        overflow: "hidden",
        backgroundColor:
          theme.colors[color][
            scheme === "dark" ? (color === "gray" ? 7 : 9) : 2
          ],
      })}
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
              styles={{
                input: {
                  color: "inherit",
                },
              }}
              value={data?.role}
              data={["ai", "user", "system", "function", "tool"]}
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
        />
      ) : data?.toolCalls ? (
        data?.toolCalls.map((toolCall, index) => (
          <RenderFunction
            key={index}
            color={color}
            compact={compact}
            data={toolCall.function}
            codeBg={codeBg}
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
  const isBot = role === "ai"

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
