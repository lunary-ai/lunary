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
import { IconBrandDiscord, IconMail, IconMessage } from "@tabler/icons-react"
import CopyText from "../Blocks/CopyText"
import { useCurrentApp } from "@/utils/dataHooks"

export default function Empty({
  what,
  Icon,
}: {
  what: string
  Icon?: React.ComponentType<any>
}) {
  const { app } = useCurrentApp()

  return (
    <Center mih="70vh" className="unblockable">
      <Card withBorder p={50} w="fit-content">
        <Stack align="start" gap="xl">
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
            href={`https://llmonitor.com/docs?app=${app?.id}`}
          >
            Documentation &rarr;
          </Button>
          <Text>
            App ID:{" "}
            <CopyText
              value={app?.id}
              color={"var(--mantine-color-violet-light)"}
            />
          </Text>
          <Text size="xl">Any issue? Get help from a founder.</Text>
          <Group>
            <Button
              size="lg"
              leftSection={<IconMessage size={22} />}
              color="blue"
              onClick={() => {
                $crisp.push(["do", "chat:open"])
              }}
            >
              Send Chat
            </Button>
            <Button
              size="lg"
              leftSection={<IconMail size={22} />}
              color="teal"
              component="a"
              href="mailto:vince@llmonitor.com"
            >
              Email
            </Button>
            <Button
              size="lg"
              leftSection={<IconBrandDiscord size={22} />}
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
