import posthog from "posthog-js";
import { getDefaultDateRange } from "shared";
import config from "./config";
import { update } from "@intercom/messenger-js-sdk";

const getPreviousDate = (day) => {
  const date = new Date();
  date.setDate(date.getDate() - day);
  return date.toISOString();
};

export const BASE_CHART_PROPS = {
  // dataKey: {
  //   type: "string",
  //   required: true,
  // },
  gridAxis: {
    type: "segmented",
    options: [
      {
        label: "x",
        value: "x",
      },
      {
        label: "y",
        value: "y",
      },
      {
        label: "xy",
        value: "xy",
      },
      {
        label: "none",
        value: "none",
      },
    ],
  },
  withXAxis: {
    type: "boolean",
    defaultValue: true,
  },
  withYAxis: {
    type: "boolean",
    defaultValue: true,
  },
  withDots: {
    type: "boolean",
    defaultValue: true,
  },
  withLegend: {
    type: "boolean",
  },
  withTooltip: {
    type: "boolean",
    defaultValue: true,
  },
};

export const CHART_DATA = [
  {
    date: getPreviousDate(15),
    Apples: 2890,
    Oranges: 2338,
    Tomatoes: 2452,
  },
  {
    date: getPreviousDate(12),
    Apples: 2756,
    Oranges: 2103,
    Tomatoes: 2402,
  },
  {
    date: getPreviousDate(8),
    Apples: 3322,
    Oranges: 986,
    Tomatoes: 1821,
  },
  {
    date: getPreviousDate(4),
    Apples: 3470,
    Oranges: 2108,
    Tomatoes: 2809,
  },
  {
    date: getPreviousDate(1),
    Apples: 3129,
    Oranges: 1726,
    Tomatoes: 2290,
  },
];

export const CHART_SERIES = [
  { name: "Apples", color: "indigo" },
  { name: "Oranges", color: "blue" },
  { name: "Tomatoes", color: "teal" },
];

export const ALL_CHARTS = {
  main: ["models", "templates", "users"],
  extras: [
    "tokens",
    "costs",
    "errors",
    "users/new",
    "users/active",
    "users/average-cost",
    "run-types",
    "latency",
    "feedback-ratio",
    "feedback/thumb/up",
    "feedback/thumb/down",
    "top-topics",
    "sentiments",
  ],
};

/**
 * This deserialize function handles the old localStorage format and
 * corrupted data (e.g., if the data was manually changed by the user).
 */
export function deserializeDateRange(value: any): [Date, Date] {
  const defaultRange: [Date, Date] = getDefaultDateRange();

  if (!value) {
    return defaultRange;
  }
  try {
    const range = typeof value === "string" ? JSON.parse(value) : value;

    if (!Array.isArray(range) || range.length !== 2) {
      return defaultRange;
    }
    if (isNaN(Date.parse(range[0])) || isNaN(Date.parse(range[1]))) {
      return defaultRange;
    }

    const [startDate, endDate] = [new Date(range[0]), new Date(range[1])];

    return [startDate, endDate];
  } catch {
    return defaultRange;
  }
}

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: window.location.origin + "/ingest", // Uses Next.js rewrite in next.config.js
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

async function handleRouteChange() {
  posthog?.capture("$pageview");
}

function track(event: string, data?: any) {
  try {
    posthog?.capture(event, data);
  } catch (e) {
    console.error(e);
  }
}

const alreadyTracked = new Set<string>();
function trackOnce(event: string, data?: any) {
  // Prevent sending too many events
  if (alreadyTracked.has(event)) return;

  try {
    posthog?.capture(event, data);
  } catch (e) {
    console.error(e);
  }
}

function identify(userId: string, traits: any) {
  try {
    if (config.IS_CLOUD) {
      posthog?.identify(userId, traits);
      update({ user_id: userId, ...traits });
    }
  } catch (e) {
    console.error(e);
  }
}

const analytics = {
  track,
  trackOnce,
  identify,
  handleRouteChange,
};

export default analytics;
