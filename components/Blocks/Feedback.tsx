import { Group } from "@mantine/core"
import { IconStar, IconThumbDown, IconThumbUp } from "@tabler/icons-react"

export default function Feedback({ data = {} }: { data: Record<string, any> }) {
  return (
    <Group>
      {data?.thumbs === "up" && <IconThumbUp color="green" />}
      {data?.thumbs === "down" && <IconThumbDown color="red" />}
      {typeof data?.rating === "number" &&
        Array.from({ length: data.rating }).map((_, i) => (
          <IconStar key={i} color="yellow" />
        ))}
    </Group>
  )
}
