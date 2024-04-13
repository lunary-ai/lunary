import {
  Box,
  Button,
  Card,
  Center,
  Group,
  Overlay,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core"
import { IconMessage } from "@tabler/icons-react"
import CopyText from "../blocks/CopyText"
import { useProject } from "@/utils/dataHooks"
import { ListFeatures } from "./Paywall"
import config from "@/utils/config"

export default function Empty({
  Icon,
  title,
  description,
  enable,
  children,
  buttonLabel = "Documentation →",
  features,
  onClick,
  showProjectId,
}: {
  title: string
  description?: string
  enable?: boolean
  features?: string[]
  showProjectId?: boolean
  Icon?: React.ComponentType<any>
  buttonLabel?: string
  onClick?: () => void
  children?: React.ReactNode
}) {
  const { project } = useProject()

  if (!enable && children) {
    return children
  }

  const btnProps =
    typeof onClick !== "undefined"
      ? {
          onClick,
        }
      : {
          component: "a",
          target: "_blank",
          href: `https://lunary.ai/docs?app=${project?.id}`,
        }

  return (
    <Box
      pos="absolute"
      className="unblockable"
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
        zIndex={3}
        blur={3}
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
        <Card withBorder p={50} w="fit-content" miw={600}>
          <Stack align="start" gap="xl">
            <Group>
              <ThemeIcon size={42} radius={12}>
                {Icon && <Icon size={26} />}
              </ThemeIcon>
              <Title order={3}>{title}</Title>
            </Group>
            {description && <Text size="lg">{description}</Text>}
            {features && <ListFeatures features={features} />}
            <Button size="md" {...btnProps} data-testid="empty-action">
              {buttonLabel}
            </Button>
            {showProjectId && (
              <Group>
                <Text>Project ID: </Text>
                <CopyText value={project?.id} />
              </Group>
            )}
            {!config.IS_SELF_HOSTED && (
              <Stack>
                <Text size="sm">Any issue? Get help from a founder.</Text>
                <Group>
                  <Button
                    size="sm"
                    leftSection={<IconMessage size={16} />}
                    color="blue"
                    variant="light"
                    onClick={() => {
                      $crisp.push(["do", "chat:open"])
                    }}
                  >
                    Chat with us
                  </Button>
                </Group>
              </Stack>
            )}
          </Stack>
        </Card>
      </Overlay>
      {children && <Box p="xl">{children}</Box>}
    </Box>
  )
}
