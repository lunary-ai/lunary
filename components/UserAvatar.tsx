import { Avatar, Text } from "@mantine/core"
import { memo } from "react"

function UserAvatar({ profile, size = "md" }) {
  return (
    <Avatar
      variant="outline"
      radius="xl"
      size={size}
      styles={{
        placeholder: { border: "none", background: profile?.color },
      }}
    >
      <Text color="white">
        {profile?.name?.split(" ").map((name: string) => name[0])}
      </Text>
    </Avatar>
  )
}

export default memo(UserAvatar)
