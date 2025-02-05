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
} from "@mantine/core";

const PAGE_SIZE = 5;
export function useUserInfiniteSWR(key, search: string | null) {
  const { projectId } = useContext(ProjectContext);

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && previousPageData.length === 0) return null;
    return `/filters/users?limit=${PAGE_SIZE}&page=${pageIndex}&projectId=${projectId}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  }

  const { data, error, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher.get,
  );

  useEffect(() => {
    // When the search term changes, clear the previous pages and reset pagination.
    mutate([], false);
    setSize(1);
  }, [search, setSize, mutate]);

  function loadMore() {
    const isEmpty = data?.[0]?.length === 0;
    const isReachingEnd =
      isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE);

    if (!isReachingEnd) {
      setSize(size + 1);
    }
  }

  return {
    data,
    error,
    size,
    setSize,
    mutate,
    loadMore,
  };
}

function UserCombobox() {
  const [search, setSearch] = useState("");
}

function UserComboboxOld() {
  const { projectId } = useContext(ProjectContext);
  // search holds the term used for filtering.
  const [search, setSearch] = useState("");
  // selectedUser holds the current selected user id (if any).
  const [selectedUser, setSelectedUser] = useState("");

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
    // Optionally clear any previous selection
    setSelectedUser("");
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
  const handleOptionSubmit = (val) => {
    setSelectedUser(val);
    combobox.closeDropdown();
  };

  if (error) {
    return <div>Error loading users.</div>;
  }

  return (
    <Combobox store={combobox} onOptionSubmit={handleOptionSubmit}>
      {/* Combobox target: a TextInput that displays the search term or the selected value */}
      <Combobox.Target>
        <TextInput
          placeholder="Search for a user"
          value={selectedUser || search}
          onChange={(event) => {
            // Update the search term; this clears any previous selection.
            setSearch(event.currentTarget.value);
            setSelectedUser("");
            combobox.openDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        {/* Optional search input inside the dropdown */}
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search users..."
        />

        {/* Render the options list inside a scrollable area */}
        <ScrollArea.Autosize type="scroll" mah={200}>
          <Combobox.Options>
            {users.length > 0 ? (
              users.map((user) => (
                <Combobox.Option key={user.id} value={user.id}>
                  {user.id}
                </Combobox.Option>
              ))
            ) : (
              <Combobox.Empty>No users found</Combobox.Empty>
            )}
          </Combobox.Options>
        </ScrollArea.Autosize>

        {/* "Load More" button if more pages are available */}
        {!isReachingEnd && (
          <div style={{ padding: "0.5rem", textAlign: "center" }}>
            <Button
              variant="light"
              onClick={() => setSize(size + 1)}
              disabled={isLoadingMore}
              size="xs"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default UserCombobox;
