import sql from "@/utils/db"
import { Context } from "koa"
import Router from "koa-router"
import EmailPassword from "supertokens-node/recipe/emailpassword"
import { RESET_PASSWORD } from "@/utils/emails"
import { sendEmail } from "@/utils/sendEmail"

const auth = new Router({
  prefix: "/auth",
})

auth.post("/request-password-reset", async (ctx: Context) => {
  const email = ctx.request.body.email as string
  const [user] = await sql`select id from profile where email = ${email}`

  const linkResponse = await EmailPassword.createResetPasswordLink(
    "public",
    user.id,
    email,
  )

  const link = linkResponse.link.replace("/auth", "")

  sendEmail(RESET_PASSWORD(email, link))

  ctx.body = { ok: true }
})

export default auth
