import CopyText from "@/components/blocks/CopyText";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Popover,
  Progress,
  SegmentedControl,
  Stack,
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
import DataWarehouseCard from "@/components/settings/data-warehouse";
import { SAMLConfig } from "@/components/settings/saml";
import config from "@/utils/config";
import {
  useLunaryVersion,
  useOrg,
  useProject,
  useUser,
} from "@/utils/dataHooks";
import { useRefreshCostsJob } from "@/utils/dataHooks/jobs";
import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconActivity,
  IconCheck,
  IconCoin,
  IconPencil,
  IconRefreshAlert,
  IconShieldCog,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { hasAccess } from "shared";
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

function OrgNameCard() {
  const { org, updateOrg, mutate } = useOrg();
  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);

  // useEffect(() => {
  //   if (org) setName(org.name);
  // }, [org]);

  const dirty = name.trim() !== (org?.name ?? "");

  async function save() {
    if (!dirty) return;
    setSaving(true);
    await updateOrg({ name: name.trim() });
    await mutate();
    setSaving(false);
  }

  return (
    <SettingsCard title="Organization Name">
      <Stack gap="sm">
        <Text c="dimmed">
          This is your organization’s visible name within Lunary.
        </Text>
        <TextInput
          data-testid="org-name-input"
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

function DatasetExperienceCard() {
  const { org, updateOrg, mutate } = useOrg();
  const [value, setValue] = useState("new");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setValue(org.useLegacyDatasets ? "legacy" : "new");
    }
  }, [org?.useLegacyDatasets]);

  if (!org) {
    return null;
  }

  async function handleChange(next: string) {
    if (saving) return;
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      await updateOrg({ useLegacyDatasets: next === "legacy" });
      await mutate();
    } catch (error) {
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Dataset Experience">
      <Stack gap="sm">
        <Text c="dimmed">
          Choose whether your organization uses the modern datasets editor or
          the legacy interface.
        </Text>
        <SegmentedControl
          value={value}
          onChange={handleChange}
          disabled={saving}
          data={[
            { label: "New editor", value: "new" },
            { label: "Legacy editor", value: "legacy" },
          ]}
        />
      </Stack>
    </SettingsCard>
  );
}

function OrgApiKeyCard() {
  const { org, mutate, regenerateOrgKey } = useOrg();
  const { user } = useUser();
  const [regenerating, setRegenerating] = useState(false);

  if (!org || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  async function handleRegenerate() {
    if (regenerating) return;
    setRegenerating(true);
    const res = await errorHandler(regenerateOrgKey());

    if (res) {
      notifications.show({
        title: "Key regenerated",
        message: "The organization API key has been rotated.",
        icon: <IconCheck />,
        color: "green",
      });
      await mutate();
    }

    setRegenerating(false);
  }

  return (
    <SettingsCard title="Organization API Key">
      <Stack gap="sm">
        <Text c="dimmed">
          Authenticate organization-level integrations with this secret key.
          Keep it private and rotate it if you suspect exposure.
        </Text>
        <Alert
          variant="light"
          color="blue"
          styles={{ label: { width: "100%" } }}
          title={
            <Group justify="space-between" w="100%">
              <Group>
                <Text fw={500}>Org API Key:</Text>
                <CopyText
                  c="blue.8"
                  value={org.orgApiKey ?? ""}
                  data-testid="org-api-key"
                  isSecret
                />
              </Group>
              <Button
                ml="auto"
                size="xs"
                color="blue"
                loading={regenerating}
                leftSection={<IconRefreshAlert size={16} />}
                onClick={() =>
                  modals.openConfirmModal({
                    title: "Rotate organization API key?",
                    confirmProps: {
                      color: "blue",
                      "data-testid": "confirm-org-key-rotation",
                    },
                    children: (
                      <Text size="sm">
                        Regenerating the org API key immediately revokes the
                        current key. Update your integrations afterwards.
                      </Text>
                    ),
                    labels: { confirm: "Confirm", cancel: "Cancel" },
                    onConfirm: handleRegenerate,
                  })
                }
              >
                Rotate
              </Button>
            </Group>
          }
        >
          <Text>
            Only owners and admins can view or rotate the organization API key.
            It grants access to some organization-level endpoints.
          </Text>
        </Alert>
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

        <Tabs.Panel value="org" pt="md">
          <Container px="0">
            <Stack gap="xl">
              <OrgNameCard />
              <DatasetExperienceCard />
              <OrgApiKeyCard />
              <SettingsCard
                title={
                  <Group gap={8} align="center">
                    <Text fw={500}>Organization Dashboard</Text>
                    <Badge size="xs" color="yellow" variant="light">
                      Beta
                    </Badge>
                  </Group>
                }
                align="start"
              >
                <Text mb="md">Explore organization-wide analytics.</Text>
                <Button
                  component={Link}
                  href="/org/dashboard"
                  variant="default"
                  leftSection={<IconActivity size={16} />}
                >
                  Open Organization Dashboard
                </Button>
              </SettingsCard>
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

                      {refreshJob.status === "done" &&
                        refreshJob.endedAt &&
                        dayjs().diff(dayjs(refreshJob.endedAt), "day") < 1 && (
                          <Alert
                            icon={<IconCheck size={16} />}
                            title={`Refresh completed ${dayjs(refreshJob.endedAt).fromNow()}`}
                            color="green"
                            variant="light"
                          >
                            All LLM run costs have been successfully
                            recalculated using the latest pricing rules.
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
              {["admin", "owner"].includes(user.role) && (
                <SettingsCard title={<>Audit Logs</>} align="start">
                  <Text mb="md">
                    View a history of user actions and activities in your
                    organization.
                  </Text>
                  <Button
                    color="blue"
                    variant="default"
                    component={Link}
                    href={`/team/audit-logs`}
                    leftSection={<IconShieldCog size={16} />}
                  >
                    View Logs
                  </Button>
                </SettingsCard>
              )}
              {["admin", "owner"].includes(user.role) && <SAMLConfig />}
            </Stack>
          </Container>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
