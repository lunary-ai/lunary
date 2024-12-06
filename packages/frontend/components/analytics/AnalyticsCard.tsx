import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { Card, Group, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string;
  description: string | null;
  isEditing: boolean;
  children: ReactNode;
}

function getShadow(isEditing: boolean, isHovered: boolean) {
  if (!isEditing) {
    return "none";
  }

  if (isHovered) {
    return "md";
  }

  return "sm";
}

function AnalyticsCard({
  title,
  children,
  description,
  isEditing,
}: AnalyticsCardProps) {
  const { hovered, ref } = useHover();

  return (
    <Card
      ref={ref}
      withBorder
      h={"100%"}
      style={{
        "&:children": { maxWidth: "100%" },
      }}
      shadow={getShadow(isEditing, hovered)}
    >
      <Group>
        <Text c="dimmed" fw={50} fz="md">
          {title}
        </Text>

        <Tooltip label={description || "No description available"}>
          <IconInfoCircle size={16} opacity={0.5} />
        </Tooltip>
      </Group>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Card>
  );
}

export default AnalyticsCard;
