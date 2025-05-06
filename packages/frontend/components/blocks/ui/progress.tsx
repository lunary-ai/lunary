// components/ui/progress.tsx

import { Progress as MantineProgress } from "@mantine/core";

interface ProgressProps {
  value?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Progress({
  value = 0,
  color = "blue",
  style,
  ...props
}: ProgressProps) {
  return (
    <MantineProgress
      value={value}
      color={color}
      radius="md"
      size="md"
      style={style}
      styles={{
        root: { backgroundColor: "#f0f0f0", height: 35, borderRadius: 50 },
      }}
      {...props}
    />
  );
}
