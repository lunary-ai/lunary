import { useState } from "react"

import LineChart from "@/components/Analytics/LineChart"
import CopyText from "@/components/Blocks/CopyText"

import {
  Alert,
  Button,
  Card,
  Container,
  FocusTrap,
  Group,
  Popover,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { IconPencil, IconUserPlus } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"

import { useOrg, useUser, useProject, useProjectSWR } from "@/utils/dataHooks"
import useSWR from "swr"
import { openUpgrade } from "../components/Layout/UpgradeModal"
import RenamableField from "@/components/Blocks/RenamableField"

export default function AppAnalytics() {
  const { user: currentUser } = useUser()
  const { org } = useOrg()
  const { update, project, setProjectId, drop } = useProject()

  // TODO: better route for project usage
  const { data: projectUsage } = useSWR(
    project?.id && org && `/orgs/${org.id}/usage?projectId=${project?.id}`,
  )

  const isAdmin =
    currentUser?.id === org?.users?.find((u) => u.role === "admin")?.id

  return (
    <Container className="unblockable">
      <NextSeo title="Settings" />
      <Stack gap="lg">
        <LineChart
          title={
            <RenamableField
              defaultValue={project?.name}
              onRename={(name) => update(name)}
            />
          }
          range={30}
          data={projectUsage}
          formatter={(val) => `${val} runs`}
          props={["count"]}
        />

        <Card withBorder p="lg">
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <Title order={3}>Keys</Title>
              {/* <Button onClick={() => alert("TODO")}>
                Refresh Api Key
              </Button> */}
            </Group>

            <Alert
              variant="light"
              title={
                <Group>
                  <Text fw={500}>Project ID:</Text>
                  <CopyText c="green.8" value={project?.id} />
                </Group>
              }
              color="green"
            >
              <Text>
                Your project ID can be used from your server or frontend code to
                track events and send requests to the API.
              </Text>
            </Alert>

            {/* <Alert
              variant="light"
              title={
                <Group>
                  <Text fw={500}>Public Tracking Key: </Text>
                  <CopyText c="green.8" value={project?.publicApiKey} />
                </Group>
              }
              color="green"
            >
              <Text>
                Public API keys can be used from your server or frontend code to
                track events and send requests to the API.
              </Text>
            </Alert> */}

            {/* <Alert
              variant="light"
              title={
                <Group>
                  <Text fw={500}>Private Key:</Text>
                  <CopyText c="red.8" value={project?.privateApiKey} />
                </Group>
              }
              color="red"
            >
              <Text>
                Private API keys should be used only on your server – they give
                read/write/delete API access to your project's resources.
              </Text>
            </Alert> */}
          </Stack>
        </Card>

        {isAdmin && (
          <Card withBorder p="lg" style={{ overflow: "visible" }}>
            <Stack align="start">
              <Title order={4}>Danger Zone</Title>

              <Text>
                Deleting your project is irreversible and it will delete all
                associated data.
                <br />
                We <b>cannot</b> recover your data once it&apos;s deleted.
              </Text>

              <Popover width={200} position="bottom" shadow="md">
                <Popover.Target>
                  <Button color="red">Delete Project</Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text mb="md">
                    Are you sure you want to delete this project? This action is
                    irreversible and it will delete all associated data.
                  </Text>
                  <Button
                    color="red"
                    onClick={() => {
                      drop()
                      setProjectId(null)
                      Router.push("/")
                    }}
                  >
                    Delete
                  </Button>
                </Popover.Dropdown>
              </Popover>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
