import {
  Alert,
  Badge,
  Card,
  Code,
  Container,
  Group,
  Overlay,
  Stack,
  Table,
  Title,
} from "@mantine/core"

import {
  costColumn,
  durationColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  timeColumn,
  userColumn,
} from "@/utils/datatable"
import { NextSeo } from "next-seo"

const columns = [
  timeColumn("created_at"),
  nameColumn("Model"),
  durationColumn(),
  userColumn(),
  {
    header: "Tokens",
    size: 25,
    id: "tokens",
    sortingFn: (a, b) =>
      a.original.completion_tokens +
      a.original.prompt_tokens -
      (b.original.completion_tokens + b.original.prompt_tokens),
    cell: (props) => props.getValue(),
    accessorFn: (row) => row.prompt_tokens + row.completion_tokens,
  },
  costColumn(),
  inputColumn("Prompt"),
  outputColumn("Result"),
]

export default function Tests() {
  return (
    <Stack sx={{ flexBasis: "100%" }}>
      <NextSeo title="Tests" />

      <Alert title="Contact Us to request access">
        The testing suite is currently invite-only. Contact us with details on
        what you're building to request access.
      </Alert>

      <Card>
        <Overlay blur={1.5} opacity={0.2} zIndex={0} />
        <Table horizontalSpacing="sm" verticalSpacing="lg">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Assertion</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Translator</td>
              <td>
                <Group spacing="sm">
                  <Badge variant="outline" color="indigo">
                    AI
                  </Badge>
                  <Code color="indigo">
                    {`The response doesn't convey negative emotions.`}
                  </Code>
                </Group>
              </td>
              <td>
                <Badge color="red">Critical</Badge>
              </td>
            </tr>
            <tr>
              <td>Translator</td>
              <td>
                <Group spacing="sm">
                  <Badge variant="outline" color="indigo">
                    AI
                  </Badge>
                  <Code color="indigo">{`The response is correct {{input.language}} language.`}</Code>
                </Group>
              </td>
              <td>
                <Badge color="red">Critical</Badge>
              </td>
            </tr>
            <tr>
              <td>PromptToSQL</td>
              <td>
                <Group spacing="sm">
                  <Badge variant="outline" color="cyan">
                    JS
                  </Badge>

                  <Code color="cyan">{`return isValidSQL(response)`}</Code>
                </Group>
              </td>
              <td>
                <Badge color="red">Critical</Badge>
              </td>
            </tr>
            <tr>
              <td>PromptToSQL</td>
              <td>
                <Group spacing="sm">
                  <Badge variant="outline" color="cyan">
                    JS
                  </Badge>
                  <Code color="cyan">{`return response.length > 100 && response.length < 1000`}</Code>
                </Group>
              </td>
              <td>
                <Badge color="yellow">Warning</Badge>
              </td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </Stack>
  )
}
