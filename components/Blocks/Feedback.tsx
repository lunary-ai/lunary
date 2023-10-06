import { Group, Tooltip } from "@mantine/core"
import {
  IconMessageCircle,
  IconRefresh,
  IconStar,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react"

export default function Feedback({ data = {} }: { data: Record<string, any> }) {
  if (!data) return null

  return (
    <Group>
      {data?.thumbs === "up" && <IconThumbUp color="green" />}
      {data?.thumbs === "down" && <IconThumbDown color="red" />}
      {typeof data?.rating === "number" &&
        Array.from({ length: data.rating }).map((_, i) => (
          <IconStar key={i} color="yellow" />
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
