import { edgeWrapper } from "@/lib/api/edgeHelpers"

import { sendEmail } from "@/lib/sendEmail"
import { CONFIRM_EMAIL } from "@/lib/emails"
import { jsonResponse } from "@/lib/api/jsonResponse"

import { SignJWT } from "jose"

export const runtime = "edge"
export const dynamic = "force-dynamic"

function sign(payload, secret: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 60 * 60 // one hour

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(secret))
}

export default edgeWrapper(async function handler(req) {
  // get email from body
  const { email, name } = await req.json()

  if (process.env.SKIP_EMAIL_VERIFY) jsonResponse(200, { message: "skipped" })

  // Generate token
  const token = await sign({ email }, process.env.JWT_SECRET)

  // Generate confirmation link
  const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/user/verify-email?token=${token}`

  await sendEmail(CONFIRM_EMAIL(email, name, confirmLink))

  return jsonResponse(200, { success: true })
})
