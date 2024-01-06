import {
  useDeleteMutation,
  useInsertMutation,
  useOffsetInfiniteScrollQuery,
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-swr"

import { useMantineTheme } from "@mantine/core"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useContext } from "react"
import { calcRunCost } from "./calcCosts"
import { ProjectContext } from "./context"
import { Database } from "./supaTypes"
import useSWR from "swr"
import { useColorScheme } from "@mantine/hooks"
import { useCurrentProject } from "./newDataHooks"

const softOptions = {
  dedupingInterval: 10000,
}

// For queries where up to date data is less important
// cache more aggressively
const hardOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
}

// Make a number seed from the ID, then use that to pick a color from the Mantine colors
const extendWithCosts = (data: any[]) =>
  data?.map((r) => ({
    ...r,
    cost: calcRunCost(r),
  }))

export function useApps() {
  const supabaseClient = useSupabaseClient<Database>()
  const apps = null
  const isLoading = false
  const insert = () => {}
  const drop = () => {}
  const update = () => {}

  // const { trigger: insert } = useInsertMutation(
  //   supabaseClient.from("app"),
  //   ["id"],
  //   "name,org_id,id",
  // )

  // const { trigger: update } = useUpdateMutation(
  //   supabaseClient.from("app"),
  //   ["id"],
  //   "name,id",
  // )

  // const { trigger: drop } = useDeleteMutation(supabaseClient.from("app"), [
  //   "id",
  // ])

  return { apps, loading: isLoading, insert, drop, update }
}

export function useConvosByFeedback(feedbackFilters) {
  const supabaseClient = useSupabaseClient<Database>()
  const { projectId: appId } = useContext(ProjectContext)

  const query = supabaseClient.rpc("get_convos_by_feedback", {
    app_id: appId,
    feedback_filters: feedbackFilters,
  })

  const { data, isLoading, error } = useQuery<string[]>(query)

  return { runIds: data, isLoading, error }
}

export function useTemplates() {
  const supabaseClient = useSupabaseClient<Database>()
  const { projectId: appId } = useContext(ProjectContext)

  const query = !appId
    ? null
    : supabaseClient
        .from("template")
        .select(
          "id,name,slug,app_id,created_at,org_id,group,mode,versions:template_version(id,content,extra,created_at,version,is_draft)",
        )
        .eq("app_id", appId)
        .order("created_at", {
          ascending: false,
        })

  const { data: templates, isLoading, mutate } = useQuery(query)

  // insert mutation
  const { trigger: insert } = useInsertMutation(
    supabaseClient.from("template"),
    ["id"],
    "id,name,slug,app_id,org_id,group,mode",
  )

  // update mutation
  const { trigger: update } = useUpdateMutation(
    supabaseClient.from("template"),
    ["id"],
    "name,slug,group,mode",
  )

  const { trigger: remove } = useDeleteMutation(
    supabaseClient.from("template"),
    ["id"],
  )

  // insertVersion mutation
  const { trigger: insertVersion } = useInsertMutation(
    supabaseClient.from("template_version"),
    ["id"],
    "id,template_id,content,extra,version,is_draft",
  )

  // update version
  const { trigger: updateVersion } = useUpdateMutation(
    supabaseClient.from("template_version"),
    ["id"],
    "content,extra,is_draft",
    {
      disableAutoQuery: true,
    },
  )

  return {
    templates,
    insert,
    insertVersion,
    update,
    remove,
    updateVersion,
    mutate,
    loading: isLoading,
  }
}

export function useRunsUsage(range, user_id?: string) {
  const supabaseClient = useSupabaseClient()
  const { projectId: appId } = useContext(ProjectContext)

  const { data: usage, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage", {
      app_id: appId,
      user_id,
      days: range,
    }),
    softOptions,
  )

  return { usage: extendWithCosts(usage), loading: isLoading }
}

export function useRunsUsageByDay(range, user_id = undefined) {
  const supabaseClient = useSupabaseClient()
  const { projectId: appId } = useContext(ProjectContext)

  const { data: dailyUsage, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage_daily", {
      app_id: appId,
      user_id,
      days: range,
    }),
    hardOptions,
  )

  return { dailyUsage: extendWithCosts(dailyUsage), loading: isLoading }
}

