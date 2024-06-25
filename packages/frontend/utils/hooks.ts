// fixes the stutter effect in dark mode
// needs to be outside the hook as window.computedColorScheme doesn't reflect the update
// but we need to update the ddefault value

import { useColorScheme, useDidUpdate } from "@mantine/hooks"
import { useEffect, useState } from "react"

// TODO FIX: THIS ACTUALLY DOESNT WORK WELL WITH MANTINE CSS VARS
let defaultColorScheme =
  typeof window !== "undefined" ? window?.computedColorScheme : null

export function useFixedColorScheme() {
  const [scheme, setScheme] = useState(defaultColorScheme)

  const mantineScheme = useColorScheme()

  useDidUpdate(() => {
    defaultColorScheme = mantineScheme
    setScheme(mantineScheme)
  }, [mantineScheme])

  return scheme
}

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
