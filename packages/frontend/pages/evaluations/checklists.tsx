import RenamableField from "@/components/Blocks/RenamableField"
import FilterPicker from "@/components/Filters/Picker"
import { useChecklist, useChecklists } from "@/utils/dataHooks"
import { cleanSlug } from "@/utils/format"

import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"

function ChecklistCard({ defaultValue }) {
  const { checklist, update, mutate } = useChecklist(
    defaultValue?.id,
    defaultValue,
  )

  return (
    <Card p="lg" withBorder>
      <Stack>
        <Group>
          <RenamableField
            defaultValue={checklist?.slug}
            onRename={(newName) => {
              const cleaned = cleanSlug(newName)
              update(
                { slug: cleaned },
                { optimisticData: (data) => ({ ...data, slug: cleaned }) },
              )
            }}
          />
        </Group>
        <FilterPicker
          value={checklist?.data}
          onChange={(newData) => {
            update(
              { data: newData },
              { optimisticData: (data) => ({ ...data, data: newData }) },
            )
          }}
        />
      </Stack>
    </Card>
  )
}

export default function Checklists() {
  const { checklists, loading } = useChecklists("evaluation")

  if (loading) {
    return <Loader />
  }

  return (
    <Container>
      <Stack>
        <Group align="center" justify="space-between">
          <Group align="center">
            <Title>Checklists</Title>
            <Badge variant="light" color="violet">
              Alpha
            </Badge>
          </Group>

          <Button
            leftSection={<IconPlus size={12} />}
            variant="light"
            color="blue"
          >
            New Checklist
          </Button>
        </Group>

        <Text size="lg" mb="md">
          Use these checklists in evaluations (SDK or dashboard) to define the
          criteria for a success.
        </Text>

        <Stack gap="xl">
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist.id} defaultValue={checklist} />
          ))}
        </Stack>
      </Stack>
    </Container>
  )
}
