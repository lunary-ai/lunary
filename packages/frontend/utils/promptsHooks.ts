import { useMemo } from "react"

// This extract handlebars variables from a string or an array of OpenAI messages
export function usePromptVariables(
  content: string | { role: string; content: string }[],
) {
  // Parse variables from the content template (handlebars parsing)
  const variables = useMemo(() => {
    const contentVariables = {}
    const variableRegex = /{{([^}]+)}}/g
    let contentArray = Array.isArray(content) ? content : [content]

    // Collect all variable names from the content
    contentArray.forEach((message) => {
      let match
      let messageText = typeof message === "string" ? message : message?.content
      while ((match = variableRegex.exec(messageText)) !== null) {
        const variableName = match[1].trim()
        // Initialize with empty string
        contentVariables[variableName] = ""
      }
    })

    return contentVariables
  }, [content])

  return variables
}

// this hook filters the initial variables to match the ones found in the content
export function useCheckedPromptVariables(
  content: string | { role: string; content: string }[],
  initialVariables: Record<string, string>,
) {
  const contentVariables = usePromptVariables(content)

  // Clean up unused initialVariables and add new keys from content
  const filteredVariables = useMemo(() => {
    const mergedVariables = { ...initialVariables }

    // Remove keys from initialVariables that are not found in the content
    Object.keys(initialVariables || {}).forEach((key) => {
      if (!contentVariables.hasOwnProperty(key)) {
        delete mergedVariables[key]
      }
    })

    // Add new keys from content
    Object.keys(contentVariables || {}).forEach((key) => {
      if (!mergedVariables.hasOwnProperty(key)) {
        mergedVariables[key] = ""
      }
    })

    return mergedVariables
  }, [contentVariables, initialVariables])

  return filteredVariables
}
