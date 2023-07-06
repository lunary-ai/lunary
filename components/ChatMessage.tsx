import { Paper, ScrollArea, Spoiler } from "@mantine/core"

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

export default function ChatMessage({ data, inline }) {
  return (
    <Paper
      p={8}
      sx={(theme) => ({
        backgroundColor: tc(theme, data?.role),
      })}
    >
      <Spoiler maxHeight={50} showLabel="..." hideLabel="↑">
        {data?.text}
      </Spoiler>
    </Paper>
  )
}
