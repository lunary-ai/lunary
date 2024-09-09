import LineChart from "@/components/analytics/LineChart";
import CopyText from "@/components/blocks/CopyText";

import {
  Alert,
  Button,
  Container,
  Flex,
  Group,
  Loader,
  Popover,
  Stack,
  Switch,
  Tabs,
  Text,
} from "@mantine/core";
import { NextSeo } from "next-seo";
import Router, { useRouter } from "next/router";

import RenamableField from "@/components/blocks/RenamableField";
import { SettingsCard } from "@/components/blocks/SettingsCard";
import CheckPicker from "@/components/checks/Picker";
import config from "@/utils/config";
import {
  useOrg,
  useProject,
  useProjectRules,
  useUser,
} from "@/utils/dataHooks";
import errorHandler from "@/utils/errors";
import { fetcher } from "@/utils/fetcher";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabaseShare,
  IconFilter,
  IconIdBadge,
  IconPencil,
  IconRefreshAlert,
  IconShield,
  IconShieldCog,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckLogic, hasAccess } from "shared";
import useSWR from "swr";

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

  const [filters, setChecks] = useState<CheckLogic>(["AND"]);

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

      <Tabs variant="outline" defaultValue="filtering" w={"100%"}>
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
              minimal={true}
              showAndOr={true}
              value={filteringRule?.filters}
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
                  addRule({ type: "filtering", filters });
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
              Masking requires a PII Real-time Evaluator enabled.
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
                } else {
                  deleteRule(maskingRule.id);
                }
              }}
            />

            {/* // <Flex justify="flex-end">
            //   <Button
            //     loading={addRulesLoading}
            //     style={{ float: "right" }}
            //     onClick={async () => {
            //       addRule({
            //         type: "masking",
            //         filters: ["AND"],
            //         enabled: true,
            //       })
            //     }}
            //     variant="full"
            //   >
            //     Save
            //   </Button>
            // </Flex> */}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </SettingsCard>
  );
}

export default function AppAnalytics() {
  const { org } = useOrg();
  const { update, project, setProjectId, drop, dropLoading } = useProject();
  const router = useRouter();

  const { user } = useUser();

  // TODO: better route for project usage
  const { data: projectUsage, isLoading: projectUsageLoading } = useSWR(
    project?.id && org && `/orgs/${org.id}/usage?projectId=${project?.id}`,
  );

  useEffect(() => {
    if (!hasAccess(user?.role, "settings", "read")) {
      router.push("/analytics");
    }
  }, [user.role]);

  if (projectUsageLoading || !user.role) {
    return <Loader />;
  }

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

        <SmartDataRule />

        <SettingsCard
          title={<>Guardrails 🔒</>}
          align="start"
          paywallConfig={{
            Icon: IconShieldCog,
            feature: "Guardrails",
            p: 12,
            plan: "enterprise",
            list: [
              "Ban certain topics",
              "Intercept prompt injections",
              "Ensure no PII is leaked",
            ],
            enabled: true,
          }}
        >
          <Button>Open Guardrails settings</Button>
        </SettingsCard>

        <SettingsCard
          title="Data Warehouse Connection"
          align="start"
          paywallConfig={{
            Icon: IconDatabaseShare,
            feature: "Data Warehouse",
            p: 12,
            plan: "enterprise",
            list: ["Sync your data with a data warehouse provider"],
            enabled: config.IS_SELF_HOSTED
              ? org.license.dataWarehouseEnabled
              : org.dataWarehouseEnabled,
          }}
        ></SettingsCard>

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
      </Stack>
    </Container>
  );
}
