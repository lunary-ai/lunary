import React, { useContext, useState, useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import { ProjectContext } from "@/utils/context";
import { fetcher } from "@/utils/fetcher";
import {
  Combobox,
  useCombobox,
  TextInput,
  Button,
  ScrollArea,
  PillsInput,
  Pill,
  Text,
  Group,
  CheckIcon,
} from "@mantine/core";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import AppUserAvatar from "../blocks/AppUserAvatar";

const PAGE_SIZE = 10;

export default function UserSelectInput({ value, onChange, width }) {
  const values = value || [];
  const { projectId } = useContext(ProjectContext);
  // search holds the term used for filtering.
  const [search, setSearch] = useState("");
  // selectedUser holds the current selected user id (if any).

  const [selectedUsers, setSelectedUsers] = useQueryState<Array<number>>(
    "users",
    parseAsArrayOf(parseAsInteger).withDefault([]),
  );

  // SWRInfinite getKey now includes the search term.
  const getKey = (pageIndex, previousPageData) => {
    // Stop fetching if the previous page returned an empty array.
    if (previousPageData && previousPageData.length === 0) return null;
    return `/filters/users?limit=${PAGE_SIZE}&page=${pageIndex}&projectId=${projectId}&search=${encodeURIComponent(
      search,
    )}`;
  };

  const { data, error, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher.get,
  );

  // When the search term changes, clear the previous pages and reset pagination.
  useEffect(() => {
    // Clear cached pages to avoid mixing old and new results.
    mutate([], false);
    setSize(1);
  }, [search, setSize, mutate]);

  // Determine various loading and pagination states.
  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE);

  // Flatten pages into a single list.
  const users = data ? data.flat() : [];

  // Initialize the Mantine combobox store.
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex(),
  });

  // When an option is submitted, store its value and close the dropdown.
  function handleValueSelect(val) {
    // onChange(
    //   values.includes(val) ? values.filter((v) => v !== val) : [...values, val],
    // );
    // setSelectedUser(val);
    // combobox.closeDropdown();
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  }

  function handleValueRemove(val) {
    onChange(values.filter((v) => v !== val));
  }

  if (error) {
    return <div>Error loading users.</div>;
  }

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
      <Combobox.DropdownTarget>
        <PillsInput
          onClick={() => combobox.openDropdown()}
          variant="unstyled"
          size="xs"
          miw={width}
          w="min-content"
        >
          <Combobox.Target>
            <Pill.Group
              style={{
                flexWrap: "nowrap",
                overflow: "hidden",
              }}
            >
              {values.length >= 4 ? (
                <Pill>{values.length} selected</Pill>
              ) : (
                values.map((value) => (
                  <Pill
                    key={value}
                    withRemoveButton
                    maw="130"
                    onRemove={() => handleValueRemove(value)}
                  >
                    {value}
                  </Pill>
                ))
              )}
            </Pill.Group>
          </Combobox.Target>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown
        miw={180}
        style={{ maxHeight: 300, overflowY: "scroll" }}
      >
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search..."
          style={{ tope: 0, zIndex: 2, position: "sticky" }}
        />

        <ScrollArea.Autosize
          type="scroll"
          mah={250}
          onBottomReached={() =>
            !isReachingEnd && !isLoadingMore && setSize(size + 1)
          }
        >
          <Combobox.Options>
            {users.length > 0
              ? users.map((user) => (
                  <Combobox.Option
                    key={user.id}
                    value={user.id}
                    active={values.includes(user.id)}
                  >
                    <Group gap="sm" wrap="nowrap">
                      {values.includes(user.id) ? (
                        <CheckIcon size={12} />
                      ) : null}
                      <AppUserAvatar user={user} withName={true} size="sm" />
                    </Group>
                  </Combobox.Option>
                ))
              : !isLoadingMore && (
                  <Combobox.Empty>No users found</Combobox.Empty>
                )}
          </Combobox.Options>
          {isLoadingMore && (
            <Text
              size="12px"
              c="gray"
              style={{ padding: "0.5rem", textAlign: "center" }}
            >
              Fetching...
            </Text>
          )}
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}
