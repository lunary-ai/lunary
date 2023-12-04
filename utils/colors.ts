export function getColorForRole(role) {
  const defaultColor = "gray"

  const colorMap = {
    ai: "green",
    assistant: "green",
    human: "blue",
    user: "blue",
    error: "red",
    function: "violet",
    tool: "violet",
    system: "gray",
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
