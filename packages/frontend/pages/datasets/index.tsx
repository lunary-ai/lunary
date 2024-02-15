import OrgUserBadge from "@/components/Blocks/OrgUserBadge"
import RenamableField from "@/components/Blocks/RenamableField"
import { useDataset, useDatasets } from "@/utils/dataHooks"
import { cleanSlug } from "@/utils/format"
import {
  ActionIcon,
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
import { modals } from "@mantine/modals"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import Router from "next/router"

function DatasetCard({ defaultValue, onDelete }) {
  const { update, dataset, remove } = useDataset(defaultValue?.id, defaultValue)

  return (
    <Card p="lg" withBorder pos="relative" style={{ overflow: "visible" }}>
      <ActionIcon
        pos="absolute"
        top={-15}
        right={-15}
        style={{ zIndex: 10 }}
        onClick={async () => {
          modals.openConfirmModal({
            title: "Please confirm your action",
            confirmProps: { color: "red" },
            children: (
              <Text size="sm">
                Are you sure you want to delete this prompt? This action cannot
                be undone and the prompt data will be lost forever.
              </Text>
            ),
            labels: { confirm: "Confirm", cancel: "Cancel" },

            onConfirm: async () => {
              onDelete()
              remove()
            },
          })
        }}
        color="red"
        variant="subtle"
      >
        <IconTrash size={16} />
      </ActionIcon>
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
  const { datasets, isLoading, mutate } = useDatasets()

  if (!isLoading && datasets.length === 0) {
    return Router.push("/datasets/new")
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
              <DatasetCard
                key={dataset.id}
                defaultValue={dataset}
                onDelete={() => {
                  mutate(
                    datasets.filter((d) => d.id !== dataset.id),
                    {
                      revalidate: false,
                    },
                  )
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