export function useRunsUsageByUser(range = null) {
  const supabaseClient = useSupabaseClient()
  const { projectId: appId } = useContext(ProjectContext)

  const { data: usageByUser, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage_by_user", {
      app_id: appId,
      days: range,
    }),
    hardOptions,
  )

  const reduceUsersUsage = (usage) => {
    const userData = []

    const uniqueUserIds = Array.from(new Set(usage.map((u) => u.user_id)))

    for (let id of uniqueUserIds) {
      const userUsage = usage.filter((u) => u.user_id === id)
      const totalCost = userUsage.reduce((acc, curr) => {
        acc += curr.cost
        return acc
      }, 0)

      const totalAgentRuns = userUsage.reduce((acc, curr) => {
        acc += curr.success + curr.errors
        return acc
      }, 0)

      userData.push({
        user_id: id,
        agentRuns: totalAgentRuns,
        cost: totalCost,
      })
    }

    return userData
  }

  return {
    usageByUser: reduceUsersUsage(extendWithCosts(usageByUser || [])),
    loading: isLoading,
  }
}

export function useRun(runId: string) {
  const supabaseClient = useSupabaseClient<Database>()

  const { data: run, isLoading } = useQuery(
    !runId
      ? null
      : supabaseClient.from("run").select("*").eq("id", runId).single(),
    softOptions,
  )

  return { run, loading: isLoading }
}

export function useRelatedRuns(runId: string) {
  const supabaseClient = useSupabaseClient<Database>()

  const { data: relatedRuns, isLoading } = useQuery(
    supabaseClient.rpc("get_related_runs", {
      run_id: runId,
    }),
  )

  return { relatedRuns: extendWithCosts(relatedRuns), loading: isLoading }
}

export function useAppUsersList() {
  const supabaseClient = useSupabaseClient()
  const { projectId: appId } = useContext(ProjectContext)

  const {
    data: users,
    isLoading,
    loadMore,
    isValidating,
  } = useOffsetInfiniteScrollQuery(
    supabaseClient
      .from("app_user")
      .select("id,app,external_id,created_at,last_seen,props")
      .eq("app", appId)
      .order("last_seen", { ascending: false }),
    { ...softOptions, pageSize: 100 },
  )

  const { usageByUser } = useRunsUsageByUser()

  const usersWithUsage = users?.map((u) => {
    const usage = usageByUser.find((uu) => uu.user_id === u.id)

    return {
      ...u,
      ...usage,
    }
  })

  return {
    users: usersWithUsage,
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useAppUsers(usageRange = 30) {
  const supabaseClient = useSupabaseClient()
  const { projectId: appId } = useContext(ProjectContext)

  const maxLastSeen = new Date(
    new Date().getTime() - usageRange * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)

  const { data: users, isLoading } = useQuery(
    supabaseClient
      .from("app_user")
      .select("id,app,external_id,created_at,last_seen,props")
      .eq("app", appId)
      .gt("last_seen", maxLastSeen),
    softOptions,
  )

  const { usageByUser } = useRunsUsageByUser(usageRange)

  const usersWithUsage = users?.map((u) => {
    const usage = usageByUser.find((uu) => uu.user_id === u.id)

    return {
      ...u,
      ...usage,
    }
  })

  return { usersWithUsage, loading: isLoading }
}

export function useAppUser(id: string) {
  const supabaseClient = useSupabaseClient<Database>()

  if (!id) {
    return { user: null, loading: false }
  }

  const { data: user, isLoading } = useQuery(
    supabaseClient.from("app_user").select("*").eq("id", id).single(),
    hardOptions,
  )

  return { user, loading: isLoading }
}

export function useFetchSWR(url: string | null, props: any = {}) {
  const key = url ? JSON.stringify({ url, props }) : null

  const { data, isValidating } = useSWR(
    key,
    () =>
      fetch(`/api/${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // automatically append the app id to the request
        body: JSON.stringify({ ...props }),
      }).then((res) => res.json()),
    softOptions,
  )

  return { data, loading: isValidating }
}

// Universal SWR hook for the current app
export function useAppSWR(url: string, props: any = {}) {
  const { project } = useCurrentProject()

  const { data, loading } = useFetchSWR(project ? url : null, {
    ...props,
    appId: project?.id,
  })

  return { data, loading }
}
