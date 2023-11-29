import { Anchor, Center, Container, Stack, Text, Title } from "@mantine/core"
import { NextSeo } from "next-seo"

export default function ThankYou() {
  return (
    <Container size="lg" my="lg">
      <NextSeo title="Thank You" />
      <Center h="50vh">
        <Stack>
          <Text size="60">🎉</Text>
          <Title>You&apos;re all set.</Title>
          <Text size="xl">
            Thank you for your upgrade. You will receive an email shortly with
            your receipt.
          </Text>

          <Text size="lg">
            <Anchor href="https://savvycal.com/vince/chat">
              Schedule a call
            </Anchor>{" "}
            with us at any time.
          </Text>
          <Anchor href="/">← Back to my apps</Anchor>
        </Stack>
      </Center>
    </Container>
  )
}
