import TinyPercentChart from "@/components/analytics/TinyPercentChart"
import CheckPicker from "@/components/checks/Picker"
import Paywall from "@/components/layout/Paywall"
import { useRadar, useRadars, useUser } from "@/utils/dataHooks"
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  Progress,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { notifications } from "@mantine/notifications"
import {
  IconBell,
  IconDotsVertical,
  IconListSearch,
  IconPencil,
  IconPlus,
  IconShieldBolt,
  IconTrash,
} from "@tabler/icons-react"
import Router from "next/router"
import { useState } from "react"
import { hasAccess } from "shared"

const DEFAULT_RADAR = {
  negative: true,
  description: "",
  view: [
    "AND",
    {
      id: "type",
      params: {
        type: "llm",
      },
    },
  ],
  checks: ["AND"],
  alerts: [],
}

function RadarEditModal({
  opened,
  onCancel,
  onUpdate,
  onSave,
  value,
}: {
  opened: boolean
  onCancel: () => void
  onUpdate: (newRadar: any) => void
  onSave: () => void
  value?: any
}) {
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)

    try {
      if (!value.description) {
        throw new Error("Please enter a name for the radar.")
      }

      if (value.view.length <= 1 || value.checks.length <= 1) {
        throw new Error("Please add checks")
      }

      await onSave()
    } catch (e) {
      notifications.show({
        title: "Error",
        message: e.message,
        color: "red",
      })
    }
    setSaving(false)
  }

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      size="xl"
      title="New radar"
      style={{
        overflow: "visible",
      }}
    >
      <Stack gap="xl">
        <Stack>
          <Switch
            onChange={(event) =>
              onUpdate({ negative: event.currentTarget.checked })
            }
            description="Matches will be considered as negative (default)."
            checked={value.negative}
            label="Negative radar"
          />

          <Text size="lg">
            Describe the radar. This will be used to identify your radar in the
            list.
          </Text>

          <TextInput
            size="sm"
            placeholder="LLM calls with latency > 1s"
            value={value.description}
            onChange={(event) =>
              onUpdate({
                description: event.currentTarget.value,
              })
            }
          />
        </Stack>
        <Stack>
          <Text size="lg">Narrow down the logs you want to analyze.</Text>
          <CheckPicker
            value={value.view}
            minimal
            restrictTo={(filter) =>
              // Only show these for now to not confuse the user with too many options
              ["type", "tags", "model", "users", "metadata"].includes(filter.id)
            }
            onChange={(logic) =>
              onUpdate({
                view: logic,
              })
            }
          />
        </Stack>
        <Stack>
          <Text size="lg">
            Define the conditions that will be a match for the radar.
          </Text>
          <Box>
            <CheckPicker
              value={value.checks}
              restrictTo={(filter) =>
                !filter.onlyInEvals && filter.id !== "radar"
              }
              onChange={(logic) =>
                onUpdate({
                  checks: logic,
                })
              }
            />
          </Box>
        </Stack>

        <Button
          variant="default"
          loading={saving}
          ml="auto"
          display="inline-block"
          onClick={() => {
            save()
          }}
        >
          Save Radar
        </Button>
      </Stack>
    </Modal>
  )
}

