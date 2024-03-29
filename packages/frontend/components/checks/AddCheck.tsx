import { useEffect, useState } from "react"
import {
  ActionIcon,
  Combobox,
  Group,
  ScrollArea,
  useCombobox,
} from "@mantine/core"
import CHECKS_UI_DATA from "./ChecksUIData"
import { IconPlus } from "@tabler/icons-react"

export function AddCheckButton({ checks, onSelect, defaultOpened }) {
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

  useEffect(() => {
    if (defaultOpened) {
      combobox.openDropdown()
      combobox.focusTarget()
      combobox.focusSearchInput()
    }
  }, [defaultOpened])

  const options = checks
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase().trim()),
    )
    .map((item) => {
      const UIItem = CHECKS_UI_DATA[item.id] || CHECKS_UI_DATA["other"]
      return (
        <Combobox.Option value={item.id} key={item.id} variant="">
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
        withinPortal={false}
        onOptionSubmit={(val) => {
          onSelect(checks.find((item) => item.id === val))
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
            <ScrollArea.Autosize mah={200} type="always">
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
