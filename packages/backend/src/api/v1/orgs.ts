import Router from "koa-router";

import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import stripe from "@/src/utils/stripe";

import { z } from "zod";

import { PassThrough } from "stream";

import { handleStream, runAImodel } from "@/src/utils/playground";
import { checkAccess } from "@/src/utils/authorization";

const orgs = new Router({
  prefix: "/orgs/:orgId",
});

orgs.get("/", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string;

  const [row] = await sql`
    select
      id,
      created_at,
      plan,
      play_allowance,
      limited,
      verified,
      plan_period,
      canceled,
      saml_enabled,
      stripe_customer,
      stripe_subscription,  
      name,
      seat_allowance 
    from
      org
    where
      id = ${orgId}
  `;

  ctx.body = row;
});

orgs.patch("/", checkAccess("org", "update"), async (ctx: Context) => {
  const orgId = ctx.state.orgId as string;
  const bodySchema = z.object({
    name: z.string(),
  });

  const { name } = bodySchema.parse(ctx.request.body);

  await sql`update org set name = ${name} where id = ${orgId}`;
  ctx.status = 200;
});

orgs.get("/usage", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string;
  const { projectId } = ctx.request.query;

  const rows = await sql`
    select
      date_trunc('day', r.created_at) as date,
      count(*)::int as count
    from
      run r 
    ${!projectId ? sql`join project p on r.project_id = p.id` : sql``}
    where
      ${!projectId ? sql`p.org_id = ${orgId} and` : sql``}
      ${projectId ? sql`r.project_id = ${projectId} and` : sql``}
      r.created_at > now() - interval '30 days'
    group by
      date
    order by
    date desc;
  `;

  ctx.body = rows;
});

orgs.get("/billing-portal", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string;

  const [org] = await sql`
    select
      id,
      stripe_customer
    from
      org
    where
      id = ${orgId}
  `;

  if (!org) throw new Error("Org not found");

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomer,
    return_url: `${process.env.APP_URL}/billing`,
  });

  ctx.body = { url: session.url };
});

orgs.post("/upgrade", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string;

  const { origin } = ctx.request.body as {
    // plan: string
    // period: string
    origin: string;
  };

  const plan = "team";

  const lookupKeys = [`team_seats`, `team_runs`, `team_ai_playground`];

  const prices = await stripe.prices.list({ lookup_keys: lookupKeys });

  if (prices.length < 3) {
    throw new Error("Prices not all found");
  }

  // const priceId = prices.data[0].id as string

  const [org] = await sql`
    select
      id,
      plan,
      stripe_customer,
      stripe_subscription
    from
      org
    where
      id = ${orgId}
  `;

  if (!org) throw new Error("Org not found");

  const seats =
    await sql`select count(*) as count from account where org_id = ${orgId}`;

  const newItems = prices.data.map((price) => ({
    price: price.id,
    quantity: price.lookup_key === "team_seats" ? seats[0].count : undefined,
  }));

  if (!org.stripe_subscription) {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      // payment_method_types: ["card"],
      client_reference_id: orgId,
      customer: org.stripeCustomer || undefined,
      metadata: {
        plan,
        //   period,
      },
      line_items: newItems,
      success_url: `${origin}/billing/thank-you`,
      cancel_url: `${origin}/billing`,
    });

    return (ctx.body = { ok: true, url: checkoutSession.url });
  } else {
    // const subscription = await stripe.subscriptions.retrieve(
    //   org.stripeSubscription,
    // )

    // const subItem = subscription.items.data[0].id

    // Update user subscription with new price
    await stripe.subscriptions.update(org.stripeSubscription, {
      cancel_at_period_end: false,
      metadata: {
        plan,
        //   period,
      },
      items: newItems,
    });

    // Update org plan
    await sql`update org set plan = ${plan} where id = ${orgId}`;
  }

  ctx.body = { ok: true };
});

orgs.post("/playground", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string;
  const requestBodySchema = z.object({
    content: z.array(z.any()).or(z.string()),
    extra: z.any(),
    variables: z.record(z.string()).nullable().optional().default({}),
  });
  const { content, extra, variables } = requestBodySchema.parse(
    ctx.request.body,
  );

  ctx.request.socket.setTimeout(0);
  ctx.request.socket.setNoDelay(true);
  ctx.request.socket.setKeepAlive(true);

  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const [org] = await sql`
    select play_allowance
    from org
    where id = ${orgId}
  `;

  if (org?.playAllowance <= 0) {
    throw new Error(
      "No allowance left today. Wait tomorrow or upgrade to continue using the playground.",
    );
  }

  // subtract play allowance
  await sql`
    update org
    set play_allowance = play_allowance - 1
    where id = ${orgId}
  `;
  const model = extra?.model || "gpt-3.5-turbo";

  const res = await runAImodel(content, extra, variables, model, true, orgId);

  const stream = new PassThrough();
  stream.pipe(ctx.res);
  ctx.status = 200;
  ctx.body = stream;

  handleStream(
    res,
    (data) => {
      stream.write(JSON.stringify(data) + "\n");
    },
    () => {
      stream.end();
    },
    (error) => {
      ctx.status = 500;
      ctx.body = { message: "An unexpected error occurred" };
      console.error(error);
      stream.end();
    },
  );
});

export default orgs;
