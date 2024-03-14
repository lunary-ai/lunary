import { useColorScheme, useDidUpdate } from "@mantine/hooks"
import { useEffect, useState } from "react"

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

export function getUserColor(scheme, theme, id: string) {
  if (!id) return theme.colors.gray[4]
  const seed = id
    .split("")
    .map((char) => char.charCodeAt(0))
    .reduce((acc, curr) => acc + curr, 0)
  const colors = Object.keys(theme.colors)

  const userColor = colors[seed % colors.length]

  const finalColor = theme.colors[userColor][scheme === "dark" ? 8 : 4]
  return finalColor
}
