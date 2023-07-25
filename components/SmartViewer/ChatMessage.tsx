import {
  Code,
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
  const theme = useMantineTheme()

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
        {data?.function_call && (
          <Text>
            {`Call function "${
              data?.function_call.name
            }" with arguments ${JSON.stringify(
              data?.function_call?.arguments
            )}`}
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
