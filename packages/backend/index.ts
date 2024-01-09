import cors from "@koa/cors"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import logger from "koa-logger"
import Router from "koa-router"
import { middleware } from "supertokens-node/framework/koa"

import supertokens from "supertokens-node"
import EmailPassword from "supertokens-node/recipe/emailpassword"
import Session from "supertokens-node/recipe/session"
import v1 from "./api/v1"
import webhooks from "./api/webhooks"
import { setupCronJobs } from "./utils/cron"
import sql from "./utils/db"

setupCronJobs()

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
                const id = response.user.id as string
                const email = response.user.emails[2] as string
              }
              return response
            },
          }
        },
      },
    }),
    Session.init(),
  ],
})

const app = new Koa()

app.use(async (ctx, next) => {
  if (ctx.method === "options") {
    // TODO
    ctx.set("Access-Control-Allow-Origin", "http://localhost:8080")
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS, DELETE")
    ctx.set("Access-Control-Allow-Credentials", "true")
    ctx.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, fdi-version, rid, st-auth-mode",
    )
    ctx.status = 204
    return
  }
  await next()
})

app.use(
  cors({
    origin: "http://localhost:8080", // TODO
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  }),
)
app.use(middleware())

app.use(bodyParser())
app.use(logger())

app.use(v1.routes())
app.use(webhooks.routes())

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

app.use(router.routes())

app.listen(3333)
