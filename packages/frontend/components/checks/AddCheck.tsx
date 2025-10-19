import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Combobox,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import CHECKS_UI_DATA from "./ChecksUIData";
import {
  IconChevronRight,
  IconFilter2,
  IconSparkles,
} from "@tabler/icons-react";
import { Check } from "shared";

const DEFAULT_AI_EXAMPLES = [
  "runs from the last 24 hours",
  "requests with thumbs down feedback",
  "traces costing more than $1",
];

type AddCheckButtonProps = {
  checks: Check[];
  onSelect: (check: Check) => void;
  defaultOpened?: boolean;
  onAiFilter?: (query: string) => void;
  aiLoading?: boolean;
  aiExamples?: string[];
};

export function AddCheckButton({
  checks,
  onSelect,
  defaultOpened,
  onAiFilter,
  aiLoading,
  aiExamples,
}: AddCheckButtonProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"root" | "ai">("root");
  const [aiInput, setAiInput] = useState("");
  const aiInputRef = useRef<HTMLInputElement>(null);

  const aiEnabled = typeof onAiFilter === "function";
  const aiSuggestions = aiExamples?.length ? aiExamples : DEFAULT_AI_EXAMPLES;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox?.resetSelectedOption();
      combobox?.focusTarget();

      setSearch("");
      setView("root");
      setAiInput("");
    },

    onDropdownOpen: () => {
      if (view === "root") {
        combobox?.focusSearchInput();
      }
    },
  });

  useEffect(() => {
    if (defaultOpened && combobox) {
      combobox.openDropdown();
      combobox.focusTarget();
      combobox.focusSearchInput();
    }
  }, [defaultOpened]);

  useEffect(() => {
    if (view === "ai") {
      requestAnimationFrame(() => {
        aiInputRef.current?.focus();
      });
    }
  }, [view]);

  const filteredOptions = useMemo(
    () =>
      checks.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase().trim()),
      ),
    [checks, search],
  );

  const renderOption = (item) => {
    const UIItem = CHECKS_UI_DATA[item.id] || CHECKS_UI_DATA["other"];
    return (
      <Combobox.Option value={item.id} key={item.id} variant="">
        <Group justify="space-between" gap="xs">
          <Group gap={6}>
            <UIItem.icon size={14} />
            <Text size="sm" fw={500}>
              {item.name}
            </Text>
          </Group>
          <IconChevronRight size={14} stroke={1.5} opacity={0.6} />
        </Group>
      </Combobox.Option>
    );
  };

  const handleAiSubmit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || !aiEnabled || aiLoading) return;
    onAiFilter?.(trimmed);
    combobox.closeDropdown();
  };

  return (
    <>
      <Combobox
        store={combobox}
        width={250}
        position="bottom-start"
        withinPortal={false}
        onOptionSubmit={(val) => {
          if (val === "__ai") {
            setView("ai");
            return;
          }

          const selected = checks.find((item) => item.id === val);
          if (selected) {
            onSelect(selected);
            combobox.closeDropdown();
          }
        }}
      >
        <Combobox.Target withAriaAttributes={false}>
          <Button
            size="sm"
            variant="subtle"
            color="gray"
            pl="4px"
            radius="md"
            leftSection={<IconFilter2 size={18} />}
            styles={{
              root: {
                fontWeight: 500,
                paddingInline: 12,
                height: 30,
              },
              section: { display: "flex", alignItems: "center", gap: 4 },
            }}
            onClick={() => combobox.toggleDropdown()}
          >
            Filter
          </Button>
        </Combobox.Target>

        <Combobox.Dropdown w="300px">
          {view === "root" ? (
            <>
              <Combobox.Search
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Filter..."
              />
              <Combobox.Options>
                <ScrollArea.Autosize mah={220} type="always" scrollbars="y">
                  {aiEnabled && (
                    <Combobox.Option value="__ai" key="__ai" variant="">
                      <Group justify="space-between" gap="xs">
                        <Group gap={6}>
                          <IconSparkles size={14} />
                          <Text size="sm" fw={500}>
                            AI Filter
                          </Text>
                        </Group>
                        <IconChevronRight
                          size={14}
                          stroke={1.5}
                          opacity={0.6}
                        />
                      </Group>
                    </Combobox.Option>
                  )}
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((item) => renderOption(item))
                  ) : (
                    <Combobox.Empty>Nothing found</Combobox.Empty>
                  )}
                </ScrollArea.Autosize>
              </Combobox.Options>
            </>
          ) : (
            <Stack gap="xs" p="xs">
              <Group gap={6} align="center">
                <IconSparkles size={14} />
                <Text size="sm" fw={600}>
                  AI Filter
                </Text>
                <Badge size="xs" variant="light">
                  Beta
                </Badge>
              </Group>
              <TextInput
                ref={aiInputRef}
                value={aiInput}
                onChange={(event) => setAiInput(event.currentTarget.value)}
                placeholder="Describe what you need"
                autoComplete="off"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleAiSubmit(aiInput);
                  }
                }}
              />
              <Stack gap={4} mt="xs">
                {aiSuggestions.map((example) => (
                  <Button
                    key={example}
                    variant="subtle"
                    w="100%"
                    size="xs"
                    color="#2F2F2F"
                    fullWidth
                    justify="flex-start"
                    leftSection={<IconSparkles size={16} />}
                    style={{ fontWeight: 200 }}
                    pl={4}
                    styles={{
                      root: {},
                      inner: {
                        fontSize: 14,
                        fontWeight: 200,
                      },
                      section: { marginRight: 4 },
                    }}
                    onClick={() => {
                      setAiInput(example);
                      handleAiSubmit(example);
                    }}
                    disabled={aiLoading}
                  >
                    {example}
                  </Button>
                ))}
              </Stack>
            </Stack>
          )}
        </Combobox.Dropdown>
      </Combobox>
    </>
  );
}
