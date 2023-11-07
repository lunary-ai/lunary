import { formatAppUser } from "@/utils/format"
import { Anchor, Avatar, Group, MantineNumberSize } from "@mantine/core"
import { memo } from "react"
import ProtectedText from "./ProtectedText"

const colors = [
  "cyan",
  "purple",
  "violet",
  "blue",
  "red",
  "teal",
  "yellow",
  "pink",
  "indigo",
  "green",
]

function AppUserAvatar({
  user,
  size = "md",
  withName = false,
}: {
  user: any
  size?: MantineNumberSize
  withName?: boolean
}) {
  // use user.id (int) as seed for random color
  const color = colors[user?.id % colors.length]

  if (!user) return null

  const nameOrEmail = formatAppUser(user)

  return (
    <Group spacing="sm">
      <Avatar lh={0.4} radius="xl" color={color} size={size}>
        {nameOrEmail?.slice(0, 2)?.toUpperCase()}
      </Avatar>
      {withName && (
        <Anchor
          sx={{
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          href={`/users/${user.id}`}
        >
          <ProtectedText>{formatAppUser(user)}</ProtectedText>
        </Anchor>
      )}
    </Group>
  )
}

export default memo(AppUserAvatar)
