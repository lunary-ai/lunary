import { Header, Anchor, Button, Flex, Group, Text } from "@mantine/core"

import { IconAnalyze, IconHelp, IconMessage } from "@tabler/icons-react"
import Image from "next/image"

import Link from "next/link"

export default function Navbar() {
  return (
    <Header height={60} p="md">
      <Flex align="center" justify="space-between" h="100%">
        <Anchor component={Link} href="/">
          <Group spacing="sm">
            <IconAnalyze />
            <Text weight="bold">LLMonitor</Text>
          </Group>
        </Anchor>

        <Group>
          <Button size="xs" variant="outline" leftIcon={<IconHelp size={18} />}>
            Help
          </Button>

          <Button size="xs" leftIcon={<IconMessage size={18} />}>
            Feedback
          </Button>
        </Group>
      </Flex>
    </Header>
  )
}
