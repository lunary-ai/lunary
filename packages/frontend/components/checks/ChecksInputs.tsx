import { Flex, NumberInput, Text, TextInput } from "@mantine/core";
import classes from "./index.module.css";
import SmartCheckSelect from "./SmartSelectInput";

import { DateTimePicker } from "@mantine/dates";
import { useEffect } from "react";

const minDate = new Date(2021, 0, 1);
const maxDate = new Date();

const CheckInputs = {
  select: SmartCheckSelect,

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
      onChange(defaultValue);
    }, []);

    return (
      <DateTimePicker
        minDate={minDate}
        maxDate={maxDate}
        variant="unstyled"
        size="xs"
        value={value}
        defaultValue={defaultValue}
        onChange={(date: Date) => {
          if (!value) {
            date.setHours(23, 59, 59, 999);
          }
          // There's a bug in the picker, it doesn't return the exact date selected
          date.setSeconds(0);
          date.setMilliseconds(0);
          return onChange(date);
        }}
        placeholder={placeholder || "Select date"}
      />
    );
  },
};

export default CheckInputs;
