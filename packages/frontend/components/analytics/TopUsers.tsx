import { formatAppUser, formatCost } from "@/utils/format";
import { Anchor, Box, Center, Group, Overlay, Text } from "@mantine/core";
import AppUserAvatar from "../blocks/AppUserAvatar";
import BarList from "./BarList";

interface TopUsers {
  id: number;
  cost: number;
  createdAt: string;
  externalId: string;
  lastSeen: string;
  props: Record<string, any>;
}

export default function TopUsers({ data }: { data: TopUsers[] }) {
  data = data.filter((user) => user.cost > 0);

  if (data.length === 0) {
    return (
      <Center ta="center" h="100%" w="100%">
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Text>No data available for this period</Text>
      </Center>
    );
  }

  return (
    <Box px="md">
      <BarList
        customMetric={{
          label: "users",
          value: data?.length,
        }}
        filterZero={false}
        data={data?.map((user) => ({
          barSections: [
            {
              value: "cost",
              tooltip: "Cost",
              count: user.cost,
              color: "teal.2",
            },
          ],
          ...user,
          url: `/logs?filters=users=${user.id}`,
        }))}
        columns={[
          {
            name: "User",
            key: "user",
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
    </Box>
  );
}
