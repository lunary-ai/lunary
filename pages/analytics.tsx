import {
  Anchor,
  Badge,
  Box,
  Card,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"

import { useState } from "react"

const ModelTokens = () => {
  return (
    <Card title="Model usage">
      <Text weight="bold">Models</Text>
    </Card>
  )
}

export default function Analytics() {
  return (
    <Stack>
      <Title>Analytics</Title>
      <SimpleGrid cols={3} spacing="md">
        <Card title="Model usage">
          <Text weight="bold">Agents</Text>
          Top agents by invokations
        </Card>
        <Card title="Model usage">
          <Text weight="bold">Usage</Text>
          Chart usage over 7 days
        </Card>
        <Card title="Model usage">
          <Text weight="bold">Latency</Text>
          Agent latency over 7 days
        </Card>
      </SimpleGrid>
    </Stack>
  )
}
