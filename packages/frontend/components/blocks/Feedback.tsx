import { Group, Indicator, Tooltip } from "@mantine/core"

import {
  IconMessage,
  IconRefresh,
  IconStar,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react"
import { useEffect, useState } from "react"
import analytics from "../../utils/analytics"
import { useFixedColorScheme } from "@/utils/hooks"

export default function Feedback({
  data = {},
  isFromParent,
}: {
  data: Record<string, any>
  isFromParent?: boolean
}) {
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
    <Tooltip
      label="Feedback from parent run"
      position="bottom"
      disabled={!isFromParent}
    >
      <Indicator inline disabled={!isFromParent} color="red" size={10}>
        <Group
          style={{
            padding: isFromParent ? "3px 6px" : "",
            borderRadius: 6,
            border: isFromParent
              ? `1px solid var(--mantine-color-default-border)`
              : "",
          }}
        >
          {data?.thumbs === "up" && <IconThumbUp {...getIconProps("green")} />}
          {data?.thumbs === "down" && (
            <IconThumbDown {...getIconProps("red")} />
          )}
          {typeof data?.rating === "number" && (
            <Group gap={3}>
              {Array.from({ length: data.rating }).map((_, i) => (
                <IconStar key={i} {...getIconProps("yellow")} />
              ))}
            </Group>
          )}
          {data?.emoji && <span>{data.emoji}</span>}
          {typeof data?.comment === "string" && (
            /* Support for comment == "" in the filters */
            <Tooltip label={`“${data.comment}”`} disabled={!data.comment}>
              <IconMessage {...getIconProps("teal")} />
            </Tooltip>
          )}
          {data?.retried && (
            <IconRefresh {...getIconProps("violet")} fillOpacity={0} />
          )}
        </Group>
      </Indicator>
    </Tooltip>
  )
}
