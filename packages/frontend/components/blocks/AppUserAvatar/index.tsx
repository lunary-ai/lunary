import { formatAppUser } from "@/utils/format"
import { Anchor, Avatar, Group } from "@mantine/core"
import { memo } from "react"
import ProtectedText from "../ProtectedText"
import styles from "./index.module.css"

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
  size?: any
  withName?: boolean
}) {
  // use user.id (int) as seed for random color
  const color = colors[user?.id % colors.length]

  if (!user) return null

  const nameOrEmail = formatAppUser(user)

  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar lh={0.4} radius="xl" color={color} size={size}>
        {nameOrEmail?.slice(0, 2)?.toUpperCase()}
      </Avatar>
      {withName && (
        <Anchor className={styles.anchor} href={`/users/${user.id}`}>
          <ProtectedText>{nameOrEmail}</ProtectedText>
        </Anchor>
      )}
    </Group>
  )
}

export default memo(AppUserAvatar)
