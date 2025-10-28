import DataTable from "@/components/blocks/DataTable";

import {
  ActionIcon,
  Box,
  Button,
  Card,
  Code,
  Drawer,
  Flex,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { costColumn, timeColumn } from "@/utils/datatable";

import AppUserAvatar from "@/components/blocks/AppUserAvatar";
import CopyText from "@/components/blocks/CopyText";
import SearchBar from "@/components/blocks/SearchBar";
import Empty from "@/components/layout/Empty";
import CheckPicker from "@/components/checks/Picker";
import { useProjectSWR } from "@/utils/dataHooks";
import { useExternalUsers } from "@/utils/dataHooks/external-users";
import { fetcher } from "@/utils/fetcher";
import { formatAppUser } from "@/utils/format";
import { useDebouncedValue, useLocalStorage } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconActivity,
  IconChartAreaLine,
  IconCheck,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { NextSeo } from "@/utils/seo";
import Router, { useRouter } from "next/router";
import { Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import analytics from "../../utils/analytics";

import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import Link from "next/link";
import { createParser, parseAsString, useQueryState } from "nuqs";
import {
  Chart,
  DEFAULT_CHARTS,
  LogicNode,
  deserializeLogic,
  serializeLogic,
  getDefaultDateRange,
} from "shared";

const columns = [
  {
    header: "User",
    size: 200,
    minSize: 100,
    id: "props",
    cell: (props) => {
      const user = props.row.original;

      return (
        <Group gap={8} wrap="nowrap">
          <AppUserAvatar size={30} user={user} />
          <Text
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            size="sm"
            fw={500}
          >
            {formatAppUser(user)}
          </Text>
        </Group>
      );
    },
  },
  timeColumn("createdAt", "First Seen"),
  timeColumn("lastSeen", "Last Seen"),
  costColumn(),
];

const DEFAULT_FILTERS: LogicNode = ["AND"];

const filtersParser = createParser({
  parse: deserializeLogic,
  serialize: serializeLogic,
});

function SelectedUser({ id, onClose }) {
  const { data: user, isLoading: userLoading } = useProjectSWR(
    id && `/external-users/${id}`,
  );
  const { name, email, ...extraProps } = user?.props || ({} as any);
  const extraPropEntries = Object.entries(extraProps);

  const renderPropValue = (value: unknown): ReactNode => {
    if (value === null || typeof value === "undefined") {
      return (
        <Text size="sm" c="dimmed">
          —
        </Text>
      );
    }

    if (typeof value === "string") {
      return (
        <Text
          size="sm"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {value}
        </Text>
      );
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return <Text size="sm">{String(value)}</Text>;
    }

    return (
      <Code
        fz="xs"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {JSON.stringify(value, null, 2)}
      </Code>
    );
  };

  const toChart = (chartDef: (typeof DEFAULT_CHARTS)[string]): Chart => ({
    id: chartDef.id,
    createdAt: "",
    updatedAt: "",
    projectId: "",
    dashboardId: null,
    name: chartDef.name,
    description: chartDef.description ?? null,
    type: chartDef.type,
    dataKey: chartDef.dataKey,
    aggregationMethod: chartDef.aggregationMethod ?? null,
    primaryDimension: chartDef.splitBy ?? null,
    secondaryDimension: null,
    isCustom: false,
    color: chartDef.color ?? null,
  });

  const runTypesChart = toChart(DEFAULT_CHARTS["run-types"]);
  const tokensChart = toChart(DEFAULT_CHARTS["tokens"]);
  const topModelsChart = toChart(DEFAULT_CHARTS["models/top"]);

  const baseUserChecks: LogicNode | undefined = id
    ? (["AND", { id: "users", params: { users: [id] } }] as LogicNode)
    : undefined;

  const chatUserChecks: LogicNode | undefined = id
    ? ([
        "AND",
        { id: "users", params: { users: [id] } },
        { id: "type", params: { type: "chat" } },
      ] as LogicNode)
    : undefined;

  const userPropEntries: Array<[string, ReactNode]> = [
    [
      "ID",
      <CopyText key="user-id" value={user?.externalId ?? ""} />,
    ],
  ];

  if (user?.email) {
    userPropEntries.push([
      "Email",
      <CopyText key="user-email" value={user.email} />,
    ]);
  }

  if (user?.lastSeen) {
    userPropEntries.push([
      "Last seen",
      <Text key="user-last-seen" size="sm" c="dimmed">
        {new Date(user.lastSeen).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        })}
      </Text>,
    ]);
  }

  extraPropEntries.forEach(([key, value]) => {
    userPropEntries.push([key, renderPropValue(value)]);
  });

  function confirmDelete() {
    modals.openConfirmModal({
      title: "Please confirm your action",
      // @ts-ignore
      confirmProps: { color: "red", "data-testid": "confirm" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this user data? This action cannot be
          undone and all the user data and logs will be lost forever.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onConfirm: async () => {
        const notifId = notifications.show({
          loading: true,
          title: "Deleting user data",
          message: "Your user data is being deleted",
          autoClose: false,
          withCloseButton: false,
        });

        await fetcher.delete(`/external-users/${id}`);

        notifications.update({
          id: notifId,
          color: "teal",
          title: "Data removed",
          message: "User data and logs have been successfully removed.",
          icon: <IconCheck size={18} />,
          loading: false,
          autoClose: 2000,
        });

        Router.push("/users");
      },
    });
  }

  const [startDate, endDate] = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return [start, end];
  }, []);

  const [granularity] = useState("daily");

  return (
    <Drawer
      opened={!!id}
      size="xl"
      padding="lg"
      keepMounted
      withCloseButton={false}
      position="right"
      title={userLoading ? <Loader size="sm" /> : null}
      onClose={() => onClose()}
    >
      {userLoading ? (
        <Loader />
      ) : (
        <>
          <Stack justify="space-between" align="start">
            <Group justify="space-between" w="100%">
              <Group>
                <AppUserAvatar user={user} />
                <Title order={4}>{formatAppUser(user)}</Title>
              </Group>
              <Group>
                <Button
                  leftSection={<IconActivity size={16} />}
                  size="xs"
                  component={Link}
                  href={`/logs?type=thread&filters=users=${id}`}
                  variant="outline"
                >
                  Activity
                </Button>
                {/* <Button
                  leftSection={<IconChartAreaLine size={16} />}
                  component={Link}
                  color="grape"
                  size="xs"
                  href={`/dashboards?filters=users=${id}`}
                  variant="outline"
                >
                  Analytics
                </Button> */}
                <ActionIcon
                  variant="transparent"
                  color="gray"
                  onClick={() => onClose()}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Group>
            <Stack gap="md" w="100%">
              <Box
                component="dl"
                w="100%"
                style={{
                  width: "100%",
                  alignSelf: "stretch",
                  display: "grid",
                  gridTemplateColumns: "max-content 1fr",
                  rowGap: 8,
                  columnGap: 24,
                }}
              >
                {userPropEntries.map(([label, value], index) => (
                  <Fragment key={`${label}-${index}`}>
                    <Text component="dt" size="sm" fw={500} c="dimmed">
                      {`${label}:`}
                    </Text>
                    <Box
                      component="dd"
                      style={{
                        margin: 0,
                        textAlign: "right",
                        minWidth: 0,
                      }}
                    >
                      {value}
                    </Box>
                  </Fragment>
                ))}
              </Box>
            </Stack>

            {chatUserChecks && (
              <Box w={"100%"}>
                <AnalyticsCard
                  title="Chat Messages"
                  description="Number of chat messages sent by the user"
                >
                  <ChartComponent
                    id={runTypesChart.id}
                    chart={runTypesChart}
                    dataKey={runTypesChart.dataKey}
                    startDate={startDate}
                    endDate={endDate}
                    granularity={"daily"}
                    checks={chatUserChecks!}
                    color={runTypesChart.color}
                    primaryDimension={runTypesChart.primaryDimension}
                    aggregationMethod={runTypesChart.aggregationMethod}
                    isCustom={false}
                  />
                </AnalyticsCard>
              </Box>
            )}
            {baseUserChecks && (
              <Box w={"100%"}>
                <AnalyticsCard
                  title="Tokens"
                  description="Number of tokens generated by the user's LLM calls"
                >
                  <ChartComponent
                    id={tokensChart.id}
                    chart={tokensChart}
                    dataKey={tokensChart.dataKey}
                    startDate={startDate}
                    endDate={endDate}
                    granularity={"daily"}
                    checks={baseUserChecks!}
                    color={tokensChart.color}
                    primaryDimension={tokensChart.primaryDimension}
                    aggregationMethod={tokensChart.aggregationMethod}
                    isCustom={false}
                  />
                </AnalyticsCard>
              </Box>
            )}

            {baseUserChecks && (
              <Box w={"100%"}>
                <AnalyticsCard
                  title="Top Models"
                  description="The top models used by the user"
                >
                  <ChartComponent
                    id={topModelsChart.id}
                    chart={topModelsChart}
                    dataKey={topModelsChart.dataKey}
                    startDate={startDate}
                    endDate={endDate}
                    granularity={"daily"}
                    checks={baseUserChecks!}
                    color={topModelsChart.color}
                    primaryDimension={topModelsChart.primaryDimension}
                    aggregationMethod={topModelsChart.aggregationMethod}
                    isCustom={false}
                  />
                </AnalyticsCard>
              </Box>
            )}
            <Button
              leftSection={<IconTrash size={14} />}
              size="xs"
              color="red"
              variant="light"
              onClick={() => {
                confirmDelete();
              }}
            >
              Delete User Data
            </Button>
          </Stack>
        </>
      )}
    </Drawer>
  );
}

