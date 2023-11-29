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
        {/* <Group>
        <Title>Evaluation Suite</Title>
      </Group>

      <Alert title="Contact Us to request access">
        The evaluation and testing suite is currently invite-only. Contact us
        with details on what you're building to request access.
      </Alert> */}
        <Button w="fit-content">New Evaluation</Button>

        <Card>
          <Overlay blur={10} opacity={0.2} zIndex={0} />

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
                  <Group gap="sm">
                    <Badge variant="outline" color="indigo">
                      AI
                    </Badge>
                    <Code color="indigo">
                      {`The response doesn't convey negative emotions.`}
                    </Code>
                  </Group>
                </td>
                <td>
                  <Badge variant="light" color="red">
                    Critical
                  </Badge>
                </td>
              </tr>
              <tr>
                <td>Translator</td>
                <td>
                  <Group gap="sm">
                    <Badge variant="outline" color="indigo">
                      AI
                    </Badge>
                    <Code color="indigo">{`The response is correct {{input.language}} language.`}</Code>
                  </Group>
                </td>
                <td>
                  <Badge variant="light" color="red">
                    Critical
                  </Badge>
                </td>
              </tr>
              <tr>
                <td>PromptToSQL</td>
                <td>
                  <Group gap="sm">
                    <Badge variant="outline" color="cyan">
                      JS
                    </Badge>

                    <Code color="cyan">{`return isValidSQL(response)`}</Code>
                  </Group>
                </td>
                <td>
                  <Badge variant="light" color="red">
                    Critical
                  </Badge>
                </td>
              </tr>
              <tr>
                <td>PromptToSQL</td>
                <td>
                  <Group gap="sm">
                    <Badge variant="outline" color="cyan">
                      JS
                    </Badge>
                    <Code color="cyan">{`return response.length > 100 && response.length < 1000`}</Code>
                  </Group>
                </td>
                <td>
                  <Badge variant="light" color="yellow">
                    Warning
                  </Badge>
                </td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </Stack>
    </Paywall>
  )
}
