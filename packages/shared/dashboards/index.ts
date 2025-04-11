export function getDefaultDateRange(
  nbDaysFromToday: number = 30,
): [Date, Date] {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const oneWeekAgoDate = new Date(endOfToday);
  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - nbDaysFromToday);
  oneWeekAgoDate.setHours(0, 0, 0, 0);
  const defaultRange: [Date, Date] = [oneWeekAgoDate, endOfToday];
  return defaultRange;
}

type Aggregation = "sum" | "avg" | null | undefined;
export type ChartType = "Top" | "Area";

export interface DefaultChart {
  id: string;
  name: string;
  description: string;
  type: ChartType;
  dataKey: string;
  aggregationMethod: Aggregation;
  color?: string;
  splitBy?: string;
}

export const DEFAULT_CHARTS: Record<string, DefaultChart> = {
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
  "agents/top": {
    id: "agents/top",
    name: "Top Agents",
    description: "The top agents in your project",
    type: "Top",
    dataKey: "agents/top",
    aggregationMethod: null,
  },
  threads: {
    id: "threads",
    name: "Active Conversations",
    description: "The number of active conversations in your project",
    type: "Area",
    dataKey: "threads",
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
    color: "red",
  },
  "users/new": {
    id: "users/new",
    name: "New Users",
    description: "The number of new tracked users for the selected period",
    type: "Area",
    dataKey: "users/new",
    aggregationMethod: "sum",
    color: "green",
  },
  "users/active": {
    id: "users/active",
    name: "Active Users",
    description: "The number of active users for the selected period",
    type: "Area",
    dataKey: "users/active",
    aggregationMethod: "sum",
    color: "yellow",
  },
  "users/average-cost": {
    id: "users/average-cost",
    name: "Avg. User Cost",
    description: "The average cost of each of your users",
    type: "Area",
    dataKey: "users/average-cost",
    aggregationMethod: "avg",
    color: "green",
  },
  "run-types": {
    id: "run-types",
    name: "Runs Volume",
    description: "The total number of runs generated by your app",
    type: "Area",
    dataKey: "run-types",
    splitBy: "type",
    aggregationMethod: "sum",
  },
  latency: {
    id: "latency",
    name: "Avg. LLM Latency",
    description: "The average duration of your LLM Calls",
    type: "Area",
    dataKey: "latency",
    color: "purple",
    aggregationMethod: "avg",
  },
  "feedback-ratio": {
    id: "feedback-ratio",
    name: "Thumb Up/Down Score",
    description: "The normalized difference of thumbs up and down feedbacks",
    type: "Area",
    dataKey: "feedback-ratio",
    aggregationMethod: "avg",
    color: "blue",
  },
  "feedback/thumb/up": {
    id: "feedback/thumb/up",
    name: "Total Thumbs Up",
    description: "The total of thumbs up feedbacks",
    type: "Area",
    dataKey: "feedback/thumb/up",
    aggregationMethod: "sum",
    color: "green",
  },
  "feedback/thumb/down": {
    id: "feedback/thumb/down",
    name: "Total Thumbs Down",
    description: "The total of thumbs down feedbacks",
    type: "Area",
    dataKey: "feedback/thumb/down",
    aggregationMethod: "sum",
    color: "red",
  },
  "languages/top": {
    id: "languages/top",
    name: "Top Languages",
    description: "The top languages in your project",
    type: "Top",
    dataKey: "languages/top",
    aggregationMethod: null,
  },
  "topics/top": {
    id: "topics/top",
    name: "Top Topics",
    description: "The number of topics occurrence in your project",
    type: "Top",
    dataKey: "topics/top",
    aggregationMethod: null,
  },
};

export const chartProps = Object.keys(DEFAULT_CHARTS);

export type GranularityType = "hourly" | "daily" | "weekly" | "monthly";

export interface Chart {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  dashboardId: string | null;
  name: string;
  description: string | null;
  type: string;
  dataKey: string;
  aggregationMethod: string | null;
  primaryDimension: string | null;
  secondaryDimension: string | null;
  isCustom: boolean;
  color: string | null;
}

export interface Dashboard {
  id: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  projectId: string;
  name: string;
  description: string | null;
  checks: any;
  startDate: string | null;
  endDate: string | null;
  granularity: GranularityType | null;
  isHome: boolean;
  charts: Chart[];
}
