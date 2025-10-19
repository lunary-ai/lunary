import { SettingsCard } from "@/components/blocks/SettingsCard";
import AiFilterSkeleton from "@/components/checks/ai-filter-skeleton";
import CheckPicker from "@/components/checks/Picker";
import { DATA_RULES_AI_FILTER_EXAMPLES } from "@/utils/ai-filters";
import { useAiFilter } from "@/utils/useAiFilter";
import config from "@/utils/config";
import {
  useOrg,
  useProject,
  useProjectRules,
  useProjects,
  useUser,
} from "@/utils/dataHooks";
import {
  Stack,
  Flex,
  Button,
  Alert,
  Switch,
  Text,
  Title,
  Box,
  Loader,
  Container,
  Select,
  Group,
  Skeleton,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCheck, IconIdBadge } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { CheckLogic } from "shared";

function SmartDataRule() {
  const { org } = useOrg();
  const { addRule, addRulesLoading, deleteRule, maskingRule, filteringRule } =
    useProjectRules();

  const { user } = useUser();
  const { project, updateDataRetention } = useProject();
  const [dataRetentionDays, setDataRetentionDays] =
    useState<string>("unlimited");

  const [checks, setChecks] = useState<CheckLogic>(["AND"]);
  const { applyAiFilter, isAiFilterLoading } = useAiFilter({
    projectId: project?.id,
  });
  const aiLoading = isAiFilterLoading();

  useEffect(() => {
    if (filteringRule?.filters) {
      setChecks(filteringRule.filters);
    }
  }, [filteringRule]);

  async function handleAiFilterSubmit(request: string) {
    const trimmed = request.trim();
    if (!trimmed) {
      return;
    }

    await applyAiFilter(trimmed, {
      notifyOnError: false,
      onSuccess: ({ logic }) => {
        setChecks(logic);
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't convert your request. Try rephrasing it.";
        showNotification({
          title: "AI filter failed",
          message,
          color: "red",
        });
      },
    }).catch(() => {});
  }

  const smartDataFilterEnabled = config.IS_SELF_HOSTED
    ? org.license.dataFilteringEnabled
    : org.dataFilteringEnabled;

  return (
    <Container>
      <Title>Data Rules</Title>
      <Text mb="md">Filter out or hide sensitive data from your project.</Text>

      <Stack>
        <SettingsCard title="Ingestion Filtering">
          <Stack>
            <Text>
              Prevent data from being ingested into your project. Click the
              button below to add conditions and filter out data based on
              metadata, users, tags, tools, or models. Input and output data
              from runs matching will be redacted.
            </Text>

            {aiLoading ? (
              <AiFilterSkeleton />
            ) : (
              <CheckPicker
                minimal
                showAndOr
                value={checks}
                onChange={setChecks}
                buttonText="Add filter"
                restrictTo={(f) =>
                  ["metadata", "users", "tags", "tools", "models"].includes(
                    f.id,
                  )
                }
                aiFilter={{
                  onSubmit: handleAiFilterSubmit,
                  loading: aiLoading,
                  examples: DATA_RULES_AI_FILTER_EXAMPLES,
                }}
              />
            )}

            <Flex justify="flex-end">
              <Button
                loading={addRulesLoading}
                onClick={() => addRule({ type: "filtering", filters: checks })}
                variant="full"
              >
                Save
              </Button>
            </Flex>
          </Stack>
        </SettingsCard>

        <SettingsCard title="PII Masking" mt="md">
          <Stack>
            <Text>
              Masking allows you to hide sensitive data in the dashboard.
            </Text>

            {addRulesLoading && <Loader />}

            <Switch
              size="lg"
              label="Enabled"
              checked={!!maskingRule}
              onChange={(e) => {
                const { checked } = e.currentTarget;

                if (checked) {
                  addRule({ type: "masking" });
                } else if (maskingRule) {
                  deleteRule(maskingRule.id);
                }
              }}
            />
          </Stack>
        </SettingsCard>

        {user && ["admin", "owner"].includes(user.role) && (
          <SettingsCard title="Data Retention Policy" align="start">
            <Text>
              Define a retention period for this Project data. The data will be
              automatically deleted after the defined time.
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
      </Stack>
    </Container>
  );
}

export default function DataRules() {
  return <SmartDataRule />;
}
