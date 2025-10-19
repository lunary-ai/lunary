import { sendSlackMessage } from "@/src/utils/notifications";
import stripe from "@/src/utils/stripe";
import Stripe from "stripe";

import {
  CANCELED_EMAIL,
  FULLY_CANCELED_EMAIL,
  sendEmail,
  UPGRADE_EMAIL,
} from "@/src/emails";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import { Context } from "koa";
import Router from "koa-router";

const router = new Router({
  prefix: "/stripe",
});

const DELINQUENT_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);

type OrgRecord = { id: string; name: string };

async function findOrgByStripeRefs({
  customerId,
  subscriptionId,
}: {
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<OrgRecord | null> {
  if (customerId && subscriptionId) {
    const [org] = await sql`
      select id, name
      from org
      where stripe_customer = ${customerId} and stripe_subscription = ${subscriptionId}
      limit 1
    `;
    if (org) return org;
  }

  if (subscriptionId) {
    const [org] = await sql`
      select id, name
      from org
      where stripe_subscription = ${subscriptionId}
      limit 1
    `;
    if (org) return org;
  }

  if (customerId) {
    const [org] = await sql`
      select id, name
      from org
      where stripe_customer = ${customerId}
      limit 1
    `;
    if (org) return org;
  }

  return null;
}

async function markOrgBillingDelinquent(orgId: string) {
  const [org] = await sql`
    update org
    set
      billing_delinquent = true,
      billing_delinquent_since = coalesce(billing_delinquent_since, now())
    where id = ${orgId}
      and (
        billing_delinquent is distinct from true
        or billing_delinquent_since is null
      )
    returning id, name
  `;

  if (org) {
    console.info(`🔔 Org ${org.name} marked as billing delinquent`);
  }
}

async function clearOrgBillingDelinquent(orgId: string) {
  const [org] = await sql`
    update org
    set
      billing_delinquent = false,
      billing_delinquent_since = null
    where id = ${orgId}
      and (
        billing_delinquent is distinct from false
        or billing_delinquent_since is not null
      )
    returning id, name
  `;

  if (org) {
    console.info(`✅ Org ${org.name} cleared delinquent flag`);
  }
}

async function reconcileSubscriptionBillingStatus(
  subscription: Stripe.Subscription,
  existingOrg?: OrgRecord | null,
) {
  const org =
    existingOrg ??
    (await findOrgByStripeRefs({
      customerId: subscription.customer as string | null,
      subscriptionId: subscription.id,
    }));

  if (!org) return;

  if (DELINQUENT_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    await markOrgBillingDelinquent(org.id);
  } else if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "canceled"
  ) {
    await clearOrgBillingDelinquent(org.id);
  }
}

async function handleInvoicePaymentFailure(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const org = await findOrgByStripeRefs({
    customerId: invoice.customer as string | null,
    subscriptionId: invoice.subscription as string | null,
  });

  if (!org) {
    console.warn(
      `⚠️ Unable to resolve org for failed invoice ${invoice.id}, customer=${invoice.customer}`,
    );
    return;
  }

  if (invoice.amount_due > 0) {
    await markOrgBillingDelinquent(org.id);
  }
}

async function handleInvoicePaymentSuccess(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const org = await findOrgByStripeRefs({
    customerId: invoice.customer as string | null,
    subscriptionId: invoice.subscription as string | null,
  });

  if (!org) {
    console.warn(
      `⚠️ Unable to resolve org for paid invoice ${invoice.id}, customer=${invoice.customer}`,
    );
    return;
  }

  await clearOrgBillingDelinquent(org.id);
}

async function setupSubscription(object: Stripe.Checkout.Session) {
  console.info("🔔 setupSubscription", object);
  const { customer, client_reference_id, mode, subscription, metadata } =
    object;

  if (mode !== "subscription") return;

  if (!client_reference_id) {
    throw new Error("client_reference_id is missing");
  }

  const plan = metadata?.plan || "team";
  const period = metadata?.period || "monthly";

  const orgData = {
    stripeCustomer: customer as string,
    stripeSubscription: subscription as string,
    canceled: false,
    plan,
    planPeriod: period,
    limited: false,
    playAllowance: 1000,
    evalAllowance: 1000,
    billingDelinquent: false,
    billingDelinquentSince: null,
  };

  const [org] = await sql`
    update
       org
    set 
      ${sql(orgData)}
    where 
      id = ${client_reference_id}
    returning id, name
  `;

  const users = await sql`select email, name from account where id = ${org.id}`;

  const emailPromises = users.map((user) =>
    sendEmail(UPGRADE_EMAIL(user.email, user.name, plan)),
  );

  await Promise.all(emailPromises);

  await sendSlackMessage(
    `💸${org.name} just upgraded to ${plan} (${period})`,
    "billing",
  );
}

async function updateSubscription(object: Stripe.Subscription) {
  const { customer, cancel_at_period_end, metadata, id } = object;

  const canceled = cancel_at_period_end;
  const plan = metadata?.plan;
  const period = metadata?.period;

  const [currentOrg] = await sql`
    SELECT id, name, plan, plan_period, canceled
    FROM org
    WHERE stripe_customer = ${customer as string} AND stripe_subscription = ${id}
  `;

  if (!currentOrg) {
    throw new Error("Org with matching subscription not found");
  }

  await reconcileSubscriptionBillingStatus(object, currentOrg);

  if (
    canceled === currentOrg.canceled &&
    ((!plan && !period) ||
      (currentOrg.plan === plan && currentOrg.planPeriod === period))
  ) {
    console.info(`🔥 updateSubscription: nothing to update`);
    return;
  }

  const [org] = await sql`
    UPDATE org
    SET ${sql(clearUndefined({ plan, planPeriod: period, canceled }))}
    WHERE id = ${currentOrg.id}
    RETURNING id, name
  `;

  const targetOrg = org ?? currentOrg;

  if (canceled) {
    const [users] = await sql`
      select email, name
      from account
      where id = ${targetOrg.id}
    `;

    if (users.length) {
      const emailPromises = users.map((user) => {
        return sendEmail(CANCELED_EMAIL(user.email, user.name));
      });

      await Promise.all(emailPromises);
    }

    await sendSlackMessage(
      `😭💔 ${targetOrg.name} subscription canceled their plans`,
      "billing",
    );
  } else if (plan || period) {
    await sendSlackMessage(
      `🔔 ${targetOrg.name} subscription updated to: ${plan} (${period})`,
      "billing",
    );
  }
}

async function cancelSubscription(object: Stripe.Subscription) {
  const { customer, id } = object;

  const [org] = await sql`
    UPDATE org
    SET ${sql({
      plan: "free",
      canceled: false,
      stripeSubscription: null,
      billingDelinquent: false,
      billingDelinquentSince: null,
    })} 
    WHERE stripe_customer = ${customer as string} AND stripe_subscription = ${id}
    RETURNING id, name
  `;

  if (!org) {
    throw new Error("Org with subscription not found");
  }

  const [users] = await sql`
    select email, name
    from account
    where id = ${org.id}
  `;

  const emailPromises = users.map((user) => {
    return sendEmail(FULLY_CANCELED_EMAIL(user.email, user.name));
  });

  await Promise.all(emailPromises);

  await sendSlackMessage(
    `😭💔 ${org.name} subscription is now deleted`,
    "billing",
  );
}

router.post("/", async (ctx: Context) => {
  const sig = ctx.request.headers["stripe-signature"];

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) throw new Error("Missing Stripe signature");
    event = await stripe.webhooks.constructEventAsync(
      ctx.request.rawBody,
      sig,
      webhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === "paid") {
          await setupSubscription(session);
        } else {
          console.info(
            `Skip setup: session ${session.id} completed with payment_status=${session.payment_status}`,
          );
        }
        break;

      case "customer.subscription.updated":
        await updateSubscription(event.data.object);
        break;

      case "customer.subscription.deleted":
        await cancelSubscription(event.data.object);
        break;

      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        await handleInvoicePaymentFailure(event.data.object as Stripe.Invoice);
        break;

      case "invoice.paid":
        await handleInvoicePaymentSuccess(event.data.object as Stripe.Invoice);
        break;

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }
  } catch (error: unknown) {
    console.error(error);
    ctx.throw(400, `Webhook Error: ${error.message}`);
  }

  ctx.body = { received: true };
});

export default router;
