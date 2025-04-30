"use client"

import { useEffect } from "react"

export function useKeyboardShortcut(keys: string[], callback: () => void, node = globalThis) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        keys.every((key) => {
          if (key === "meta") return e.metaKey
          if (key === "ctrl") return e.ctrlKey
          if (key === "alt") return e.altKey
          if (key === "shift") return e.shiftKey
          return e.key.toLowerCase() === key.toLowerCase()
        })
      ) {
        e.preventDefault()
        callback()
      }
    }

    node.addEventListener("keydown", handler)
    return () => node.removeEventListener("keydown", handler)
  }, [callback, keys, node])
}
