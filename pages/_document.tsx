import { createGetInitialProps } from "@mantine/next"
import Document, { Head, Html, Main, NextScript } from "next/document"
import Script from "next/script"

const getInitialProps = createGetInitialProps()

export default class _Document extends Document {
  static getInitialProps = getInitialProps

  render() {
    return (
      <Html>
        <Head>
          {process.env.NEXT_PUBLIC_CUSTOM_SCRIPT && (
            <Script id="custom-script">
              {process.env.NEXT_PUBLIC_CUSTOM_SCRIPT}
            </Script>
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
