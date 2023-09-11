import {
  useDeleteMutation,
  useInsertMutation,
  useOffsetInfiniteQuery,
  useOffsetInfiniteScrollQuery,
  useQuery,
} from "@supabase-cache-helpers/postgrest-swr"

import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useMantineTheme } from "@mantine/core"
import { Database } from "./supaTypes"
import { useContext, useEffect } from "react"
import { calcRunCost } from "./calcCosts"
import { AppContext } from "./context"

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
const getUserColor = (theme, id: string) => {
  const seed = id
    .split("")
    .map((char) => char.charCodeAt(0))
    .reduce((acc, curr) => acc + curr, 0)
  const colors = Object.keys(theme.colors)

  const userColor = colors[seed % colors.length]

  const finalColor = theme.colors[userColor][4]
  return finalColor
}

const extendWithCosts = (data: any[]) =>
  data?.map((r) => ({
    ...r,
    cost: calcRunCost(r),
  }))

export const useProfile = () => {
  const supabaseClient = useSupabaseClient<Database>()

  const user = useUser()

  const theme = useMantineTheme()

  const { data: profile, isLoading } = useQuery(
    user
      ? supabaseClient
          .from("profile")
          .select("id,email,name,updated_at,plan")
          .match({ id: user?.id })
          .single()
      : null,
    hardOptions
  )

  if (profile) {
    // @ts-ignore
    profile.color = getUserColor(theme, profile.id)
  }

  return { profile, loading: isLoading }
}

export function useApps() {
  const supabaseClient = useSupabaseClient<Database>()

  const { data: apps, isLoading } = useQuery(
    supabaseClient.from("app").select("name,owner,id"),
    softOptions
  )

  const { trigger: insert } = useInsertMutation(
    supabaseClient.from("app"),
    ["id"],
    "name,owner,id"
  )

  const { trigger: drop } = useDeleteMutation(supabaseClient.from("app"), [
    "id",
  ])

  return { apps, loading: isLoading, insert, drop }
}

export function useRuns(type: string, match?: any, withoutParent = false) {
  const supabaseClient = useSupabaseClient<Database>()
  const { app } = useContext(AppContext)

  let query = supabaseClient
    .from("run")
    .select(
      "id,user,type,name,created_at,ended_at,app,input,output,parent_run,prompt_tokens,completion_tokens,status,tags,error,params"
    )
    .order("created_at", {
      ascending: false,
    })
    .eq("type", type)
    .eq("app", app?.id)
  // .limit(200)

  if (match) {
    query = query.match(match)
  }

  if (withoutParent) {
    query = query.filter("parent_run", "is", null)
  }

  const {
    data: runs,
    isLoading,
    isValidating,
    loadMore,
  } = useOffsetInfiniteScrollQuery(query, { ...softOptions, pageSize: 10 })
  // runs?.reverse()

  return {
    runs: extendWithCosts(runs),
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useRunsUsage(range, user_id = undefined) {
  const supabaseClient = useSupabaseClient()
  const { app } = useContext(AppContext)

  const { data: usage, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage", {
      app_id: app?.id,
      user_id,
      days: range,
    }),
    softOptions
  )

  return { usage: extendWithCosts(usage), loading: isLoading }
}

export function useRunsUsageByDay(range, user_id = undefined) {
  const supabaseClient = useSupabaseClient()
  const { app } = useContext(AppContext)

  const { data: dailyUsage, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage_daily", {
      app_id: app?.id,
      user_id,
      days: range,
    }),
    hardOptions
  )

  return { dailyUsage: extendWithCosts(dailyUsage), loading: isLoading }
}

export function useRunsUsageByUser(range) {
  const supabaseClient = useSupabaseClient()
  const { app } = useContext(AppContext)

  const { data: usageByUser, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage_by_user", {
      app_id: app?.id,
      days: range,
    }),
    hardOptions
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
    supabaseClient.from("run").select("*").eq("id", runId).single(),
    softOptions
  )

  return { run, loading: isLoading }
}

export function useAppUsers(usageRange = 30) {
  const supabaseClient = useSupabaseClient()
  const { app } = useContext(AppContext)

  const maxLastSeen = new Date(
    new Date().getTime() - usageRange * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10)

  const { data: users, isLoading } = useQuery(
    supabaseClient
      .from("app_user")
      .select("id,app,external_id,created_at,last_seen,props")
      .eq("app", app?.id)
      .gt("last_seen", maxLastSeen)
      .limit(100),
    softOptions
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
    hardOptions
  )

  return { user, loading: isLoading }
}
