export const DEFAULT_CHARTS = [
  "models",
  "templates",
  "users",
  "tokens",
  "costs",
  "errors",
  "users/new",
  "users/active",
  "users/average-cost",
  "run-types",
  "latency",
  "feedback-ratio",
];

export function getDefaultDateRange() {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const oneWeekAgoDate = new Date(endOfToday);
  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 30);
  oneWeekAgoDate.setHours(0, 0, 0, 0);
  const defaultRange: [Date, Date] = [oneWeekAgoDate, endOfToday];
  return defaultRange;
}

export const DEFAULT_DASHBOARD = {
  name: "Default",
  pinned: true,
  description: "Lunary's Default dashboard",
  charts: DEFAULT_CHARTS,
  filters: {
    checks: "",
    granularity: "daily",
    dateRange: getDefaultDateRange(),
  },
};
