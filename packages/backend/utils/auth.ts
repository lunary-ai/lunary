import { Context, Next } from "koa"
import supertokens from "supertokens-node"
import EmailPassword from "supertokens-node/recipe/emailpassword"
import Session from "supertokens-node/recipe/session"
import { verifySession } from "supertokens-node/recipe/session/framework/koa"
import sql from "./db"
import { sendTelegramMessage } from "./notifications"
import { SignJWT } from "jose"

export function setupAuth() {
  supertokens.init({
    framework: "koa",
    supertokens: {
      connectionURI: "http://localhost:3567",
    },
    appInfo: {
      appName: "Lunary",
      apiDomain: "http://localhost:3333",
      websiteDomain: "http://localhost:8080",
      apiBasePath: "/auth",
    },
    debug: false,
    recipeList: [
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            { id: "email" },
            { id: "password" },
            { id: "name" },
            { id: "orgName" },
            { id: "projectName" },
            { id: "employeeCount" },
            { id: "signupMethod" },
            { id: "token", optional: true },
          ],
        },
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              signUpPOST: async function (input) {
                if (originalImplementation.signUpPOST === undefined) {
                  throw Error("Should never come here")
                }

                let response = await originalImplementation.signUpPOST(input)

                if (
                  response.status === "OK" &&
                  response.user.loginMethods.length === 1
                ) {
                  const userId = response.user.id as string
                  const email = response.user.emails[0] as string

                  // TODO: formFields helper
                  const orgName = input.formFields.find(
                    ({ id }) => id === "orgName",
                  )?.value
                  const name = input.formFields.find(({ id }) => id === "name")
                    ?.value
                  const projectName = input.formFields.find(
                    ({ id }) => id === "projectName",
                  )?.value
                  const employeeCount = input.formFields.find(
                    ({ id }) => id === "employeeCount",
                  )?.value
                  const signupMethod = input.formFields.find(
                    ({ id }) => id === "signupMethod",
                  )?.value

                  const orgId = input.formFields.find(
                    ({ id }) => id === "token",
                  )?.value

                  // TODO: use porsager helper for inserts

                  if (signupMethod === "signup") {
                    const [org] = await sql`
                      insert into org (name, plan)
                      values (${orgName || `${name}'s Org`}, 'free')
                      returning *
                    `

                    await sql`
                      insert into profile (id, name, email, org_id, role, verified)
                      values (${userId}, ${name!}, ${email}, ${
                        org.id
                      }, 'admin', ${
                        process.env.SKIP_EMAIL_VERIFY ? true : false
                      })
                    `

                    await sql`
                      insert into app (name, org_id)
                      values (${projectName!}, ${org.id})
                    `
                  } else if (signupMethod === "join") {
                    await sql`
                      insert into profile (id, name, email, org_id, role, verified)
                      values (
                        ${userId as string}, 
                        ${name as string}, 
                        ${email}, 
                        ${orgId as string}, 
                        'member', 
                        true
                      )
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
                  //TODO: telegram mesage
                }
                return response
              },

              passwordResetPOST: async function (input) {
                if (originalImplementation.passwordResetPOST === undefined) {
                  throw Error("Should never come here")
                }

                let response =
                  await originalImplementation.passwordResetPOST(input)

                return response
              },
            }
          },
        },
      }),
      Session.init(),
    ],
  })
}

const publicRoutes = [
  new RegExp(`/auth/.+`),
  "/api/report",
  "/auth/user/password/reset",
  new RegExp(`/v1/projects/.+/runs/ingest`),
  new RegExp(`/v1/project/.+/template_versions/latest`), // TODO: verify if it publicly accessible
]

export async function authMiddleware(ctx: Context, next: Next) {
  const isPublicRoute = publicRoutes.some((route) =>
    typeof route === "string" ? route === ctx.path : route.test(ctx.path),
  )

  if (isPublicRoute) {
    await next()
  } else {
    await verifySession()(ctx, async () => {
      await addSessionInfos(ctx, next)
    })
  }
}

export async function addSessionInfos(ctx: Context, next: Next) {
  const userId = ctx.session?.getUserId()

  // TODO: should be stored in the token, so we don't have to make a db query for each request
  const [user] = await sql`select * from profile where id = ${userId}`

  ctx.state = {
    userId,
    orgId: user.orgId,
  }

  await next()
}

export function sign(payload: any, secret: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 60 * 60 // one hour

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(secret))
}
