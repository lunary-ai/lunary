import { Badge, ThemeIcon } from "@mantine/core"
import { IconClock } from "@tabler/icons-react"

export default function DurationBadge({ createdAt, endedAt, minimal = false }) {
  const duration = endedAt
    ? new Date(endedAt).getTime() - new Date(createdAt).getTime()
    : NaN

  return (
    <Badge
      variant="outline"
      color="blue"
      pl={0}
      pr={5}
      leftSection={
        <ThemeIcon variant="subtle" size="sm">
          <IconClock size="12" />
        </ThemeIcon>
      }
      style={{ textTransform: "none" }}
    >
      {(duration / 1000).toFixed(2)}s
    </Badge>
  )
}
