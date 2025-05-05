import { Badge, ThemeIcon } from "@mantine/core";
import { IconBolt, IconClock } from "@tabler/icons-react";

export default function DurationBadge({
  cached = false,
  createdAt,
  endedAt,
  minimal = false,
  type,
}) {
  const duration = endedAt
    ? new Date(endedAt).getTime() - new Date(createdAt).getTime()
    : NaN;

  if (type === "llm" && (cached || duration < 0.01 * 1000)) {
    return (
      <Badge
        variant="light"
        color="yellow"
        pl={0}
        pr={5}
        leftSection={
          <ThemeIcon variant="subtle" size="sm" color="light">
            <IconBolt size="12" />
          </ThemeIcon>
        }
      >
        Cached ({(duration / 1000).toFixed(2)}s)
      </Badge>
    );
  }

  return (
    <Badge
      variant="light"
      color="gray"
      pl={0}
      pr={5}
      leftSection={
        <ThemeIcon variant="subtle" size="sm" color="light">
          <IconClock size="12" />
        </ThemeIcon>
      }
    >
      {(duration / 1000).toFixed(2)}s
    </Badge>
  );
}
