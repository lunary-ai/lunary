import { capitalize } from "@/utils/format";
import { Avatar, Text } from "@mantine/core";
import { memo } from "react";

function UserAvatar({
  profile: user,
  size = "md",
}: {
  profile: any;
  size?: string | number;
}) {
  const text = user?.name || user?.email;
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
      {text && (
        <Text c="white" size="110%" mt={"1%"} fw="bold">
          {capitalize(text)
            ?.split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </Text>
      )}
    </Avatar>
  );
}

export default memo(UserAvatar);
