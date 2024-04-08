import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "../styles/globals.css"

import { MantineProvider, createTheme } from "@mantine/core"
import type { AppProps } from "next/app"
import Head from "next/head"

import Layout from "@/components/layout"
import AnalyticsWrapper from "@/components/layout/Analytics"
import { DefaultSeo } from "next-seo"
import Link from "next/link"

import { fetcher } from "@/utils/fetcher"
import localFont from "next/font/local"
import { SWRConfig } from "swr"
import { AuthProvider } from "@/utils/auth"
import Script from "next/script"
import ErrorBoundary from "@/components/blocks/ErrorBoundary"

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

const theme = createTheme({
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${circularPro.style.fontFamily};
        }
      `}</style>
      <Head>
        <link href="https://lunary.ai/logo.png" rel="icon" type="image/png" />
      </Head>
      <ErrorBoundary>
        <AuthProvider>
          <SWRConfig
            value={{
              fetcher: fetcher.get,
              dedupingInterval: 10000,
            }}
          >
            <DefaultSeo
              title="Dashboard"
              titleTemplate="%s | Lunary"
              defaultTitle="Dashboard | Lunary"
            />
            <MantineProvider theme={theme} defaultColorScheme="auto">
              <AnalyticsWrapper>
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </AnalyticsWrapper>
            </MantineProvider>
          </SWRConfig>
        </AuthProvider>
      </ErrorBoundary>
    </>
  )
}
