import { useEffect, useMemo, useState } from "react";
import { Select, Group } from "@mantine/core";
import {
  DateRangePicker,
  GranularitySelect,
  determineGranularity,
  Granularity,
} from "@/components/analytics/Creator";

type PresetDateRange = "Today" | "7 Days" | "30 Days" | "3 Months" | "Custom";
type DateRange = [Date, Date];

// Helper functions to handle date range presets
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
    setGranularity(determineGranularity(dateRange));
  }, [dateRange]);

  return {
    startDate: dateRange[0],
    endDate: dateRange[1],
    setDateRange,
    granularity,
    setGranularity,
  };
}

// Component to handle date range selection
function DateRangeSelect({ dateRange, setDateRange }) {
  const selectedOption = getPresetFromDateRange(dateRange);
  const data = ["Today", "7 Days", "30 Days", "3 Months"];
  const displayData = selectedOption === "Custom" ? [...data, "Custom"] : data;

  function handleSelectChange(value) {
    const newDateRange = getDateRangeFromPreset(value);
    setDateRange(newDateRange);
  }

  return (
    <Select
      placeholder="Select date range"
      w="100"
      size="xs"
      allowDeselect={false}
      styles={{
        input: {
          height: 32,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderRight: 0,
        },
      }}
      data={displayData}
      value={selectedOption}
      onChange={handleSelectChange}
    />
  );
}

// Combined component for date range and granularity selection
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
      />
    </Group>
  );
}
