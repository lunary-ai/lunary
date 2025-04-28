import CopyText from "@/components/blocks/CopyText";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  Alert,
  Box,
  Button,
  Container,
  Flex,
  Group,
  Loader,
  Popover,
  Progress,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";
import Router, { useRouter } from "next/router";

import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import { SettingsCard } from "@/components/blocks/SettingsCard";
import CheckPicker from "@/components/checks/Picker";
import DataWarehouseCard from "@/components/settings/data-warehouse";
import config from "@/utils/config";
import {
  useLunaryVersion,
  useOrg,
  useProject,
  useProjectRules,
  useUser,
} from "@/utils/dataHooks";
import { useRefreshCostsJob } from "@/utils/dataHooks/jobs";
import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import { modals } from "@mantine/modals";
import { notifications, showNotification } from "@mantine/notifications";
import {
  IconCheck,
  IconCoin,
  IconFilter,
  IconIdBadge,
  IconPencil,
  IconRefreshAlert,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type CheckLogic, hasAccess } from "shared";
import useSWR from "swr";

dayjs.extend(relativeTime);

function Keys() {
  const [regenerating, setRegenerating] = useState(false);
  const { project, mutate } = useProject();
  const { user } = useUser();

  async function regenerateKey() {
    setRegenerating(true);

    const res = await errorHandler(
      fetcher.post(`/projects/${project.id}/regenerate-key`, {
        arg: { type: "private" },
      }),
    );

    if (res) {
      notifications.show({
        title: "Key regenerated",
        message: "Your private key has been successfully regenerated",
        icon: <IconCheck />,
        color: "green",
      });
      await mutate();
    }

    setRegenerating(false);
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
      {hasAccess(user.role, "privateKeys", "list") && (
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
                  isSecret
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
                      await regenerateKey();
                    },
                  });
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
  );
}

function SmartDataRule() {
  const { org } = useOrg();
  const { addRule, addRulesLoading, deleteRule, maskingRule, filteringRule } =
    useProjectRules();

  const [checks, setChecks] = useState<CheckLogic>(["AND"]);

  useEffect(() => {
    if (filteringRule?.filters) {
      setChecks(filteringRule.filters);
    }
  }, [filteringRule]);

  const smartDataFilterEnabled = config.IS_SELF_HOSTED
    ? org.license.dataFilteringEnabled
    : org.dataFilteringEnabled;

  return (
    <SettingsCard
      title={<>Smart Data Rules ✨</>}
      align="start"
      paywallConfig={{
        Icon: IconFilter,
        feature: "Smart Data Rules",
        p: 12,
        plan: "enterprise",
        list: [
          "Filter out sensitive data",
          "LLM-powered detection or custom regex patterns",
        ],
        enabled: !smartDataFilterEnabled,
      }}
    >
      <Text>Filter out or hide sensitive data from your project.</Text>

      <Tabs variant="outline" defaultValue="filtering" w="100%">
        <Tabs.List>
          <Tabs.Tab value="filtering">Ingestion Filtering</Tabs.Tab>
          <Tabs.Tab value="masking">PII Masking</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="filtering" p="md">
          <Stack>
            <Text>
              Prevent data from being ingested into your project. Click below
              button to add conditions and filter out data based on metadata,
              users, tags, tools, or models. Input and output data from runs
              matching will be redacted.
            </Text>
            <CheckPicker
              minimal
              showAndOr
              value={checks}
              onChange={setChecks}
              buttonText="Add filter"
              restrictTo={(f) =>
                ["metadata", "users", "tags", "tools", "models"].includes(f.id)
              }
            />

            <Flex justify="flex-end">
              <Button
                loading={addRulesLoading}
                style={{ float: "right" }}
                onClick={() => {
                  addRule({ type: "filtering", filters: checks });
                }}
                variant="full"
              >
                Save
              </Button>
            </Flex>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="masking" p="md">
          <Stack>
            <Text>
              Masking allows you to hide sensitive data in the dashboard.
            </Text>

            <Alert w="100%" icon={<IconIdBadge />}>
              Masking requires a PII enricher enabled.
            </Alert>
            {addRulesLoading && <Loader />}
            <Switch
              size="lg"
              label="Enabled"
              checked={!!maskingRule}
              onChange={(e) => {
                const { checked } = e.currentTarget;

                if (checked) {
                  addRule({
                    type: "masking",
                  });
                } else if (maskingRule) {
                  deleteRule(maskingRule.id);
                }
              }}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </SettingsCard>
  );
}

