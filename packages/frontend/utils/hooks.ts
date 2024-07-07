import {
  useDebouncedValue,
  useDidUpdate,
  useShallowEffect,
  useThrottledValue,
} from "@mantine/hooks"
import { useRouter } from "next/router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const prevThrottledState = useRef(throttledState)

  useEffect(() => {
    if (!router.isReady) return

    const value = router.query[key]
    // allow null values
    if (value === undefined) {
      return
    }

    const parsedValue = options.parse
      ? options.parse(value as string)
      : (value as unknown as T)

    setState(parsedValue)
  }, [router.isReady, router.query[key]])

  useEffect(() => {
    if (!router.isReady) return

    if (throttledState !== prevThrottledState.current) {
      const query = { ...router.query, [key]: throttledState as string }
      router.replace({ query }, undefined, { shallow: true })

      prevThrottledState.current = throttledState
    }
  }, [router.isReady, throttledState, key, router.asPath])

  return [state, setState] as const
}

/**
 * useChecksFromURL is a custom React hook that manages the state of a set of "checks" (filters or conditions)
 * based on the URL query parameters. It allows the checks to be persisted in the URL and synced with the component state.
 *
 * @param defaultValue - The initial value of the checks if no query parameter is present.
 * @param ignoreKeys - An array of query parameter keys to ignore when syncing with the URL.
 *
 * @returns An object with the following properties:
 *   - checks: The current state of the checks.
 *   - setChecks: A function to update the checks state.
 *   - serializedChecks: A throttled value of the serialized checks, used for updating the URL.
 */

export function useChecksFromURL(
  defaultValue: CheckLogic,
  ignoreKeys: string[] = [],
) {
  const router = useRouter()
  const [checks, setChecks] = useState<CheckLogic>(defaultValue)

  const serializedChecks = useMemo(() => serializeLogic(checks), [checks])

  const parseUrlParams = useCallback(() => {
    const params = new URLSearchParams(router.asPath.split("?")[1] || "")
    ignoreKeys.forEach((key) => params.delete(key))
    return params.toString()
  }, [router.asPath, ignoreKeys.toString()])

  // Load checks from URL when the component mounts or URL changes
  useEffect(() => {
    if (!router.isReady) return

    const paramString = parseUrlParams()
    if (paramString) {
      const filtersData = deserializeLogic(paramString)
      if (
        filtersData &&
        JSON.stringify(filtersData) !== JSON.stringify(checks)
      ) {
        setChecks(filtersData)
      }
    } else {
      // Reset to default value if no filters in URL
      setChecks(defaultValue)
    }
  }, [router.isReady, parseUrlParams])

  // Update URL when checks change
  useEffect(() => {
    if (!router.isReady) return

    const currentUrlParams = parseUrlParams()
    if (currentUrlParams !== serializedChecks) {
      const newParams = new URLSearchParams(serializedChecks)
      ignoreKeys.forEach((key) => {
        if (router.query[key]) {
          newParams.set(key, router.query[key] as string)
        }
      })

      router.replace(
        { pathname: router.pathname, query: newParams.toString() },
        undefined,
        { shallow: true },
      )
    }
  }, [router.isReady, serializedChecks, parseUrlParams, ignoreKeys.toString()])

  return { checks, setChecks, serializedChecks }
}
