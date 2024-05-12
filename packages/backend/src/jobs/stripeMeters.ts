import config from "../utils/config"
import sql from "../utils/db"
import stripe from "../utils/stripe"

// Count the run events in the past hour and send them to Stripe
// for all orgs with a stripe_customer
export default async function stripeCounters() {
  if (config.IS_SELF_HOSTED || !process.env.STRIPE_SECRET_KEY) return

  const orgs = await sql`
        SELECT
            o.id,
            o.stripe_customer,
            o.stripe_subscription
        FROM org o
            WHERE o.stripe_customer IS NOT NULL`

  console.log(`Counting runs for ${orgs.length} orgs`)

  for (const org of orgs) {
    // count the number of events in the past hour (each 'run' where 'run.project.org = org.id')
    const [{ count }] = await sql`
            SELECT
                COUNT(*)
            FROM run
            WHERE
                project_id IN (
                    SELECT id
                    FROM project
                    WHERE org_id = ${org.id}
                )
                AND created_at > NOW() - INTERVAL '1 hour'`

    await stripe.billing.meterEvents.create({
      event_name: "runs",
      payload: {
        value: count.toString(),
        stripe_customer_id: org.stripeCustomer,
      },
    })
  }
}

stripeCounters()
