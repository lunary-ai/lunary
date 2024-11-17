import { formatAppUser } from "@/utils/format";
import { Anchor, Avatar, Group } from "@mantine/core";
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
}: {
  user: any;
  size?: any;
  withName?: boolean;
}) {
  // use user.id (int) as seed for random color
  const color = colors[user?.id % colors.length];

  if (!user) return null;

  const nameOrEmail = formatAppUser(user);

  return (
    <Group gap="xs" wrap="nowrap">
      <Anchor className={styles.anchor} href={`/users/${user.id}`}>
        <Avatar lh={0.4} radius="xl" color={color} size={size}>
          {nameOrEmail?.slice(0, 2)?.toUpperCase()}
        </Avatar>
      </Anchor>
      {withName && <ProtectedText>{nameOrEmail}</ProtectedText>}
    </Group>
  );
}

export default memo(AppUserAvatar);
