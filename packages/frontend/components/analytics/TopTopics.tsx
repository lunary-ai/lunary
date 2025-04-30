import { Box, Center, Overlay, Text } from "@mantine/core";
import BarList from "./BarList";

interface TopTopicsData {
  topic: string;
  count: number;
}

export default function TopTopics({ data }: { data: TopTopicsData[] }) {
  data = data.filter((topic) => topic.count > 0);

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
      <Box h="20px"></Box>
      <BarList
        filterZero={false}
        data={data?.map((topic) => ({
          value: topic.count,
          barSections: [
            {
              value: "count",
              tooltip: "Count",
              count: topic.count,
              color: "var(--mantine-color-blue-4)",
            },
          ],
          ...topic,
          url: `/logs?filters=topics=${topic.topic}`,
        }))}
        columns={[
          {
            name: "Topics",
            bar: true,
            main: true,
            key: "count",
          },
          {
            name: "Name",
            key: "topic",
            render: (_, { topic }) => (
              <Text
                size="sm"
                px="md"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {topic}
              </Text>
            ),
          },
        ]}
      />
    </Box>
  );
}
