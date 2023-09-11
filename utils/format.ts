export const formatCost = (cost = 0) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 3,
    // maximumFractionDigits: 2,
  }).format(cost)
}

export const formatLargeNumber = (number) => {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(
    number || 0
  )
}

export const formatAppUser = (user) => {
  if (!user) return ""
  return user.props?.name ?? user.props?.email ?? user.external_id
}

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  })
}
