import { Badge, ThemeIcon } from "@mantine/core"
import { IconCashBanknote } from "@tabler/icons-react"

export default function TokensBadge({ tokens }) {
  if (!tokens) return null

  return (
    <Badge
      variant="outline"
      color="pink"
      pl={0}
      pr={5}
      leftSection={
        <ThemeIcon variant="subtle" size="sm" color="pink">
          <IconCashBanknote size="12" />
        </ThemeIcon>
      }
      tt="none"
    >
      {tokens} tokens
    </Badge>
  )
}
