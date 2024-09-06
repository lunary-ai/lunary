import {
  ActionIcon,
  Box,
  Button,
  MantineSize,
  Modal,
  Text,
  Textarea,
  TextareaProps,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsMaximize } from "@tabler/icons-react";

type VariableTextareaProps = TextareaProps & {
  name: string;
  value: string;
  w?: MantineSize;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  [key: string]: any;
};

export default function VariableTextarea({
  name,
  value,
  w,
  onChange,
  ...props
}: VariableTextareaProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={<Title order={3}>Edit variable content</Title>}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        size="xl"
      >
        <Textarea
          size="md"
          placeholder="Paste variable content here"
          radius="sm"
          minRows={2}
          rows={10}
          autosize
          value={value}
          onChange={onChange}
        />

        <Button
          my="md"
          variant="default"
          style={{ float: "right" }}
          onClick={close}
        >
          Save
        </Button>
      </Modal>

      <Box style={{ position: "relative" }} w={w}>
        <Textarea {...props} onChange={onChange} value={value} />
        <ActionIcon
          size="xs"
          onClick={open}
          aria-label="expand textarea"
          variant="transparent"
          style={{
            position: "absolute",
            right: "10px",
            bottom: "7px",
          }}
        >
          <IconArrowsMaximize size={14} />
        </ActionIcon>
      </Box>
    </>
  );
}
