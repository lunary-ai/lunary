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
  const defaultColor = "gray"

  const colorMap = {
    llm: "yellow",
    embed: "yellow",
    chain: "blue",
    agent: "violet",
    tool: "grape",
    thread: "grape",
    convo: "grape",
    chat: "blue",
  }

  return colorMap[type] || defaultColor
}
