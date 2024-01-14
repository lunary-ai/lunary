import { useState } from "react"
import {
  ActionIcon,
  Box,
  Button,
  Combobox,
  Group,
  ScrollArea,
  Text,
  useCombobox,
} from "@mantine/core"
import FILTERS_UI_DATA from "./UIData"
import { IconPlus } from "@tabler/icons-react"

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
    .map((item) => {
      const UIItem = FILTERS_UI_DATA[item.id] || FILTERS_UI_DATA["other"]
      return (
        <Combobox.Option
          value={item.id}
          key={item.id}
          c={UIItem.color}
          variant=""
        >
          <Group gap={6}>
            <UIItem.icon size={14} />
            {item.name}
          </Group>
        </Combobox.Option>
      )
    })

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
          <ActionIcon
            variant="light"
            size="md"
            onClick={() => combobox.toggleDropdown()}
          >
            <IconPlus size={14} />
          </ActionIcon>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Type to filter"
          />
          <Combobox.Options>
            <ScrollArea.Autosize type="scroll" mah={200}>
              {options.length > 0 ? (
                options
              ) : (
                <Combobox.Empty>Nothing found</Combobox.Empty>
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </>
  )
}
