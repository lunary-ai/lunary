import { Avatar, Text } from "@mantine/core";
import { memo } from "react";

function UserAvatar({
  profile: user,
  size = "md",
}: {
  profile: any;
  size?: string | number;
}) {
  return (
    <Avatar
      variant="outline"
      radius="xl"
      size={size}
      src={user.avatarUrl}
      styles={{
        placeholder: { border: "none", background: user?.color },
      }}
    >
      <Text c="white" size="110%" mt={"1%"} fw="bold">
        {user?.name
          ?.split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </Text>
    </Avatar>
  );
}

export default memo(UserAvatar);
