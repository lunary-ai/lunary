import postgres from "postgres";
import logger from "koa-logger";
import bodyParser from "koa-bodyparser";

//TODO: remove profile table to "user"

const sql = postgres(
  "postgresql://postgres:Ii2Zex8Jnu1SGxAc@5.161.196.185/postgres",
  { transform: postgres.camel }
);

// const res = db.query.cities.findFirst();
import supertokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";

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
              let response = await originalImplementation.signUp(input);

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

                console.log(response.user);
              }
              return response;
            },
          };
        },
      },
    }), // initializes signin / sign up features
    Session.init(), // initializes session features
  ],
});

import cors from "@koa/cors";
import Koa, { Context } from "koa";
import Router from "koa-router";
import { SessionContext, middleware } from "supertokens-node/framework/koa";

let app = new Koa();
let router = new Router();

app.use(async (ctx, next) => {
  if (ctx.method === "options") {
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, OPTIONS, DELETE"
    );
    ctx.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    ctx.status = 204;
    return;
  }
  await next();
});

app.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(bodyParser());
app.use(logger());
// app.use(middleware());

import { verifySession } from "supertokens-node/recipe/session/framework/koa";

router.get("/filters/models/:projectId", async (ctx: Context) => {
  const projectId = ctx.params.projectId as string;

  const rows = await sql`
    select
      name
    from
      app_model_name
    where
      app = ${projectId}
    order by
      app
  `;

  ctx.body = rows;
});

router.get("/filters/tags/:projectId", async (ctx: Context) => {
  const projectId = ctx.params.projectId as string;

  const rows = await sql`
	  select
      tag as tags
    from
      app_tag
    where
      app = ${projectId}
  `;

  ctx.body = rows;
});

router.get("/filters/feedbacks/:projectId", async (ctx: Context) => {
  const projectId = ctx.params.projectId as string;

  const rows = await sql`
    select
      jsonb_build_object ('thumbs',
        feedback::json ->> 'thumbs')
    from
      run
    where
      feedback::json ->> 'thumbs' is not null
      and app = ${projectId}
    union
    select
      jsonb_build_object ('emoji',
        feedback::json ->> 'emoji')
    from
      run
    where
      feedback::json ->> 'emoji' is not null
      and app = ${projectId}
    union
    select
      jsonb_build_object ('rating',
        CAST(feedback::json ->> 'rating' as INT))
    from
      run
    where
      feedback::json ->> 'rating' is not null
      and app = ${projectId}
    union
    select
      jsonb_build_object ('retried',
        CAST(feedback::json ->> 'retried' as boolean))
    from
      run
    where
      feedback::json ->> 'retried' is not null
      and app = ${projectId}
  `;

  const feedbacks = rows.map((row) => row.jsonbBuildObject);

  ctx.body = feedbacks;
});

// TODO
router.get("/filters/app-users/:projectId", async (ctx) => {
  const projectId = ctx.params.projectId as string;
  const usageRange = Number(ctx.query.usageRange) || 30;

  // TODO: do a new query to get the user list. Look at what is currently used in production
  ctx.body = usersWithUsage;
});

// router.get("/profile", verifySession(), async (ctx: SessionContext) => {
router.get("/users/me", async (ctx: Context) => {
  // TODO: get user id from supertokens
  // const userId = ctx.session!.getUserId()
  const userId = "aa0c13b0-4e44-4f06-abc9-f364974972e4";

  // TODO: (low priority) merge queries
  const [user] = await sql`
    select
      id,
      email,
      verified
    from
      profile
    where
      id = ${userId}
  `;

  ctx.body = user;
});

router.get("/users/me/org", async (ctx: Context) => {
  // TODO: supertoken session
  const userId = "aa0c13b0-4e44-4f06-abc9-f364974972e4";

  const [org] = await sql`
    select
      id,
      limited,
      name,
      plan,
      plan_period,
      canceled,
      play_allowance,
      stripe_customer,
      api_key
    from
      org
    where
      id = (select org_id from profile where id = ${userId})
  `;

  const users = await sql`
    select
      id,
      name,
      email,
      role
    from
      profile
    where
      org_id = ${org.id}
    order by
      case role
        when 'admin' then 1
        when 'member' then 2
        else 3
      end,
      name
  `;

  org.users = users;

  ctx.body = org;
});

router.patch("/orgs/:orgId", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string;

  const name = (ctx.request.body as { name: string }).name;
  console.log(name, orgId);

  await sql`
    update org
    set
      name = ${name}
    where
      id = ${orgId}
  `;
  ctx.body = {};
});

router.get("/projects/:orgId", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string;

  const rows = await sql`
    select
      id,
      created_at,
      name,
      org_id,
      exists(select * from run where app = app.id) as activated
    from
      app
    where
      org_id = ${orgId}
  `;

  ctx.body = rows;
});

router.get("/app-users/:id", async (ctx) => {
  const { id } = ctx.params;
  ctx.body = sql`
      select * from app_user where id = ${id} limit 1
  `;
});

