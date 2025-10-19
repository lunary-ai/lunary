import Head from "next/head";
import {
  type DefaultSeoProps,
  type NextSeoProps,
  generateDefaultSeo,
  generateNextSeo,
} from "next-seo/pages";

export function NextSeo(props: NextSeoProps) {
  return <Head>{generateNextSeo(props)}</Head>;
}

export function DefaultSeo(props: DefaultSeoProps) {
  return <Head>{generateDefaultSeo(props)}</Head>;
}
