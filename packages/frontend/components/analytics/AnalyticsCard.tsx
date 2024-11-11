import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { ActionIcon, Card, Group, Text, Tooltip } from "@mantine/core";
import {
  IconCircleCheck,
  IconCirclePlus,
  IconInfoCircle,
  IconMinus,
} from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title?: string | JSX.Element;
  description?: string;
  children: ReactNode;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  icons?: {
    icon: (...args) => ReactNode;
    color: string;
    onClick: () => void;
  }[];
  icon?: (props: { onClick?: () => any; selected?: boolean }) => ReactNode;
}

function AnalyticsCard({
  title,
  children,
  description = "No description available",
  selectable,
  isSelected,
  onSelect,
  icon,
  icons,
}: AnalyticsCardProps) {
  return (
    <Card
      withBorder
      className="lineChart"
      radius="md"
      h={"100%"}
      style={{ "&:children": { maxWidth: "100%" } }}
    >
      <Group justify="space-between">
        <Group>
          <Text c="dimmed" fw={50} fz="md">
            {title}
          </Text>

          {description && (
            <Tooltip label={description}>
              <IconInfoCircle size={16} opacity={0.5} />
            </Tooltip>
          )}
        </Group>

        {selectable && (
          <Group align="center" justify="right">
            {icon ? (
              icon({ selected: isSelected, onClick: onSelect })
            ) : (
              <ActionIcon
                variant="transparent"
                onClick={onSelect}
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  zIndex: 30,
                }}
                color={isSelected ? "blue" : "gray"}
              >
                {isSelected ? (
                  <IconCircleCheck size="22" />
                ) : (
                  <IconCirclePlus size="22" />
                )}
              </ActionIcon>
            )}

            {icons &&
              icons.reverse().map((icon, index) => (
                <ActionIcon
                  variant="subtle"
                  style={{
                    position: "absolute",
                    top: "15px",
                    right: `${30 * (index + 1) + 20}px`,
                    zIndex: 30,
                  }}
                  color={icon.color}
                  onClick={icon.onClick}
                >
                  <icon.icon size="12" />
                </ActionIcon>
              ))}
          </Group>
        )}
      </Group>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Card>
  );
}

export default AnalyticsCard;
