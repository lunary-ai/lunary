import { SettingsCard } from "@/components/blocks/SettingsCard";
import CheckPicker from "@/components/checks/Picker";
import config from "@/utils/config";
import { useOrg, useProjectRules } from "@/utils/dataHooks";
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
} from "@mantine/core";
import { IconIdBadge } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { CheckLogic } from "shared";

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
                onClick={() => addRule({ type: "filtering", filters: checks })}
                variant="full"
              >
                Save
              </Button>
            </Flex>
          </Stack>
        </SettingsCard>

        {/* ── PII Masking ─────────────────────────────────────────────────────── */}
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
      </Stack>
    </Container>
  );
}

export default function DataRules() {
  return <SmartDataRule />;
}
