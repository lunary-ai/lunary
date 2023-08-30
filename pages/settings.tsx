import CopyText from "@/components/Blocks/CopyText"
import { AppContext } from "@/utils/context"

import { Stack, Text, Title } from "@mantine/core"
import { NextSeo } from "next-seo"
import { useContext } from "react"

export default function AppAnalytics() {
  const { app } = useContext(AppContext)

  return (
    <Stack>
      <NextSeo title="Settings" />
      <Title>{app?.name}</Title>
      <Text>
        App ID for tracking: <CopyText value={app?.id} />
      </Text>
    </Stack>
  )
}
