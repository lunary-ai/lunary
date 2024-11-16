import { formatAppUser, formatCost } from "@/utils/format";
import {
  Anchor,
  Center,
  Flex,
  Group,
  Loader,
  Overlay,
  Text,
} from "@mantine/core";
import AppUserAvatar from "../blocks/AppUserAvatar";
import AnalyticsCard from "./AnalyticsCard";
import BarList from "./BarList";

interface TopUsers {
  id: number;
  cost: number;
  createdAt: string;
  externalId: string;
  lastSeen: string;
  props: Record<string, any>;
}

interface TopUsersProps {
  topUsers: TopUsers[];
  isLoading: boolean;
}

function TopUsers({ topUsers, isLoading }: TopUsersProps) {
  if (isLoading) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  if (topUsers?.length === 0) {
    return (
      <>
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Center
          ta="center"
          style={{ position: "absolute", zIndex: 2 }}
          h="100%"
          w="100%"
        >
          No users tracked for this period
        </Center>
      </>
    );
  }

  return (
    <BarList
      customMetric={{
        label: "users",
        value: topUsers?.length,
      }}
      filterZero={false}
      data={topUsers?.map((user) => ({
        barSections: [
          {
            value: "cost",
            tooltip: "Cost",
            count: user.cost,
            color: "teal.2",
          },
        ],
        ...user,
      }))}
      columns={[
        {
          name: "User",
          render: (_, user) => (
            <Group
              my={-4}
              gap="sm"
              wrap="nowrap"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <AppUserAvatar size={30} user={user} />
              <Text
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                size="sm"
                px="md"
              >
                <Anchor
                  c="inherit"
                  underline="never"
                  href={`/users/${user.id}`}
                >
                  {formatAppUser(user)}
                </Anchor>
              </Text>
            </Group>
          ),
        },
        {
          name: "Cost",
          key: "cost",
          render: formatCost,
          main: true,
        },
      ]}
    />
  );
}

export default function TopUsersCard({ topUsers, isLoading }: TopUsersProps) {
  return (
    <AnalyticsCard title="Top Users">
      <TopUsers topUsers={topUsers} isLoading={isLoading} />
    </AnalyticsCard>
  );
}
