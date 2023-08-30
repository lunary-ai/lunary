import {
  Code,
  Highlight,
  Mark,
  Paper,
  ScrollArea,
  Spoiler,
  Text,
  useMantineTheme,
} from "@mantine/core"

const typesColors = {
  ai: "blue",
  human: "green",
  system: "red",
}

const tc = (theme, role) => {
  const color = typesColors[role]
  if (!color) return theme.colors.gray[2]
  return theme.colors[color][2]
}

export default function ChatMessage({ data, compact = false }) {
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
          {data?.role}
        </Text>
      )}
      <Spoiler mt={5} maxHeight={300} showLabel="Show all ↓" hideLabel="↑">
        {data?.text && (
          <Code color={typesColors[data?.role]} block>
            {data?.text}
          </Code>
        )}
        {data?.functionCall && (
          <Text>
            <Code color={typesColors[data?.role]} block>
              <Text w={300} color={typesColors[data?.role]} mb="xs">
                {`function call: `}
                <Text span weight="bolder">
                  {data?.functionCall?.name}
                </Text>
              </Text>

              {typeof data?.functionCall?.arguments === "string"
                ? data?.functionCall?.arguments
                : JSON.stringify(data?.functionCall?.arguments, null, 2)}
            </Code>
          </Text>
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
