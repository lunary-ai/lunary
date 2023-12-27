import { edgeWrapper } from "@/lib/api/edgeHelpers"

import { WELCOME_EMAIL } from "@/lib/emails"
import { sendEmail } from "@/lib/sendEmail"
import { supabaseAdmin } from "@/lib/supabaseClient"

import { jwtVerify } from "jose"

export const runtime = "edge"
export const dynamic = "force-dynamic"

const response = new Response(`Email verified`, {
  status: 302,
  headers: {
    Location: process.env.NEXT_PUBLIC_APP_URL + "?verified=true",
  },
})

export default edgeWrapper(async function handler(req) {
  const params = new URL(req.url).searchParams

  const token = params.get("token")

  const {
    payload: { email },
  }: {
    payload: { email: string }
  } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))

  // check if email is already verified
  const { data: { verified } = {} } = await supabaseAdmin
    .from("profile")
    .select("verified")
    .eq("email", email)
    .single()
    .throwOnError()

  if (verified) {
    return response
  }

  const {
    data: { org_id, name },
  } = await supabaseAdmin
    .from("profile")
    .update({ verified: true })
    .eq("email", email)
    .select()
    .single()
    .throwOnError()

  const {
    data: { id },
  } = await supabaseAdmin
    .from("app")
    .select("id")
    .eq("org_id", org_id)
    .single()
    .throwOnError()

  await sendEmail(WELCOME_EMAIL(email, name, id))

  return response
})
