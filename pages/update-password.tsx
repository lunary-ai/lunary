import { useUser } from "@supabase/auth-helpers-react"

export default function UpdatePassword() {
  const user = useUser()
  console.log(user)
  return "In construction"
}
