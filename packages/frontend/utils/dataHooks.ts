import {
  useDeleteMutation,
  useInsertMutation,
  useOffsetInfiniteScrollQuery,
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-swr"

import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useContext } from "react"
import { calcRunCost } from "./calcCosts"
import { ProjectContext } from "./context"
import { Database } from "./supaTypes"
import useSWR from "swr"
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
