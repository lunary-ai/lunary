import { Badge, Card, Loader, Stack, Table, Text, Title } from "@mantine/core"
import { useRouter } from "next/router"

export default function AppAnalytics() {
  const router = useRouter()
  const { id } = router.query

  return (
    <Stack>
      <Title>App Analytics</Title>
      <p>App ID: {id}</p>

      {/* <Card>
        <Stack>
          <Title order={3}>Conversations</Title>
          {convos?.length ? (
            <Table
              striped
              highlightOnHover
              withBorder
              withColumnBorders
              fontSize="md"
            >
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>LLM calls</th>
                  <th>Messages</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {convos.map(
                  ({
                    first_message,
                    id: convoId,
                    start,
                    end,
                    calls,
                    messages,
                    tags,
                  }) => (
                    <tr
                      key={convoId}
                      sx={{ cursor: "pointer" }}
                      onClick={() => router.push(`/convo/${convoId}`)}
                    >
                      <td>{first_message}</td>
                      <td>{new Date(start).toLocaleString()}</td>
                      <td>{new Date(end).toLocaleString()}</td>
                      <td>{calls}</td>
                      <td>{messages}</td>
                      <td>
                        {tags.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
          ) : (
            <Text>Integrate the module in your app to start recording.</Text>
          )}
        </Stack> 
      </Card>*/}
    </Stack>
  )
}
