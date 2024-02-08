import { useState } from "react"
import {
  useCombobox,
  Combobox,
  Text,
  Button,
  Box,
  Group,
  CheckIcon,
} from "@mantine/core"

// TODO: object that maps a filter label with it's hooks

export default function MultiSelectButton({
  label,
  items,
  selectedItems,
  setSelectedItems,
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  })

  const options = items.map((item) => (
    <Combobox.Option value={item} key={item}>
      <Group>
        {selectedItems.includes(item) && <CheckIcon size={12} />}
        <span>{item}</span>
      </Group>
    </Combobox.Option>
  ))

  return (
    <>
      <Combobox
        store={combobox}
        width={250}
        position="bottom-start"
        withinPortal={false}
        positionDependencies={[selectedItems]}
        onOptionSubmit={(val) => {
          setSelectedItems(
            (current) =>
              current.includes(val)
                ? current.filter((item) => item !== val)
                : [...current, val],
            combobox.closeDropdown(),
          )
        }}
      >
        <Combobox.Target>
          <Button onClick={() => combobox.toggleDropdown()}>{label}</Button>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>{options}</Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </>
  )
}
