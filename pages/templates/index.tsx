import { Badge, Button, Card, Overlay, Stack, Table } from "@mantine/core"

import { NextSeo } from "next-seo"
import Paywall from "@/components/Layout/Paywall"
import { IconBracketsAngle } from "@tabler/icons-react"

const FEATURE_LIST = [
  "Collaborate with non-technical teammates",
  "Versioning and history",
  "Insights into each version",
  "Clean your source-code",
]

export default function Tests() {
  return (
    <Paywall
      Icon={IconBracketsAngle}
      feature="Template"
      plan="unlimited"
      description="Edit and manage your prompt templates."
      list={FEATURE_LIST}
    >
      <Stack>
        <NextSeo title="Templates" />

        <Button w="fit-content">New Template</Button>

        <Card>
          <Overlay blur={10} opacity={0.2} zIndex={0} />

          <Table horizontalSpacing="sm" verticalSpacing="lg">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Revision</Table.Th>
                <Table.Th>Model</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td></Table.Td>
                <Table.Td>
                  <Badge variant="outline" color="indigo">
                    template_001
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="blue">
                    v1
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="red">
                    gpt-4-vision
                  </Badge>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Paywall>
  )
}
