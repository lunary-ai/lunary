import { formatAppUser, formatCost } from "@/utils/format";
import { Anchor, Center, Group, Overlay, Text } from "@mantine/core";
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
  return (
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
  );
}
