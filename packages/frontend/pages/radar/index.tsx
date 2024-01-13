import TinyPercentChart from "@/components/Blocks/Analytics/TinyPercentChart"
import FiltersModal from "@/components/Blocks/FiltersModal"
import Paywall from "@/components/Layout/Paywall"
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Flex,
  Group,
  NumberInput,
  Popover,
  Progress,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useLocalStorage, useSetState } from "@mantine/hooks"
import {
  IconBellBolt,
  IconDatabase,
  IconListSearch,
  IconPlus,
  IconRadar2,
  IconShieldBolt,
} from "@tabler/icons-react"
import Router from "next/router"
import { useState } from "react"

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
  const [selected, setSelected] = useSetState({})
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
              <Button
                leftSection={<IconDatabase size={12} />}
                variant="light"
                color="violet"
                onClick={() => {
                  Router.push("/datasets")
                }}
              >
                Datasets
              </Button>
            </Group>
          </Group>

          <Text size="xl" mb="md">
            Create radar views by combining filters. See responses matching your
            criterias.
          </Text>

          <FiltersModal
            opened={modalOpened}
            defaultSelected={selected}
            setOpened={setModalOpened}
            save={setSelected}
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
