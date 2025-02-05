import { formatAppUser } from "@/utils/format";
import { Anchor, Avatar, Group, Text } from "@mantine/core";
import { memo } from "react";
import ProtectedText from "../ProtectedText";
import styles from "./index.module.css";

const colors = [
  "blue",
  "cyan",
  "purple",
  "violet",
  "red",
  "teal",
  "yellow",
  "pink",
  "indigo",
  "green",
];

function AppUserAvatar({
  user,
  size = "md",
  withName = false,
  maw,
}: {
  user: any;
  size?: any;
  withName?: boolean;
  maw?: string;
}) {
  // use user.id (int) as seed for random color
  const color = colors[user?.id % colors.length];

  if (!user) return null;

  const nameOrEmail = formatAppUser(user);

  return (
    <Group gap="xs" wrap="nowrap" maw={maw ? maw : "auto"}>
      <Anchor className={styles.anchor} href={`/users/${user.id}`} miw="25px">
        <Avatar lh={0.4} radius="xl" color={color} size={size}>
          {nameOrEmail?.slice(0, 2)?.toUpperCase()}
        </Avatar>
      </Anchor>
      {withName && (
        <Text
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            fontSize: "14px",
          }}
        >
          <ProtectedText>{nameOrEmail}</ProtectedText>
        </Text>
      )}
    </Group>
  );
}

export default memo(AppUserAvatar);
