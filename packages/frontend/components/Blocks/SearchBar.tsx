import { ActionIcon, Input, Kbd, Text } from "@mantine/core"
import { useFocusWithin, useHotkeys } from "@mantine/hooks"
import { IconSearch, IconX } from "@tabler/icons-react"
import HotkeysInfo from "./HotkeysInfo"

export default function SearchBar({ query, setQuery, ...props }) {
  const { ref, focused } = useFocusWithin()

  useHotkeys([["mod+K", () => ref.current.focus()]])

  const showCross = query && query.length > 0

  const clearInput = () => {
    setQuery("")
    ref.current.value = ""
  }

  return (
    <Input
      leftSection={<IconSearch size={14} />}
      maw={400}
      w="30%"
      type="search"
      size="sm"
      ref={ref}
      id="search"
      rightSectionWidth={showCross ? 40 : 80}
      rightSectionPointerEvents="auto"
      rightSection={
        showCross ? (
          <IconX onClick={clearInput} size={13} cursor="pointer" />
        ) : !focused ? (
          <HotkeysInfo
            hot="K"
            size="sm"
            style={{ marginTop: -4, marginRight: -13 }}
          />
        ) : null
      }
      placeholder="Type to filter"
      defaultValue={query}
      onChange={(e) => setQuery(e.currentTarget.value)}
      {...props}
    />
  )
}