router.get("/logs/:projectId", async (ctx) => {
  interface Query {
    type?: "llm" | "trace" | "thread";
    search?: string;
    models?: string[];
    tags?: string[];
    tokens?: string;
    minDuration?: string;
    maxDuration?: string;
    startTime?: string;
    endTime?: string;

    limit?: string;
    page?: string;
    order?: string;
  }

  const projectId = ctx.params.projectId as string;
  const {
    type,
    search,
    models = [],
    tags = [],
    limit = "100",
    page = "0",
    tokens,
    minDuration,
    maxDuration,
    startTime,
    endTime,
  } = ctx.query as Query;

  if (!type) {
    return ctx.throw(422, "The `type` query parameter is required");
  }

  let typeFilter = sql``;
  if (type === "llm") {
    typeFilter = sql`and type = 'llm'`;
  } else if (type === "trace") {
    typeFilter = sql`and type in ('agent','chain')`;
  } else if (type === "thread") {
    typeFilter = sql`and type in ('thread','convo')`;
  }

  // if (
  //   !startTime ||
  //   !endTime ||
  //   new Date(startTime as string) >= new Date(endTime as string)
  // ) {
  //   ctx.throw(422, "Invalid time window");
  // }

  // await ensureHasAccessToApp(ctx);

  // if (models.length > 0) {
  //   queryFilters = sql`${queryFilters} and r.name = any(${models})`;
  // }
  // if (tags.length > 0) {
  //   queryFilters = sql`${queryFilters} and r.tags && ${tags}`;
  // }
  // if (search) {
  //   queryFilters = sql`${queryFilters} and (r.input ilike ${
  //     "%" + search + "%"
  //   } or r.output ilike ${"%" + search + "%"})`;
  // }
  // if (tokens) {
  //   queryFilters = sql`${queryFilters} and (r.completion_tokens + r.prompt_tokens) >= ${Number(
  //     tokens
  //   )}`;
  // }
  // if (minDuration && maxDuration) {
  //   queryFilters = sql`${queryFilters} and extract(epoch from (r.ended_at - r.created_at)) between ${Number(
  //     minDuration
  //   )} and ${Number(maxDuration)}`;
  // } else if (minDuration) {
  //   queryFilters = sql`${queryFilters} and extract(epoch from (r.ended_at - r.created_at)) >= ${Number(
  //     minDuration
  //   )}`;
  // } else if (maxDuration) {
  //   queryFilters = sql`${queryFilters} and extract(epoch from (r.ended_at - r.created_at)) <= ${Number(
  //     maxDuration
  //   )}`;
  // }
  // queryFilters = sql`${queryFilters} and r.created_at between ${new Date(
  //   startTime as string
  // )} and ${new Date(endTime as string)}`;

  const rows = await sql`
      select
        r.*,
        au.id as user_id,
        au.external_id as user_external_id,
        au.created_at as user_created_at,
        au.last_seen as user_last_seen,
        au.props as user_props
      from
          run r
          left join app_user au on r.user = au.id
      where
          r.app = ${projectId as string}
          ${typeFilter}
      order by
          r.created_at desc
      limit ${Number(limit)}
      offset ${Number(page) * Number(limit)}`;

  const runs = rows.map((run) => ({
    type: run.type,
    name: run.name,
    createdAt: run.createdAt,
    endedAt: run.endedAt,
    duration: run.duration,
    tokens: {
      completion: run.completionTokens,
      prompt: run.promptTokens,
      total: run.completionTokens + run.promptTokens,
    },
    tags: run.tags,
    input: run.input,
    output: run.output,
    error: run.error,
    status: run.status,
    user: {
      id: run.userId,
      externalId: run.userExternalId,
      createdAt: run.userCreatedAt,
      lastSeen: run.userLastSeen,
      props: run.userProps,
    },
    // TODO
    // cost: calcRunCost(run),
  }));

  ctx.body = runs;
});

router.get("/traces/:projectId", async (ctx) => {
  const projectId = ctx.params.projectId;
  const { search } = ctx.query;

  let searchFilter = sql``;
  if (search) {
    searchFilter = sql`
          and (r.input::text ilike ${"%" + search + "%"}
              or r.output::text ilike ${"%" + search + "%"}
              or r.name::text ilike ${"%" + search + "%"}
              or r.error::text ilike ${"%" + search + "%"})`;
  }

  const runs = await sql`
      select * from run
      where app = ${projectId}
      and (type = 'agent' or type = 'chain')
      ${search ? sql`and parent_run is null ${searchFilter}` : sql``}
      order by created_at desc
      limit 100`;

  // const extendedRuns = runs.map(run => extendWithCosts(run));

  // ctx.body = extendedRuns;
  ctx.body = runs;
});

router.get("/users/:projectId", async (ctx) => {
  const { projectId } = ctx.params;

  const users = await sql`
      with app_users as (
          select distinct on (external_id) id
          from app_user
          where app = ${projectId}
            and external_id is not null
      )
      select distinct on (u.external_id) u.*
      from app_user u
      where u.app = ${projectId}
        and u.external_id is not null
        and exists (
            select 1
            from run
            where run.user = u.id
            and run.type = 'llm'
        )`;

  ctx.body = users;
});

router.get("/runs/usage", async (ctx) => {
  const { projectId, days, userId } = ctx.query;

  const daysNum = parseInt(days, 10);
  const userIdNum = userId ? parseInt(userId, 10) : null;

  if (isNaN(daysNum) || (userId && isNaN(userIdNum))) {
    ctx.throw(400, "Invalid query parameters");
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
          run.name, run.type`;

  ctx.body = runsUsage;
});

app.use(router.routes());

app.listen(3000);
