import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"

import {
  Badge,
  Card,
  Code,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core"

import DurationBadge from "@/components/Blocks/DurationBadge"
import TokensBadge from "@/components/Blocks/TokensBadge"
import SmartViewer from "@/components/Blocks/SmartViewer"
import StatusBadge from "@/components/Blocks/StatusBadge"

import {
  useAppUser,
  useGroupedRunsWithUsage,
  useRun,
  useRuns,
} from "@/utils/supabaseHooks"
import { useQuery } from "@supabase-cache-helpers/postgrest-swr"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { JsonView } from "react-json-view-lite"
import AnalyticsCard from "@/components/Blocks/AnalyticsCard"
import BarList from "@/components/Blocks/BarList"

export default function UserDetails({}) {
  const router = useRouter()
  const { id } = router.query

  const { user } = useAppUser(id as string)

  const { usage } = useGroupedRunsWithUsage(90, parseInt(id as string))

  const totalTokens = useMemo(
    () =>
      usage?.reduce(
        (acc, cur) => acc + cur.completion_tokens + cur.prompt_tokens,
        0
      ),
    [usage]
  )

  return (
    <Stack>
      <Card withBorder>
        <Group>
          <Stack>
            <Title order={2}>{user?.external_id}</Title>
            <Group>
              <Text>{`Last seen:  ${new Date(user?.last_seen).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                }
              )}`}</Text>
            </Group>
            <Group>
              <Text>Last 3 month usage: </Text>
              <TokensBadge tokens={totalTokens} />
            </Group>
          </Stack>
          {user?.props && <SmartViewer data={user.props} />}
        </Group>
      </Card>

      {usage && (
        <SimpleGrid cols={3} spacing="md">
          <AnalyticsCard title="Tokens">
            <BarList
              data={usage
                .filter((u) => u.type === "llm")
                .map((model) => ({
                  value: model.name,
                  count: model.completion_tokens + model.prompt_tokens,
                  composedBy: [
                    {
                      value: "Completion",
                      count: model.completion_tokens,
                      color: "purple",
                    },
                    {
                      value: "Prompt",
                      count: model.prompt_tokens,
                      color: "cyan",
                    },
                  ],
                }))}
              headers={["Model", "Tokens"]}
            />
          </AnalyticsCard>

          <AnalyticsCard title="Requests">
            <BarList
              data={usage
                .filter((u) => u.type === "llm")
                .map((model) => ({
                  value: model.name,
                  count: model.success + model.errors,
                  composedBy: [
                    {
                      value: "Success",
                      count: model.success,
                      color: "green",
                    },
                    {
                      value: "Errors",
                      count: model.errors,
                      color: "red",
                    },
                  ],
                }))}
              headers={["Model", "Total"]}
            />
          </AnalyticsCard>
          <AnalyticsCard title="Agents">
            <BarList
              data={usage
                .filter((u) => u.type === "agent")
                .map((model) => ({
                  value: model.name,
                  count: model.success + model.errors,
                  composedBy: [
                    {
                      value: "Success",
                      count: model.success,
                      color: "green",
                    },
                    {
                      value: "Errors",
                      count: model.errors,
                      color: "red",
                    },
                  ],
                }))}
              headers={["Model", "Total"]}
            />
          </AnalyticsCard>
        </SimpleGrid>
      )}
    </Stack>
  )
}
