import { showErrorNotification } from "@/utils/errors";
import { Modal, Group, Button, Input, CloseButton } from "@mantine/core";
import { useState } from "react";

export function ConfirmModal({ title, opened, close, onConfirm }) {
  return (
    <Modal centered opened={opened} onClose={close} radius={"md"} title={title}>
      <Group align="right" mt="md">
        <Button variant="subtle" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="filled"
          color="red"
          onClick={() => {
            onConfirm();
            close();
          }}
        >
          Confirm
        </Button>
      </Group>
    </Modal>
  );
}

export function SaveAsModal({ opened, close, title, onConfirm }) {
  const [name, setName] = useState("");

  const confirm = async () => {
    try {
      await onConfirm(name);
      close();
    } catch (error) {
      showErrorNotification(error.message);
    }
  };

  return (
    <Modal centered opened={opened} onClose={close} radius={"md"} title={title}>
      <Input.Wrapper>
        <Input
          mt="md"
          value={name}
          placeholder="Clearable input"
          onChange={(event) => setName(event.currentTarget.value)}
          rightSectionPointerEvents="all"
          rightSection={
            <CloseButton
              aria-label="Clear input"
              onClick={() => setName("")}
              style={{ display: name ? undefined : "none" }}
            />
          }
        />
      </Input.Wrapper>
      <Group align="right" mt="md">
        <Button variant="subtle" onClick={close}>
          Cancel
        </Button>
        <Button variant="filled" onClick={confirm}>
          Save
        </Button>
      </Group>
    </Modal>
  );
}
