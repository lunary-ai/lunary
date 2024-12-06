export const DEFAULT_CHARTS = [
  "models/top",
  "templates/top",
  "users/top",
  "tokens",
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
export const chartProps: Record<string, Chart> = {
  "models/top": {
    id: "models/top",
    name: "Top Models",
    description: "The top models in your project",
    type: "Top",
    dataKey: "models/top",
    aggregationMethod: null,
  },
  "templates/top": {
    id: "templates/top",
    name: "Top Templates",
    description: "The top templates in your project",
    type: "Top",
    dataKey: "templates/top",
    aggregationMethod: null,
  },
  "users/top": {
    id: "users/top",
    name: "Top Users",
    description: "The top users in your project",
    type: "Top",
    dataKey: "users/top",
    aggregationMethod: null,
  },
  tokens: {
    id: "tokens",
    name: "Tokens",
    description: "The number of tokens generated by your LLM calls",
    type: "Area",
    dataKey: "tokens",
    aggregationMethod: "sum",
  },
  costs: {
    id: "costs",
    name: "Costs",
    description: "The total cost generated by your LLM calls",
    type: "Area",
    dataKey: "costs",
    aggregationMethod: "sum",
  },
  errors: {
    id: "errors",
    name: "Errors Volume",
    description: "How many errors were captured in your app",
    type: "Area",
    dataKey: "errors",
    aggregationMethod: "sum",
  },
  "users/new": {
    id: "users/new",
    name: "New Users",
    description: "The number of new tracked users for the selected period",
    type: "Area",
    dataKey: "users/new",
    aggregationMethod: "sum",
  },
  // "users/new": {
  //   dataKey: "users/new",
  //   props: ["users"],
  //   agg: "sum",
  //   title: "New Users",
  //   description: "The number of new tracked users for the selected period",
  // },
  // "users/active": {
  //   dataKey: "users/active",
  //   props: ["users"],
  //   title: "Active Users",
  //   colors: ["violet"],
  //   description: "The number of active users for the selected period",
  // },
  // "users/average-cost": {
  //   dataKey: "users/average-cost",
  //   props: ["cost"],
  //   title: "Avg. User Cost",
  //   description: "The average cost of each of your users",
  //   formatter: formatCost,
  // },
  // "top/languages": {
  //   chartType: "pie",
  //   dataKey: "top/languages",
  //   props: ["isoCode", "count"],
  //   title: "Languages",
  //   description: "Top languages for your runs",
  // },
  // "run-types": {
  //   dataKey: "run-types",
  //   splitBy: "type",
  //   props: ["runs"],
  //   agg: "sum",
  //   title: "Runs Volume",
  //   description: "The total number of runs generated by your app",
  // },
  // latency: {
  //   dataKey: "latency",
  //   props: ["avgDuration"],
  //   title: "Avg. LLM Latency",
  //   description: "The average duration of your LLM Calls",
  //   formatter: (value) => `${value.toFixed(2)}s`,
  //   colors: ["yellow"],
  // },
  // "feedback-ratio": {
  //   dataKey: "feedback-ratio",
  //   props: ["ratio"],
  //   agg: "avg",
  //   title: "Thumbs Up/Down Ratio",
  //   description: "The ratio of thumbs up to thumbs down feedback",
  // },
};
