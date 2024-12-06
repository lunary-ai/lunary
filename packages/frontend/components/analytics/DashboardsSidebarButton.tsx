import { useDashboards } from "@/utils/dataHooks/dashboards";
import { ActionIcon, Group, Menu, Text } from "@mantine/core";
import {
  IconAnalyze,
  IconChevronDown,
  IconHome,
  IconHome2,
} from "@tabler/icons-react";
import { useRef } from "react";
import { NavbarLink } from "../layout/Sidebar";
import { useRouter } from "next/router";

export default function DashboardsSidebarButton() {
  const { dashboards } = useDashboards();
  const router = useRouter();
  const menuTargetRef = useRef<HTMLElement>(null);

  const homeDashboardId = dashboards.find((dashboard) => dashboard.isHome)?.id;

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
                <Text style={{ overflow: "hidden" }}>{name}</Text>
                {isHome && <IconHome2 stroke="2px" size={18} />}
              </Group>
            </Menu.Item>
          ))}
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
