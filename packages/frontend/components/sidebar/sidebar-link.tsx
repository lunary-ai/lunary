import { Badge, Group, NavLink, ThemeIcon } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, type MouseEvent } from "react";

export interface SidebarLinkProps {
  icon: any;
  label: string;
  link: string;
  rightSection?: any;
  soon?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

export function SidebarLink({
  icon: Icon,
  label,
  link,
  rightSection,
  soon = false,
  onClick = () => {},
  disabled = false,
}: SidebarLinkProps) {
  const router = useRouter();

  const active = useMemo(() => {
    if (disabled || soon) return false;

    if (router.pathname.startsWith("/logs")) {
      const search = link.includes("?") ? link.split("?")[1] : "";
      const params = new URLSearchParams(search);

      if (params.has("view")) {
        return router.asPath.includes(`view=${params.get("view")}`);
      }

      return router.asPath.startsWith(link);
    }

    if (
      router.pathname.startsWith("/dashboards/[id]") &&
      link.startsWith("/dashboards")
    ) {
      return true;
    }

    return router.pathname.startsWith(link);
  }, [router.asPath, router.pathname, link, disabled, soon]);

  if (disabled) return null;

  return (
    <NavLink
      w="100%"
      href={link}
      component={Link}
      pl={5}
      styles={{
        label: {
          fontSize: 14,
        },
      }}
      onClick={onClick}
      h={33}
      label={
        <Group gap="xs">
          {label}
          {label === "Insights" && (
            <Badge size="xs" variant="light">
              Alpha
            </Badge>
          )}
          {label === "Guardrails" && (
            <Badge size="xs" variant="light">
              Beta
            </Badge>
          )}
        </Group>
      }
      disabled={disabled || soon}
      active={active}
      leftSection={
        <ThemeIcon variant="subtle" size="md" mr={-10}>
          <Icon size={18} opacity={0.7} />
        </ThemeIcon>
      }
      rightSection={rightSection}
    />
  );
}
