import { Badge, ThemeIcon } from "@mantine/core"
import { IconCheck, IconCross, IconX } from "@tabler/icons-react"

export default function StatusBadge({ status, minimal = false }) {
  const color = status === "success" ? "green" : "red"

  if (minimal)
    return (
      <ThemeIcon color={color} size="sm" radius="lg" variant="outline">
        {status === "success" ? (
          <IconCheck strokeWidth={4} size={12} />
        ) : (
          <IconX strokeWidth={4} size={11} />
        )}
      </ThemeIcon>
    )

  return <Badge color={color}>{status}</Badge>
}
