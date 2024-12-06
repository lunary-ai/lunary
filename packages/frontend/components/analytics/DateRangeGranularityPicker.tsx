import {
  DateRangePicker,
  determineGranularity,
  Granularity,
} from "@/components/analytics/Creator";
import { DateRangeSelect } from "@/pages/dashboards/old-[id]";
import { Group, Select } from "@mantine/core";
import { useEffect, useState } from "react";

type PresetDateRange = "Today" | "7 Days" | "30 Days" | "3 Months" | "Custom";
type DateRange = [Date, Date];

export function getDateRangeFromPreset(preset: PresetDateRange): DateRange {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startDate = new Date(endOfDay);
  startDate.setHours(0, 0, 0, 0);

  if (preset === "7 Days") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (preset === "30 Days") {
    startDate.setDate(startDate.getDate() - 30);
  } else if (preset === "3 Months") {
    startDate.setMonth(startDate.getMonth() - 3);
  }

  return [startDate, endOfDay];
}

function getDiffDays(dateRange: [Date, Date]) {
  const [startDate, endDate] = dateRange;
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
}

function getPresetFromDateRange(dateRange: DateRange): PresetDateRange {
  const [startDate, endDate] = [new Date(dateRange[0]), new Date(dateRange[1])];
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  if (
    startDate.getTime() === startOfToday.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "Today";
  }

  const sevenDaysAgo = new Date(endOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  if (
    startDate.getTime() === sevenDaysAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "7 Days";
  }

  const thirtyDaysAgo = new Date(endOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  if (
    startDate.getTime() === thirtyDaysAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "30 Days";
  }

  const threeMonthsAgo = new Date(endOfToday);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setHours(0, 0, 0, 0);
  if (
    startDate.getTime() === threeMonthsAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "3 Months";
  }

  return "Custom";
}

export function useDateRangeGranularity() {
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRangeFromPreset("7 Days"),
  );
  const [granularity, setGranularity] = useState<Granularity>(
    determineGranularity(dateRange),
  );

  useEffect(() => {
    if (!granularity) {
      setGranularity(determineGranularity(dateRange));
    }
  }, [dateRange]);

  return {
    startDate: dateRange[0],
    endDate: dateRange[1],
    setDateRange,
    granularity,
    setGranularity,
  };
}

interface GranularitySelectProps {
  dateRange: [Date, Date];
  granularity: Granularity;
  setGranularity: (granularity: Granularity) => void;
}
export function GranularitySelect({
  dateRange,
  granularity,
  setGranularity,
}: GranularitySelectProps) {
  const [options, setOptions] = useState<
    { value: Granularity; label: string }[]
  >([]);

  useEffect(() => {
    const diffDays = getDiffDays(dateRange);
    let allowedOptions: { value: Granularity; label: string }[] = [];

    if (diffDays <= 1) {
      allowedOptions = [{ value: "hourly", label: "Hourly" }];
    } else if (diffDays <= 30) {
      allowedOptions = [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ];
    } else {
      allowedOptions = [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        // TODO: { value: "monthly", label: "Monthly" },
      ];
    }

    setOptions(allowedOptions);

    if (!allowedOptions.find((opt) => opt.value === granularity)) {
      setGranularity(allowedOptions[0].value);
    }
  }, [dateRange, granularity, setGranularity]);

  return (
    <Select
      placeholder="Granularity"
      w="100"
      size="xs"
      allowDeselect={false}
      ml="md"
      styles={{
        input: {
          height: 32,
        },
      }}
      data={options}
      value={granularity}
      onChange={(value) => setGranularity(value as Granularity)}
    />
  );
}

export default function DateRangeGranularityPicker({
  dateRange,
  setDateRange,
  granularity,
  setGranularity,
}) {
  return (
    <Group gap={0}>
      <DateRangeSelect dateRange={dateRange} setDateRange={setDateRange} />
      <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      <GranularitySelect
        granularity={granularity}
        setGranularity={setGranularity}
        dateRange={dateRange}
      />
    </Group>
  );
}
