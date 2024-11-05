import { useDashboard, useDashboards } from "@/utils/dataHooks/dashboards";
import {
  ActionIcon,
  Card,
  Group,
  Menu,
  Text,
  Flex,
  Anchor,
  Avatar,
  Grid,
  Stack,
  MenuItem,
  Loader,
} from "@mantine/core";
import {
  IconBrandOpenai,
  IconDotsVertical,
  IconEdit,
  IconLink,
  IconPin,
  IconPinned,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useCharts } from "@/utils/dataHooks/charts";
import { useProjectSWR, useProjectMutation } from "@/utils/dataHooks";
import { useRouter } from "next/router";
import SearchBar from "@/components/blocks/SearchBar";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import Empty from "@/components/layout/Empty";
import { NextSeo } from "next-seo";
import { ConfirmModal } from "@/components/analytics/Modals";
import { DEFAULT_CHARTS, DEFAULT_DASHBOARD, getDefaultDateRange } from "shared";
import { fetcher } from "@/utils/fetcher";
import { useMemo } from "react";

const colors = [
  "cyan",
  "purple",
  "violet",
  "blue",
  "red",
  "teal",
  "yellow",
  "pink",
  "indigo",
  "green",
];

// Used to create default dashboards for existing projects
let insertingDefaultPromise;

function OwnerCard({ ownerId }) {
  const { data: user, isLoading } = useProjectSWR<any>(`/users/${ownerId}`);

  if (isLoading) return "Loading...";

  const color = colors[user?.id % colors.length];

  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar lh={0.4} radius="xl" color={color} size="sm">
        {(user.name || user.email)?.slice(0, 2)?.toUpperCase()}
      </Avatar>
      <Text size="xs">{user.name}</Text>
    </Group>
  );
}

function Dashboard({ item }) {
  const router = useRouter();
  const { dashboard, update, remove, loading } = useDashboard(item.id, item);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  const { trigger } = useProjectMutation(`/dashboards`, fetcher.post);

  if (loading) {
    return <Loader />;
  }

  function togglePin(dashboard) {
    update({
      pinned: !dashboard.pinned,
    });
  }

  async function duplicate() {
    const dash = await trigger({
      pinned: false,
      name: `${dashboard.name} (copy)`,
      charts: dashboard.charts,
      filters: dashboard.filters,
      description: dashboard.description,
    });
    router.push(`/dashboards/${dash.id}`);
  }

  return (
    <>
      <ConfirmModal
        opened={confirmOpened}
        close={closeConfirm}
        onConfirm={() => {
          remove();
        }}
        confirmText={`Delete ${dashboard.name}`}
        title={`Delete "${dashboard.name}"`}
      />
      <Grid.Col span={6}>
        <Card align="center" withBorder radius="md" p="xs">
          <Flex justify="space-between" align="center" wrap="nowrap" gap={0}>
            <ActionIcon
              variant="transparent"
              onClick={() => togglePin(dashboard)}
            >
              {dashboard.pinned ? (
                <IconPinned size={20} color="red" />
              ) : (
                <IconPin size={20} />
              )}
            </ActionIcon>
            <Group gap="xl" pt="xs" pb="md">
              {/** @ts-ignore */}
              <Text
                component={Anchor}
                href={`/dashboards/${dashboard.id}`}
                tt="uppercase"
                fw={700}
                size="xs"
              >
                {dashboard.name}
              </Text>
              {dashboard.description && <Text>{dashboard.description}</Text>}
            </Group>
            <Group wrap="nowrap" gap="xs">
              <OwnerCard ownerId={dashboard.ownerId} />
              <Text size="xs" c="dimmed">
                •
              </Text>
              <Text size="xs" c="dimmed">
                {new Date(dashboard.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              </Text>
            </Group>

            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="light">
                  <IconDotsVertical size={12} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <MenuItem
                  leftSection={<IconLink size={15} />}
                  onClick={() => router.push(`/dashboards/${dashboard.id}`)}
                >
                  View
                </MenuItem>
                <MenuItem
                  leftSection={<IconEdit size={15} />}
                  onClick={duplicate}
                >
                  Duplicate
                </MenuItem>
                {/* <MenuItem leftSection={<IconEdit size={15} />}>Edit</MenuItem> */}
                <MenuItem
                  color="red"
                  leftSection={<IconTrash size={15} />}
                  onClick={openConfirm}
                >
                  Delete
                </MenuItem>
              </Menu.Dropdown>
            </Menu>
          </Flex>
        </Card>
      </Grid.Col>
    </>
  );
}

export default function Dashboards() {
  const router = useRouter();
  const { dashboards, isLoading, insert } = useDashboards();
  // const { charts, loading: chartsLoading } = useCharts<any>();
  const [query, setQuery] = useDebouncedState<string | null>(null, 300);

  async function createDashboard() {
    const dash = await insert({
      name: `Dashboard ${dashboards?.length || 1}`,
      charts: DEFAULT_CHARTS,
      pinned: false,
      filters: {
        checks: "",
        granularity: "daily",
        dateRange: getDefaultDateRange(),
      },
    });
    router.push(`/dashboards/${dash.id}`);
  }

  useMemo(() => {
    if (!isLoading && dashboards && dashboards.length === 0) {
      if (insertingDefaultPromise) return;
      insertingDefaultPromise = insert(DEFAULT_DASHBOARD);
    }
  }, [dashboards]);

  return (
    <Empty
      enable={isLoading}
      Icon={IconBrandOpenai}
      title="Waiting for data..."
      description="Once you create a dashboard, they will appear here."
    >
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Dashboards" />

        <Stack>
          <Card withBorder p={2} px="sm">
            <Flex justify="space-between">
              <SearchBar
                query={query}
                ml={-8}
                setQuery={setQuery}
                variant="unstyled"
                size="sm"
              />

              <Group gap="xs">
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="light">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <MenuItem
                      leftSection={<IconPlus size={12} />}
                      onClick={createDashboard}
                    >
                      Create Dashboard
                    </MenuItem>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Flex>
          </Card>
        </Stack>

        <Grid>
          {dashboards
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )
            .map((dashboard) => (
              <Dashboard key={dashboard.id} item={dashboard} />
            ))}
        </Grid>
      </Stack>
    </Empty>
  );
}
