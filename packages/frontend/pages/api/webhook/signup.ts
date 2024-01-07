import { edgeWrapper } from "@/lib/api/edgeHelpers"
import { jsonResponse } from "@/lib/api/jsonResponse"
import { sendTelegramMessage } from "@/lib/notifications"
import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"

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

  let org
  if (signupMethod === "signup") {
    // First user in Org (/signup)

    // Create new Org
    const [orgResult] = await sql`
      INSERT INTO org (name, plan)
      VALUES (${orgName || `${name}'s Org`}, 'free')
      RETURNING *
    `
    org = orgResult

    // Add user to Org as admin
    await sql`
      INSERT INTO profile (id, name, email, org_id, role, verified)
      VALUES (${userId}, ${name}, ${email}, ${org.id}, 'admin', ${
        process.env.SKIP_EMAIL_VERIFY ? true : false
      })
    `

    // Create first app
    await sql`
      INSERT INTO app (name, org_id)
      VALUES (${projectName}, ${org.id})
    `

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
    await sql`
      INSERT INTO profile (id, name, email, org_id, role, verified)
      VALUES (${userId}, ${name}, ${email}, ${orgId}, 'member', true)
    `
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
