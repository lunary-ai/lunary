import { useProjectSWR } from "@/utils/dataHooks"
import {
  CheckIcon,
  Combobox,
  Group,
  Loader,
  Pill,
  PillsInput,
  useCombobox,
} from "@mantine/core"
import local from "next/font/local"
import { useEffect, useState } from "react"

export default function SmartCheckSelect({
  options,
  multiple,
  placeholder,
  searchable,
  customSearch,
  width,
  allowCustom,
  renderListItem,
  renderLabel = (item) => (typeof item === "object" ? item?.label : item),
  getItemValue = (item) => (typeof item === "object" ? `${item.value}` : item),
  value,
  onChange,
}) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  const [search, setSearch] = useState("")
  const [localData, setLocalData] = useState(options || [])

  const useSWRforData = typeof options === "function"
  const { data: swrCheckData, isLoading } = useProjectSWR(
    useSWRforData ? options() : null,
  )
  const data = useSWRforData ? swrCheckData || [] : localData

  const fixedValue = value || (multiple ? [] : null)

  const shouldDisplaySearch = data?.length > 5 || searchable !== false

  useEffect(() => {
    if (data && isLoading === false && shouldDisplaySearch) {
      combobox.focusSearchInput()
    }
  }, [isLoading])

  useEffect(() => {
    if (allowCustom && value) {
      const valueArray = multiple ? value : [value]
      valueArray.forEach((val) => {
        if (!localData.some((item) => getItemValue(item) === val)) {
          const newOption = { label: val, value: val }
          setLocalData((prevData) => {
            const updatedData = [...prevData, newOption]
            const uniqueData = updatedData.filter(
              (item, index, self) =>
                index ===
                self.findIndex((t) => getItemValue(t) === getItemValue(item)),
            )
            return uniqueData
          })
        }
      })
    }
  }, [localData, value, allowCustom])
  const handleValueSelect = (val: string) => {
    setSearch("")
    return multiple
      ? onChange(
          fixedValue.includes(val)
            ? fixedValue.filter((v) => v !== val)
            : [...fixedValue, val],
        )
      : onChange(val)
  }

  const handleValueRemove = (val: string) => {
    return multiple
      ? onChange(fixedValue.filter((v) => v !== val))
      : onChange(null)
  }

  function getRenderedValues() {
    if (fixedValue?.length >= 4) {
      return <Pill>{fixedValue?.length} selected</Pill>
    }
    return fixedValue.map((item) => (
      <Pill
        key={item}
        withRemoveButton
        maw={130}
        onRemove={() => handleValueRemove(item)}
      >
        {renderLabel(data?.find((d) => getItemValue(d) === item))}
      </Pill>
    ))
  }
  const renderedValue = multiple
    ? getRenderedValues()
    : renderLabel(data?.find((d) => getItemValue(d) === value))

  function optionsFilter(item) {
    if (search.length === 0) {
      return true
    }

    if (customSearch) {
      return customSearch(search, item)
    }

    return getItemValue(item)
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  }
  const renderedOptions = data?.filter(optionsFilter).map((item) => {
    const active = multiple
      ? fixedValue.includes(getItemValue(item))
      : getItemValue(item) === value
    return (
      <Combobox.Option
        value={getItemValue(item)}
        key={getItemValue(item)}
        active={active}
      >
        <Group gap="sm" wrap="nowrap">
          {active ? <CheckIcon size={12} /> : null}
          {renderListItem ? renderListItem(item) : renderLabel(item)}
        </Group>
      </Combobox.Option>
    )
  })

  useEffect(() => {
    if (!value) {
      combobox.openDropdown()
    }
  }, [])

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && allowCustom && search.trim().length > 0) {
      const newItem = search.trim()
      if (!localData.some((item) => getItemValue(item) === newItem)) {
        const newOption = { label: newItem, value: newItem }
        setLocalData((prevData) => [...prevData, newOption])
        handleValueSelect(newItem)
      }
    } else if (event.key === "Backspace" && search.length === 0) {
      event.preventDefault()
      handleValueRemove(value[value.length - 1])
    }
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
            <Pill.Group style={{ flexWrap: "nowrap", overflow: "hidden" }}>
              {renderedValue}
            </Pill.Group>
          </Combobox.Target>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown miw={180}>
        <Combobox.Search
          value={search}
          display={shouldDisplaySearch ? "initial" : "none"}
          onChange={(event) => setSearch(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={allowCustom ? `Type to create new` : "Search..."}
        />
        <Combobox.Options>
          {renderedOptions?.length > 0 ? (
            renderedOptions
          ) : (
            <Combobox.Empty>
              {isLoading ? (
                <Loader size="sm" />
              ) : allowCustom ? (
                "Press enter to add"
              ) : (
                "Nothing found..."
              )}
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
