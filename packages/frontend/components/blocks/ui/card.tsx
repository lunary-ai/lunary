// components/ui/card.tsx

import { Card as MantineCard } from "@mantine/core";

export function Card({
  children,
  ...props
}: React.ComponentProps<typeof MantineCard>) {
  return (
    <MantineCard radius="sm" shadow="sm" withBorder {...props}>
      {children}
    </MantineCard>
  );
}

export function CardContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div {...props} style={{ paddingTop: "1rem" }}>
      {children}
    </div>
  );
}
