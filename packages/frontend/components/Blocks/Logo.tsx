import { Anchor, Group, Text } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"

export default function Logo() {
  const scheme = useColorScheme()

  return (
    <Anchor
      c={scheme === "dark" ? "#fff" : "#000"}
      fw={700}
      href="https://lunary.ai"
    >
      <Group>
        <img
          width={24}
          style={{ borderRadius: 6 }}
          src="https://lunary.ai/logo-black-bg.svg"
        />
        <Text>lunary</Text>
      </Group>
    </Anchor>
  )
}
