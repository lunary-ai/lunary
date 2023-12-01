export function getColorForRole(role) {
  const defaultColor = "var(--mantine-color-gray-light)"

  const colorMap = {
    ai: "var(--mantine-color-green-2)",
    assistant: "var(--mantine-color-green-2)",
    human: "var(--mantine-color-blue-2)",
    user: "var(--mantine-color-blue-2)",
    error: "var(--mantine-color-red-light)",
    function: "var(--mantine-color-violet-2)",
    tool: "var(--mantine-color-violet-2)",
    system: "var(--mantine-color-gray-2)",
  }

  return colorMap[role] || defaultColor
}

export function getColorForRunType(type) {
  const defaultColor = "var(--mantine-color-gray-light)"

  const colorMap = {
    llm: "var(--mantine-color-yellow-light)",
    chain: "var(--mantine-color-blue-light)",
    agent: "var(--mantine-color-violet-light)",
    tool: "var(--mantine-color-grape-light)",
  }

  return colorMap[type] || defaultColor
}
