import { useCallback, useEffect, useState } from "react"
import {
  PillsInput,
  Pill,
  Combobox,
  CheckIcon,
  Group,
  useCombobox,
} from "@mantine/core"
import { useProjectSWR } from "@/utils/dataHooks"

export default function SmartCheckSelect({
  options,
  multiple,
  placeholder,
  searchable,
  customSearch,
  width,
  renderListItem,
  renderLabel = (item) => (typeof item === "object" ? item?.label : item),
  getItemValue = (item) => (typeof item === "object" ? `${item.value}` : item),
  value,
  onChange,
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  })

  const [search, setSearch] = useState("")

  const useSWRforData = typeof options === "function"
  const { data: swrCheckData } = useProjectSWR(useSWRforData ? options() : null)
  const data = useSWRforData ? swrCheckData : options

  const fixedValue = value || (multiple ? [] : null)

  const handleValueSelect = (val: string) => {
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

  const renderedValue = multiple
    ? fixedValue.map((item) => (
        <Pill
          key={item}
          withRemoveButton
          onRemove={() => handleValueRemove(item)}
        >
          {renderLabel(data?.find((d) => getItemValue(d) === item))}
        </Pill>
      ))
    : renderLabel(data?.find((d) => getItemValue(d) === value))

  const renderedOptions = data
    ?.filter((item) =>
      search.length === 0
        ? true
        : customSearch
          ? customSearch(search, item)
          : getItemValue(item)
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
    )
    .map((item) => (
      <Combobox.Option
        value={getItemValue(item)}
        key={getItemValue(item)}
        active={value?.includes(getItemValue(item))}
      >
        <Group gap="sm" wrap="nowrap">
          {value?.includes(getItemValue(item)) ? <CheckIcon size={12} /> : null}
          {renderListItem ? renderListItem(item) : renderLabel(item)}
        </Group>
      </Combobox.Option>
    ))

  useEffect(() => {
    if (!value) {
      combobox.openDropdown()
    }
  }, [])

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
      <Combobox.DropdownTarget>
        <PillsInput
          onClick={() => combobox.openDropdown()}
          variant="unstyled"
          miw={width}
          w="min-content"
        >
          <Pill.Group style={{ flexWrap: "nowrap" }}>
            {renderedValue}

            {(!renderedValue || !renderedValue?.length || searchable) && (
              <Combobox.EventsTarget>
                <PillsInput.Field
                  onFocus={() => combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  value={search}
                  w={80}
                  placeholder={placeholder}
                  onChange={(event) => {
                    combobox.updateSelectedOptionIndex()
                    setSearch(event.currentTarget.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && search.length === 0) {
                      event.preventDefault()
                      handleValueRemove(value[value.length - 1])
                    }
                  }}
                />
              </Combobox.EventsTarget>
            )}
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown miw={180}>
        {data?.length > 5 && searchable && (
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={"Search..."}
          />
        )}
        <Combobox.Options>
          {renderedOptions?.length > 0 ? (
            renderedOptions
          ) : (
            <Combobox.Empty>Nothing found...</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
