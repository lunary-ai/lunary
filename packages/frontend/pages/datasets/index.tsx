import OrgUserBadge from "@/components/Blocks/OrgUserBadge"
import { useDatasets } from "@/utils/dataHooks"
import {
  ActionIcon,
  Badge,
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
import { IconDotsVertical, IconPencil, IconPlus } from "@tabler/icons-react"
import Router from "next/router"

export default function Datasets() {
  const { datasets, isLoading } = useDatasets()

  if (!isLoading && datasets.length === 0) {
    Router.push("/datasets/new")
  }

  if (isLoading) {
    return <Loader />
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

        <Stack gap="xl">
          {datasets.map((dataset) => (
            <Card key={dataset.id} p="lg" withBorder>
              <Group justify="space-between">
                <Stack>
                  <Group>
                    <Title
                      style={{ cursor: "pointer" }}
                      order={3}
                      size={16}
                      onClick={() => {
                        Router.push(`/datasets/${dataset.id}`)
                      }}
                    >
                      {dataset.slug}
                    </Title>
                    <Badge variant="light" radius="sm" color="blue" size="sm">
                      {`${dataset.promptCount} prompt${dataset.promptCount > 1 ? "s" : ""}`}
                    </Badge>
                  </Group>
                  <OrgUserBadge userId={dataset.ownerId} />
                </Stack>

                <Group>
                  <Menu withArrow shadow="sm" position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="transparent">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={16} />}
                        onClick={() => Router.push(`/datasets/${dataset.id}`)}
                      >
                        Edit
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  )
}
