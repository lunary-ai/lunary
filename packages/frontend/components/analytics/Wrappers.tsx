import { ActionIcon, Box, Card, Group } from "@mantine/core";
import { IconCircleCheck, IconCirclePlus } from "@tabler/icons-react";
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
    <Card>
      <Card.Section>
        <Group justify="end">
          {icon ? (
            icon({ selected, onClick: onSelected })
          ) : (
            <ActionIcon
              variant="transparent"
              onClick={onSelected}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                zIndex: 30,
              }}
              color={selected ? "blue" : "gray"}
            >
              {selected ? (
                <IconCircleCheck size="22" />
              ) : (
                <IconCirclePlus size="22" />
              )}
            </ActionIcon>
          )}

          {icons &&
            icons.reverse().map((icon, index) => (
              <ActionIcon
                variant="subtle"
                style={{
                  position: "absolute",
                  top: "15px",
                  right: `${30 * (index + 1) + 20}px`,
                  zIndex: 30,
                }}
                color={icon.color}
                onClick={icon.onClick}
              >
                <icon.icon size="12" />
              </ActionIcon>
            ))}
        </Group>
      </Card.Section>

      <Card.Section h="calc(100% + 33px)">{children}</Card.Section>
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
