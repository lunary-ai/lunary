import { Flex, NumberInput, Text, TextInput } from "@mantine/core"
import classes from "./index.module.css"
import SmartCheckSelect from "./SmartSelectInput"

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
  label: ({ label }) => {
    return (
      <Text size="xs" className={classes["input-label"]} component="div">
        {label}
      </Text>
    )
  },
}

export default CheckInputs
