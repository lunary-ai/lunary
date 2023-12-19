export const formatCost = (cost = 0) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 3,
  }).format(cost)
}

export function formatLargeNumber(number) {
  return new Intl.NumberFormat(navigator.language, {
    notation: "compact",
  }).format(number || 0)
}

export function formatAppUser(user) {
  if (!user) return ""
  return user.props?.name ?? user.props?.email ?? user.external_id
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString(navigator.language, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  })
}

export function msToTime(duration) {
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

export function capitalize(s) {
  if (typeof s !== "string") return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}
