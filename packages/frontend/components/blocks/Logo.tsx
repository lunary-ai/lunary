import { Anchor, Group, Text, useComputedColorScheme } from "@mantine/core"

export default function Logo() {
  const scheme = useComputedColorScheme()

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
