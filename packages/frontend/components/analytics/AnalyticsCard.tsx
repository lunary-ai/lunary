import { ActionIcon, Card, Group, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string | ReactNode;
  description?: string | null;
  isEditing?: boolean;
  onDelete?: () => void;
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
      {children}
    </Card>
  );
}

export default AnalyticsCard;
