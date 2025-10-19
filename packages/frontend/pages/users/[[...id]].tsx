import DataTable from "@/components/blocks/DataTable";

import {
  ActionIcon,
  Box,
  Button,
  Card,
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
import SmartViewer from "@/components/SmartViewer";
import { useProjectSWR } from "@/utils/dataHooks";
import {
  useAnalyticsChartData,
  useTopModels,
} from "@/utils/dataHooks/analytics";
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
import { useEffect, useState } from "react";
import analytics from "../../utils/analytics";

import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { deserializeLogic, getDefaultDateRange } from "shared";

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

function SelectedUser({ id, onClose }) {
  const { data: user, isLoading: userLoading } = useProjectSWR(
    id && `/external-users/${id}`,
  );
  const { data: topModels, isLoading: topModelsLoading } = useTopModels(
    id && {
      userId: id,
    },
  );
  const { name, email, ...extraProps } = user?.props || ({} as any);

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

  const [startDate, endDate] = getDefaultDateRange(90);

  const [granularity] = useState("daily");

  const { data: tokensData, isLoading: tokensDataLoading } =
    useAnalyticsChartData(
      id && "tokens",
      startDate,
      endDate,
      granularity,
      deserializeLogic(`users=${id}`),
    );

  const commonChartData: {
    startDate: Date;
    endDate: Date;
    granularity: "daily";
  } = {
    startDate,
    endDate,
    granularity: "daily",
  };

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
                  href={`/logs?filters=users=${id}`}
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
            <Stack gap="md">
              <Group gap={3}>
                <Text>ID:</Text>
                <CopyText value={user?.externalId} />
              </Group>
              {user?.email && (
                <Group gap={3}>
                  <Text>Email:</Text>
                  <CopyText value={user?.email} />
                </Group>
              )}
              {user?.lastSeen && (
                <Group>
                  <Text c="dimmed">{`Last seen:  ${new Date(
                    user.lastSeen,
                  ).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  })}`}</Text>
                </Group>
              )}

              {Object.keys(extraProps).length > 0 && (
                <SmartViewer data={extraProps} />
              )}
            </Stack>

            <Box w={"100%"}>
              <AnalyticsCard
                title="Chat Messages"
                description="Number of chat messages sent by the user"
              >
                <ChartComponent
                  dataKey="run-types"
                  startDate={startDate}
                  endDate={endDate}
                  granularity={"daily"}
                  checks={[
                    "AND",
                    { id: "users", params: { users: id } },
                    { id: "type", params: { type: "chat" } },
                  ]}
                  aggregationMethod="sum"
                  isCustom={false}
                />
              </AnalyticsCard>
            </Box>
            <Box w={"100%"}>
              <AnalyticsCard
                title="Tokens"
                description="Number of tokens generated by the user's LLM calls"
              >
                <ChartComponent
                  dataKey="tokens"
                  startDate={startDate}
                  endDate={endDate}
                  granularity={"daily"}
                  checks={["AND", { id: "users", params: { users: id } }]}
                  aggregationMethod="sum"
                  isCustom={false}
                />
              </AnalyticsCard>
            </Box>

            <Box w={"100%"}>
              <AnalyticsCard
                title="Top Models"
                description="The top models used by the user"
              >
                <ChartComponent
                  dataKey="models/top"
                  startDate={startDate}
                  endDate={endDate}
                  granularity={"daily"}
                  checks={["AND", { id: "users", params: { users: id } }]}
                  isCustom={false}
                />
              </AnalyticsCard>
            </Box>
            <Button
              leftSection={<IconTrash size={14} />}
              size="xs"
              color="red"
              variant="light"
              onClick={() => {
                confirmDelete();
              }}
            >
              Remove Data
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

  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [columnVisibility, setColumnVisibility] = useLocalStorage({
    key: "users-columns",
    defaultValue: {},
  });

  const { users, loading, validating, loadMore } = useExternalUsers({
    search: debouncedSearch,
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

        <Flex justify="space-between">
          <Card withBorder p={2} px="sm" w={"100%"}>
            <SearchBar
              query={search ?? ""}
              setQuery={(value) => setSearch(value || undefined)}
              ml={-8}
              variant="unstyled"
              size="sm"
            />
          </Card>
        </Flex>

        <DataTable
          type="users"
          availableColumns={columns}
          visibleColumns={columnVisibility}
          setVisibleColumns={setColumnVisibility}
          data={users}
          onRowClicked={(row) => {
            analytics.trackOnce("OpenUser");

            setSelectedUserId(row.id);

            router.replace({
              pathname: `/users/${row.id}`,
              query: { sortField, sortDirection },
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
            router.replace({
              pathname: "/users",
              query: { sortField, sortDirection },
            });
          }}
        />
      </Stack>
    </Empty>
  );
}
