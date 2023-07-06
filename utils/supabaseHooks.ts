import {
  useInsertMutation,
  useQuery,
} from "@supabase-cache-helpers/postgrest-swr"

import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useMantineTheme } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"
import { Database } from "./supaTypes"

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

  const app = apps?.find((app) => app.id === appId)

  return { app, loading, setAppId }
}

export function useAgentRuns() {
  const supabaseClient = useSupabaseClient<Database>()
  const { app } = useCurrentApp()

  const { data: agentRuns, isLoading } = useQuery(
    supabaseClient
      .from("agent_run")
      .select("*")
      .order("created_at", {
        ascending: true,
      })
      .eq("app", app?.id)
      .limit(100),
    options
  )

  return { agentRuns, loading: isLoading }
}

export function useGenerations() {
  const supabaseClient = useSupabaseClient<Database>()
  const { app } = useCurrentApp()

  const { data: generations, isLoading } = useQuery(
    supabaseClient
      .from("llm_run")
      .select("*")
      .order("created_at", {
        ascending: true,
      })
      .eq("app", app?.id)
      .limit(100),
    options
  )

  console.log(generations)

  return { generations, loading: isLoading }
}
