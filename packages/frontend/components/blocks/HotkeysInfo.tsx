import { Kbd, Text } from "@mantine/core";
import { CSSProperties } from "react";

interface HotkeysInfoProps {
  hot?: string;
  size?: string;
  style?: CSSProperties;
}

export default function HotkeysInfo({
  hot,
  size = "sm",
  style = {},
}: HotkeysInfoProps) {
  const fz = size === "xs" ? 10 : 14;

  return (
    <span style={style}>
      <Kbd size={size} py={0} fz={fz}>
        ⌘
      </Kbd>
      <Text c="dimmed" size={size} span>
        {` + `}
      </Text>
      <Kbd size={size} py={1} fz={fz}>
        {hot?.replace("Enter", "⏎")}
      </Kbd>
    </span>
  );
}
