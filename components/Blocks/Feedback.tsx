import { Group, Tooltip } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"
import {
  IconMessageCircle,
  IconRefresh,
  IconStar,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react"
import { useEffect } from "react"
import analytics from "../../utils/analytics"

export default function Feedback({ data = {} }: { data: Record<string, any> }) {
  const scheme = useColorScheme()
  useEffect(() => {
    // Feature tracking
    if (data) analytics.trackOnce("HasFeedback")
  }, [data])

  if (!data) return null

  return (
    <Group>
      {data?.thumbs === "up" && <IconThumbUp color="green" />}
      {data?.thumbs === "down" && <IconThumbDown color="red" />}
      {typeof data?.rating === "number" &&
        Array.from({ length: data.rating }).map((_, i) => (
          <IconStar
            key={i}
            color={
              scheme === "light" ? "var(--mantine-color-yellow-5)" : "yellow"
            }
          />
        ))}
      {data?.emoji && <span>{data.emoji}</span>}
      {data?.comment && (
        <Tooltip label={data.comment}>
          <IconMessageCircle color="blue" />
        </Tooltip>
      )}
      {data?.retried && <IconRefresh color="purple" />}
    </Group>
  )
}
