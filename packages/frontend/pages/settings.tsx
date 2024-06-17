import LineChart from "@/components/analytics/LineChart"
import CopyText from "@/components/blocks/CopyText"

import {
  Alert,
  Button,
  Container,
  Flex,
  Group,
  NumberInput,
  Popover,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core"
import { NextSeo } from "next-seo"
import Router from "next/router"

import { useOrg, useUser, useProject } from "@/utils/dataHooks"
import useSWR from "swr"
import RenamableField from "@/components/blocks/RenamableField"
import { CheckLogic, hasAccess } from "shared"
import { SettingsCard } from "@/components/blocks/SettingsCard"
import { IconCheck, IconFilter, IconRefreshAlert } from "@tabler/icons-react"
import { useState } from "react"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"
import { notifications } from "@mantine/notifications"
import { modals } from "@mantine/modals"
import CheckPicker from "@/components/checks/Picker"
import { AreaChart } from "@mantine/charts"

function Keys() {
  const [regenerating, setRegenerating] = useState(false)
  const { project, mutate } = useProject()
  const { user } = useUser()

  async function regenerateKey() {
    setRegenerating(true)

    const res = await errorHandler(
      fetcher.post(`/projects/${project.id}/regenerate-key`, {
        arg: { type: "private" },
      }),
    )

    if (res) {
      notifications.show({
        title: "Key regenerated",
        message: "Your private key has been successfully regenerated",
        icon: <IconCheck />,
        color: "green",
      })
      await mutate()
    }

    setRegenerating(false)
  }

  return (
    <SettingsCard title="Keys">
      <Alert
        variant="light"
        title={
          <Group>
            <Text fw={500}>Project ID / Public Key:</Text>
            <CopyText
              c="green.8"
              value={project?.id}
              data-testid="public-key"
            />
          </Group>
        }
        color="green"
      >
        <Text>
          Your project ID can be used from your server or frontend code to track
          events and send requests to the API.
        </Text>
      </Alert>
      {hasAccess(user.role, "projects", "update") && (
        <Alert
          variant="light"
          styles={{
            label: { width: "100%" },
          }}
          title={
            <Group justify="space-between" w="100%">
              <Group>
                <Text fw={500}>Private Key:</Text>
                <CopyText
                  c="red.8"
                  value={project?.privateApiKey}
                  data-testid="private-key"
                />
              </Group>
              <Button
                ml="auto"
                size="xs"
                color="red"
                loading={regenerating}
                data-testid="regenerate-private-key-button"
                onClick={() => {
                  modals.openConfirmModal({
                    title: "Please confirm your action",
                    confirmProps: {
                      color: "red",
                      "data-testid": "confirm-button",
                    },
                    children: (
                      <Text size="sm">
                        Are you sure you want to regenerate your private key?
                        The current key will be invalidated.
                      </Text>
                    ),
                    labels: { confirm: "Confirm", cancel: "Cancel" },

                    onConfirm: async () => {
                      await regenerateKey()
                    },
                  })
                }}
                leftSection={<IconRefreshAlert size={16} />}
              >
                Regenerate
              </Button>
            </Group>
          }
          color="red"
        >
          <Text>
            Your private key should be kept secret and never shared. It can be
            used to retrieve data from the API.
          </Text>
        </Alert>
      )}
    </SettingsCard>
  )
}

export default function AppAnalytics() {
  const { org } = useOrg()
  const { update, project, setProjectId, drop } = useProject()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser()
  const [filters, setChecks] = useState<CheckLogic>([
    "AND",
    { id: "type", params: { type: "llm" } },
  ])

  // TODO: better route for project usage
  const { data: projectUsage, isLoading: projectUsageLoading } = useSWR(
    project?.id && org && `/orgs/${org.id}/usage?projectId=${project?.id}`,
  )
  console.log(projectUsage)

  return (
    <Container className="unblockable">
      <NextSeo title="Settings" />
      <Stack gap="xl">
        <LineChart
          title={
            hasAccess(user.role, "projects", "update") ? (
              <RenamableField
                defaultValue={project?.name}
                onRename={(name) => update(name)}
              />
            ) : (
              <Text size="xl" fw="bold">
                {project?.name}
              </Text>
            )
          }
          data={projectUsage}
          cleanData={false}
          agg="sum"
          loading={projectUsageLoading}
          formatter={(val) => `${val} runs`}
          props={["count"]}
        />

        {user.role !== "viewer" && <Keys />}

        <SettingsCard
          title={<>Smart Data Masking ✨</>}
          align="start"
          paywallConfig={{
            Icon: IconFilter,
            feature: "Smart Data Masking",
            p: 12,
            plan: "enterprise",
            list: [
              "Mask or filter out sensitive data",
              "LLM-powered detection or custom regex patterns",
            ],
            enabled: !process.env.NEXT_PUBLIC_DEMO,
          }}
        >
          <Text>
            Smart Data Masking allows you to filter out sensitive data from your
            project.
          </Text>
          <CheckPicker
            defaultOpened={true}
            value={filters}
            onChange={setChecks}
            restrictTo={(f) =>
              ["tools", "tags", "metadata", "users", "pii", "regex"].includes(
                f.id,
              )
            }
          />

          <Flex justify="flex-end" w="100%">
            <Button
              loading={isLoading}
              style={{ float: "right" }}
              onClick={() => {
                setIsLoading(true)
                setTimeout(() => setIsLoading(false), 1000)
              }}
              variant="default"
            >
              Save
            </Button>
          </Flex>
        </SettingsCard>
        <SettingsCard
          title={<>Custom Models 🧠</>}
          align="start"
          paywallConfig={{
            Icon: IconFilter,
            feature: "Custom Models",
            p: 12,
            plan: "enterprise",
            list: [
              "Use custom models for evaluations",
              "Add and overwrite cost mappings",
            ],

            enabled: !process.env.NEXT_PUBLIC_DEMO,
          }}
        >
          <Text>Add custom models and cost mappings to your project.</Text>

          <Table withColumnBorders withRowBorders withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Model Name</Table.Th>
                <Table.Th>Match Regex</Table.Th>
                <Table.Th>Unit</Table.Th>
                <Table.Th>Input Cost</Table.Th>
                <Table.Th>Output Cost</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>gpt-4-preview</Table.Td>
                <Table.Td>(?i)^(gpt-4-preview)$</Table.Td>
                <Table.Td>Tokens</Table.Td>
                <Table.Td>$0.01</Table.Td>
                <Table.Td>$0.01</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>

          <Group wrap="nowrap">
            <TextInput
              label="Model Name"
              placeholder="Enter model name"
              defaultValue="gpt-4-preview"
              required
            />
            <TextInput
              label="Match Regex"
              placeholder="Enter match regex"
              defaultValue="(?i)^(gpt-4-preview)$"
              required
            />
            <Select
              label="Unit"
              placeholder="Select unit"
              defaultValue="TOKENS"
              data={[
                { value: "TOKENS", label: "Tokens" },
                { value: "CHARACTERS", label: "Characters" },
                { value: "SECONDS", label: "Seconds" },
              ]}
              required
            />
            <NumberInput
              label="Input Cost"
              defaultValue={0.01}
              placeholder="Enter input cost in USD"
              required
            />
            <NumberInput
              label="Output Cost"
              defaultValue={0.01}
              placeholder="Enter output cost in USD"
              required
            />
          </Group>

          <Flex justify="flex-end" w="100%">
            <Button
              loading={isLoading}
              style={{ float: "right" }}
              variant="default"
              onClick={() => {
                setIsLoading(true)
                setTimeout(() => setIsLoading(false), 1000)
              }}
            >
              Add Model
            </Button>
          </Flex>
        </SettingsCard>

        {user && hasAccess(user.role, "projects", "delete") && (
          <SettingsCard title="Danger Zone" align="start">
            <Text>
              Deleting your project is irreversible and it will delete all
              associated data.
              <br />
              We <b>cannot</b> recover your data once it&apos;s deleted.
            </Text>

            <Popover width={200} position="bottom" shadow="md">
              <Popover.Target>
                <Button color="red" data-testid="delete-project-button">
                  Delete Project
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text mb="md">
                  Are you sure you want to delete this project? This action is
                  irreversible and it will delete all associated data.
                </Text>
                <Group align="start">
                  <Button
                    color="red"
                    w={80}
                    data-testid="delete-project-popover-button"
                    onClick={async () => {
                      const dropped = await drop()
                      if (dropped) {
                        setProjectId(null)
                        Router.push("/")
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Group>
              </Popover.Dropdown>
            </Popover>
          </SettingsCard>
        )}
      </Stack>
    </Container>
  )
}
