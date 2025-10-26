import { Badge, Group, NavLink, ThemeIcon } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, type MouseEvent } from "react";

const LOG_GROUP_TYPES = ["llm", "tool", "retriever"] as const;
const isLogGroupType = (
  value: string | null | undefined,
): value is (typeof LOG_GROUP_TYPES)[number] =>
  !!value && (LOG_GROUP_TYPES as readonly string[]).includes(value);

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
      const currentSearch = router.asPath.includes("?")
        ? router.asPath.split("?")[1]
        : "";
      const currentParams = new URLSearchParams(currentSearch);
      const routerTypeQuery = router.query?.type;
      const routerType = Array.isArray(routerTypeQuery)
        ? routerTypeQuery[0]
        : routerTypeQuery;
      const currentType = currentParams.get("type") ?? routerType ?? "llm";
      const currentHasView = currentParams.has("view");
      const linkHasView = params.has("view");

      if (linkHasView) {
        return router.asPath.includes(`view=${params.get("view")}`);
      }

      if (currentHasView && !linkHasView) {
        return false;
      }

      if (params.has("type")) {
        const targetType = params.get("type");

        if (targetType === currentType) {
          return true;
        }

        if (targetType === "llm" && isLogGroupType(currentType)) {
          return true;
        }
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
  }, [
    router.asPath,
    router.pathname,
    router.query?.type,
    link,
    disabled,
    soon,
  ]);

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
