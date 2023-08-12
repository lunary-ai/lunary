import { formatAppUser } from "@/utils/format"
import { Database } from "@/utils/supaTypes"
import { Avatar, MantineNumberSize, MantineSize } from "@mantine/core"
import App from "next/app"
import { memo } from "react"

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
}: {
  user: any
  size?: MantineNumberSize
}) {
  // use user.id (int) as seed for random color
  const color = colors[user.id % colors.length]

  if (!user) return null

  const nameOrEmail = formatAppUser(user)

  return (
    <Avatar lh={0.4} radius="xl" color={color} size={size}>
      {nameOrEmail?.slice(0, 2)?.toUpperCase()}
    </Avatar>
  )
}

export default memo(AppUserAvatar)
