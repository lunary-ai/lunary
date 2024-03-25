import { useOrg } from "@/utils/dataHooks"
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
} from "@mantine/core"
import { IconBolt, IconCheck } from "@tabler/icons-react"
import { openUpgrade } from "./UpgradeModal"

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

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
  )
}

export default function Paywall({
  plan,
  feature,
  children,
  list,
  description,
  Icon,
}: {
  plan: string
  feature: string
  description: string
  list: string[]
  children: React.ReactNode
  Icon?: React.ComponentType<any>
}) {
  const { org } = useOrg()

  // Automatically disable paywall in these cases
  if (
    ["custom", "unlimited", plan].includes(org?.plan) ||
    process.env.NEXT_PUBLIC_DEMO
  ) {
    return children
  }

  return (
    <Box
      pos="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
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
              <Title order={3}>
                {feature} is available in Lunary {capitalize(plan)}
              </Title>
            </Group>
            <Text size="lg">{description}</Text>
            <ListFeatures features={list} />
            <Button
              fullWidth
              size="md"
              leftSection={<IconBolt size={20} />}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              onClick={() => openUpgrade(feature.toLowerCase())}
            >
              Upgrade to {capitalize(plan)} &rarr;
            </Button>
          </Stack>
        </Card>
      </Overlay>
      <Box>{children}</Box>
    </Box>
  )
}
