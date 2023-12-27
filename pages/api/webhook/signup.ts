import { edgeWrapper } from "@/lib/api/edgeHelpers"
import { jsonResponse } from "@/lib/api/jsonResponse"
import { sendTelegramMessage } from "@/lib/notifications"
import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"
export const dynamic = "force-dynamic"

// This sets up the user profile after signing up
export default edgeWrapper(async function handler(req: NextRequest) {
  const {
    type,
    table,
    record: {
      email,
      id: userId,
      raw_user_meta_data: {
        projectName,
        orgName,
        employeeCount,
        name,
        orgId,
        signupMethod,
      },
    },
  } = await req.json()

  if (type !== "INSERT" || table !== "users") {
    return new NextResponse()
  }

  if (signupMethod === "signup") {
    // First user in Org (/signup)

    // Create new Org
    const { data: org } = await supabaseAdmin
      .from("org")
      .insert({ name: orgName || `${name}'s Org`, plan: "free" })
      .select()
      .single()
      .throwOnError()

    // Add user to Org as admin
    await supabaseAdmin
      .from("profile")
      .insert({
        id: userId,
        name,
        email,
        org_id: org.id,
        role: "admin",
        verified: process.env.SKIP_EMAIL_VERIFY ? true : false,
      })
      .throwOnError()

    // Create first app
    await supabaseAdmin
      .from("app")
      .insert({ name: projectName, org_id: org.id })
      .select()
      .single()
      .throwOnError()

    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/user/send-verification`,
      {
        method: "POST",
        body: JSON.stringify({ email, name }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    // await sendEmail(WELCOME_EMAIL(email, name, appId))
  } else if (signupMethod === "join") {
    // New user in existing Org (/join)

    // Add user to Org as member
    await supabaseAdmin
      .from("profile")
      .insert({
        id: userId,
        name,
        email,
        org_id: orgId,
        role: "member",
        verified: true, // Auto verify email
      })
      .throwOnError()
  }

  await sendTelegramMessage(
    `<b>🔔 New signup from ${email}</b>
    
${name} is ${
      signupMethod === "signup"
        ? `building ${projectName} @ ${orgName} (${employeeCount}).`
        : "joining an org."
    }`,
    "users",
  )

  return jsonResponse(200, { ok: true })
})
