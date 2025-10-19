import type { ChangeEvent, ComponentPropsWithoutRef } from "react";
import { TextInput, CloseButton } from "@mantine/core";
import { useFocusWithin } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import HotkeysInfo from "./HotkeysInfo";

import { useGlobalShortcut } from "@/utils/hooks";

type TextInputProps = ComponentPropsWithoutRef<typeof TextInput>;

export type SearchBarProps = {
  query: string;
  setQuery: (value: string) => void;
} & Omit<
  TextInputProps,
  | "value"
  | "defaultValue"
  | "onChange"
  | "leftSection"
  | "rightSection"
  | "rightSectionWidth"
  | "rightSectionPointerEvents"
>;

export default function SearchBar({
  query,
  setQuery,
  maw = 400,
  w = "30%",
  placeholder = "Type to filter",
  id = "search",
  ...props
}: SearchBarProps) {
  const { ref, focused } = useFocusWithin<HTMLInputElement>();

  useGlobalShortcut([["mod+K", () => ref.current?.focus()]]);

  const showClear = query.length > 0;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value);
  };

  const handleClear = () => {
    setQuery("");
    ref.current?.focus();
  };

  return (
    <TextInput
      ref={ref}
      id={id}
      type="search"
      size="sm"
      maw={maw}
      w={w}
      value={query}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label="Search"
      leftSection={<IconSearch size={14} aria-hidden="true" />}
      rightSectionWidth={showClear ? 40 : 80}
      rightSectionPointerEvents="auto"
      rightSection={
        showClear ? (
          <CloseButton
            aria-label="Clear search"
            size="xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
          />
        ) : !focused ? (
          <HotkeysInfo
            hot="K"
            size="sm"
            style={{ marginTop: -4, marginRight: -13 }}
          />
        ) : null
      }
      {...props}
    />
  );
}
