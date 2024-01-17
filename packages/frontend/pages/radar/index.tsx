import TinyPercentChart from "@/components/Analytics/TinyPercentChart"
import Steps from "@/components/Blocks/Steps"
import FilterPicker from "@/components/Filters/Picker"
import Paywall from "@/components/Layout/Paywall"
import { useRadars } from "@/utils/dataHooks"
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Modal,
  NumberInput,
  Popover,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { useSetState } from "@mantine/hooks"
import {
  IconBellBolt,
  IconListSearch,
  IconPlus,
  IconShieldBolt,
} from "@tabler/icons-react"
import Router from "next/router"
import { useState } from "react"
import { Filter, FilterLogic } from "shared"

function NewRadarModal({ opened, onClose }) {
  const { insert } = useRadars()

  const [newRadar, setNewRadar] = useSetState<{
    description: string
    view: FilterLogic
    checks: FilterLogic
    alerts: any
  }>({
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
  })

  const [saving, setSaving] = useState(false)

  const save = async () => {
    // setSaving(true)
    await insert(newRadar)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title="New radar"
      style={{
        overflow: "visible",
      }}
    >
      <Stack>
        <Steps>
          <Steps.Step label="Name" n={1}>
            <Text size="lg" mb="md">
              Describe the radar. This will be used to identify your radar in
              the list.
            </Text>

            <TextInput
              size="sm"
              placeholder="LLM calls with latency > 1s"
              value={newRadar.description}
              onChange={(event) =>
                setNewRadar({
                  description: event.currentTarget.value,
                })
              }
            />
          </Steps.Step>
          <Steps.Step label="View" n={2}>
            <Text size="lg" mb="md">
              Narrow down the logs you want to analyze.
            </Text>
            <FilterPicker
              value={newRadar.view}
              minimal
              restrictTo={(filter) =>
                // Only show these for now to not confuse the user with too many options
                ["type", "tags", "model", "users"].includes(filter.id)
              }
              onChange={(logic) => setNewRadar({ view: logic })}
            />
          </Steps.Step>
          <Steps.Step label="Checks" n={3}>
            <Text size="lg" mb="md">
              Define the conditions that will be a match for the radar.
            </Text>
            <FilterPicker
              value={newRadar.checks}
              restrictTo={(filter) => !filter.onlyInEvals}
              onChange={(logic) => setNewRadar({ checks: logic })}
            />
          </Steps.Step>
        </Steps>
        <Button
          variant="gradient"
          loading={saving}
          ml="auto"
          display="inline-block"
          onClick={() => {
            save()
          }}
        >
          Create radar
        </Button>
      </Stack>
    </Modal>
  )
}

function View({ name, filters, percentMatch }) {
  return (
    <Card p="md" withBorder>
      <Stack>
        <Flex justify="space-between">
          <Title order={3} size="h4">
            {name}
          </Title>

          <Group justify="end">
            <TinyPercentChart height={40} width={210} />

            <Popover withArrow shadow="sm">
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
                    ]}
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
            </Popover>
            <ActionIcon
              variant="light"
              onClick={() => {
                Router.push("/logs")
              }}
            >
              <IconListSearch size={16} />
            </ActionIcon>
          </Group>
        </Flex>
        <Flex justify="space-between">
          <Group>
            {filters.map((filter) => (
              <Badge key={filter} variant="light" color="blue">
                {filter}
              </Badge>
            ))}
          </Group>

          <Progress.Root size={20} w={300}>
            <Progress.Section value={percentMatch} color="red">
              <Progress.Label>{`${percentMatch}%`}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={100 - percentMatch} color="green">
              <Progress.Label>{`${100 - percentMatch}%`}</Progress.Label>
            </Progress.Section>
          </Progress.Root>
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
              <Title>Radar</Title>
              <Badge variant="light" color="violet">
                Alpha
              </Badge>
            </Group>

            <Group>
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
          </Group>

          <Text size="xl" mb="md">
            Create radar views by combining filters. See responses matching your
            criterias.
          </Text>

          <NewRadarModal
            opened={modalOpened}
            onClose={() => setModalOpened(false)}
          />

          <Stack gap="xl">
            <View
              name="Unhelpful responses"
              filters={["feedback", "helpfulness"]}
              percentMatch={28}
            />
            <View
              name="Slow or failed responses"
              filters={["duration", "status"]}
              percentMatch={14}
            />
            <View
              name="Costly LLM calls"
              filters={["cost"]}
              percentMatch={11}
            />

            <View
              name="Contains Personal Identifiable Information (PII)"
              filters={["email", "phone", "address"]}
              percentMatch={9}
            />

            <View
              name="Contains hatred or profanity"
              filters={["profanity", "hatred", "feedback"]}
              percentMatch={1}
            />
          </Stack>
        </Stack>
      </Container>
    </Paywall>
  )
}
