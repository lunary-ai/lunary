import { List, Stack, Title } from "@mantine/core"
import { ContextModalProps } from "@mantine/modals"
import { IconCheck } from "@tabler/icons-react"

import Script from "next/script"
const UpgradeModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<{ modalBody: string }>) => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return null

  return (
    <>
      <Stack align="center" pb={40}>
        <Title order={2}>Upgrade your plan</Title>

        <Script async src="https://js.stripe.com/v3/buy-button.js" />
        {/* @ts-ignore */}
        <stripe-buy-button
          buy-button-id={process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID}
          publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        />

        <List icon={<IconCheck color="blue" />} ta="left">
          <List.Item>Unlimited requests</List.Item>
          <List.Item>Up to 10.000 users</List.Item>
          <List.Item>Invite your team</List.Item>
          <List.Item>Priority support</List.Item>
          <List.Item>Integration help</List.Item>
        </List>
      </Stack>
    </>
  )
}

export default UpgradeModal
