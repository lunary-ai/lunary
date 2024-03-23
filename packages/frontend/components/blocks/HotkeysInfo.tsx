import { Kbd, Text } from "@mantine/core"

export default function HotkeysInfo({ hot, size, style }) {
  const fz = size === "xs" ? 10 : 14

  return (
    <span style={style}>
      <Kbd size="sm" py={0} fz={fz}>
        ⌘
      </Kbd>
      <Text c="dimmed" size="xs" span>
        {` + `}
      </Text>
      <Kbd size="sm" py={1}>
        {hot?.replace("Enter", "⏎")}
      </Kbd>
    </span>
  )
}
