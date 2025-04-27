import { useState } from "react";
import {
  Container,
  Tabs,
  Table,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  Box,
  ThemeIcon,
  Card,
  Drawer,
} from "@mantine/core";
import {
  IconBrain,
  IconMoodHappy,
  IconTarget,
  IconPlus,
  IconMinus,
  IconTrendingUp,
  IconTrendingDown,
  IconClock,
} from "@tabler/icons-react";
import { format } from "date-fns";

type LineChartData = Array<{
  date: string;
  [key: string]: string | number; // Allow any string key with string or number value
}>;

// Mock data
const topicsData = [
  {
    topic: "API Authentication",
    conversations: 245,
    frustrationPercent: 32,
    avgRating: 3.8,
    trend: 12, // positive number means upward trend
  },
  {
    topic: "Billing Issues",
    conversations: 189,
    frustrationPercent: 45,
    avgRating: 2.9,
    trend: -8,
  },
  {
    topic: "Documentation",
    conversations: 156,
    frustrationPercent: 18,
    avgRating: 4.2,
    trend: 5,
  },
  {
    topic: "Performance",
    conversations: 134,
    frustrationPercent: 28,
    avgRating: 3.5,
    trend: -3,
  },
  {
    topic: "Rate Limits",
    conversations: 98,
    frustrationPercent: 38,
    avgRating: 3.1,
    trend: -15,
  },
  {
    topic: "SDK Integration",
    conversations: 167,
    frustrationPercent: 22,
    avgRating: 4.0,
    trend: 8,
  },
  {
    topic: "Webhook Setup",
    conversations: 145,
    frustrationPercent: 25,
    avgRating: 3.7,
    trend: 3,
  },
  {
    topic: "Data Export",
    conversations: 89,
    frustrationPercent: 15,
    avgRating: 4.4,
    trend: 6,
  },
];

const intentsData = [
  {
    intent: "User inquires about pricing plans",
    conversations: 312,
    trend: 15,
    lastSeen: "2 hours ago",
  },
  {
    intent: "User reports API error",
    conversations: 245,
    trend: -5,
    lastSeen: "30 minutes ago",
  },
  {
    intent: "User requests feature",
    conversations: 198,
    trend: 8,
    lastSeen: "1 hour ago",
  },
  {
    intent: "User needs implementation help",
    conversations: 167,
    trend: 2,
    lastSeen: "45 minutes ago",
  },
  {
    intent: "User complains about downtime",
    conversations: 89,
    trend: -12,
    lastSeen: "15 minutes ago",
  },
  {
    intent: "User asks for documentation",
    conversations: 156,
    trend: 4,
    lastSeen: "20 minutes ago",
  },
  {
    intent: "User reports billing issue",
    conversations: 134,
    trend: -3,
    lastSeen: "1 hour ago",
  },
  {
    intent: "User requests account deletion",
    conversations: 45,
    trend: 7,
    lastSeen: "3 hours ago",
  },
  {
    intent: "User asks about security features",
    conversations: 112,
    trend: 9,
    lastSeen: "40 minutes ago",
  },
];

const emotionsData = [
  {
    emotion: "Frustration",
    conversations: 423,
    trend: -2,
    lastSeen: "5 minutes ago",
  },
  {
    emotion: "Satisfaction",
    conversations: 356,
    trend: 12,
    lastSeen: "15 minutes ago",
  },
  {
    emotion: "Confusion",
    conversations: 234,
    trend: 5,
    lastSeen: "1 hour ago",
  },
  {
    emotion: "Appreciation",
    conversations: 189,
    trend: 8,
    lastSeen: "30 minutes ago",
  },
  {
    emotion: "Anger",
    conversations: 145,
    trend: -8,
    lastSeen: "10 minutes ago",
  },
  {
    emotion: "Relief",
    conversations: 167,
    trend: 6,
    lastSeen: "25 minutes ago",
  },
  {
    emotion: "Disappointment",
    conversations: 198,
    trend: -4,
    lastSeen: "45 minutes ago",
  },
  {
    emotion: "Excitement",
    conversations: 134,
    trend: 10,
    lastSeen: "2 hours ago",
  },
  {
    emotion: "Urgency",
    conversations: 223,
    trend: 3,
    lastSeen: "20 minutes ago",
  },
];

