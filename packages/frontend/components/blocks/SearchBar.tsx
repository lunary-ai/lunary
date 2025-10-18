import {
  ActionIcon,
  Button,
  Group,
  Input,
  Loader,
  Menu,
  Tooltip,
  Text,
  Stack,
} from "@mantine/core";
import { useFocusWithin } from "@mantine/hooks";
import {
  IconCaretDown,
  IconCheck,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react";
import HotkeysInfo from "./HotkeysInfo";

import { useGlobalShortcut } from "@/utils/hooks";

type SearchMode = "keyword" | "ai";

const MODE_CONFIG: Record<
  SearchMode,
  { label: string; placeholder: string; icon: JSX.Element }
> = {
  keyword: {
    label: "Direct Search",
    placeholder: "Search in input and output",
    icon: <IconSearch size={14} />,
  },
  ai: {
    label: "Ask AI",
    placeholder: "Ask AI with natural language to find data for you",
    icon: <IconSparkles size={14} />,
  },
};

type SearchBarProps = {
  value: string;
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  loading?: boolean;
  disabled?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">;

export default function SearchBar({
  value,
  mode,
  onModeChange,
  onChange,
  onSubmit,
  loading,
  disabled,
  ...props
}: SearchBarProps) {
  const { ref, focused } = useFocusWithin();
  const { maw, w, placeholder, ...rest } = props;

  const currentMode: SearchMode = mode ?? "keyword";

  useGlobalShortcut([
    [
      "mod+K",
      () => {
        if (ref.current?.focus) ref.current.focus();
      },
    ],
  ]);

  const leftSection = onModeChange ? (
    <Menu withinPortal position="bottom-start">
      <Menu.Target>
        <Button
          variant="subtle"
          size="xs"
          radius="md"
          color="gray"
          aria-label="Select search mode"
          leftSection={MODE_CONFIG[currentMode].icon}
          rightSection={<IconCaretDown size={10} />}
          styles={{
            root: {
              paddingInline: 10,
              height: 28,
              display: "flex",
              alignItems: "center",
            },
            section: { display: "flex", alignItems: "center" },
          }}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={600}>
            Search mode
          </Text>
        </Menu.Label>
        <Menu.Item
          leftSection={<IconSearch size={16} />}
          onClick={() => {
            onModeChange("keyword");
            setTimeout(() => ref.current?.focus(), 0);
          }}
          rightSection={
            currentMode === "keyword" ? <IconCheck size={14} /> : undefined
          }
          disabled={currentMode === "keyword"}
        >
          <Stack gap={2} align="flex-start">
            <Text size="sm" fw={500}>
              {MODE_CONFIG.keyword.label}
            </Text>
            <Text size="xs" c="dimmed">
              Type to match input/output text directly.
            </Text>
          </Stack>
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSparkles size={16} />}
          onClick={() => {
            onModeChange("ai");
            setTimeout(() => ref.current?.focus(), 0);
          }}
          rightSection={
            currentMode === "ai" ? <IconCheck size={14} /> : undefined
          }
          disabled={currentMode === "ai"}
        >
          <Stack gap={2} align="flex-start">
            <Text size="sm" fw={500}>
              {MODE_CONFIG.ai.label}
            </Text>
            <Text size="xs" c="dimmed">
              Ask in natural language—Lunary builds the filters.
            </Text>
          </Stack>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  ) : (
    <Button
      variant="subtle"
      color="gray"
      size="xs"
      radius="md"
      disabled
      leftSection={MODE_CONFIG[currentMode].icon}
      styles={{
        root: {
          paddingInline: 10,
          height: 28,
          display: "flex",
          alignItems: "center",
          gap: 6,
        },
        section: { display: "flex", alignItems: "center" },
      }}
    />
  );

  const rightSection = (
    <Group gap={4} align="center" wrap="nowrap">
      {!focused && currentMode === "keyword" ? (
        <HotkeysInfo
          hot="K"
          size="sm"
          style={{ marginTop: -4, marginRight: -6 }}
        />
      ) : null}
      {currentMode === "ai" && (
        <Tooltip label="Ask AI" withArrow>
          <Button
            size="xs"
            variant="gradient"
            gradient={{ from: "blue.4", to: "cyan.5" }}
            radius="md"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            loading={loading}
            leftSection={<IconSparkles size={13} />}
            styles={{
              root: {
                paddingInline: 12,
                boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.12)",
                fontWeight: 500,
              },
            }}
          >
            Ask AI
          </Button>
        </Tooltip>
      )}
    </Group>
  );

  return (
    <Input
      leftSection={leftSection}
      leftSectionPointerEvents="auto"
      maw={maw ?? 420}
      w={w ?? "32%"}
      type="search"
      size="sm"
      ref={ref}
      id="search"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (currentMode === "ai" && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (!loading && value.trim() && onSubmit) {
            onSubmit();
          }
        }
      }}
      rightSectionWidth={currentMode === "ai" ? 96 : 78}
      rightSectionPointerEvents="auto"
      rightSection={rightSection}
      placeholder={placeholder ?? MODE_CONFIG[currentMode].placeholder}
      disabled={disabled}
      {...rest}
    />
  );
}
