export function getColorForRole(role) {
  // TODO: dark theme
  const defaultColor = "var(--mantine-color-gray-light)"

  const colorMap = {
    ai: "var(--mantine-color-green-light)",
    human: "var(--mantine-color-blue-light)",
    user: "var(--mantine-color-blue-light)",
    error: "var(--mantine-color-red-light)",
    function: "var(--mantine-color-violet-light)",
    tool: "var(--mantine-color-violet-light)",
    system: "var(--mantine-color-gray-light)",
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
