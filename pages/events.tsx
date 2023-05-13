import { useQuery } from "@supabase-cache-helpers/postgrest-swr"
import { useSessionContext } from "@supabase/auth-helpers-react"

export default function Events() {
  const { supabaseClient } = useSessionContext()

  const { data: events } = useQuery(supabaseClient.from("events").select("*"), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  return (
    <>
      <h1>Events</h1>
      <ul>
        {events?.map((event) => (
          <li key={event.id}>
            <h2>{event.type}</h2>
            <p>{event.message}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
