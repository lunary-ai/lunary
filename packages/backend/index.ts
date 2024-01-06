import logger from "koa-logger"
import bodyParser from "koa-bodyparser"
import { verifySession } from "supertokens-node/recipe/session/framework/koa"
import cors from "@koa/cors"
import Koa, { Context } from "koa"
import Router from "@koa/router"
import { SessionContext, middleware } from "supertokens-node/framework/koa"

//TODO: remove profile table to "user"

// const res = db.query.cities.findFirst();
import supertokens from "supertokens-node"
import EmailPassword from "supertokens-node/recipe/emailpassword"
import Session from "supertokens-node/recipe/session"
import v1 from "./api/v1"
import sql from "./utils/db"

supertokens.init({
  framework: "koa",
  supertokens: {
    // These are the connection details of the app you created on supertokens.com
    connectionURI:
      "https://st-dev-e40b0da0-a9d2-11ee-9231-0b636d7a2a46.aws.supertokens.io",
    apiKey: "5N=hKGPsW6e3RAN1lmy9-vwf2Y",
  },
  appInfo: {
    // learn more about this on https://supertokens.com/docs/session/appinfo
    appName: "Lunary",
    apiDomain: "http://localhost:3000",
    websiteDomain: "http://localhost:8080",
    apiBasePath: "/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [
    EmailPassword.init({
      override: {
        functions: (originalImplementation) => {
          return {
            ...originalImplementation,
            signUp: async function (input) {
              // First we call the original implementation of signUpPOST.
              let response = await originalImplementation.signUp(input)

              // Post sign up response, we check if it was successful
              if (
                response.status === "OK" &&
                response.user.loginMethods.length === 1
              ) {
                /**
                 *
                 * response.user contains the following info:
                 * - emails
                 * - id
                 * - timeJoined
                 * - tenantIds
                 * - phone numbers
                 * - third party login info
                 * - all the login methods associated with this user.
                 * - information about if the user's email is verified or not.
                 *
                 */

                console.log(response.user)
              }
              return response
            },
          }
        },
      },
    }), // initializes signin / sign up features
    Session.init(), // initializes session features
  ],
})

const app = new Koa()

app.use(async (ctx, next) => {
  if (ctx.method === "options") {
    ctx.set("Access-Control-Allow-Origin", "*")
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS, DELETE")
    ctx.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    )
    ctx.status = 204
    return
  }
  await next()
})

app.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  })
)

app.use(bodyParser())
app.use(logger())
// app.use(middleware());

app.use(v1.routes())

let router = new Router()

router.get("/traces/:projectId", async (ctx) => {
  const projectId = ctx.params.projectId
  const { search } = ctx.query

  let searchFilter = sql``
  if (search) {
    searchFilter = sql`
          and (r.input::text ilike ${"%" + search + "%"}
              or r.output::text ilike ${"%" + search + "%"}
              or r.name::text ilike ${"%" + search + "%"}
              or r.error::text ilike ${"%" + search + "%"})`
  }

  const runs = await sql`
      select * from run
      where app = ${projectId}
      and (type = 'agent' or type = 'chain')
      ${search ? sql`and parent_run is null ${searchFilter}` : sql``}
      order by created_at desc
      limit 100`

  // const extendedRuns = runs.map(run => extendWithCosts(run));

  // ctx.body = extendedRuns;
  ctx.body = runs
})

router.get("/runs/usage", async (ctx) => {
  const { projectId, days, userId } = ctx.query

  const daysNum = parseInt(days, 10)
  const userIdNum = userId ? parseInt(userId, 10) : null

  if (isNaN(daysNum) || (userId && isNaN(userIdNum))) {
    ctx.throw(400, "Invalid query parameters")
  }

  const runsUsage = await sql`
      select
          run.name,
          run.type,
          coalesce(sum(run.completion_tokens), 0) as completion_tokens,
          coalesce(sum(run.prompt_tokens), 0) as prompt_tokens,
          sum(case when run.status = 'error' then 1 else 0 end) as errors,
          sum(case when run.status = 'success' then 1 else 0 end) as success
      from
          run
      where
          run.app = ${projectId as string}
          and run.created_at >= now() - interval '1 day' * ${daysNum}
          ${userIdNum ? sql`and run.user = ${userIdNum}` : sql``}
      group by
          run.name, run.type`

  ctx.body = runsUsage
})

app.use(router.routes())

app.listen(3333)
