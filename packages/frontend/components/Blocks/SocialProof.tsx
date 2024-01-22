import { Card, Group, Avatar, Stack, Rating, Text } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"

export default function SocialProof() {
  const scheme = useColorScheme()

  return (
    <Group>
      <Avatar.Group>
        {[
          "https://lunary.ai/users/1.png",
          "https://lunary.ai/users/2.jpeg",
          "https://lunary.ai/users/3.jpeg",
          "https://lunary.ai/users/4.jpeg",
        ].map((src) => (
          <Avatar size={42} radius="xl" src={src} key={src} />
        ))}
      </Avatar.Group>
      <Stack gap={0}>
        <Rating value={5} readOnly />
        <Text color="dimmed">
          <Text color={scheme === "light" ? "black" : "white"} span fw="bolder">
            950+
          </Text>{" "}
          AI devs build better apps
        </Text>
      </Stack>
    </Group>
  )
}
