import { Avatar, MantineSize, Text } from "@mantine/core"
import { memo } from "react"

function UserAvatar({
  profile: user,
  size = "md",
}: {
  profile: any
  size?: string | number
}) {
  return (
    <Avatar
      variant="outline"
      radius="xl"
      size={size}
      styles={{
        placeholder: { border: "none", background: user?.color },
      }}
    >
      <Text c="white" size="130%" mt={"1%"} fw="bold">
        {user?.name
          ?.split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </Text>
    </Avatar>
  )
}

export default memo(UserAvatar)
