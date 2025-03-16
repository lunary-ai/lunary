import { useOrg } from "@/utils/dataHooks";
import {
  Box,
  Button,
  Card,
  Group,
  List,
  Overlay,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBolt, IconCheck } from "@tabler/icons-react";
import { openUpgrade } from "./UpgradeModal";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const ListFeatures = ({ features }) => {
  return (
    <List
      spacing="md"
      size="md"
      center
      icon={
        <ThemeIcon variant="outline" color="teal" size={28} radius="xl">
          <IconCheck stroke={3} size={18} />
        </ThemeIcon>
      }
    >
      {features.map((title, i) => (
        <List.Item key={i}>
          <Text fw={500}>{title}</Text>
        </List.Item>
      ))}
    </List>
  );
};

export interface PaywallConfig {
  plan: string;
  feature: string;
  description: string;
  enabled?: boolean;
  list?: string[];
  Icon?: React.ComponentType<any>;
  p?: number;
}

interface PaywallProps extends PaywallConfig {
  children: React.ReactNode;
}

export default function Paywall(props: PaywallProps) {
  const { plan, feature, children, enabled, list, description, Icon, p } =
    props;
  const { org } = useOrg();

  // Automatically disable paywall in these cases
  if (
    typeof enabled !== "undefined"
      ? !enabled
      : ["custom", plan].includes(org?.plan) || process.env.NEXT_PUBLIC_DEMO
  ) {
    return children;
  }

  // Legacy Unlimited plan has access to all features
  if (plan === "team" && org?.plan === "unlimited") {
    return children;
  }

  const isEnterpriseFeature = plan === "enterprise";

  return (
    <Box
      pos="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      p={p}
      h={`100%`}
      style={{
        overflow: "hidden",
      }}
    >
      <Overlay
        zIndex={1}
        blur={2}
        top={0}
        left={0}
        right={0}
        display="flex"
        bottom={0}
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card p={50} w={650} shadow="md" className="unblockable">
          <Stack align="start" gap="xl">
            <Group wrap="nowrap">
              <ThemeIcon size={42} radius={12}>
                {Icon && <Icon size="20" />}
              </ThemeIcon>
              <Title order={3} lh={1} lts={-0.2}>
                {
                  <Text
                    span
                    fw={"inherit"}
                    fz={"inherit"}
                    lts={"inherit"}
                    variant="gradient"
                    gradient={{ from: "indigo", to: "cyan", deg: 45 }}
                  >
                    {feature}
                  </Text>
                }
                <span>{` is available in the ${capitalize(plan)} plan`}</span>
              </Title>
            </Group>
            {description && <Text size="lg">{description}</Text>}
            {list && <ListFeatures features={list} />}
            <Button
              fullWidth
              size="md"
              leftSection={<IconBolt size={20} />}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              onClick={() =>
                isEnterpriseFeature
                  ? window.open("https://lunary.ai/schedule", "_blank")
                  : openUpgrade(feature.toLowerCase())
              }
            >
              {isEnterpriseFeature
                ? "Contact Sales"
                : `Upgrade to ${capitalize(plan)}`}
            </Button>
          </Stack>
        </Card>
      </Overlay>
      <Box>{children}</Box>
    </Box>
  );
}
