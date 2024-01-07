import { edgeWrapper } from "@/lib/api/edgeHelpers"

import { WELCOME_EMAIL } from "@/lib/emails"
import { sendEmail } from "@/lib/sendEmail"

import sql from "@/lib/db"

import { jwtVerify } from "jose"

export const runtime = "edge"
export const dynamic = "force-dynamic"

const response = {
  status: 302,
  headers: {
    Location: process.env.NEXT_PUBLIC_APP_URL + "?verified=true",
  },
}

export default edgeWrapper(async function handler(req) {
  const params = new URL(req.url).searchParams

  const token = params.get("token") as string

  const {
    payload: { email },
  }: {
    payload: { email: string }
  } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))

  // check if email is already verified
  let verified
  {
    const result = await sql`
      SELECT verified
      FROM profile
      WHERE email = ${email}
    `
    verified = result[0]?.verified
  }

  if (verified) {
    return new Response("Email already verified", response)
  }

  let org_id, name
  {
    const result = await sql`
      UPDATE profile
      SET verified = true
      WHERE email = ${email}
      RETURNING org_id, name
    `
    org_id = result[0]?.org_id
    name = result[0]?.name
  }

  let id
  {
    const result = await sql`
      SELECT id
      FROM app
      WHERE org_id = ${org_id}
    `
    id = result[0]?.id
  }

  await sendEmail(WELCOME_EMAIL(email, name, id))

  return new Response("Email verified", response)
})
