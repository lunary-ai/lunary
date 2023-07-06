import { Paper, ScrollArea, Spoiler, Text } from "@mantine/core"

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
        <Text>{data?.text}</Text>
      </Spoiler>
    </Paper>
  )
}
