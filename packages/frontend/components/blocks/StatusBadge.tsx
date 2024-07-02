import { Badge, ThemeIcon } from "@mantine/core"
import { IconCheck, IconShieldBolt, IconX } from "@tabler/icons-react"
import ProtectedText from "./ProtectedText"

function getColor(status) {
  if (status === "success") {
    return "green"
  } else if (status === "error") {
    return "red"
  } else if (status === "filtered") {
    return "gray"
  } else {
    return "blue"
  }
}

function Icon({ status }) {
  if (status === "success") {
    return <IconCheck strokeWidth={4} size="12" />
  } else if (status === "filtered") {
    return <IconShieldBolt size="12" />
  } else {
    return <IconX strokeWidth={4} size={11} />
  }
}

export default function StatusBadge({ status, minimal = false }) {
  const color = getColor(status)

  if (minimal)
    return (
      <ThemeIcon color={color} size="sm" radius="lg" variant="outline">
        <Icon status={status} />
      </ThemeIcon>
    )

  return (
    <Badge color={color} variant="light">
      <ProtectedText>{status}</ProtectedText>
    </Badge>
  )
}
