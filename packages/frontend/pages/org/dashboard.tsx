import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import TopModels from "@/components/analytics/Charts/TopModels";
import DateRangeGranularityPicker, {
  Granularity,
  determineGranularity,
  getDateRangeFromPreset,
} from "@/components/analytics/DateRangeGranularityPicker";
import { useOrg } from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";
import {
  Anchor,
  Box,
  Center,
  Flex,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

type TopModel = {
  name: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  projectName?: string | null;
};

function buildQuery(range: [Date, Date], timeZone: string) {
  const params = new URLSearchParams();
  params.set("startDate", range[0].toISOString());
  params.set("endDate", range[1].toISOString());
  if (timeZone) {
    params.set("timeZone", timeZone);
  }
  return params.toString();
}

export default function OrgDashboardPage() {
  const { org, loading: orgLoading } = useOrg();
  const [timeZone, setTimeZone] = useState("UTC");
  const defaultRange = useMemo(() => getDateRangeFromPreset("30 Days"), []);
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => [
    new Date(defaultRange[0]),
    new Date(defaultRange[1]),
  ]);
  const [granularity, setGranularity] = useState<Granularity>(() =>
    determineGranularity(defaultRange),
  );

  useEffect(() => {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      const resolved = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolved) {
        setTimeZone(resolved);
      }
    }
  }, []);

  const queryString = useMemo(
    () => buildQuery(dateRange, timeZone),
    [dateRange, timeZone],
  );

  const requestPath = useMemo(() => {
    return `/analytics/org/models/top?${queryString}`;
  }, [queryString]);

  const {
    data: topModels,
    isLoading: topModelsLoading,
    error: topModelsError,
  } = useSWR<TopModel[]>(
    org?.orgApiKey ? [requestPath, org.orgApiKey] : null,
    ([path, apiKey]) =>
      fetcher.getWithHeaders(
        path,
        { Authorization: `Bearer ${apiKey}` },
        false,
      ),
  );

  const isLoading = orgLoading || topModelsLoading;
  const hasOrgKey = Boolean(org?.orgApiKey);

  return (
    <Stack gap="xl" p="xl">
      <Box>
        <Title order={2}>Org Dashboard</Title>
        <Text c="dimmed" size="sm">
          Organization-wide analytics powered by your org-level API key.
        </Text>
      </Box>

      {!hasOrgKey ? (
        <AnalyticsCard title="Org API Key Required">
          <Center mih={160} px="md">
            <Stack gap="xs" align="center">
              <Text size="sm" ta="center">
                You need an org-level API key to load organization analytics.
              </Text>
              <Text size="sm" ta="center">
                Generate one from the <Anchor component={Link} href="/settings">organization settings</Anchor> page.
              </Text>
            </Stack>
          </Center>
        </AnalyticsCard>
      ) : (
        <AnalyticsCard
          title="Top Models"
          description="Most used models across every project in your organization"
        >
          <Stack gap="md" py="md">
            <Box px="md">
              <DateRangeGranularityPicker
                dateRange={dateRange}
                setDateRange={setDateRange}
                granularity={granularity}
                setGranularity={setGranularity}
                disableWeekly
              />
            </Box>
            <Box>
              {isLoading ? (
                <Flex align="center" justify="center" h={200}>
                  <Loader size="sm" />
                </Flex>
              ) : topModelsError ? (
                <Center mih={160} px="md">
                  <Text size="sm" c="red">
                    Failed to load org models. Please try again.
                  </Text>
                </Center>
              ) : !topModels || topModels.length === 0 ? (
                <Center mih={160} px="md">
                  <Text size="sm" c="dimmed">
                    No model activity for the selected date range.
                  </Text>
                </Center>
              ) : (
                <TopModels
                  data={topModels}
                  showProjectColumn
                  showTokenBreakdown
                  enableLinks={false}
                  maxRows={20}
                />
              )}
            </Box>
          </Stack>
        </AnalyticsCard>
      )}
    </Stack>
  );
}
