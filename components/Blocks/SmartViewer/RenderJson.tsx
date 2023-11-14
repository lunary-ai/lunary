import { useMemo } from "react"
import ProtectedText from "../ProtectedText"
import { JsonView, defaultStyles } from "react-json-view-lite"

export const RenderJson = ({ data }) => {
  if (!data) return null

  const parsed = useMemo(() => {
    if (!data) return null
    if (typeof data === "string" && data?.startsWith("{")) {
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

  return (
    <ProtectedText>
      {isFatObject ? (
        <JsonView
          data={parsed}
          shouldInitiallyExpand={(level) => level < 1}
          style={defaultStyles}
        />
      ) : (
        JSON.stringify(parsed, null, 2)
      )}
    </ProtectedText>
  )
}
