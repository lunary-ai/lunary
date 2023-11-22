import { edgeWrapper } from "@/lib/api/edgeHelpers"

import { supabaseAdmin } from "@/lib/supabaseClient"
import { sendEmail } from "@/lib/sendEmail"
import { WELCOME_EMAIL } from "@/lib/emails"

import { jwtVerify } from "jose"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default edgeWrapper(async function handler(req) {
  const params = new URL(req.url).searchParams

  const token = params.get("token")

  // Verify token
  const {
    payload: { email },
  }: {
    payload: { email: string }
  } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))

  const {
    data: { org_id, name },
  } = await supabaseAdmin
    .from("profile") // Assuming 'profiles' is your user table
    .update({ verified: true })
    .eq("email", email)
    .select()
    .single()
    .throwOnError()

  // get the user's first app
  const {
    data: { id },
  } = await supabaseAdmin
    .from("app")
    .select("id")
    .eq("org_id", org_id)
    .single()
    .throwOnError()

  await sendEmail(WELCOME_EMAIL(email, name, id))

  // redirect to app
  return new Response(`Email verified`, {
    status: 302,
    headers: {
      Location: process.env.NEXT_PUBLIC_APP_URL,
    },
  })
})
