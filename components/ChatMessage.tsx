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

export default function ChatMessage({ data, inline = false }) {
  const theme = useMantineTheme()

  return (
    <Paper
      p={8}
      sx={(theme) => ({
        backgroundColor: tc(theme, data?.role),
      })}
    >
      {!inline && (
        <Text size="xs" sx={{ color: "gray" }}>
          {data?.role}
        </Text>
      )}
      <Spoiler maxHeight={50} showLabel="..." hideLabel="↑">
        <Code color={tc(theme, data?.role)} block>
          {data?.text}
        </Code>
        {data?.kwargs && <>{data?.kwargs}</>}
      </Spoiler>
    </Paper>
  )
}
