import {
  useInsertMutation,
  useQuery,
} from "@supabase-cache-helpers/postgrest-swr"
import { useSessionContext } from "@supabase/auth-helpers-react"

export function useApps() {
  const { supabaseClient } = useSessionContext()

  const { data: apps, isLoading } = useQuery(
    supabaseClient.from("apps").select("name,owner,id"),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const { trigger: insert } = useInsertMutation(
    supabaseClient.from("apps"),
    ["id"],
    "name,owner"
  )

  return { apps, loading: isLoading, insert }
}

export function useEvents(appId: string, convoId: string) {
  const { supabaseClient } = useSessionContext()

  const { data: events, isLoading } = useQuery(
    supabaseClient
      .from("events")
      .select("*")
      .eq("app", appId)
      .eq("convo", convoId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  return { events, loading: isLoading }
}

export function useConvos(appId: string) {
  const { supabaseClient } = useSessionContext()

  const { data: convos, isLoading } = useQuery(
    supabaseClient
      .from("convos")
      .select("*", { count: "exact" })
      .eq("app", appId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  return { convos, loading: isLoading }
}
