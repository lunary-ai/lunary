// DEPRECATED: Use CheckPicker
// Kept to copy search method for users and render prop

import { useProject, useProjects } from "@/utils/dataHooks"
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
import { useEffect, useRef, useState } from "react"

// TODO: proper props type
export default function FacetedCheck({
  name,
  items = [],
  render,
  selectedItems,
  setSelectedItems,
  withSearch = true,
  withUserSearch = false,
}: {
  name: string
  items: string[] | any
  render?: any
  selectedItems: any
  setSelectedItems: any
  withSearch?: boolean
  withUserSearch?: boolean
}) {
  const [search, setSearch] = useState("")

  const { project } = useProject()

  const prevAppIdRef = useRef<string>(null)

  useEffect(() => {
    if (app?.id) {
      if (prevAppIdRef.current !== app.id) {
        setSelectedItems([])
      }
      prevAppIdRef.current = app.id
    }
  }, [app, prevAppIdRef, setSelectedItems])

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

  function defaultSearchCheck(item) {
    if (typeof item === "string") {
      return item?.toLowerCase()?.includes(search.toLowerCase().trim())
    }
    return true
  }

  function userSearchCheck(item) {
    const searchTerm = search.toLowerCase().trim()

    return (
      item.external_id.toLowerCase().includes(searchTerm) ||
      (item.props?.email &&
        item.props.email.toLowerCase().includes(searchTerm)) ||
      (item.props?.name &&
        item.props.name.toLowerCase().includes(searchTerm)) ||
      (item.props?.firstName &&
        item.props.firstName.toLowerCase().includes(searchTerm)) ||
      (item.props?.lastName &&
        item.props.lastName.toLowerCase().includes(searchTerm))
    )
  }

  const searchCheck = withUserSearch ? userSearchCheck : defaultSearchCheck

  const options = items.filter(searchCheck).map((item) => (
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
          variant="light"
          size="compact-xs"
          onClick={() => combobox.toggleDropdown()}
        >
          <Flex align="center">
            <IconCirclePlus stroke={1.8} size={12} style={{ marginRight: 8 }} />
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
