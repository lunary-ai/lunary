import { Group, Avatar, Stack, Rating, Text } from "@mantine/core"

export default function SocialProof() {
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
        <Text c="dimmed">
          <Text
            c={"var(--mantine-color-default-color)"}
            opacity={0.7}
            span
            fw="bolder"
          >
            1500+
          </Text>{" "}
          AI devs build better apps
        </Text>
      </Stack>
    </Group>
  )
}
