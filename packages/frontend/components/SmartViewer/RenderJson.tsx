import { useMemo } from "react"
import ProtectedText from "../blocks/ProtectedText"
// import { JsonView, defaultStyles } from "react-json-view-lite"
// import errorHandler from "@/utils/errors"
import ErrorBoundary from "../blocks/ErrorBoundary"

export const Json = ({ data, compact }) => {
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
      {compact ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2)}
    </ProtectedText>
  )
}

export const RenderJson = ({ data, compact }) => (
  <ErrorBoundary>
    <Json data={data} compact={compact} />
  </ErrorBoundary>
)
