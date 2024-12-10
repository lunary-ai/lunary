import { useDashboards } from "@/utils/dataHooks/dashboards";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAnalyze,
  IconChevronDown,
  IconHome2,
  IconPlus,
} from "@tabler/icons-react";
import { useRef } from "react";
import { NavbarLink } from "../layout/Sidebar";
import { useRouter } from "next/router";

export default function DashboardsSidebarButton() {
  const { dashboards, insert: insertDashboard } = useDashboards();
  const router = useRouter();
  const menuTargetRef = useRef<HTMLElement>(null);

  const homeDashboardId = dashboards.find((dashboard) => dashboard.isHome)?.id;

  async function handleCreateDashboard() {
    const newDashboard = await insertDashboard();
    router.push(`/dashboards/${newDashboard.id}`);
  }

  function DashboardsMenu() {
    return (
      <Menu position="bottom-end" withArrow={false} offset={3}>
        <Menu.Target ref={menuTargetRef}>
          <ActionIcon variant="subtle">
            <IconChevronDown size={12} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {dashboards.map(({ id, name, isHome }) => (
            <Menu.Item
              key={id}
              onClick={(event) => {
                event.preventDefault();
                router.push(`/dashboards/${id}`);
              }}
            >
              <Group>
                <Text size="sm" style={{ overflow: "hidden" }}>
                  {name}
                </Text>
                {isHome && <IconHome2 stroke="2px" size={18} />}
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
      />
    </Group>
  );
}
