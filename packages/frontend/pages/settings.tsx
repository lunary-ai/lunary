import LineChart from "@/components/analytics/LineChart"
import CopyText from "@/components/blocks/CopyText"

import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Popover,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { NextSeo } from "next-seo"
import Router from "next/router"

import { useOrg, useUser, useProject } from "@/utils/dataHooks"
import useSWR from "swr"
import RenamableField from "@/components/blocks/RenamableField"

export default function AppAnalytics() {
  const { org } = useOrg()
  const { update, project, setProjectId, drop } = useProject()

  // TODO: better route for project usage
  const { data: projectUsage } = useSWR(
    project?.id && org && `/orgs/${org.id}/usage?projectId=${project?.id}`,
  )

  const isOwner = org?.users?.find((u) => u.role === "owner")?.role === "owner"

  return (
    <Container className="unblockable">
      <NextSeo title="Settings" />
      <Stack gap="xl">
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

        {isOwner && (
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
                  <Button color="red" data-testid="delete-project-button">
                    Delete Project
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text mb="md">
                    Are you sure you want to delete this project? This action is
                    irreversible and it will delete all associated data.
                  </Text>
                  <Button
                    color="red"
                    data-testid="delete-project-popover-button"
                    onClick={async () => {
                      const dropped = await drop()
                      if (dropped) {
                        setProjectId(null)
                        Router.push("/")
                      }
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
