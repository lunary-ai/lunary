import type React from "react"

import { MantineProvider, createTheme } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/dates/styles.css"

const theme = createTheme({
  primaryColor: "dark",
  colors: {
    dark: [
      "#C1C2C5",
      "#A6A7AB",
      "#909296",
      "#5c5f66",
      "#373A40",
      "#2C2E33",
      "#25262b",
      "#1A1B1E",
      "#141517",
      "#101113",
    ],
    chart: [
      "#FF6B6B", // chart-1
      "#4ECDC4", // chart-2
      "#1A535C", // chart-3
      "#FFE66D", // chart-4
      "#FF9F1C", // chart-5
    ],
  },
})

export function MantineAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  )
}
