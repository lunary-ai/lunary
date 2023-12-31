import { Group, Paper, Stack, Title } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"

export default function Evaluations() {
  const [views, setViews] = useLocalStorage({
    key: "views",
    defaultValue: [],
  })

  return (
    <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
      <Title>Views</Title>
      <Stack w="50%">
        {views.map((view) => (
          <Paper p="md">
            <Title order={3}>{view.name}</Title>
          </Paper>
        ))}
      </Stack>
    </Stack>
  )
}
