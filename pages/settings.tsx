import { useState } from "react"

import LineChart from "@/components/Blocks/Analytics/LineChart"
import CopyText from "@/components/Blocks/CopyText"
import UserAvatar from "@/components/Blocks/UserAvatar"
import {
  useAppSWR,
  useApps,
  useCurrentApp,
  useProfile,
} from "@/utils/dataHooks"

import {
  Badge,
  Button,
  Card,
  Container,
  FocusTrap,
  Group,
  Popover,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { IconPencil, IconUserPlus } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"

import { Label, ReferenceLine } from "recharts"

function Invite() {
  const { profile } = useProfile()

  if (profile?.team_owner) {
    return null
  }

  if (profile?.plan === "pro") {
    if (profile?.org.users.length === 5) {
      return <Badge color="orange">Seat allowance exceeded</Badge>
    }
    return (
      <Text>
        Invite link:{" "}
        <CopyText
          value={`${window.location.origin}/join?orgId=${profile?.org.id}`}
        />
      </Text>
    )
  }

  return (
    <Button
      variant="light"
      onClick={() =>
        modals.openContextModal({
          modal: "upgrade",
          size: 800,
          innerProps: {},
        })
      }
      sx={{ float: "right" }}
      leftIcon={<IconUserPlus size={16} />}
    >
      Invite
    </Button>
  )
}

export default function AppAnalytics() {
  const { app, setAppId } = useCurrentApp()
  const [focused, setFocused] = useState(false)

  const { profile } = useProfile()

  const { drop, update } = useApps()

  const applyRename = (e) => {
    setFocused(false)
    update({ id: app.id, name: e.target.value })
  }

  const { data: appUsage } = useAppSWR("/analytics/usage")

  const allowedLimit = profile?.org.plan === "pro" ? 5000 : 1000

  return (
    <Container className="unblockable">
      <Stack>
        <NextSeo title="Settings" />
        <Stack>
          <Card withBorder p="lg">
            <Stack>
              {focused ? (
                <FocusTrap>
                  <TextInput
                    defaultValue={app?.name}
                    variant="unstyled"
                    h={40}
                    px={10}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") applyRename(e)
                    }}
                    onBlur={(e) => applyRename(e)}
                  />
                </FocusTrap>
              ) : (
                <Title
                  order={3}
                  onClick={() => setFocused(true)}
                  style={{ cursor: "pointer" }}
                >
                  {app?.name} <IconPencil size={16} />
                </Title>
              )}
              <Text>
                App ID for tracking: <CopyText value={app?.id} />
              </Text>
            </Stack>
          </Card>

          <Card withBorder p={0}>
            <Group position="apart" align="center" p="lg">
              <Title order={3}>Team</Title>
              <Invite />
            </Group>

            <Table striped verticalSpacing="lg" horizontalSpacing="lg">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {profile?.org.users?.map((user, i) => (
                  <tr key={i}>
                    <td>
                      <Group>
                        <UserAvatar profile={user} />
                        <Text>{user?.name}</Text>

                        {user.id === profile.id ? (
                          <Badge color="blue">You</Badge>
                        ) : null}
                      </Group>
                    </td>
                    <td>{user?.email}</td>
                    <td>{user?.role}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* <Card withBorder p="lg"> */}
          <LineChart
            title={<Title order={3}>Usage</Title>}
            range={30}
            data={appUsage}
            formatter={(val) => `${val} runs`}
            props={["count"]}
            chartExtra={
              <ReferenceLine
                y={allowedLimit}
                fontWeight={600}
                ifOverflow="extendDomain"
                stroke="red"
                strokeDasharray="3 3"
              >
                <Label
                  position="insideTop"
                  fontSize={14}
                  fill="#d00"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", padding: "2px" }}
                >
                  plan limit
                </Label>
              </ReferenceLine>
            }
          />

          {/* <Card withBorder p="lg">
            <Overlay blur={2} opacity={0.3} p="lg" zIndex={1}>
              <Center h="100%">
                <Alert title="Datasets">
                  This feature is currently invite-only. Contact us with details
                  on what you're building to request access.
                </Alert>
              </Center>
            </Overlay>
            <Stack spacing="md">
              <Title order={4}>Export dataset</Title>

              <Text weight="semibold">Select conditions:</Text>

              <Group spacing="xs">
                <Button variant="outline" compact>
                  model = "gpt-4"
                </Button>

                <Text>and</Text>
                <Button variant="outline" compact>
                  feedback: "thumbs" = "up"
                </Button>

                <Text>and</Text>
                <Button variant="outline" compact>
                  contains tag: "training"
                </Button>
              </Group>

              <Text weight="semibold">Download:</Text>

              <Group>
                <Button variant="light" leftIcon={<IconDownload size={16} />}>
                  .csv
                </Button>
                <Button
                  variant="light"
                  color="cyan"
                  leftIcon={<IconDownload size={16} />}
                  rightIcon={<IconBrandOpenai size={16} />}
                >
                  OpenAI .jsonl
                </Button>
              </Group>
            </Stack>
          </Card> */}

          {!profile?.team_owner && (
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
                      setAppId(null)
                      Router.push("/")
                    }}
                  >
                    Delete
                  </Button>
                </Popover.Dropdown>
              </Popover>
            </Card>
          )}
        </Stack>
      </Stack>
    </Container>
  )
}
