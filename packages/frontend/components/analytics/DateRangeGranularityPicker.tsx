import { Group, Select } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

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

export function getDiffDays(dateRange: [Date, Date]) {
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

export const determineGranularity = (dateRange: [Date, Date]): Granularity => {
  const [startDate, endDate] = dateRange;
  const diffDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return "hourly";
  if (diffDays <= 60) return "daily";
  return "weekly";
};

interface GranularitySelectProps {
  dateRange: [Date, Date];
  granularity: Granularity;
  setGranularity: (granularity: Granularity) => void;
  disableWeekly?: boolean; // new prop
}

export function GranularitySelect({
  dateRange,
  granularity,
  setGranularity,
  disableWeekly = false,
}: GranularitySelectProps) {
  const [options, setOptions] = useState<
    { value: Granularity; label: string }[]
  >([]);

  useEffect(() => {
    const diffDays = getDiffDays(dateRange);
    let allowedOptions: { value: Granularity; label: string }[] = [];

    if (diffDays < 1) {
      allowedOptions = [{ value: "hourly", label: "Hourly" }];
    } else if (diffDays <= 7) {
      allowedOptions = [{ value: "daily", label: "Daily" }];
    } else if (diffDays >= 7 && diffDays <= 31) {
      allowedOptions = disableWeekly
        ? [{ value: "daily", label: "Daily" }]
        : [
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ];
    } else {
      allowedOptions = disableWeekly
        ? [{ value: "daily", label: "Daily" }]
        : [
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ];
    }

    setOptions(allowedOptions);

    if (!allowedOptions.find((opt) => opt.value === granularity)) {
      setGranularity(allowedOptions[0].value);
    }
  }, [dateRange, granularity, setGranularity, disableWeekly]);

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
export function DateRangeSelect({ dateRange, setDateRange }) {
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

function parseDateValue(value: string | Date | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = dayjs(value, "YYYY-MM-DD", true);
  if (parsed.isValid()) {
    return parsed.toDate();
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function DateRangePicker({ dateRange, setDateRange }) {
  const [localDateRange, setLocalDateRange] = useState<
    [Date | null, Date | null]
  >([dateRange[0], dateRange[1]]);

  useEffect(() => {
    setLocalDateRange([dateRange[0], dateRange[1]]);
  }, [dateRange]);

  function handleDateChange(dates: [string | null, string | null]) {
    const parsed: [Date | null, Date | null] = [
      parseDateValue(dates[0]),
      parseDateValue(dates[1]),
    ];

    setLocalDateRange(parsed);

    if (parsed[0] && parsed[1]) {
      const startDate = new Date(parsed[0]);
      const endDate = new Date(parsed[1]);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 99);

      setDateRange([startDate, endDate]);
    }
  }
  return (
    <DatePickerInput
      type="range"
      placeholder="Pick date range"
      leftSection={<IconCalendar size={18} stroke={1.5} />}
      size="xs"
      w="fit-content"
      styles={{
        input: {
          borderTopLeftRadius: 0,
          height: 32,
          borderBottomLeftRadius: 0,
        },
      }}
      value={localDateRange}
      onChange={handleDateChange}
      maxDate={new Date()}
    />
  );
}
interface DateRangeGranularityPickerProps {
  dateRange: [Date, Date];
  setDateRange: (range: [Date, Date]) => void;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  disableWeekly?: boolean; // new prop
}

export default function DateRangeGranularityPicker({
  dateRange,
  setDateRange,
  granularity,
  setGranularity,
  disableWeekly = false, // default false
}: DateRangeGranularityPickerProps) {
  return (
    <Group gap={0}>
      <DateRangeSelect dateRange={dateRange} setDateRange={setDateRange} />
      <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      <GranularitySelect
        granularity={granularity}
        setGranularity={setGranularity}
        dateRange={dateRange}
        disableWeekly={disableWeekly}
      />
    </Group>
  );
}
export type Granularity = "hourly" | "daily" | "weekly" | "monthly";
