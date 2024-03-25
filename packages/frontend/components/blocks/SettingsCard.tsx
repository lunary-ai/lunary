import { Card, Stack, Title } from "@mantine/core"

// so we can have an harmonized title for all cards
export function SettingsCard({
  title,
  children,
  align,
  gap = "lg",
}: {
  title
  children: React.ReactNode
  align?: string
  gap?: string
}) {
  return (
    <Card withBorder p="lg" style={{ overflow: "visible" }}>
      <Stack gap={gap} align={align}>
        <Title order={4}>{title}</Title>
        {children}
      </Stack>
    </Card>
  )
}
