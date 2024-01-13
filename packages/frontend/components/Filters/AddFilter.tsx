import { useState } from "react"
import { Box, Button, Combobox, Text, useCombobox } from "@mantine/core"

export function AddFilterButton({ filters, onSelect }) {
  const [search, setSearch] = useState("")

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      combobox.focusTarget()

      setSearch("")
    },

    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  const options = filters
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase().trim()),
    )
    .map((item) => (
      <Combobox.Option value={item.id} key={item.id}>
        {item.name}
      </Combobox.Option>
    ))

  return (
    <>
      <Combobox
        store={combobox}
        width={250}
        position="bottom-start"
        withArrow
        withinPortal={false}
        onOptionSubmit={(val) => {
          onSelect(filters.find((item) => item.id === val))
          combobox.closeDropdown()
        }}
      >
        <Combobox.Target withAriaAttributes={false}>
          <Button
            variant="light"
            size="xs"
            onClick={() => combobox.toggleDropdown()}
          >
            Add filter
          </Button>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search groceries"
          />
          <Combobox.Options>
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>Nothing found</Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </>
  )
}
