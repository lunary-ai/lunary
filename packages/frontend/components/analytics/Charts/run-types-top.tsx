import { useMemo } from "react";
import { Box } from "@mantine/core";
import BarList, { type BarListColumn } from "../BarList";
import { formatLargeNumber } from "@/utils/format";
import { RUN_TYPE_LABELS, type RunTypeFilterValue } from "shared/checks";

type SplitByOption = "type" | "tags";

type RunTypesPoint = {
  name: string | null;
  value: number;
  date: string;
};

type RunTypesTopRow = {
  label: string;
  count: number;
  value: string;
  barSections: {
    count: number;
    color: string;
    tooltip: string;
  }[];
};

const UNKNOWN_KEY = "__unknown__";

function formatLabel(rawName: string | null, splitBy: SplitByOption) {
  if (!rawName) {
    return splitBy === "tags" ? "No Tag" : "Unknown";
  }

  if (splitBy === "type") {
    const normalized = rawName as RunTypeFilterValue;
    if (normalized in RUN_TYPE_LABELS) {
      return RUN_TYPE_LABELS[normalized];
    }
  }

  return rawName;
}

export default function RunTypesTop({
  data,
  splitBy,
}: {
  data: RunTypesPoint[];
  splitBy: SplitByOption;
}) {
  const MAX_ROWS = 5;

  const rows = useMemo<RunTypesTopRow[]>(() => {
    const totals = new Map<string, number>();

    for (const point of data) {
      const key = point.name ?? UNKNOWN_KEY;
      totals.set(key, (totals.get(key) ?? 0) + (point.value ?? 0));
    }

    return Array.from(totals.entries())
      .map(([rawKey, count]) => {
        const rawName = rawKey === UNKNOWN_KEY ? null : rawKey;
        const label = formatLabel(rawName, splitBy);

        const formattedCount = formatLargeNumber(count);

        return {
          label,
          count,
          value: formattedCount,
          barSections: [
            {
              count,
              color:
                splitBy === "tags"
                  ? "var(--mantine-color-blue-5)"
                  : "var(--mantine-color-blue-5)",
              tooltip:
                splitBy === "tags"
                  ? `${label}: ${formattedCount} events`
                  : `${label}: ${formattedCount}`,
            },
          ],
        };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [data, splitBy]);

  const columns: BarListColumn[] = useMemo(
    () => [
      {
        name: "Events",
        key: "count",
        main: true,
        bar: true,
        render: (value: unknown) =>
          formatLargeNumber(Number.parseInt(String(value ?? 0), 10)),
      },
      {
        name: splitBy === "tags" ? "Tags" : "Event Types",
        key: "label",
      },
    ],
    [splitBy],
  );

  return (
    <Box px="md">
      <BarList data={rows} columns={columns} maxRows={MAX_ROWS} />
    </Box>
  );
}
