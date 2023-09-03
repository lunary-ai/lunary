import CopyText from "@/components/Blocks/CopyText"
import { AppContext } from "@/utils/context"
import { useApps } from "@/utils/supabaseHooks"

import { Button, Card, Popover, Stack, Text, Title } from "@mantine/core"
import { NextSeo } from "next-seo"
import Router from "next/router"
import { useContext } from "react"

export default function AppAnalytics() {
  const { app, setApp } = useContext(AppContext)

  const { drop } = useApps()

  return (
    <Stack>
      <NextSeo title="Settings" />
      <Stack>
        <Card withBorder p="lg">
          <Stack>
            <Title order={3}>{app?.name}</Title>
            <Text>
              App ID for tracking: <CopyText value={app?.id} />
            </Text>
          </Stack>
        </Card>
        <Card withBorder p="lg" sx={{ overflow: "visible" }}>
          <Title mb="md" order={4}>
            Danger Zone
          </Title>

          <Popover width={200} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Button color="red">Delete App</Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Text mb="md">
                Are you sure you want to delete this app? This action is
                irreversible and it will delete all associated data.
              </Text>
              <Button
                color="red"
                onClick={() => {
                  drop({ id: app.id })
                  setApp(null)
                  Router.push("/")
                }}
              >
                Delete
              </Button>
            </Popover.Dropdown>
          </Popover>
        </Card>
      </Stack>
    </Stack>
  )
}