export default function Users() {
  const [search, setSearch] = useQueryState<string | undefined>(
    "search",
    parseAsString,
  );

  const [sortField] = useQueryState<string | undefined>(
    "sortField",
    parseAsString,
  );

  const [sortDirection] = useQueryState<string | undefined>(
    "sortDirection",
    parseAsString,
  );
  const [checks, setChecks] = useQueryState(
    "filters",
    filtersParser.withDefault(DEFAULT_FILTERS).withOptions({ clearOnDefault: true }),
  );

  const serializedChecks = useMemo(
    () =>
      checks && checks.length > 1 ? serializeLogic(checks) : undefined,
    [checks],
  );

  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [columnVisibility, setColumnVisibility] = useLocalStorage({
    key: "users-columns",
    defaultValue: {},
  });

  const { users, loading, validating, loadMore } = useExternalUsers({
    search: debouncedSearch,
    checks: serializedChecks,
  });

  const router = useRouter();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = router.query.id as string;

    setSelectedUserId(id);
  }, [router.query.id]);

  return (
    <Empty
      enable={!loading && users && users.length === 0 && !debouncedSearch}
      Icon={IconUsers}
      title="Find out who your users are"
      description="Users you identify from the SDKs will appear here."
      features={["See who costs you the most", "View actions taken by users"]}
    >
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Users" />

        <Stack gap="sm">
          <Card withBorder p={2} px="sm">
            <SearchBar
              query={search ?? ""}
              setQuery={(value) => setSearch(value || undefined)}
              ml={-8}
              variant="unstyled"
              size="sm"
            />
          </Card>
          <CheckPicker
            minimal
            value={checks ?? DEFAULT_FILTERS}
            onChange={(next) => setChecks(next as LogicNode)}
            restrictTo={(check) => check.id === "user-props"}
            buttonText="Add Filter"
          />
        </Stack>

        <DataTable
          type="users"
          availableColumns={columns}
          visibleColumns={columnVisibility}
          setVisibleColumns={setColumnVisibility}
          data={users}
          onRowClicked={(row) => {
            analytics.trackOnce("OpenUser");

            setSelectedUserId(row.id);
            const nextQuery: Record<string, string | undefined> = {
              sortField: sortField || undefined,
              sortDirection: sortDirection || undefined,
              search: search || undefined,
            };

            if (serializedChecks) {
              nextQuery.filters = serializedChecks;
            }

            router.replace({
              pathname: `/users/${row.id}`,
              query: nextQuery,
            });
          }}
          loading={loading || validating}
          loadMore={loadMore}
          defaultSortBy="cost"
        />
        <SelectedUser
          id={selectedUserId}
          onClose={() => {
            setSelectedUserId(null);
            const nextQuery: Record<string, string | undefined> = {
              sortField: sortField || undefined,
              sortDirection: sortDirection || undefined,
              search: search || undefined,
            };

            if (serializedChecks) {
              nextQuery.filters = serializedChecks;
            }

            router.replace({
              pathname: "/users",
              query: nextQuery,
            });
          }}
        />
      </Stack>
    </Empty>
  );
}
