import { useDashboards } from "@/utils/dataHooks/dashboards";
import { ActionIcon, Group, Menu } from "@mantine/core";
import { IconAnalyze, IconChevronDown } from "@tabler/icons-react";
import { useRef } from "react";
import { NavbarLink } from "../layout/Sidebar";
import { useRouter } from "next/router";

export default function DashboardsSidebarButton() {
  const { dashboards } = useDashboards();
  const router = useRouter();
  const menuTargetRef = useRef<HTMLElement>(null);

  function DashboardsMenu() {
    return (
      <Menu position="bottom-end">
        <Menu.Target ref={menuTargetRef}>
          <ActionIcon variant="subtle">
            <IconChevronDown size={12} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {dashboards.map(({ id, name }) => (
            <Menu.Item
              key={id}
              onClick={(event) => {
                event.preventDefault();
                router.push(`/dashboards/${id}`);
              }}
            >
              {name}
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
          console.log(target);
          console.log(menuTargetRef);
          if (menuTargetRef.current?.contains(target)) {
            console.log("contains");
            event.preventDefault();
          }
        }}
        label="Dashboards"
        icon={IconAnalyze}
        link="/dashboards"
        rightSection={<DashboardsMenu />}
      />
    </Group>
  );
}