function ProjectNameCard() {
  const { project, update } = useProject();
  const [name, setName] = useState(project?.name ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== (project?.name ?? "");

  async function save() {
    if (!dirty) return;
    setSaving(true);
    await update(name.trim());
    setSaving(false);
  }

  useEffect(() => {
    if (project) {
      setName(project.name);
    }
  }, [project]);

  return (
    <SettingsCard title="Project Name">
      <Stack gap="sm">
        <Text c="dimmed">
          This is your project’s visible name within Lunary. For example, the
          name of your company or department.
        </Text>

        <TextInput
          data-testid="project-name-input"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />

        <Group justify="end">
          <Button onClick={save} disabled={!dirty} loading={saving}>
            Save
          </Button>
        </Group>
      </Stack>
    </SettingsCard>
  );
}

export default function Settings() {
  const { user } = useUser();
  const {
    job: refreshJob,
    isLoading: refreshLoading,
    isStarting: refreshStarting,
    start: startRefreshCosts,
  } = useRefreshCostsJob();
  const prevStatus = useRef<string | undefined>();

  useEffect(() => {
    if (!refreshJob) return;
    if (refreshJob.status !== prevStatus.current) {
      if (refreshJob.status === "done") {
        notifications.update({
          id: "refresh-costs",
          title: "Cost refresh completed",
          message: "All run costs are up‑to‑date.",
          icon: <IconCheck />,
          color: "green",
          autoClose: 4000,
        });
      }
      if (refreshJob.status === "failed") {
        notifications.update({
          id: "refresh-costs",
          title: "Cost refresh failed",
          message: refreshJob.error || "See logs for details",
          color: "red",
          autoClose: 8000,
        });
      }
      prevStatus.current = refreshJob.status;
    }
  }, [refreshJob]);

  const openRefreshCostModal = () =>
    modals.openConfirmModal({
      title: <Title order={4}>Refresh costs for all logs?</Title>,
      children: (
        <Text size="sm">
          This will recalculate costs for every LLM log in your organization
          using the latest pricing rules.
        </Text>
      ),
      confirmProps: { loading: refreshStarting },
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onConfirm: async () => {
        await startRefreshCosts();
        modals.closeAll();
      },
    });

  const { org } = useOrg();
  const {
    update: updateProjectName, // kept for backward compatibility if needed elsewhere
    project,
    setProjectId,
    drop,
    dropLoading,
    updateDataRetention,
  } = useProject();

  const [dataRetentionDays, setDataRetentionDays] =
    useState<string>("unlimited");

  const { backendVersion, frontendVersion } = useLunaryVersion();
  const router = useRouter();

  // TODO: better route for project usage
  const { data: projectUsage, isLoading: projectUsageLoading } = useSWR(
    project?.id && org && `/orgs/${org.id}/usage?projectId=${project?.id}`,
  );

  useEffect(() => {
    if (project?.dataRetentionDays) {
      setDataRetentionDays(project.dataRetentionDays || "unlimited");
    }
  }, [project]);

  useEffect(() => {
    if (!hasAccess(user?.role, "settings", "read")) {
      router.push("/dashboards");
    }
  }, [user.role]);

  if (!user.role) {
    return <Loader />;
  }

  const startDate = dayjs().subtract(30, "days").toDate();
  startDate.setHours(0, 0, 0, 0);

  return (
    <>
      <NextSeo title="Settings" />

      <Title order={4} mb="xs">
        Settings
      </Title>
      <Tabs defaultValue="project" variant="default" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab px="0" value="project" mr="md">
            Project
          </Tabs.Tab>
          <Tabs.Tab px="0" value="org">
            Organization
          </Tabs.Tab>
        </Tabs.List>

        {/* ----------------------------- PROJECT TAB */}
        <Tabs.Panel value="project" pt="md">
          <Container px="0">
            <Stack gap="xl">
              {hasAccess(user.role, "projects", "update") ? (
                <ProjectNameCard />
              ) : (
                <Text size="xl" fw="bold">
                  {project?.name}
                </Text>
              )}

              <AnalyticsCard
                title={<Title order={4}>Monthly Project Usage</Title>}
                description={null}
              >
                <Box h="280px">
                  <ChartComponent
                    dataKey="runs"
                    startDate={startDate}
                    endDate={new Date()}
                    granularity="daily"
                    isCustom={false}
                    checks={["AND"]}
                    color="blue"
                    aggregationMethod="sum"
                  />
                </Box>
              </AnalyticsCard>

              {user.role !== "viewer" && <Keys />}

              <SettingsCard
                title={<>LLM Providers Configuration</>}
                align="start"
              >
                <Button
                  color="blue"
                  variant="default"
                  component={Link}
                  href={`/settings/providers`}
                  leftSection={<IconPencil size={16} />}
                >
                  Configure
                </Button>
              </SettingsCard>

              <SmartDataRule />

              {user && ["admin", "owner"].includes(user.role) && (
                <SettingsCard title="Data Retention Policy" align="start">
                  <Text>
                    Define a retention period for this Project data. The data
                    will be automatically deleted after the defined time.
                  </Text>
                  <Select
                    defaultValue="Unlimited"
                    value={String(dataRetentionDays)}
                    onChange={setDataRetentionDays}
                    data={[
                      { label: "Unlimited", value: "unlimited" },
                      { label: "1 year", value: "365" },
                      { label: "180 days", value: "180" },
                      { label: "90 days", value: "90" },
                      { label: "60 days", value: "60" },
                      { label: "30 days", value: "30" },
                    ]}
                  />

                  <Group w="100%" justify="end">
                    <Button
                      onClick={() => {
                        if (dataRetentionDays !== "unlimited") {
                          // eslint-disable-next-line no-alert
                          confirm(
                            `If you confirm, all data older than ${dataRetentionDays} days will be deleted permanently.`,
                          );
                          updateDataRetention(dataRetentionDays);
                        } else if (dataRetentionDays === "unlimited") {
                          updateDataRetention("unlimited");
                        }
                        showNotification({
                          title: "Data retention policy updated",
                          message: `Data retention policy updated to ${dataRetentionDays} days`,
                          icon: <IconCheck />,
                          color: "green",
                        });
                      }}
                    >
                      Save
                    </Button>
                  </Group>
                </SettingsCard>
              )}

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
                        Are you sure you want to delete this project? This
                        action is irreversible and it will delete all associated
                        data.
                      </Text>
                      <Group align="start">
                        <Button
                          color="red"
                          w={80}
                          data-testid="delete-project-popover-button"
                          loading={dropLoading}
                          onClick={async () => {
                            const dropped = await drop();
                            if (dropped) {
                              setProjectId(null);
                              Router.push("/");
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

              {config.IS_SELF_HOSTED && (frontendVersion || backendVersion) && (
                <Group justify="flex-end">
                  {frontendVersion && (
                    <Text c="dimmed" size="sm">
                      Frontend: {frontendVersion}
                    </Text>
                  )}
                  {backendVersion && (
                    <Text c="dimmed" size="sm">
                      Backend: {backendVersion}
                    </Text>
                  )}
                </Group>
              )}
            </Stack>
          </Container>
        </Tabs.Panel>

        {/* ----------------------------- ORG TAB */}
        <Tabs.Panel value="org" pt="md">
          <Container px="0">
            <Stack gap="xl">
              <SettingsCard title={<>Cost Mapping</>} align="start">
                <Stack gap="md" w="100%">
                  <Group justify="apart">
                    <Group>
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
                      <Button
                        color="blue"
                        variant="primary"
                        leftSection={<IconCoin size={16} />}
                        loading={refreshStarting}
                        disabled={
                          refreshLoading ||
                          (refreshJob &&
                            ["pending", "running"].includes(refreshJob.status))
                        }
                        onClick={openRefreshCostModal}
                      >
                        {refreshJob &&
                        ["pending", "running"].includes(refreshJob.status)
                          ? "Refreshing costs..."
                          : "Refresh costs"}
                      </Button>
                    </Group>
                  </Group>

                  {refreshJob && (
                    <Stack gap="xs" w="100%">
                      {["pending", "running"].includes(refreshJob.status) && (
                        <>
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                              Refreshing costs
                            </Text>
                            <Text size="sm" c="dimmed">
                              {(refreshJob.progress ?? 0).toFixed(2)}%
                            </Text>
                          </Group>
                          <Progress
                            value={refreshJob.progress ?? 0}
                            size="md"
                            radius="sm"
                          />
                        </>
                      )}

                      {refreshJob.status === "done" && refreshJob.endedAt && (
                        <Alert
                          icon={<IconCheck size={16} />}
                          title={`Refresh completed ${dayjs(refreshJob.endedAt).fromNow()}`}
                          color="green"
                          variant="light"
                        >
                          All LLM run costs have been successfully recalculated
                          using the latest pricing rules.
                        </Alert>
                      )}

                      {refreshJob.status === "failed" && (
                        <Alert
                          icon={<IconRefreshAlert size={16} />}
                          title="Refresh Failed"
                          color="red"
                          variant="light"
                        >
                          {refreshJob.error ||
                            "An error occurred while refreshing costs. Please try again."}
                        </Alert>
                      )}
                    </Stack>
                  )}
                </Stack>
              </SettingsCard>

              <DataWarehouseCard />
            </Stack>
          </Container>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
