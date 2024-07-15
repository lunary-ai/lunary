import { Flex, NumberInput, Text, TextInput } from "@mantine/core"
import classes from "./index.module.css"
import SmartCheckSelect from "./SmartSelectInput"

import { DateTimePicker } from "@mantine/dates"

const minDate = new Date(2021, 0, 1)
const maxDate = new Date()

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
    )
  },
  text: ({ placeholder, width, value, onChange }) => {
    return (
      <TextInput
        size="xs"
        w={width}
        variant="unstyled"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    )
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
    )
  },
  date: ({ placeholder, value, onChange }) => {
    return (
      <DateTimePicker
        minDate={minDate}
        maxDate={maxDate}
        variant="unstyled"
        size="xs"
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Select date"}
      />
    )
  },
}

export default CheckInputs
