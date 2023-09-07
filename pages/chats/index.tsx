import {
  Alert,
  Badge,
  Card,
  Code,
  Group,
  Overlay,
  Stack,
  Table,
  Title,
} from "@mantine/core"

import { NextSeo } from "next-seo"

export default function Tests() {
  return (
    <Stack>
      <NextSeo title="Tests" />
      <Group>
        <Title>Chats and Feedbacks</Title>
      </Group>

      <Alert title="Contact Us to request access">
        Chat Replays and Feedbacks features are currently invite-only. Contact
        us with details on what you're building to request access.
      </Alert>

      <Card>
        <Overlay blur={1.5} opacity={0.2} />
        <Table horizontalSpacing="sm" verticalSpacing="lg">
          <thead>
            <tr>
              <th>User</th>
              <th>Opener</th>
              <th>Messages</th>
              <th>Feedbacks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>john@apple.com</td>
              <td>List my unread emails</td>
              <td>
                <Group>
                  <Badge variant="outline" color="indigo">
                    8
                  </Badge>
                </Group>
              </td>
              <td>👍👍👎</td>
            </tr>
            <tr>
              <td>emelyn@tesla.com</td>
              <td>Who is John's supervisor</td>
              <td>
                <Group>
                  <Badge variant="outline" color="indigo">
                    2
                  </Badge>
                </Group>
              </td>
              <td>👎</td>
            </tr>
            <tr>
              <td>chloe@hey.com</td>
              <td>List top 10 customers by LTV</td>
              <td>
                <Group>
                  <Badge variant="outline" color="indigo">
                    4
                  </Badge>
                </Group>
              </td>
              <td>👍</td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </Stack>
  )
}
