import {
  ActionIcon,
  Box,
  Button,
  Modal,
  Text,
  Textarea,
  TextareaProps,
  Title,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { IconArrowsMaximize } from "@tabler/icons-react"

type VariableTextareaProps = TextareaProps & {
  name: string
  value: string
}

export default function VariableTextarea({
  name,
  value,
  onChange,
  ...props
}: VariableTextareaProps) {
  const [opened, { open, close }] = useDisclosure(false)

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={<Title order={3}>Edit variable</Title>}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        size="xl"
      >
        <Textarea
          size="md"
          radius="sm"
          minRows={2}
          rows={10}
          autosize
          value={value}
          onChange={onChange}
        />

        <Button my="md" style={{ float: "right" }} onClick={close}>
          Save
        </Button>
      </Modal>

      <Box style={{ position: "relative" }}>
        <Textarea {...props} onChange={onChange} value={value} />
        <ActionIcon
          size="xs"
          onClick={open}
          aria-label="expand textarea"
          variant="transparent"
          style={{
            position: "absolute",
            right: "5%",
            bottom: "5%",
            marginBottom: "0.3rem",
          }}
        >
          <IconArrowsMaximize />
        </ActionIcon>
      </Box>
    </>
  )
}
