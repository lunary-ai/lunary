import {
  ActionIcon,
  Box,
  Button,
  JsonInput,
  JsonInputProps,
  Modal,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsMaximize } from "@tabler/icons-react";

type ExpandableJsonInputProps = JsonInputProps & {
  value: string;
  onChange: (value: string) => void;
};

export default function ExpandableJsonInput({
  value,
  onChange,
  ...props
}: ExpandableJsonInputProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={<Title order={3}>Edit JSON Payload</Title>}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        size="xl"
      >
        <JsonInput
          size="md"
          placeholder='{"key": "value"}'
          radius="sm"
          minRows={10}
          maxRows={20}
          autosize
          formatOnBlur
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

      <Box style={{ position: "relative" }}>
        <JsonInput
          {...props}
          value={value}
          onChange={onChange}
        />
        <ActionIcon
          size="xs"
          onClick={open}
          aria-label="expand json editor"
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