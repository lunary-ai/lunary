import Router from "koa-router"
import stripe from "./stripe"

const webhooks = new Router({
  prefix: "/webhooks",
})

webhooks.use(stripe.routes())

export default webhooks
