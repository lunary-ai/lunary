import { ActionIcon, Input, Kbd, Text } from "@mantine/core"
import { useFocusWithin, useHotkeys } from "@mantine/hooks"
import { IconSearch, IconX } from "@tabler/icons-react"

export default function SearchBar({ query, setQuery }) {
  const { ref, focused } = useFocusWithin()

  useHotkeys([["mod+K", () => ref.current.focus()]])

  const showCross = query && query.length > 0

  const clearInput = () => {
    setQuery("")
    ref.current.value = ""
  }

  return (
    <Input
      leftSection={<IconSearch size={13} />}
      w={400}
      type="search"
      size="xs"
      ref={ref}
      id="search"
      rightSectionWidth={showCross ? 40 : 80}
      rightSection={
        showCross ? (
          <ActionIcon onClick={clearInput} size="sm" variant="subtle">
            <IconX size={13} />
          </ActionIcon>
        ) : !focused ? (
          <span style={{ marginTop: -4, marginRight: -13 }}>
            <Kbd size="sm" py={0} fz={14}>
              ⌘
            </Kbd>
            <Text color="dimmed" size="xs" component="span">
              {` + `}
            </Text>
            <Kbd size="sm" py={1}>
              K
            </Kbd>
          </span>
        ) : null
      }
      placeholder="Type to filter"
      defaultValue={query}
      onChange={(e) => setQuery(e.currentTarget.value)}
    />
  )
}
