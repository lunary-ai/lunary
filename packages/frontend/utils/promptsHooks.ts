import { useMemo } from "react"

export function usePromptVariables(
  data: string | { role: string; content: string }[],
) {
  // Parse variables from the content template (handlebars parsing)
  const variables = useMemo(() => {
    const variables = {}
    const variableRegex = /{{([^}]+)}}/g
    let contentArray = Array.isArray(data) ? data : [data]

    contentArray.forEach((message) => {
      let match
      let messageText = typeof message === "string" ? message : message?.content
      while ((match = variableRegex.exec(messageText)) !== null) {
        variables[match[1].trim()] = ""
      }
    })

    return variables
  }, [data])

  return variables
}
