import {
  Code,
  Flex,
  Paper,
  Select,
  Space,
  Spoiler,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core"
import { IconRobot, IconUser } from "@tabler/icons-react"
import ProtectedText from "../ProtectedText"

const typesColors = {
  ai: "green",
  human: "blue",
  user: "blue",
  error: "red",
  function: "violet",
  system: "gray",
}

const tc = (theme, role) => {
  const color = typesColors[role]
  if (!color) return theme.colors.gray[2]
  return theme.colors[color][2]
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
  return (
    <Paper
      p={compact ? 0 : 12}
      pt={compact ? 0 : 8}
      sx={(theme) => ({
        backgroundColor: tc(theme, data?.role),
      })}
    >
      {!compact && (
        <Text size="xs" color={typesColors[data?.role] + ".9"}>
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
              color={typesColors[data?.role]}
              value={data?.role}
              data={["ai", "user", "system", "function"]}
              onChange={(role) => onChange({ ...data, role })}
            />
          ) : (
            data?.role
          )}
        </Text>
      )}
      <Spoiler mt={5} maxHeight={300} showLabel="Show all ↓" hideLabel="Hide ↑">
        {data?.functionCall ? (
          <Text>
            <Code color={typesColors[data?.role]} block>
              <Text w={300} color={typesColors[data?.role]} mb="xs">
                {`function call: `}
                <Text span weight="bolder">
                  {data?.functionCall?.name}
                </Text>
              </Text>

              <ProtectedText>
                {typeof data?.functionCall?.arguments === "string"
                  ? data?.functionCall?.arguments
                  : JSON.stringify(data?.functionCall?.arguments, null, 2)}
              </ProtectedText>
            </Code>
          </Text>
        ) : (
          typeof data?.text === "string" && (
            <Code color={typesColors[data?.role]} block>
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
                    onChange={(e) =>
                      onChange({ ...data, text: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                ) : (
                  data?.text
                )}
              </ProtectedText>
            </Code>
          )
        )}
      </Spoiler>
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
        {isBot ? (
          <ThemeIcon size={36} variant="light" radius="xl" color={"blue"}>
            <IconRobot size={24} />
          </ThemeIcon>
        ) : (
          <ThemeIcon size={36} variant="light" radius="xl" color={"pink"}>
            <IconUser size={24} />
          </ThemeIcon>
        )}
        <div>
          <Paper
            mb="xs"
            px="md"
            py={"sm"}
            radius="lg"
            shadow="sm"
            withBorder
            maw={270}
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
