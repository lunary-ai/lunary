import OrgUserBadge from "@/components/blocks/OrgUserBadge"
import RenamableField from "@/components/blocks/RenamableField"
import { useDataset, useDatasets, useUser } from "@/utils/dataHooks"
import { cleanSlug } from "@/utils/format"
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import {
  IconMessages,
  IconPencil,
  IconPlus,
  IconTextCaption,
  IconTrash,
} from "@tabler/icons-react"
import Router from "next/router"
import { generateSlug } from "random-word-slugs"
import { hasAccess } from "shared"

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

            <Badge
              variant="light"
              radius="sm"
              color={dataset?.format === "chat" ? "violet" : "gray"}
              size="md"
              tt="none"
            >
              {dataset?.format}
            </Badge>
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
  const { datasets, isLoading, mutate, insert, isInserting } = useDatasets()
  const { user } = useUser()

  function createDataset(format) {
    insert(
      {
        slug: generateSlug(),
        format,
      },
      {
        onSuccess: (dataset) => {
          Router.push(`/datasets/${dataset.id}`)
        },
      },
    )
  }

  return (
    <Container>
      <Stack>
        <Group align="center" justify="space-between">
          <Group align="center">
            <Title>Datasets</Title>
            <Badge variant="light" color="violet">
              Beta
            </Badge>
          </Group>

          {hasAccess(user.role, "datasets", "create") && (
            <Menu>
              <Menu.Target>
                <Button
                  leftSection={<IconPlus size={12} />}
                  variant="default"
                  loading={isInserting}
                >
                  New Dataset
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconMessages size={12} />}
                  onClick={() => {
                    createDataset("chat")
                  }}
                >
                  New Chat Dataset (OpenAI compatible)
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTextCaption size={12} />}
                  onClick={() => {
                    createDataset("text")
                  }}
                >
                  New Text Dataset
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
        <Text size="lg" mb="md">
          Datasets are collections of prompts that you can use as a basis for
          evaluations.
        </Text>

        {isLoading ? (
          <Loader />
        ) : (
          <Stack gap="xl">
            <>
              {datasets?.length === 0 ? (
                <Alert color="gray" title="No datasets yet" />
              ) : (
                datasets?.map((dataset) => (
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
                ))
              )}
            </>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
