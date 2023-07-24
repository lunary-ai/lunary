/*
 * This component is used to show inputs and outputs of runs.
 * It should be able to show & format:
 * - Complicated objects with many properties
 * - Messages (one or more)
 * - Simple JSON
 * - Text
 */

import { Code } from "@mantine/core"
import { useMemo } from "react"
import ObjectViewer from "./ObjectViewer"
import MessageViewer from "./MessageViewer"

const checkIsMessage = (obj) => {
  return !!obj.text
}

export default function SmartViewer({
  data,
  error,
  compact = false,
}: {
  data: any
  error?: string
  compact?: boolean
}) {
  const parsed = useMemo(() => {
    if (!data) return null
    if (typeof data === "string" && data.startsWith("{")) {
      try {
        return JSON.parse(data)
      } catch (e) {
        return data
      }
    }

    return data
  }, [data])

  const isObject = typeof parsed === "object"

  const isFatObject = useMemo(() => {
    if (!isObject || !parsed) return false
    if (Object.keys(parsed).length > 3) return true
    if (JSON.stringify(parsed).length > 300) return true
    return false
  }, [parsed])

  const isMessages = useMemo(() => {
    if (!parsed) return false
    return Array.isArray(parsed)
      ? parsed.every(checkIsMessage)
      : checkIsMessage(parsed)
  }, [parsed])

  return (
    <>
      {error && (
        <pre>
          <Code color="red">{error}</Code>
        </pre>
      )}

      {data && (
        <>
          {isObject ? (
            isMessages ? (
              <MessageViewer data={parsed} compact={compact} />
            ) : isFatObject ? (
              <ObjectViewer data={parsed} />
            ) : (
              <pre>
                <Code color="blue">{JSON.stringify(parsed, null, 2)}</Code>
              </pre>
            )
          ) : (
            <pre>
              <Code color="blue">{parsed}</Code>
            </pre>
          )}
        </>
      )}

      <style jsx>{`
        pre {
          white-space: pre-wrap;
        }

        pre :global(code) {
          padding: 10px;
          display: block;
        }
      `}</style>
    </>
  )
}
