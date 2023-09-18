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

export const msToTime = (duration) => {
  let seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
    days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 24)

  const m = minutes
  const s = seconds
  const h = hours
  const d = days

  return `${d > 0 ? d + "d " : ""}${h > 0 ? h + "h " : ""}${
    m > 0 ? m + "m " : ""
  }${s}s`
}

export const capitalize = (s) => {
  if (typeof s !== "string") return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}
