import { ActionIcon, Card, Group, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  IconInfoCircle,
  IconX,
  IconArrowsMaximize,
  IconFilter,
  IconSettings,
  IconPencil,
} from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string | ReactNode;
  description?: string | null;
  isEditing?: boolean;
  onDelete?: () => void;
  onResize?: () => void; // existing prop for resize
  resizeLabel?: string; // new prop for tooltip label
  onFilter?: () => void;
  filterLabel?: string;
  filterCount?: number;
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
  isEditing = false,
  onDelete = () => {},
  onResize,
  resizeLabel,
  onFilter,
  filterLabel,
  filterCount = 0,
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
      px="0"
      shadow={getShadow(isEditing, hovered)}
    >
      <Group justify="space-between" px="md">
        <Group>
          {typeof title === "string" ? (
            <Text c="dimmed" fw={50} fz="md">
              {title}
            </Text>
          ) : (
            title
          )}

          {description !== null && (
            <Tooltip label={description || "No description available"}>
              <IconInfoCircle style={{ zIndex: 2 }} size={16} opacity={0.5} />
            </Tooltip>
          )}
        </Group>
        <Group gap="xs">
          {!isEditing && filterCount > 0 && (
            <Tooltip label={`${filterCount} filters applied`}>
              <ActionIcon
                variant="light"
                radius="lg"
                size="sm"
                color="gray"
                disabled
                style={{ cursor: "help" }}
              >
                <IconFilter size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {isEditing && onFilter && (
            <Tooltip label={filterLabel || "Edit filters"}>
              <ActionIcon
                variant="light"
                radius="lg"
                size="sm"
                color="gray"
                onClick={onFilter}
                style={{ zIndex: 2 }}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {isEditing && onResize && (
            <Tooltip label={resizeLabel || "Resize chart width"}>
              <ActionIcon
                variant="light"
                radius="lg"
                size="sm"
                color="gray"
                onClick={onResize}
                style={{ zIndex: 2 }}
              >
                <IconArrowsMaximize size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {isEditing && (
            <ActionIcon
              variant="light"
              radius="lg"
              size="sm"
              color="gray"
              onClick={onDelete}
              style={{ zIndex: 2 }}
            >
              <IconX size={16} />
            </ActionIcon>
          )}
        </Group>
      </Group>
      {children}
    </Card>
  );
}

export default AnalyticsCard;
