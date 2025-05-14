import { useProject } from "@/utils/dataHooks";
import { useDashboards } from "@/utils/dataHooks/dashboards";
import { ActionIcon, Box, Button, Group, Menu, Text } from "@mantine/core";
import {
  IconAnalyze,
  IconChevronDown,
  IconHome2,
  IconPin,
  IconPinFilled,
  IconPinned,
  IconPinnedFilled,
  IconPlus,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useRef } from "react";
import { NavbarLink } from "../layout/Sidebar";

export default function DashboardsSidebarButton() {
  const { project } = useProject();
  const { dashboards, insert: insertDashboard } = useDashboards();
  const router = useRouter();
  const menuTargetRef = useRef<HTMLElement>(null);

  const homeDashboardId =
    project?.homeDashboardId ??
    dashboards.find((dashboard) => dashboard.isHome)?.id;

  async function handleCreateDashboard() {
    const newDashboard = await insertDashboard();
    router.push(`/dashboards/${newDashboard.id}`);
  }

  function DashboardsMenu() {
    return (
      <Menu position="bottom-end" withArrow={false} offset={3}>
        <Menu.Target ref={menuTargetRef}>
          <ActionIcon variant="subtle" data-testid="dashboard-menu-toggle">
            <IconChevronDown size={12} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown data-testid="dashboard-menu-dropdown">
          {dashboards.map(({ id, name, isHome }) => (
            <Menu.Item
              key={id}
              data-testid={`dashboard-menu-item-${id}`}
              onClick={(event) => {
                event.preventDefault();
                router.push(`/dashboards/${id}`);
              }}
            >
              <Group justify="space-between">
                <Text size="sm" style={{ overflow: "hidden" }}>
                  {name}
                </Text>
                {isHome && <IconPinnedFilled stroke="2px" size={18} />}
              </Group>
            </Menu.Item>
          ))}

          <Menu.Divider />
          <Box>
            <Button
              variant="light"
              fullWidth
              leftSection={<IconPlus size={12} />}
              onClick={handleCreateDashboard}
              data-testid="create-dashboard-button" // Test ID for the create button

            >
              Create Dashboard
            </Button>
          </Box>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Group>
      <NavbarLink
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (menuTargetRef.current?.contains(target)) {
            event.preventDefault();
          }
        }}
        label="Dashboards"
        icon={IconAnalyze}
        link={`/dashboards/${homeDashboardId}`}
        rightSection={<DashboardsMenu />}
        data-testid="dashboard-sidebar-link"
      />
    </Group>
  );
}