const mockConversations = [
  {
    id: 2,
    user: "rachel.patel@techstart.io",
    message:
      "The new invoice breakdown is much clearer now, thanks for the update.",
    sentiment: "positive",
    date: "2024-03-20T09:15:00Z",
  },
  {
    id: 3,
    user: "alex.martinez@dataflow.dev",
    message: "Need help understanding the usage-based pricing tiers",
    sentiment: "neutral",
    date: "2024-03-20T08:45:00Z",
  },
  {
    id: 4,
    user: "sarah.wilson@cloudscape.net",
    message: "Our billing contact changed, how do we update this?",
    sentiment: "neutral",
    date: "2024-03-20T08:15:00Z",
  },
  {
    id: 5,
    user: "james.thompson@scaleup.co",
    message: "The auto-payment failed again. This is the third time!",
    sentiment: "negative",
    date: "2024-03-20T07:30:00Z",
  },
  {
    id: 6,
    user: "emma.garcia@innovate.ai",
    message: "Love the new cost management dashboard",
    sentiment: "positive",
    date: "2024-03-20T07:00:00Z",
  },
  {
    id: 7,
    user: "michael.wong@devhub.tech",
    message: "Can we get an itemized breakdown of last month's usage?",
    sentiment: "neutral",
    date: "2024-03-20T06:45:00Z",
  },
  {
    id: 8,
    user: "lisa.kumar@bytecode.com",
    message: "Payment method update keeps failing with error code 3012",
    sentiment: "negative",
    date: "2024-03-20T06:30:00Z",
  },
];

import LineChartComponent from "@/components/analytics/OldLineChart";

