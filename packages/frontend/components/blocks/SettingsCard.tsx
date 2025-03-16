import { Card, Stack, Title } from "@mantine/core";
import Paywall, { PaywallConfig } from "../layout/Paywall";

export function SettingsCard({
  title,
  children,
  align,
  paywallConfig,
  gap = "lg",
}: {
  title;
  children: React.ReactNode;
  paywallConfig?: PaywallConfig;
  align?: string;
  gap?: string;
}) {
  if (paywallConfig?.enabled) {
    return (
      <Card withBorder p="lg">
        <Stack gap={gap} align={align}>
          <Title order={4}>{title}</Title>
          <Stack
            style={{
              position: "relative",
              minHeight: 400,
              width: "100%",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Paywall {...paywallConfig}>{children}</Paywall>
          </Stack>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder p="lg" style={{ overflow: "visible" }}>
      <Stack gap={gap} align={align}>
        <Title order={4}>{title}</Title>
        {children}
      </Stack>
    </Card>
  );
}