function RadarCard({ id, initialData }) {
  const { user } = useUser()
  const [editOpened, setEditOpened] = useState(false)

  const { radar, remove, update, chart, mutate } = useRadar(id, initialData)

  if (!radar) return null

  const { description, checks, passed, failed, negative } = radar || {}

  const hasStats = +passed > 0 || +failed > 0
  const total = +passed + +failed

  const percentMatch = Math.round((+passed / total) * 100)

  return (
    <Card p="md" withBorder>
      <RadarEditModal
        opened={editOpened}
        onCancel={() => setEditOpened(false)}
        value={radar}
        onUpdate={async (value) => {
          mutate(
            { ...radar, ...value },
            {
              optimisticData: { ...radar, ...value },
              rollbackOnError: true,
              populateCache: true,
              revalidate: false,
            },
          )
        }}
        onSave={async () => {
          await update(radar)
          notifications.show({
            title: "Radar updated",
            message: "Please allow a few minutes for the radar data to update.",
            color: "teal",
          })
          setEditOpened(false)
        }}
      />

      <Stack>
        <Flex justify="space-between">
          <Title order={3} size="h4">
            {description}
          </Title>

          <Group justify="end">
            <TinyPercentChart
              height={40}
              width={210}
              data={chart}
              negative={negative}
            />

            {/* <Popover withArrow shadow="sm">
              <Popover.Target>
                <ActionIcon variant="light">
                  <IconBellBolt size={16} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="md">
                  <Text size="sm">
                    Setup an alert to get notified when new responses match
                    this.
                  </Text>

                  <Select
                    label="Alert type"
                    placeholder="Select alert type"

                    data={[
                      { value: "threshold", label: "% Match threshold" },
                      { value: "count", label: "Count" },
                    ]}acti
                  />

                  <NumberInput
                    defaultValue={50}
                    min={0}
                    max={100}
                    label="Match threshold"
                    placeholder="50"
                    rightSection="%"
                  />
                  <Button size="xs">Save</Button>
                </Stack>
              </Popover.Dropdown>
            </Popover> */}

            <Tooltip label="View logs matched by radar.">
              <ActionIcon
                variant="light"
                onClick={() => {
                  Router.push(`/logs?radar=${id}`)
                }}
              >
                <IconListSearch size={16} />
              </ActionIcon>
            </Tooltip>

            {hasAccess(user.role, "radars", "update") && (
              <Menu>
                <Menu.Target>
                  <ActionIcon variant="transparent">
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconPencil size={13} />}
                    onClick={() => setEditOpened(true)}
                  >
                    Edit
                  </Menu.Item>
                  <Menu.Item disabled leftSection={<IconBell size={13} />}>
                    Alerts
                  </Menu.Item>

                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={13} />}
                    onClick={() => {
                      modals.openConfirmModal({
                        title: "Delete radar",
                        labels: { confirm: "Confirm", cancel: "Cancel" },
                        children: (
                          <Text size="sm">
                            Are you sure you want to delete this radar? This
                            action cannot be undone.
                          </Text>
                        ),

                        onConfirm: () => {
                          remove(id)
                        },
                      })
                    }}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Flex>
        <Flex justify="space-between">
          <Group>
            {checks
              ?.filter((f) => typeof f !== "string" && !Array.isArray(f))
              .map((filter) => (
                <Badge key={filter.id} variant="light" color="blue">
                  {filter.id}
                </Badge>
              ))}
          </Group>

          {hasStats ? (
            <Progress.Root size={20} w={300}>
              <Progress.Section
                value={percentMatch}
                color={negative ? "red" : "teal"}
              >
                <Progress.Label>{`${percentMatch}%`}</Progress.Label>
              </Progress.Section>
              <Progress.Section
                value={100 - percentMatch}
                color={negative ? "teal" : "red"}
              >
                <Progress.Label>{`${100 - percentMatch}%`}</Progress.Label>
              </Progress.Section>
            </Progress.Root>
          ) : (
            <Progress.Root size={20} w={300}>
              <Progress.Section animated value={100} color="blue">
                <Progress.Label>Scanning in progress...</Progress.Label>
              </Progress.Section>
            </Progress.Root>
          )}
        </Flex>
      </Stack>
    </Card>
  )
}

const FEATURE_LIST = [
  "Combine filters to create magic views",
  "See logs matching your criterias",
  "AI filters to analyzise emotions, sentiments, PII, etc.",
  "Setup alerts",
]

export default function Radar() {
  const [modalOpened, setModalOpened] = useState(false)
  const { radars, insert, loading } = useRadars()
  const [newRadar, setNewRadar] = useState(DEFAULT_RADAR)

  const { user } = useUser()

  return (
    <Paywall
      plan="unlimited"
      feature="Radar"
      Icon={IconShieldBolt}
      description="Identify outlier results that match specific conditions."
      list={FEATURE_LIST}
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Radars</Title>
              <Badge variant="light" color="violet">
                Beta
              </Badge>
            </Group>

            {hasAccess(user.role, "radars", "create") && (
              <Button
                leftSection={<IconPlus size={12} />}
                variant="default"
                onClick={() => {
                  setModalOpened(true)
                }}
              >
                New
              </Button>
            )}
          </Group>

          <Text size="lg" mb="md">
            Radar views are combinations of smart filters that you can use to
            identify outlier results.
          </Text>

          <RadarEditModal
            opened={modalOpened}
            onCancel={() => setModalOpened(false)}
            value={newRadar}
            onUpdate={(value) => setNewRadar({ ...newRadar, ...value })}
            onSave={async () => {
              await insert(newRadar)

              notifications.show({
                title: "Radar created",
                message:
                  "Please allow a few minutes for the radar to start showing.",
                color: "teal",
              })

              setModalOpened(false)

              setNewRadar(DEFAULT_RADAR)
            }}
          />

          {loading ? (
            <Loader />
          ) : (
            <Stack gap="xl">
              {radars?.map((radar) => (
                <RadarCard key={radar.id} id={radar.id} initialData={radar} />
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </Paywall>
  )
}
