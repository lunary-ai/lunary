export const DEFAULT_CHARTS = [
  "models/top",
  "templates/top",
  "users/top",
  // "models",
  // "templates",
  // "users",
  // "tokens",
  // "costs",
  // "errors",
  // "users/new",
  // "users/active",
  // "users/average-cost",
  // "top/languages",
  // "run-types",
  // "latency",
  // "feedback-ratio",
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

// export interface Dashboard {

// }

type Aggregation = "sum" | "avg" | null | undefined;

export interface Chart {
  id: string;
  name: string;
  description: string | null;
  type: "Top" | "Area";
  dataKey: string;
  aggregationMethod: Aggregation;
  splitBy?: string;
}
