import { useDidUpdate, useThrottledValue } from "@mantine/hooks"
import { useRouter } from "next/router"
import { useEffect, useMemo, useState } from "react"
import { CheckLogic, deserializeLogic, serializeLogic } from "shared"

type Shortcut = [string, () => void]

export function useGlobalShortcut(shortcuts: Shortcut[]) {
  useEffect(() => {
    let timeoutId: number | null = null

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        shortcuts.forEach(([keyCombination, action]) => {
          const [mod, key] = keyCombination.split("+")
          const isModPressed =
            mod === "mod" ? evt.ctrlKey || evt.metaKey : evt[`${mod}Key`]
          if (isModPressed && evt.key.toLowerCase() === key.toLowerCase()) {
            action()
            evt.preventDefault()
          }
        })
      }, 10)
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [shortcuts])
}

// Start of Selection
export function useStateFromURL<T>(
  key: string,
  defaultValue?: T,
  options: { parse?: (value: string) => T } = {},
) {
  const router = useRouter()
  const [state, setState] = useState<T>(defaultValue as T)
  const throttledState = useThrottledValue(state, 300)

  useEffect(() => {
    const value = router.query[key]
    if (value === undefined) {
      return
    }

    const parsedValue = options.parse
      ? options.parse(value as string)
      : (value as unknown as T)

    setState(parsedValue)
  }, [router.query[key]])

  useEffect(() => {
    const query = { ...router.query, [key]: throttledState as string }
    router.replace({ query }, undefined, { shallow: true })
  }, [throttledState])

  return [state, setState] as const
}

export function useChecksFromURL(
  defaultValue: CheckLogic,
  ignoreKeys: string[] = [],
) {
  const router = useRouter()
  const [checks, setChecks] = useState<CheckLogic>(defaultValue || ["AND"])

  const serialized = useMemo(() => {
    return serializeLogic(checks)
  }, [checks])
  const serializedChecks = useThrottledValue(serialized, 300)

  useDidUpdate(() => {
    if (
      serializedChecks === "" ||
      serializedChecks === router.asPath.replace("/logs?", "")
    ) {
      return
    }

    const currentParams = new URLSearchParams(router.asPath.split("?")[1])

    const newParams = new URLSearchParams(serializedChecks)
    ignoreKeys.forEach((key) => {
      if (currentParams.has(key)) {
        newParams.set(key, currentParams.get(key) as string)
      }
    })

    // router.replace({
    //   pathname: "/logs",
    //   query: newParams.toString(),
    // })
  }, [serializedChecks])

  useEffect(() => {
    const params = new URLSearchParams(router.asPath.split("?")[1])
    ignoreKeys.forEach((key) => params.delete(key))

    const paramString = params.toString()

    if (paramString) {
      const filtersData = deserializeLogic(paramString)
      if (filtersData) {
        console.log("Restoring filters from query params", filtersData)
        setChecks(filtersData)
      }
    }
  }, [router.asPath])

  return { checks, setChecks, serializedChecks }
}
