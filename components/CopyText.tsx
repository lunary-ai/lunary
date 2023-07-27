import {
  ActionIcon,
  Code,
  CopyButton,
  Group,
  Text,
  Tooltip,
} from "@mantine/core"
import { IconCheck, IconCopy } from "@tabler/icons-react"

export const SuperCopyButton = ({ value }) => (
  <CopyButton value={value} timeout={2000}>
    {({ copied, copy }) => (
      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="right">
        <ActionIcon color={copied ? "teal" : "gray"} onClick={copy}>
          {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
        </ActionIcon>
      </Tooltip>
    )}
  </CopyButton>
)

export default function CopyText({ color = "violet", value }) {
  return (
    <Group spacing={0} display="inline-flex">
      <Code ml={5} color={color}>
        {value}
      </Code>
      <SuperCopyButton value={value} />
    </Group>
  )
}
