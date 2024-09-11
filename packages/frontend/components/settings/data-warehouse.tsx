import { useOrg } from "@/utils/dataHooks";
import { SettingsCard } from "../blocks/SettingsCard";
import { IconDatabaseShare } from "@tabler/icons-react";
import AmazonRedshiftIconSrc from "public/assets/amazon-redshift.svg";
import AzureSynapseAnalyticsIconSrc from "public/assets/azure-synapse-analytics.svg";
import BigQueryIconSrc from "public/assets/bigquery.svg";
import DatabricksIconSrc from "public/assets/databricks.svg";
import SnowflakeIconSrc from "public/assets/snowflake.svg";
import Image from "next/image";
import config from "@/utils/config";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { useRouter } from "next/router";

const PROVIDERS = [
  {
    name: "Amazon Redshift",
    iconSrc: AmazonRedshiftIconSrc,
    disabled: true,
  },
  {
    name: "Azure Synapse Analytics",
    iconSrc: AzureSynapseAnalyticsIconSrc,
    disabled: true,
  },
  {
    name: "BigQuery",
    settingsPath: "bigquery",
    iconSrc: BigQueryIconSrc,
  },
  {
    name: "Databricks",
    iconSrc: DatabricksIconSrc,
    disabled: true,
  },
  {
    name: "Snowflake",
    iconSrc: SnowflakeIconSrc,
    disabled: true,
  },
];

export default function DataWarehouseCard() {
  const { org } = useOrg();
  const router = useRouter();

  return (
    <SettingsCard
      title="Data Warehouse Connections"
      align="start"
      paywallConfig={{
        Icon: IconDatabaseShare,
        feature: "Data Warehouse",
        p: 12,
        plan: "enterprise",
        list: ["Synchronize your data with a data warehouse provider"],
        enabled: config.IS_SELF_HOSTED
          ? org.license.dataWarehouseEnabled
          : org.dataWarehouseEnabled,
      }}
    >
      <Text mb="lg">Synchronize your data with a data warehouse provider</Text>
      <Group gap="xl">
        {PROVIDERS.map(({ name, iconSrc, settingsPath, disabled }) => (
          <Tooltip
            label={
              disabled
                ? `You license does not allow access to ${name} connection`
                : name
            }
          >
            <ActionIcon
              disabled={disabled}
              w="80"
              h="80"
              variant="light"
              onClick={() =>
                router.push(`/settings/data-warehouse/${settingsPath}`)
              }
            >
              <Image src={iconSrc} alt={name} width="40" height="40" />
            </ActionIcon>
          </Tooltip>
        ))}
      </Group>
    </SettingsCard>
  );
}
