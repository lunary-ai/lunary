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

function Dataset({ id, slug, updated_at, runs }) {
  return (
    <Card withBorder>
      <UnstyledButton onClick={() => Router.push(`/datasets/${slug}`)}>
        <Stack gap="xs">
          <Text size="lg" w={700}>
            {slug}
          </Text>
          <Text size="sm" c="dimmed">
            Updated {formatDateTime(updated_at)}
          </Text>
        </Stack>
      </UnstyledButton>
    </Card>
  )
}

const datasets = [
  {
    id: "1",
    slug: "testing_dataset",
    updated_at: "2023-06-01T00:00:00Z",
    runs: [
      {
        name: "gpt-4",
        created_at: "2021-06-01T00:00:00Z",
        input: [{ role: "user", content: "Hello, how are you?" }],
        output: [{ role: "assistant", content: "Hello, how are you?" }],
      },
    ],
  },
]

export default function Evaluations() {
  const [modalOpened, setModalOpened] = useState(false)

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
            onClick={() => {
              setModalOpened(true)
            }}
          >
            New
          </Button>
        </Group>

        <Text size="xl" mb="md">
          Create testing datasets to use for your agents or as a basis for
          fine-tuning your models.
        </Text>

        <Stack>
          {datasets.map((dataset) => (
            <Dataset {...dataset} />
          ))}
        </Stack>
      </Stack>
    </Container>
  )
}
