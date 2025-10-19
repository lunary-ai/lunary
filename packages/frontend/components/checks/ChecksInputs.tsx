import {
  Flex,
  Group,
  NumberInput,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import classes from "./index.module.css";
import SmartCheckSelect from "./SmartSelectInput";

import { DateTimePicker } from "@mantine/dates";
import { useEffect } from "react";
import UserSelectInput from "./UserSelectInput";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const minDate = new Date(2021, 0, 1);
const maxDate = new Date();

function parseDateTime(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = dayjs(value, "YYYY-MM-DD HH:mm:ss", true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }

    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return null;
}

const CheckInputs = {
  select: SmartCheckSelect,
  users: UserSelectInput,
  slider: ({ placeholder, width, min, max, step, value, onChange }) => {
    return (
      <Stack w="100%">
        <Group justify="space-between">
          <Text size="sm">Passing grade</Text>
          <Text size="sm">{value}</Text>
        </Group>
        <Slider
          size="sm"
          w="100%"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(n) => onChange(n)}
        />
      </Stack>
    );
  },

  number: ({ placeholder, width, min, max, step, value, onChange, unit }) => {
    return (
      <Flex align="center">
        <NumberInput
          size="xs"
          placeholder={placeholder}
          w={width}
          min={min}
          max={max}
          step={step}
          mr="xs"
          variant="unstyled"
          value={value}
          onChange={(n) => onChange(n)}
        />
        <Text ta="center" pr="xs" size="xs">
          {unit}
        </Text>
      </Flex>
    );
  },
  text: ({ placeholder, width, value, minimal, onChange }) => {
    return (
      <TextInput
        size={minimal ? "xs" : "sm"}
        w={width}
        variant={minimal ? "unstyled" : "default"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    );
  },

  label: ({ label, description, minimal }) => {
    return (
      <div>
        <Text
          size={minimal ? "xs" : "sm"}
          className={classes["input-label"]}
          component="div"
        >
          {label}
        </Text>
        {!minimal && description && (
          <Text size="xs" c="dimmed" className={classes["input-description"]}>
            {description}
          </Text>
        )}
      </div>
    );
  },
  date: ({ placeholder, value, onChange }) => {
    const defaultValue = new Date();
    defaultValue.setHours(23, 59, 59, 999);

    useEffect(() => {
      if (!value) {
        onChange(defaultValue);
      }
    }, []);

    const resolvedValue = parseDateTime(value) ?? value ?? null;

    return (
      <DateTimePicker
        minDate={minDate}
        maxDate={maxDate}
        variant="unstyled"
        size="xs"
        value={resolvedValue}
        defaultValue={defaultValue}
        onChange={(dateString) => {
          if (!dateString) {
            return onChange(null);
          }

          const parsed = parseDateTime(dateString);
          if (!parsed) {
            return onChange(null);
          }

          if (!value) {
            parsed.setHours(23, 59, 59, 999);
          }

          parsed.setSeconds(0);
          parsed.setMilliseconds(0);

          return onChange(parsed);
        }}
        placeholder={placeholder || "Select date"}
      />
    );
  },
};

export default CheckInputs;
