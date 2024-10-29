import { useDashboards } from "@/utils/dataHooks/dashboards";
import {
  ActionIcon,
  Card,
  Container,
  Group,
  Loader,
  Menu,
  rem,
  SimpleGrid,
  Tabs,
  Text,
  Image,
  Flex,
  Button,
  Title,
  Anchor,
} from "@mantine/core";
import {
  IconArrowRight,
  IconAt,
  IconCalendar,
  IconChartArea,
  IconDots,
  IconDownload,
  IconEye,
  IconFileZip,
  IconLink,
  IconPhoneCall,
  IconPhoto,
  IconPin,
  IconPlus,
  IconTimeline,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useCharts } from "@/utils/dataHooks/charts";
import { useProjectSWR } from "@/utils/dataHooks";

function OwnerName({ ownerId }) {
  const { data: user, isLoading: userLoading } = useProjectSWR(
    ownerId && `/users/${ownerId}`,
  );

  return user?.name;
}

export default function Dashboard() {
  const { dashboards, isLoading } = useDashboards();
  const { charts, loading: chartsLoading } = useCharts();

  if (isLoading || chartsLoading) {
    return <Loader />;
  }

  return (
    <Container>
      <Title mb="lg">Dashboards</Title>
      <Tabs defaultValue="dashboards">
        <Tabs.List>
          <Tabs.Tab value="dashboards" leftSection={<IconTimeline size={15} />}>
            Dashboards
          </Tabs.Tab>
          <Tabs.Tab value="charts" leftSection={<IconChartArea size={15} />}>
            Charts
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboards">
          <SimpleGrid cols={3} my="md">
            {dashboards.map((dashboard) => (
              <Card
                shadow="sm"
                radius="md"
                display="flex"
                component={Anchor}
                href={`/dashboards/${dashboard.id}`}
                style={{ justifyContent: "center" }}
              >
                <Card.Section withBorder inheritPadding py="xs">
                  <Group justify="space-between">
                    <IconTimeline size={30} />
                    <Text fw={500}>{dashboard.name}</Text>
                    <Menu withinPortal position="bottom-end" shadow="sm">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots
                            style={{ width: rem(16), height: rem(16) }}
                          />
                        </ActionIcon>
                      </Menu.Target>

                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={
                            <IconTrash
                              style={{ width: rem(14), height: rem(14) }}
                            />
                          }
                          color="red"
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Card.Section>
                {/* 
                <Card.Section>{dashboard.description}</Card.Section>

                <Flex p="sm" direction={"column"} align={"center"}>
                  <Group wrap="nowrap" gap={10} mt={5}>
                    <IconCalendar stroke={1.5} size="1rem" />
                    {"Created at: "}
                    <Text fz="xs" c="dimmed">
                      {new Date(dashboard.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </Group>
                  <Group wrap="nowrap" gap={10} mt={3}>
                    <IconUser stroke={1.5} size="1rem" />
                    {"Created by: "}
                    <Text fz="xs" c="dimmed">
                      <OwnerName ownerId={dashboard.ownerId} />
                    </Text>
                  </Group>
                </Flex>

                <Card.Section pb="sm">
                  <Group justify="center">
                    <ActionIcon>
                      <IconPin size="15" />
                    </ActionIcon>

                    <Button
                      variant="outline"
                      rightSection={<IconLink size={14} />}
                    >
                      Open Dashboard
                    </Button>
                  </Group>
                </Card.Section> */}
              </Card>
            ))}

            <Card
              p="md"
              h="100%"
              withBorder
              radius="md"
              style={{
                border: "2px dashed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => {}}
            >
              <Button
                size="lg"
                variant="transparent"
                leftSection={<IconPlus size={15} />}
              >
                Create
              </Button>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="charts">{charts.map((chart) => {})}</Tabs.Panel>
      </Tabs>
    </Container>
  );
}
