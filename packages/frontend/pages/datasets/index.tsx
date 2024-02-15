import OrgUserBadge from "@/components/Blocks/OrgUserBadge"
import RenamableField from "@/components/Blocks/RenamableField"
import { useDataset, useDatasets } from "@/utils/dataHooks"
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
import { IconPencil, IconPlus } from "@tabler/icons-react"
import Router from "next/router"

function DatasetCard({ defaultValue }) {
  const { update, dataset } = useDataset(defaultValue?.id, defaultValue)

  return (
    <Card p="lg" withBorder>
      <Group justify="space-between">
        <Stack>
          <Group>
            <RenamableField
              style={{ cursor: "pointer" }}
              order={3}
              size={16}
              defaultValue={dataset.slug}
              onRename={(newName) => {
                update(
                  { slug: cleanSlug(newName) },
                  {
                    optimisticData: (data) => ({
                      ...data,
                      slug: cleanSlug(newName),
                    }),
                  },
                )
              }}
            />
            {dataset?.prompts && (
              <Badge
                variant="light"
                radius="sm"
                color="blue"
                size="md"
                tt="none"
              >
                {`${dataset.prompts?.length} prompt${dataset.prompts?.length > 1 ? "s" : ""}`}
              </Badge>
            )}
          </Group>
          <OrgUserBadge userId={dataset.ownerId} />
        </Stack>

        <Button
          onClick={() => Router.push(`/datasets/${dataset.id}`)}
          size="sm"
          leftSection={<IconPencil size={16} />}
          variant="light"
        >
          Edit
        </Button>
      </Group>
    </Card>
  )
}

export default function Datasets() {
  const { datasets, isLoading } = useDatasets()

  if (!isLoading && datasets.length === 0) {
    Router.push("/datasets/new")
  }

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
              Router.push("/datasets/new")
            }}
          >
            New Dataset
          </Button>
          <Text size="lg" mb="md">
            Datasets are collections of prompts that you can use as a basis for
            evaluations.
          </Text>
        </Group>

        {isLoading ? (
          <Loader />
        ) : (
          <Stack gap="xl">
            {datasets?.map((dataset) => (
              <DatasetCard key={dataset.id} defaultValue={dataset} />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
