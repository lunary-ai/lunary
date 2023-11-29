// import { CloseButton, Input, Kbd, Text } from "@mantine/core"
// import { useDebouncedValue, useFocusWithin, useHotkeys } from "@mantine/hooks"
// import { IconSearch } from "@tabler/icons-react"
// import { usePathname, useSearchParams } from "next/navigation"
// import { useRouter } from "next/router"
// import { useEffect, useState } from "react"

// export default function SearchBar() {
//   const params = new URL(document.location.href).searchParams
//   const [search, setSearch] = useState(params.get("search") || "")
//   const pathname = usePathname()
//   const { replace } = useRouter()

//   const [debounced] = useDebouncedValue(search, 200)

//   useEffect(() => {
//     if (debounced) {
//       params.set("search", debounced)
//     } else {
//       params.delete("search")
//     }
//     // TODO: makes changing page bug
//     // replace(`${pathname}?${params.toString()}`)
//   }, [debounced, params, replace, pathname])

//   function handleSearch(term: string) {
//     setSearch(term)
//   }

//   function clearSearch() {
//     setSearch("")
//   }

//   const showCross = search?.length > 0

//   const { ref, focused } = useFocusWithin()
//   useHotkeys([["mod+K", () => ref.current.focus()]])

//   return (
//     <Input
//       leftSection={<IconSearch size={13} />}
//       w={400}
//       type="search"
//       size="xs"
//       ref={ref}
//       id="search"
//       rightSectionWidth={showCross ? 40 : 80}
//       rightSectionPointerEvents="all"
//       rightSection={
//         showCross ? (
//           <CloseButton onClick={clearSearch} size="sm" />
//         ) : !focused ? (
//           <span>
//             <Kbd size="sm" h={13} py={0}>
//               ⌘
//             </Kbd>
//             <Text c="dimmed" size="xs" component="span">
//               {` + `}
//             </Text>
//             <Kbd size="sm" h={13} py={0}>
//               K
//             </Kbd>
//           </span>
//         ) : null
//       }
//       placeholder="Type to filter"
//       value={search}
//       onChange={(e) => handleSearch(e.currentTarget.value)}
//     />
//   )
// }

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
