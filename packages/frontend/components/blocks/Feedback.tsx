import { Group, Tooltip } from "@mantine/core"

import {
  IconMessage,
  IconRefresh,
  IconStar,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react"
import { useEffect } from "react"
import analytics from "../../utils/analytics"
import { useFixedColorScheme } from "@/utils/hooks"

export default function Feedback({ data = {} }: { data: Record<string, any> }) {
  const scheme = useFixedColorScheme()
  useEffect(() => {
    // Feature tracking
    if (data) analytics.trackOnce("HasFeedback")
  }, [data])

  if (!data) return null

  const getIconProps = (color: string) => ({
    size: 20,
    fillOpacity: 0.2,
    fill: scheme === "light" ? `var(--mantine-color-${color}-5)` : color,
    color: scheme === "light" ? `var(--mantine-color-${color}-5)` : color,
  })

  return (
    <Group>
      {data?.thumbs === "up" && <IconThumbUp {...getIconProps("green")} />}
      {data?.thumbs === "down" && <IconThumbDown {...getIconProps("red")} />}
      {typeof data?.rating === "number" && (
        <Group gap={3}>
          {Array.from({ length: data.rating }).map((_, i) => (
            <IconStar key={i} {...getIconProps("yellow")} />
          ))}
        </Group>
      )}
      {data?.emoji && <span>{data.emoji}</span>}
      {data?.comment && (
        <Tooltip label={data.comment}>
          <IconMessage {...getIconProps("blue")} />
        </Tooltip>
      )}
      {data?.retried && (
        <IconRefresh {...getIconProps("violet")} fillOpacity={0} />
      )}
    </Group>
  )
}
