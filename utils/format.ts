export const formatCost = (cost) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cost || 0)
}

export const formatLargeNumber = (number) => {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(
    number || 0
  )
}
