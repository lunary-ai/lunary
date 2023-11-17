import {
  Box,
  Button,
  Checkbox,
  Combobox,
  Divider,
  Flex,
  Group,
  Pill,
  PillsInput,
  Text,
  useCombobox,
} from "@mantine/core"
import { IconCirclePlus } from "@tabler/icons-react"
import { useState } from "react"
import { useModelNames } from "../../utils/dataHooks"

export default function FacetedFilter({
  name,
  items,
}: {
  name: string
  items: string[]
}) {
  const [search, setSearch] = useState("")
  const [selectedItems, setSelectedItems] = useState("model")

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

  const options = items
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option value={item} key={item}>
        <Group gap="sm">
          <Checkbox
            checked={selectedItems.includes(item)}
            onChange={() => {}}
            aria-hidden
            tabIndex={-1}
            style={{ pointerEvents: "none" }}
          />
          <span>{item}</span>
        </Group>
      </Combobox.Option>
    ))

  return (
    <Combobox
      store={combobox}
      position="bottom-start"
      withArrow
      withinPortal={true}
      width={250}
      onOptionSubmit={(val) => {
        setSelectedItems((current) =>
          current.includes(val)
            ? current.filter((item) => item !== val)
            : [...current, val],
        )
      }}
    >
      <Combobox.Target withAriaAttributes={false}>
        <Button
          variant="outline"
          size="xs"
          // style={{ borderStyle: "dashed" }}
          onClick={() => combobox.toggleDropdown()}
        >
          <Flex align="center">
            <IconCirclePlus
              stroke={1.8}
              size="16px"
              style={{ marginRight: 8 }}
            />
            {name}

            {selectedItems.length > 0 && (
              <>
                <Divider
                  orientation="vertical"
                  color="blue"
                  mx="8"
                  style={{ height: 16, alignSelf: "center" }}
                />
                <Pill>{selectedItems.length} selected</Pill>
              </>
            )}
          </Flex>
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown w="250">
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={name}
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
  )
}
