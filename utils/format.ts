export const formatCost = (cost) => {
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
