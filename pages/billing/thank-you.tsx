import { Anchor, Center, Container, Stack, Text, Title } from "@mantine/core"
import { NextSeo } from "next-seo"
import Confetti from "react-confetti"

export default function ThankYou() {
  return (
    <Container>
      <NextSeo title="Thank You" />
      {typeof window !== "undefined" && (
        <Confetti
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}

      <Center h="60vh">
        <Stack>
          <Text fz={70}>🎉</Text>

          <Title order={1}>{`You're all set.`}</Title>
          <Text size="xl">
            Thank you for your upgrade. You will receive an email shortly with
            your receipt.
          </Text>

          <Text size="xl">
            <Anchor href="https://savvycal.com/vince/chat">
              Schedule a call
            </Anchor>{" "}
            with us at any time.
          </Text>
          <Anchor href="/">← Back to my projects</Anchor>
        </Stack>
      </Center>
    </Container>
  )
}
