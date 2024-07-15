import { DEFAULT_THEME, createTheme, mergeMantineTheme } from "@mantine/core"
import Link from "next/link"
import localFont from "next/font/local"

export const circularPro = localFont({
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  src: [
    {
      path: "../public/fonts/circular-pro-book.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/circular-pro-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/circular-pro-bold.woff2",
      weight: "700",
      style: "normal",
    },
    // {
    //   path: "../public/fonts/circular-pro-black.woff2",
    //   weight: "900",
    //   style: "normal",
    // },
  ],
})

export const themeOverride = createTheme({
  defaultRadius: "md",
  fontFamily: circularPro.style.fontFamily,
  headings: {
    fontWeight: "700",
  },
  components: {
    Anchor: {
      defaultProps: {
        component: Link,
      },
    },
    NavLink: {
      defaultProps: {
        h: 36,
      },
    },
    Select: {
      defaultProps: {
        spellCheck: "false",
        autoCorrect: "off",
      },
    },
    Button: {
      defaultProps: {
        fw: "500",
      },
    },
    Popover: {
      defaultProps: {
        withArrow: true,
        shadow: "sm",
      },
    },
    Badge: {
      defaultProps: {
        tt: "none",
      },
    },
    Combobox: {
      defaultProps: {
        withArrow: true,
        shadow: "sm",
      },
    },
    HoverCard: {
      defaultProps: {
        withArrow: true,
        shadow: "sm",
      },
    },
    Tooltip: {
      defaultProps: {
        withArrow: true,
        shadow: "sm",
      },
    },
  },
})

export const theme = mergeMantineTheme(DEFAULT_THEME, themeOverride)
