import {
  useInsertMutation,
  useQuery,
} from "@supabase-cache-helpers/postgrest-swr"

import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useMantineTheme } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"
import { Database } from "./supaTypes"
import { useEffect } from "react"

const options = {
  // revalidateOnFocus: false,
  // revalidateOnReconnect: false,
  dedupingInterval: 10000,
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

export const useProfile = () => {
  const supabaseClient = useSupabaseClient<Database>()

  const user = useUser()

  const theme = useMantineTheme()

  const { data: profile, isLoading } = useQuery(
    user
      ? supabaseClient
          .from("profiles")
          .select("*")
          .match({ id: user?.id })
          .single()
      : null,
    options
  )

  if (profile) {
    profile.color = getUserColor(theme, profile.id)
  }

  return { profile, loading: isLoading }
}

export function useApps() {
  const supabaseClient = useSupabaseClient<Database>()

  const { data: apps, isLoading } = useQuery(
    supabaseClient.from("app").select("name,owner,id"),
    options
  )

  const { trigger: insert } = useInsertMutation(
    supabaseClient.from("apps"),
    ["id"],
    "name,owner"
  )

  return { apps, loading: isLoading, insert }
}

export function useCurrentApp() {
  const { apps, loading } = useApps()

  const [appId, setAppId] = useLocalStorage({
    key: "appId",
    defaultValue: null,
  })

  useEffect(() => {
    if (!appId && apps?.length) {
      setAppId(apps[0].id)
    }
  }, [apps])

  const app = apps?.find((app) => app.id === appId)

  return { app, loading, setAppId }
}

export function useAgents() {
  const supabaseClient = useSupabaseClient<Database>()
  const { app } = useCurrentApp()

  const { data: agents, isLoading } = useQuery(
    supabaseClient.from("agents").select("*").eq("app", app?.id).limit(100),
    options
  )

  return { agents, loading: isLoading }
}

export function useRuns(type: string, name?: string) {
  const supabaseClient = useSupabaseClient<Database>()
  const { app } = useCurrentApp()

  let query = supabaseClient
    .from("run")
    .select("*")
    .order("created_at", {
      ascending: true,
    })
    .eq("type", type)
    .eq("app", app?.id)

  if (name) {
    query = query.eq("name", name)
  }

  const { data: runs, isLoading } = useQuery(query.limit(200), options)

  return { runs, loading: isLoading }
}

export function useGroupedRunsWithUsage(range) {
  const supabaseClient = useSupabaseClient()
  const { app } = useCurrentApp()

  const { data: usage, isLoading } = useQuery(
    app
      ? supabaseClient.rpc("get_runs_usage", {
          app_id: app.id,
          days: range,
        })
      : null
  )

  return { usage, loading: isLoading }
}

export function useRun(runId: string) {
  const supabaseClient = useSupabaseClient<Database>()

  const { data: run, isLoading } = useQuery(
    supabaseClient.from("run").select("*").eq("id", runId).single(),
    options
  )

  return { run, loading: isLoading }
}
