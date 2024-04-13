import { signJWT } from "@/src/api/v1/auth/utils"
import { sendEmail } from "./sendEmail"

function extractFirstName(name: string) {
  if (!name) return "there"
  return name.split(" ")[0]
}

export async function sendVerifyEmail(email: string, name: string) {
  const token = await signJWT({ email })

  const confirmLink = `${process.env.API_URL}/v1/users/verify-email?token=${token}`

  await sendEmail(CONFIRM_EMAIL(email, name, confirmLink))
}

export function INVITE_EMAIL(email: string, orgName: string, link: string) {
  return {
    subject: `You've been invited to Lunary`,
    to: [email],
    reply_to: "hello@lunary.ai",
    from: process.env.GENERIC_SENDER,
    text: `Hi, 

You've been invited to join ${orgName} on Lunary. 

Please click on the following link to accept the invitation: 

${link}

We're looking forward to having you on board!

You can reply to this email if you have any question.

Thanks
- The Lunary team`,
  }
}

export function CONFIRM_EMAIL(
  email: string,
  name: string,
  confirmLink: string,
) {
  return {
    subject: `confirm your email`,
    to: [email],
    reply_to: "hello@lunary.ai",
    from: process.env.GENERIC_SENDER,

    text: `Hi ${extractFirstName(name)},

Thanks for signing up for Lunary.

Please confirm your email address by clicking on the link below:

${confirmLink}

You can reply to this email if you have any question.

Thanks
- The Lunary team`,
  }
}

export function RESET_PASSWORD(email: string, confirmLink: string) {
  return {
    subject: `Reset your password`,
    to: [email],
    reply_to: "hello@lunary.ai",
    from: process.env.GENERIC_SENDER,
    text: `Hi, 

Please click on the link below to reset your password:

${confirmLink}

You can reply to this email if you have any question.

- The Lunary team`,
  }
}

export function WELCOME_EMAIL(email: string, name: string, projectId: string) {
  return {
    subject: `welcome to Lunary`,
    to: [email],
    reply_to: "vince@lunary.ai",
    from: process.env.PERSONAL_SENDER || process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

I'm Vince, co-founder of lunary. 

Wanted to say welcome.

Although this is an automated email, I'm here to help get you started if you have any question.

Here's your project tracking ID: \`${projectId}\`

You can use this to integrate your app with one of our SDKs.

In your opinion, what can we do to make lunary better?

Thanks
Vince`,
  }
}

export function UPGRADE_EMAIL(email: string, name: string, plan: string) {
  return {
    subject: `Your account has been upgraded`,
    to: [email],
    reply_to: "hello@lunary.ai",
    from: process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

Your account has been upgraded to the ${plan} plan.

The extra features and higher limits are now available to you.

Reply to this email if you have any question.

- The Lunary Team`,
  }
}

export function CANCELED_EMAIL(email: string, name: string) {
  return {
    subject: `Important: subscription canceled`,
    to: [email],
    from: process.env.GENERIC_SENDER,
    reply_to: "hello@lunary.ai",
    text: `Hi ${extractFirstName(name)},

You have canceled your subscription. We're sad to see you go :(

At the end of your billing period, your account will be downgraded to the free plan.

*Important: any data older than 30 days (free plan limits) will be permanently deleted.*

If this was a mistake, you can upgrade again at any time here: https://app.lunary.ai/billing

Would you mind telling us why you canceled? We're always looking to improve. 

Thank you for trying Lunary.

Vince & Hugh - co-founders of Lunary`,
  }
}

export function FULLY_CANCELED_EMAIL(email: string, name: string) {
  return {
    subject: `Sorry to see you go..`,
    reply_to: "hello@lunary.ai",
    to: [email],
    from: process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

Your account has been downgraded to the free plan

Would you mind telling us why you canceled? We're always looking to improve. 

If you can take 30 seconds to reply to this email with one of the following reasons, it would help us a lot:

1. I don't need it anymore
2. I found a better alternative
3. I'm missing a feature
4. It's too expensive
5. Other: ____________

If this was a mistake, you can upgrade again at any time here: https://app.lunary.ai/billing

Thank you for trying Lunary.

Vince & Hugh - co-founders of Lunary`,
  }
}
