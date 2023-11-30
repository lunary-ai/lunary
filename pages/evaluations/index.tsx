import {
  Badge,
  Button,
  Card,
  Code,
  Group,
  Overlay,
  Stack,
  Table,
} from "@mantine/core"

import { NextSeo } from "next-seo"
import Paywall from "@/components/Layout/Paywall"
import { IconStethoscope } from "@tabler/icons-react"

// const columns = [
//   timeColumn("created_at"),
//   nameColumn("Model"),
//   durationColumn(),
//   userColumn(),
//   {
//     header: "Tokens",
//     size: 25,
//     id: "tokens",
//     sortingFn: (a, b) =>
//       a.original.completion_tokens +
//       a.original.prompt_tokens -
//       (b.original.completion_tokens + b.original.prompt_tokens),
//     cell: (props) => props.getValue(),
//     accessorFn: (row) => row.prompt_tokens + row.completion_tokens,
//   },
//   costColumn(),
//   inputColumn("Prompt"),
//   outputColumn("Result"),
// ]

const FEATURE_LIST = [
  "Automatically evaluate results",
  "Identify outlier results and errors",
  "Smart AI evaluation or custom code",
  "Receive alerts on errors",
]

export default function Tests() {
  return (
    <Paywall
      Icon={IconStethoscope}
      feature="Evaluate"
      plan="unlimited"
      description="Improve your app's quality and performance."
      list={FEATURE_LIST}
    >
      <Stack>
        <NextSeo title="Evaluations" />

        <Button w="fit-content">New Evaluation</Button>

        <Card>
          <Overlay blur={10} opacity={0.2} zIndex={0} />

          <Table horizontalSpacing="sm" verticalSpacing="lg">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Agent</Table.Th>
                <Table.Th>Assertion</Table.Th>
                <Table.Th>Level</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Translator</Table.Td>
                <Table.Td>
                  <Group gap="sm">
                    <Badge variant="outline" color="indigo">
                      AI
                    </Badge>
                    <Code color="indigo">
                      {`The response doesn't convey negative emotions.`}
                    </Code>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="red">
                    Critical
                  </Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Translator</Table.Td>
                <Table.Td>
                  <Group gap="sm">
                    <Badge variant="outline" color="indigo">
                      AI
                    </Badge>
                    <Code color="indigo">{`The response is correct {{input.language}} language.`}</Code>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="red">
                    Critical
                  </Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>PromptToSQL</Table.Td>
                <Table.Td>
                  <Group gap="sm">
                    <Badge variant="outline" color="cyan">
                      JS
                    </Badge>

                    <Code color="cyan">{`return isValidSQL(response)`}</Code>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="red">
                    Critical
                  </Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>PromptToSQL</Table.Td>
                <Table.Td>
                  <Group gap="sm">
                    <Badge variant="outline" color="cyan">
                      JS
                    </Badge>
                    <Code color="cyan">{`return response.length > 100 && response.length < 1000`}</Code>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="yellow">
                    Warning
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
