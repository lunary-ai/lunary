import {
  useDeleteMutation,
  useInsertMutation,
  useOffsetInfiniteScrollQuery,
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-swr"

import { useMantineTheme } from "@mantine/core"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useContext, useEffect, useState } from "react"
import { calcRunCost } from "./calcCosts"
import { AppContext } from "./context"
import { Database } from "./supaTypes"
import useSWR from "swr"
import { useColorScheme } from "@mantine/hooks"
import { useRouter } from "next/router"

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
const getUserColor = (scheme, theme, id: string) => {
  const seed = id
    .split("")
    .map((char) => char.charCodeAt(0))
    .reduce((acc, curr) => acc + curr, 0)
  const colors = Object.keys(theme.colors)

  const userColor = colors[seed % colors.length]

  const finalColor = theme.colors[userColor][scheme === "dark" ? 8 : 4]
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
  const scheme = useColorScheme()

  const query = supabaseClient
    .from("profile")
    .select("*,org(*,apiKey:api_key,users:profile(*))")
    .match({ id: user?.id })
    .single()

  const {
    data: profile,
    mutate,
    error,
    isLoading,
  } = useQuery(user ? query : null, hardOptions)

  const users = profile?.org.users
    ?.sort((a, b) => {
      if (a.role === "admin" && b.role === "member") return -1
      if (a.role === "member" && b.role === "admin") return 1
      return 0
    })
    .map((u) => ({
      ...u,
      color: getUserColor(scheme, theme, u.id),
    }))

  const profileWithOrg = profile
    ? {
        ...profile,
        color: getUserColor(scheme, theme, user.id),
        org: {
          ...profile.org,
          users,
        },
      }
    : null

  const { trigger: updateOrg } = useUpdateMutation(
    supabaseClient.from("org"),
    ["id"],
    "name,id",
  )

  return {
    profile: profileWithOrg,
    error,
    loading: isLoading,
    mutate,
    updateOrg,
  }
}

export function useApps() {
  const supabaseClient = useSupabaseClient<Database>()
  const { profile } = useProfile()

  const query = supabaseClient
    .from("app")
    .select("id,name")
    .eq("org_id", profile?.org?.id)

  const { data: apps, isLoading } = useQuery(
    profile?.org ? query : null,
    softOptions,
  )

  const { trigger: insert } = useInsertMutation(
    supabaseClient.from("app"),
    ["id"],
    "name,org_id,id",
  )

  const { trigger: update } = useUpdateMutation(
    supabaseClient.from("app"),
    ["id"],
    "name,id",
  )

  const { trigger: drop } = useDeleteMutation(supabaseClient.from("app"), [
    "id",
  ])

  return { apps, loading: isLoading, insert, drop, update }
}

export function useCurrentApp() {
  const { appId, setAppId } = useContext(AppContext)
  const supabaseClient = useSupabaseClient<Database>()

  const { count } = useQuery(
    supabaseClient
      .from("run")
      .select("id", { count: "exact", head: true })
      .eq("app", appId)
      .limit(1),
  )

  const { apps, loading } = useApps()

  const app = apps?.find((a) => a.id === appId)

  const activated = !!count

  const appWithActivated = app ? { ...app, activated } : null

  return { app: appWithActivated, setAppId, loading }
}

export function useModelNames() {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const query = supabaseClient.rpc("get_model_names", {
    app_id: appId,
  })

  const { data } = useQuery<string[]>(query)

  return { modelNames: data || [] }
}

export function useTags() {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const query = supabaseClient.rpc("get_tags", {
    app_id: appId,
  })

  const { data: tags } = useQuery<string[]>(query)
  return { tags }
}

export function useAllFeedbacks() {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const query = supabaseClient.rpc("get_all_feedbacks", {
    app_id: appId,
  })

  const { data, isLoading } = useQuery<string[]>(query)

  return { allFeedbacks: data, isLoading }
}

export function useConvosByFeedback(feedbackFilters) {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const query = supabaseClient.rpc("get_convos_by_feedback", {
    app_id: appId,
    feedback_filters: feedbackFilters,
  })

  const { data, isLoading, error } = useQuery<string[]>(query)

  return { runIds: data, isLoading, error }
}

export function useUsers() {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const query = supabaseClient.rpc("get_users", {
    app_id: appId,
  })

  const { data: users } = useQuery<string[]>(query)
  return { users }
}

export function useLLMCalls(
  search,
  modelNames: string[] = [],
  tags: string[] = [],
) {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  let query
  if (search === null || search === "") {
    query = supabaseClient
      .from("run")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .eq("type", "llm")
  } else {
    query = supabaseClient.rpc("get_runs", {
      app_id: appId,
      search_pattern: search,
    })
  }

  query.eq("app", appId)

  if (modelNames.length > 0) {
    query.in("name", modelNames)
  }

  if (tags.length > 0) {
    query.overlaps("tags", tags)
  }

  const {
    data: runs,
    isLoading,
    isValidating,
    loadMore,
  } = useOffsetInfiniteScrollQuery(query, { ...softOptions, pageSize: 100 })

  return {
    runs: extendWithCosts(runs),
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useFilteredLLMCalls(
  search,
  modelNames = [],
  tags = [],
  feedbacks = [],
  users = [],
) {
  const supabaseClient = useSupabaseClient()
  const { appId } = useContext(AppContext)

  const query = supabaseClient.rpc("get_runs", {
    app_id: appId,
    search_pattern: search,
    model_names: modelNames,
    tags_param: tags,
    feedback_param: feedbacks,
    users_param: users.map((u) => Number.parseInt(u)),
  })

  const {
    data,
    isLoading,
    isValidating,
    // @ts-ignore
    loadMore,
  } = useOffsetInfiniteScrollQuery(query, { ...softOptions, pageSize: 100 })

  return {
    runs: data ? extendWithCosts(data) : [],
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useTraces(search) {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  let query
  if (search === null || search === "") {
    query = supabaseClient
      .from("run")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .or("type.eq.agent,type.eq.chain")
      .is("parent_run", null)
  } else {
    query = supabaseClient.rpc("get_trace_runs_roots", {
      app_id: appId,
      search_pattern: search,
    })
  }

  query.eq("app", appId)

  const {
    data: runs,
    isLoading,
    isValidating,
    loadMore,
  } = useOffsetInfiniteScrollQuery(query, { ...softOptions, pageSize: 100 })

  return {
    runs: extendWithCosts(runs),
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useRuns(
  type: string,
  config: {
    notInfinite?: boolean
    match?: any
    filter?: Array<any>
    not?: Array<any>
    select?: string
  } = {},
) {
  const supabaseClient = useSupabaseClient<Database>()
  const { appId } = useContext(AppContext)

  const { notInfinite, match, select, filter, not } = config

  let query = supabaseClient
    .from("run")
    .select(select || "*")
    .order("created_at", {
      ascending: false,
    })
    .eq("app", appId)

  if (type) {
    query = query.eq("type", type)
  }

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
    softOptions,
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
    hardOptions,
  )

  return { dailyUsage: extendWithCosts(dailyUsage), loading: isLoading }
}

export function useRunsUsageByUser(range = null) {
  const supabaseClient = useSupabaseClient()
  const { appId } = useContext(AppContext)

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
    supabaseClient.from("run").select("*").eq("id", runId).single(),
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
  const { appId } = useContext(AppContext)

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
  const { appId } = useContext(AppContext)

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

export function useFetchSWR(url: string, props: any = {}) {
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
  const { app } = useCurrentApp()

  const { data, loading } = useFetchSWR(app && url, {
    ...props,
    appId: app?.id,
  })

  return { data, loading }
}
