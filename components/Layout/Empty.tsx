import {
  Button,
  Card,
  Center,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core"
import { IconBrandDiscord, IconMessage } from "@tabler/icons-react"
import CopyText from "../Blocks/CopyText"
import { useCurrentApp } from "@/utils/supabaseHooks"

export default function Empty({
  what,
  Icon,
}: {
  what: string
  Icon?: React.ComponentType<any>
}) {
  const { app } = useCurrentApp()

  return (
    <Center mih="70vh">
      <Card withBorder p={50} w="fit-content">
        <Stack align="start" spacing="xl">
          <ThemeIcon size={72} radius="lg">
            {Icon && <Icon size={48} />}
          </ThemeIcon>
          <Title>You have no {what} yet.</Title>
          <Text size="xl">
            Head to the docs to find more details on reporting {what}.
          </Text>
          <Button
            size="lg"
            variant="outline"
            component="a"
            target="_blank"
            href="https://llmonitor.com/docs/"
          >
            Documentation &rarr;
          </Button>
          <Text>
            Tracking ID: <CopyText value={app?.id} />
          </Text>
          <Text size="xl">
            Any issue? Get help from a founder on Discord or by email.
          </Text>
          <Group>
            <Button
              size="lg"
              leftIcon={<IconMessage size={22} />}
              color="teal"
              component="a"
              href="mailto:vince@llmonitor.com"
            >
              Email
            </Button>
            <Button
              size="lg"
              leftIcon={<IconBrandDiscord size={22} />}
              color="indigo"
              component="a"
              href="https://discord.gg/8PafSG58kK"
            >
              Discord
            </Button>
          </Group>
        </Stack>
      </Card>
    </Center>
  )
}
