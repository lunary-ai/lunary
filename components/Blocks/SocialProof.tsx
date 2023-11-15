import { Card, Group, Avatar, Stack, Rating, Text } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"

export default function SocialProof() {
  const scheme = useColorScheme()

  return (
    <Group>
      <Avatar.Group>
        {[
          "https://llmonitor.com/users/1.png",
          "https://llmonitor.com/users/2.jpeg",
          "https://llmonitor.com/users/3.jpeg",
          "https://llmonitor.com/users/4.jpeg",
        ].map((src) => (
          <Avatar size={42} radius="xl" src={src} />
        ))}
      </Avatar.Group>
      <Stack spacing={0}>
        <Rating value={5} readOnly />
        <Text color="dimmed">
          <Text
            color={scheme === "light" ? "black" : "white"}
            span
            weight="bolder"
          >
            450+
          </Text>{" "}
          AI devs build better apps
        </Text>
      </Stack>
    </Group>
  )
}
