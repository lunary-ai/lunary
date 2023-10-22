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
      icon={<IconSearch size={13} />}
      w={400}
      type="search"
      size="xs"
      ref={ref}
      id="search"
      rightSectionWidth={showCross ? 40 : 80}
      rightSection={
        showCross ? (
          <ActionIcon onClick={clearInput} size="sm">
            <IconX size={13} />
          </ActionIcon>
        ) : !focused ? (
          <span>
            <Kbd size="sm" h={13} py={0}>
              ⌘
            </Kbd>
            <Text color="dimmed" size="xs" component="span">
              {` + `}
            </Text>
            <Kbd size="sm" h={13} py={0}>
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
