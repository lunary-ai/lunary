import { edgeWrapper, jsonResponse } from "@/lib/api/helpers"
import { WELCOME_EMAIL } from "@/lib/emails"
import { sendTelegramMessage } from "@/lib/notifications"
import { sendEmail } from "@/lib/sendEmail"
import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"
export const dynamic = "force-dynamic"

// This sets up the user profile after signing up
export default async function handler(req: NextRequest) {
  const {
    type,
    table,
    record: {
      email,
      id: userId,
      raw_user_meta_data: { projectName, name, orgName, orgId },
    },
  } = await req.json()

  if (type !== "INSERT" || table !== "users") {
    return new NextResponse()
  }

  await supabaseAdmin.from("profile").insert({ id: userId, email, name })

  const { count } = await supabaseAdmin
    .from("org_user")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (count > 0) {
    // First user in Org (/signup)

    // Create new Org
    const { data: org } = await supabaseAdmin
      .from("org")
      .insert({ name: orgName, plan: "free" })
      .select()
      .single()

    // Add user to Org as admin
    await supabaseAdmin
      .from("org_member")
      .insert({ org_id: org.id, member_id: userId, role: "admin" })

    // Create first app
    const {
      data: { id: appId },
    } = await supabaseAdmin
      .from("app")
      .insert({ name: projectName, owner: userId })
      .select()
      .single()

    await sendTelegramMessage(
      `<b>🔔 New signup from ${email}</b><br/>${name} is building ${projectName} in Org ${orgName}.`,
    )
    await sendEmail(WELCOME_EMAIL(email, name, appId))
  } else {
    // New user in existing Org (/join)

    // Add user to Org as member
    await supabaseAdmin
      .from("org_member")
      .insert({ org_id: orgId, member_id: userId, role: "admin" })
  }

  return jsonResponse(200, { ok: true })
}
