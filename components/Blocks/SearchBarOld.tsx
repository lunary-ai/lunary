// import { ActionIcon, CloseButton, Input, Kbd, Text } from "@mantine/core"
// // import { useFocusWithin, useHotkeys } from "@mantine/hooks"
// // import { IconSearch, IconX } from "@tabler/icons-react"
// // import { usePathname, useSearchParams } from "next/navigation"
// // import { useRouter } from "next/router"
// // import { useEffect } from "react"

// import { CloseButton, Input, Kbd, Text } from "@mantine/core"
// import { useDebouncedValue, useFocusWithin, useHotkeys } from "@mantine/hooks"
// import { IconSearch } from "@tabler/icons-react"
// import { usePathname, useSearchParams } from "next/navigation"
// import { useRouter } from "next/router"
// import { useEffect, useState } from "react"

// // // export default function SearchBar() {
// // //   const searchParams = useSearchParams()
// // //   const params = new URLSearchParams(searchParams)
// // //   const search = params.get("search")
// // //   const pathname = usePathname()
// // //   const { replace } = useRouter()

// // //   useEffect(() => {
// // //     console.log(searchParams.get("search"))
// // //   }, [searchParams])

// // //   console.log(searchParams.get("search"))

// // //   const { ref, focused } = useFocusWithin()

// // //   useHotkeys([["mod+K", () => ref.current.focus()]])

// // //   const showCross = search?.length > 0

// // //   function clearInput() {
// // //     const params = new URLSearchParams(searchParams)
// // //     params.delete("search")
// // //     replace(`${pathname}?${params.toString()}`)
// // //     // ref.current.value = ""
// // //   }

// // //   function handleSearch(term: string) {
// // //     if (term) {
// // //       params.set("search", term)
// // //     } else {
// // //       params.delete("search")
// // //     }
// // //     replace(`${pathname}?${params.toString()}`)
// // //   }

// // //   return (
// // //     <Input
// // //       leftSection={<IconSearch size={13} />}
// // //       w={400}
// // //       type="search"
// // //       size="xs"
// // //       ref={ref}
// // //       id="search"
// // //       rightSectionWidth={showCross ? 40 : 80}
// // //       rightSectionPointerEvents="all"
// // //       rightSection={
// // //         showCross ? (
// // //           <CloseButton onClick={clearInput} size="sm" />
// // //         ) : !focused ? (
// // //           <span>
// // //             <Kbd size="sm" h={13} py={0}>
// // //               ⌘
// // //             </Kbd>
// // //             <Text c="dimmed" size="xs" component="span">
// // //               {` + `}
// // //             </Text>
// // //             <Kbd size="sm" h={13} py={0}>
// // //               K
// // //             </Kbd>
// // //           </span>
// // //         ) : null
// // //       }
// // //       placeholder="Type to filter"
// // //       value={search}
// // //       onChange={(e) => handleSearch(e.currentTarget.value)}
// // //     />
// // //   )
// // // }

// export default function SearchBar() {
//   const searchParams = new URLSearchParams(useSearchParams())
//   const [search, setSearch] = useState(searchParams.get("search") || "")
//   const { replace } = useRouter()
//   const pathname = usePathname()

//   const [debounced] = useDebouncedValue(search, 200)

//   const firstLoad = false

//   useEffect(() => {
//     console.log(debounced)
//   }, [debounced])

//   function handleSearch(term: string) {
//     setSearch(term)
//     if (term) {
//       searchParams.set("search", term)
//     } else {
//       searchParams.delete("search")
//     }
//     replace(`${pathname}?${searchParams.toString()}`)
//   }

//   function clearInput() {
//     handleSearch("")
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
//           <CloseButton onClick={clearInput} size="sm" />
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
