import { Badge, ThemeIcon } from "@mantine/core"
import { IconCheck, IconCross, IconX } from "@tabler/icons-react"
import ProtectedText from "./ProtectedText"

const getColor = (status) => {
  switch (status) {
    case "success":
      return "green"
    case "error":
      return "red"
    default:
      return "blue"
  }
}

export default function StatusBadge({ status, minimal = false }) {
  const color = getColor(status)

  if (minimal)
    return (
      <ThemeIcon color={color} size="sm" radius="lg" variant="outline">
        {status === "success" ? (
          <IconCheck strokeWidth={4} size="12" />
        ) : (
          <IconX strokeWidth={4} size={11} />
        )}
      </ThemeIcon>
    )

  return (
    <Badge color={color} variant="light">
      <ProtectedText>{status}</ProtectedText>
    </Badge>
  )
}