export default function Insights() {
  const [activeTab, setActiveTab] = useState<string | null>("topics");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(topic);
  };

  const TrendBadge = ({ value }: { value: number }) => (
    <Group gap={4}>
      {value > 0 ? (
        <ThemeIcon color="green" variant="light" size="sm">
          <IconTrendingUp size={14} />
        </ThemeIcon>
      ) : (
        <ThemeIcon color="red" variant="light" size="sm">
          <IconTrendingDown size={14} />
        </ThemeIcon>
      )}
      <Text size="sm" c={value > 0 ? "green" : "red"}>
        {Math.abs(value)}%
      </Text>
    </Group>
  );

  return (
    <Container size="xl" py="xl">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="topics" leftSection={<IconBrain size={16} />}>
            Topics
          </Tabs.Tab>
          <Tabs.Tab value="emotions" leftSection={<IconMoodHappy size={16} />}>
            Emotions
          </Tabs.Tab>
          <Tabs.Tab value="intent" leftSection={<IconTarget size={16} />}>
            Intent
          </Tabs.Tab>
        </Tabs.List>

        <Box mt="xl">
          <Tabs.Panel value="topics">
            <Card p={0} withBorder>
              <Table
                verticalSpacing="md"
                horizontalSpacing="md"
                highlightOnHover
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Topic</Table.Th>
                    <Table.Th>Conversations</Table.Th>
                    <Table.Th>Frustration</Table.Th>
                    <Table.Th>Avg Rating</Table.Th>
                    <Table.Th>7d Trend</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topicsData.map((topic) => (
                    <Table.Tr
                      key={topic.topic}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleTopicClick(topic.topic)}
                    >
                      <Table.Td>{topic.topic}</Table.Td>
                      <Table.Td>{topic.conversations}</Table.Td>
                      <Table.Td>
                        <Badge color="red" variant="light">
                          {topic.frustrationPercent}%
                        </Badge>
                      </Table.Td>
                      <Table.Td>{topic.avgRating.toFixed(1)}</Table.Td>
                      <Table.Td>
                        <TrendBadge value={topic.trend} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={8}>
                          <Tooltip label="Add to tracking">
                            <ActionIcon variant="light" color="blue" size="sm">
                              <IconPlus size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Remove from tracking">
                            <ActionIcon variant="light" color="red" size="sm">
                              <IconMinus size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="emotions">
            <Card p={0} withBorder>
              <Table
                verticalSpacing="md"
                horizontalSpacing="md"
                highlightOnHover
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Emotion</Table.Th>
                    <Table.Th>Conversations</Table.Th>
                    <Table.Th>7d Trend</Table.Th>
                    <Table.Th>Last Seen</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {emotionsData.map((emotion) => (
                    <Table.Tr key={emotion.emotion}>
                      <Table.Td>{emotion.emotion}</Table.Td>
                      <Table.Td>{emotion.conversations}</Table.Td>
                      <Table.Td>
                        <TrendBadge value={emotion.trend} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <IconClock size={14} />
                          <Text size="sm">{emotion.lastSeen}</Text>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="intent">
            <Card p={0} withBorder>
              <Table
                verticalSpacing="md"
                horizontalSpacing="md"
                highlightOnHover
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Intent</Table.Th>
                    <Table.Th>Conversations</Table.Th>
                    <Table.Th>7d Trend</Table.Th>
                    <Table.Th>Last Seen</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {intentsData.map((intent) => (
                    <Table.Tr key={intent.intent}>
                      <Table.Td>{intent.intent}</Table.Td>
                      <Table.Td>{intent.conversations}</Table.Td>
                      <Table.Td>
                        <TrendBadge value={intent.trend} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <IconClock size={14} />
                          <Text size="sm">{intent.lastSeen}</Text>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Tabs.Panel>
        </Box>
      </Tabs>

      <Drawer
        opened={!!selectedTopic}
        onClose={() => setSelectedTopic(null)}
        title={selectedTopic}
        position="right"
        size="xl"
      >
        {selectedTopic && (
          <Box>
            <Text size="lg" fw={500} mb="md">
              Conversations Over Time
            </Text>
            <LineChartComponent
              data={generateMockTimeSeriesData(30, 200, 0.2)}
              startDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
              endDate={new Date()}
              granularity="daily"
              height={200}
              agg="sum"
              props={["conversations"]}
              title="Conversations"
              extraProps={{}}
              cleanData={true}
              colors={["blue.6"]}
              formatter={(value) => value.toLocaleString()}
            />

            <Text size="lg" fw={500} mt="xl" mb="md">
              Sentiment Over Time
            </Text>
            <LineChartComponent
              data={generateMockTimeSeriesData(30, 3.5, 0.15).map((d) => ({
                date: d.date,
                sentiment: d.conversations,
              }))}
              startDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
              endDate={new Date()}
              granularity="daily"
              height={200}
              agg="avg"
              props={["sentiment"]}
              title="Sentiment"
              extraProps={{}}
              cleanData={true}
              colors={["violet.6"]}
              formatter={(value) => value.toFixed(1)}
            />

            <Text size="lg" fw={500} mt="xl" mb="md">
              Recent Conversations
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Message</Table.Th>
                  <Table.Th>Sentiment</Table.Th>
                  <Table.Th>Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockConversations.map((conv) => (
                  <Table.Tr key={conv.id}>
                    <Table.Td>{conv.user}</Table.Td>
                    <Table.Td>{conv.message}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          conv.sentiment === "positive"
                            ? "green"
                            : conv.sentiment === "negative"
                              ? "red"
                              : "gray"
                        }
                      >
                        {conv.sentiment}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{new Date(conv.date).toLocaleString()}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}
      </Drawer>
    </Container>
  );
}

const generateMockTimeSeriesData = (
  days = 30,
  base = 100,
  variance = 0.3,
): LineChartData => {
  const data: LineChartData = [];
  const now = new Date();

  let currentValue = base;
  let trend = (Math.random() - 0.5) * 0.1;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    currentValue =
      currentValue * (1 + trend) + (Math.random() - 0.5) * variance * base;

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentValue *= 0.7;
    }

    const formattedDate = format(date, "yyyy-MM-dd");

    data.push({
      date: formattedDate,
      conversations: Math.max(0, Math.round(currentValue)),
    });

    if (Math.random() < 0.1) {
      trend = (Math.random() - 0.5) * 0.1;
    }
  }
  return data;
};
