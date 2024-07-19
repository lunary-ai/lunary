import LineChart from "@/components/analytics/LineChart"
import CopyText from "@/components/blocks/CopyText"

import {
  Alert,
  Button,
  Container,
  Flex,
  Group,
  Popover,
  Stack,
  Text,
} from "@mantine/core"
import { NextSeo } from "next-seo"
import Router from "next/router"

import RenamableField from "@/components/blocks/RenamableField"
import CheckPicker from "@/components/checks/Picker"
import { SettingsCard } from "@/components/blocks/SettingsCard"
import {
  IconCheck,
  IconPencil,
  IconFilter,
  IconRefreshAlert,
} from "@tabler/icons-react"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"
import { modals } from "@mantine/modals"
import { notifications } from "@mantine/notifications"
import { useOrg, useProject, useUser } from "@/utils/dataHooks"
import { useEffect, useState } from "react"
import { CheckLogic, hasAccess } from "shared"
import useSWR from "swr"
import config from "@/utils/config"
import Link from "next/link"

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
  const { update, project, setProjectId, drop, updateSmartDatafilters } =
    useProject()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser()
  const [filters, setChecks] = useState<CheckLogic>(["AND"])

  useEffect(() => {
    if (project) {
      setChecks(project.filters)
    }
  }, [project])

  // TODO: better route for project usage
  const { data: projectUsage, isLoading: projectUsageLoading } = useSWR(
    project?.id && org && `/orgs/${org.id}/usage?projectId=${project?.id}`,
  )

  const smartDataFilterEnabled = config.IS_SELF_HOSTED
    ? org.license.dataFilteringEnabled
    : org.dataFilteringEnabled

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

        <SettingsCard title={<>Custom Models 🧠</>} align="start">
          <Button
            color="blue"
            variant="default"
            component={Link}
            data-testid="add-model-button"
            href={`/settings/models`}
            leftSection={<IconPencil size={16} />}
          >
            Edit Mappings
          </Button>
        </SettingsCard>

        <SettingsCard
          title={<>Smart Data Filtering ✨</>}
          align="start"
          paywallConfig={{
            Icon: IconFilter,
            feature: "Smart Data Filtering",
            p: 12,
            plan: "enterprise",
            list: [
              "Filter out sensitive data",
              "LLM-powered detection or custom regex patterns",
            ],
            enabled: !smartDataFilterEnabled,
          }}
        >
          <Text>
            Smart Data Filters allows you to filter out sensitive data from your
            project.
          </Text>
          <CheckPicker
            defaultOpened={true}
            minimal={true}
            value={filters}
            onChange={setChecks}
            buttonText="Add filter"
            restrictTo={(f) =>
              ["metadata", "users", "tags", "tools", "models"].includes(f.id)
            }
          />

          <Flex justify="flex-end" w="100%">
            <Button
              loading={isLoading}
              style={{ float: "right" }}
              onClick={() => {
                setIsLoading(true)
                updateSmartDatafilters(filters)
                setTimeout(() => setIsLoading(false), 1000)
              }}
              variant="full"
            >
              Save
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
