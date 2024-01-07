import Router from "koa-router"
import stripe from "./stripe"
import signup from "./signup"

const webhooks = new Router({
  prefix: "/webhooks",
})

webhooks.use(stripe.routes())
webhooks.use(signup.routes())

export default webhooks
