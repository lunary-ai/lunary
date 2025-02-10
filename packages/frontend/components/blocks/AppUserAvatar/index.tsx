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

interface AppUserAvatarProps {
  user: any;
  size?: any;
  withName?: boolean;
  maw?: string;
  withLink?: boolean;
}

function AppUserAvatar({
  user,
  size = "md",
  withName = false,
  maw,
  withLink = false,
}: AppUserAvatarProps) {
  if (!user) return null;

  // Use user.id as a seed for the random color
  const color = colors[user.id % colors.length];
  const nameOrEmail = formatAppUser(user);

  const content = (
    <Group gap="xs" wrap="nowrap" maw={maw || "auto"}>
      <Avatar lh={0.4} radius="xl" color={color} size={size}>
        {nameOrEmail?.slice(0, 2)?.toUpperCase()}
      </Avatar>
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

  // If withLink is true, wrap the whole element in an Anchor.
  // Otherwise, simply return the content.
  return withLink ? (
    <Anchor
      href={`/users/${user.id}`}
      className={styles.anchor}
      style={{
        textDecoration: "none",
        color: "black",
        display: "inline-block",
      }}
    >
      {content}
    </Anchor>
  ) : (
    content
  );
}

export default memo(AppUserAvatar);
