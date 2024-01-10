import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"
import { formatDateTime } from "@/utils/format"
import { useState } from "react"
import Router from "next/router"
import { useDatasets } from "@/utils/dataHooks"

function Dataset({ id, slug, updatedAt, runs }) {
  return (
    <Card withBorder>
      <UnstyledButton onClick={() => Router.push(`/datasets/${id}`)}>
        <Stack gap="xs">
          <Text size="lg" w={700}>
            {slug}
          </Text>
          <Text size="sm" c="dimmed">
            Updated {formatDateTime(updatedAt)}
          </Text>
        </Stack>
      </UnstyledButton>
    </Card>
  )
}

export default function Datasets() {
  const [setModalOpened] = useState(false)
  const { datasets, loading, insert, mutate } = useDatasets()

  return (
    <Container>
      <Stack>
        <Group align="center" justify="space-between">
          <Group align="center">
            <Title>Datasets</Title>
            <Badge variant="light" color="violet">
              Alpha
            </Badge>
          </Group>

          <Button
            leftSection={<IconPlus size={12} />}
            variant="light"
            color="blue"
            onClick={async () => {
              await insert({
                slug: `dataset-${(datasets?.length || 0) + 1}`,
              })

              mutate()
            }}
          >
            New
          </Button>
        </Group>

        <Text size="xl" mb="md">
          Create testing datasets to use for your agents or as a basis for
          fine-tuning your models.
        </Text>

        <Stack>{datasets?.map((dataset) => <Dataset {...dataset} />)}</Stack>
      </Stack>
    </Container>
  )
}
