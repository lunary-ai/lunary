import { useConvos } from "@/utils/supabaseHooks"
import { Card, Loader, Stack, Table, Text, Title } from "@mantine/core"
import { useRouter } from "next/router"

export default function AppAnalytics() {
  const router = useRouter()
  const { id } = router.query

  const { convos, loading } = useConvos(id as string)

  return (
    <Stack>
      <Title>App Analytics</Title>
      <p>App ID: {id}</p>

      {loading && <Loader />}

      <Card>
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
                  <th>Start</th>
                  <th>End</th>
                  <th>LLM calls</th>
                  <th>Messages</th>
                  <th>Tokens Used</th>
                </tr>
              </thead>
              <tbody>
                {convos.map(({ id, start, end, events }) => (
                  <tr key={id}>
                    <td>{new Date(start).toLocaleString()}</td>
                    <td>{new Date(end).toLocaleString()}</td>
                    <td>{events}</td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Text>Integrate the module in your app to start recording.</Text>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
