import { FiltersGrid } from "@/components/Blocks/FiltersModal"
import {
  Badge,
  Container,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core"
import { useLocalStorage, useSetState } from "@mantine/hooks"
import { IconPlus } from "@tabler/icons-react"

function View({ name, filters }) {
  return (
    <Paper p="md">
      <Group>
        <Title order={3} size="h4">
          {name}
        </Title>
        <Group>
          {filters.map((filter) => (
            <Badge key={filter} variant="light" color="blue">
              {filter}
            </Badge>
          ))}
        </Group>
      </Group>
    </Paper>
  )
}

export default function Evaluations() {
  const [views, setViews] = useLocalStorage({
    key: "views",
    defaultValue: [],
  })

  const [selected, setSelected] = useSetState({})

  return (
    <Container>
      <Stack>
        <Title>Evaluations</Title>

        <Tabs defaultValue="new" variant="pills">
          <Tabs.List mb="lg">
            <Tabs.Tab value="new" leftSection={<IconPlus size={12} />}>
              New view
            </Tabs.Tab>
            <Tabs.Tab value="existing">Existing views</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="new">
            <Text size="xl">
              Create evaluating views by combining filters. See responses that
              match your criteria.
            </Text>

            <FiltersGrid selected={selected} setSelected={setSelected} />
          </Tabs.Panel>

          <Tabs.Panel value="existing">
            <Stack>
              <View
                name="Slow or failed responses"
                filters={["duration", "status"]}
              />
              <View
                name="Contains hatred or profanity"
                filters={["profanity", "hatred", "feedback"]}
              />
              <View
                name="Contains Personal Identifiable Information (PII)"
                filters={["email", "phone", "address"]}
              />
              <View
                name="Unhelpful responses"
                filters={["feedback", "helpfulness"]}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  )
}
