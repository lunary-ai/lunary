import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { ActionIcon, Card, Group, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconCross, IconInfoCircle, IconX } from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string;
  description: string | null;
  isEditing: boolean;
  children: ReactNode;
  onDelete: () => void;
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
  onDelete,
}: AnalyticsCardProps) {
  const { hovered, ref } = useHover();

  // TODO : use mantine card sections instead of groups? (https://mantine.dev/core/card/
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
      <Group justify="space-between">
        <Group>
          <Text c="dimmed" fw={50} fz="md">
            {title}
          </Text>

          <Tooltip label={description || "No description available"}>
            <IconInfoCircle size={16} opacity={0.5} />
          </Tooltip>
        </Group>
        {isEditing && (
          <ActionIcon
            variant="light"
            radius="lg"
            size="sm"
            color="gray"
            onClick={onDelete}
          >
            <IconX size={16} />
          </ActionIcon>
        )}
      </Group>
      {children}
    </Card>
  );
}

export default AnalyticsCard;
