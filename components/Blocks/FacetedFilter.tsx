import {
  Button,
  Checkbox,
  Combobox,
  Divider,
  Flex,
  Group,
  Pill,
  useCombobox,
} from "@mantine/core"
import { IconCirclePlus } from "@tabler/icons-react"
import { useState } from "react"

// TODO: proper typing for props
export default function FacetedFilter({
  name,
  items = [],
  render,
  selectedItems,
  setSelectedItems,
  withSearch = true,
}: {
  name: string
  items: string[] | any
  render?: any
  selectedItems: any
  setSelectedItems: any
  withSearch?: boolean
}) {
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

  function searchFilter(item) {
    if (typeof item === "string") {
      return item?.toLowerCase()?.includes(search.toLowerCase().trim())
    }
    return true
  }

  const options = items.filter(searchFilter).map((item) => (
    <Combobox.Option value={item} key={item}>
      <Group gap="sm">
        <Checkbox
          checked={selectedItems.includes(item)}
          onChange={() => {}}
          aria-hidden
          tabIndex={-1}
          style={{ pointerEvents: "none" }}
        />
        {render ? render(item) : <span>{item}</span>}
      </Group>
    </Combobox.Option>
  ))

  return (
    <Combobox
      store={combobox}
      position="bottom-start"
      withArrow
      withinPortal={false}
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
          disabled={!withSearch}
        />
        <Combobox.Options mah={500} style={{ overflowY: "auto" }}>
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
