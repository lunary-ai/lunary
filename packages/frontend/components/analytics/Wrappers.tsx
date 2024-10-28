import { Text, Card, Group, ActionIcon, Box } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";

export function Selectable({
  header,
  isSelected,
  icon,
  icons,
  children,
  onSelect,
}: {
  icons?: any[];
  children: any;
  header?: string;
  isSelected?: boolean;
  icon?: (props: { onClick: () => any; selected: boolean }) => any;
  onSelect?: () => any;
}) {
  const [selected, setSelected] = useState(!!isSelected);

  function onSelected() {
    setSelected(!selected);
    onSelect?.();
  }

  return (
    <Card withBorder>
      <Card.Section p="xs">
        <Group justify="space-between">
          <Text fw={500}>{header}</Text>

          {icon ? (
            icon({ selected, onClick: onSelected })
          ) : (
            <ActionIcon
              onClick={onSelected}
              color={selected ? "red" : undefined}
            >
              {selected ? <IconMinus size="12" /> : <IconPlus size="12" />}
            </ActionIcon>
          )}

          {icons &&
            icons.map((icon) => (
              <ActionIcon
                variant="subtle"
                color={icon.color}
                onClick={icon.onClick}
              >
                <icon.icon size="12" />
              </ActionIcon>
            ))}
        </Group>
      </Card.Section>

      <Card.Section>{children}</Card.Section>
    </Card>
  );
}

export function Draggable({ id, children, editMode }) {
  const [{ isDragging }, element] = useDrag(
    () => ({
      type: "chart",
      item: { id },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
      canDrag: () => editMode,
    }),
    [editMode],
  );

  return (
    <Box
      ref={element}
      h="100%"
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: editMode ? "move" : "auto",
      }}
    >
      {children}
    </Box>
  );
}

export function Droppable({ children, editMode, onDrop }) {
  const [{ isOver }, element] = useDrop(
    () => ({
      accept: "chart",
      drop: onDrop,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
      canDrop: () => editMode,
    }),
    [editMode],
  );

  return (
    <Box
      ref={element}
      h="100%"
      style={
        isOver
          ? {
              opacity: 0.4,
              border: "2px dashed #ccc",
              borderRadius: "var(--mantine-radius-md)",
            }
          : {}
      }
    >
      {children}
    </Box>
  );
}
