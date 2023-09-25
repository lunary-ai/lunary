import {
  useDeleteMutation,
  useInsertMutation,
  useOffsetInfiniteScrollQuery,
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-swr"

import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useMantineTheme } from "@mantine/core"
import { Database } from "./supaTypes"
import { useContext } from "react"
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
          .select("id,email,name,updated_at,plan,team_owner")
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

export const useTeam = () => {
  const supabaseClient = useSupabaseClient<Database>()
  const { profile: user } = useProfile()
  const theme = useMantineTheme()

  const ownerId = user?.team_owner || user?.id
  const { data, isLoading } = useQuery(
    user
      ? supabaseClient
          .from("profile")
          .select("*")
          .or(`id.eq.${ownerId},team_owner.eq.${ownerId}`)
      : null,
    hardOptions
  )

  const users = data
    ?.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.team_owner ? "Member" : "Owner",
      plan: user.plan,
      color: getUserColor(theme, user.id),
    }))
    .sort((a, b) => {
      if (a.role === "Owner" && b.role === "Member") return -1
      if (a.role === "Member" && b.role === "Owner") return 1
      return 0
    })

  const team = {
    plan: users && users[0].plan,
    users,
  }

  return { team, loading: isLoading }
}

export function useApps() {
  const supabaseClient = useSupabaseClient<Database>()
  const { team } = useTeam()

  const owner = team?.users && team.users[0]

  const { data: apps, isLoading } = useQuery(
    owner?.id
      ? supabaseClient
          .from("app")
          .select("name,owner,id")
          .match({ owner: owner.id })
      : null,
    softOptions
  )

  const { trigger: insert } = useInsertMutation(
    supabaseClient.from("app"),
    ["id"],
    "name,owner,id"
  )

  const { trigger: update } = useUpdateMutation(
    supabaseClient.from("app"),
    ["id"],
    "name,id"
  )

  const { trigger: drop } = useDeleteMutation(supabaseClient.from("app"), [
    "id",
  ])

  return { apps, loading: isLoading, insert, drop, update }
}

export function useCurrentApp() {
  const { appId, setAppId } = useContext(AppContext)

  const { apps, loading } = useApps()

  const app = apps?.find((a) => a.id === appId)

  return { app, setAppId, loading }
}

export function useRuns(
  type: string,
  config: {
    notInfinite?: boolean
    match?: any
    filter?: Array<any>
    not?: Array<any>
    select?: string
  } = {}
) {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const { notInfinite, match, select, filter, not } = config

  let query = supabaseClient
    .from("run")
    .select(
      select || "*" // "id,user,type,name,created_at,ended_at,app,input,output,parent_run,prompt_tokens,completion_tokens,status,tags,error,params,feedback,retry_of"
    )
    .order("created_at", {
      ascending: false,
    })
    .eq("type", type)
    .eq("app", appId)

  if (match) {
    query = query.match(match)
  }

  if (filter) {
    // @ts-ignore
    query = query.filter(...filter)
  }

  if (not) {
    // @ts-ignore
    query = query.not(...not)
  }

  const {
    data: runs,
    isLoading,
    isValidating,
    // @ts-ignore
    loadMore,
  } = !notInfinite
    ? useOffsetInfiniteScrollQuery(query, { ...softOptions, pageSize: 10 })
    : useQuery(query.limit(100), { ...softOptions })

  return {
    runs: extendWithCosts(runs),
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useRunsUsage(range, user_id = undefined) {
  const supabaseClient = useSupabaseClient()
  const { appId } = useContext(AppContext)

  const { data: usage, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage", {
      app_id: appId,
      user_id,
      days: range,
    }),
    softOptions
  )

  return { usage: extendWithCosts(usage), loading: isLoading }
}

export function useRunsUsageByDay(range, user_id = undefined) {
  const supabaseClient = useSupabaseClient()
  const { appId } = useContext(AppContext)

  const { data: dailyUsage, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage_daily", {
      app_id: appId,
      user_id,
      days: range,
    }),
    hardOptions
  )

  return { dailyUsage: extendWithCosts(dailyUsage), loading: isLoading }
}

export function useRunsUsageByUser(range) {
  const supabaseClient = useSupabaseClient()
  const { appId } = useContext(AppContext)

  const { data: usageByUser, isLoading } = useQuery(
    supabaseClient.rpc("get_runs_usage_by_user", {
      app_id: appId,
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

export function useRelatedRuns(runId: string) {
  const supabaseClient = useSupabaseClient<Database>()

  const { data: relatedRuns, isLoading } = useQuery(
    supabaseClient.rpc("get_related_runs", {
      run_id: runId,
    })
  )

  return { relatedRuns: extendWithCosts(relatedRuns), loading: isLoading }
}

export function useAppUsers(usageRange = 30) {
  const supabaseClient = useSupabaseClient()
  const { appId } = useContext(AppContext)

  const maxLastSeen = new Date(
    new Date().getTime() - usageRange * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10)

  const { data: users, isLoading } = useQuery(
    supabaseClient
      .from("app_user")
      .select("id,app,external_id,created_at,last_seen,props")
      .eq("app", appId)
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
