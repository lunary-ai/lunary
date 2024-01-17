import {
  Flex,
  MultiSelect,
  NumberInput,
  Select,
  Text,
  TextInput,
} from "@mantine/core"
import classes from "./index.module.css"
import { useProjectSWR } from "@/utils/dataHooks"

const FilterInputs = {
  select: ({ options, placeholder, width, multiple, value, onChange }) => {
    const useSWRforData = typeof options === "function"

    const { data: swrFilterData } = useProjectSWR(
      useSWRforData ? options() : null,
    )

    const data = useSWRforData ? swrFilterData : options

    const Component = multiple ? MultiSelect : Select

    return data ? (
      <Component
        size="xs"
        allowDeselect={false}
        w={width}
        variant="unstyled"
        placeholder={placeholder}
        onChange={onChange}
        value={value}
        data={data}
      />
    ) : (
      "loading..."
    )
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
        <Text size="xs">{unit}</Text>
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

export default FilterInputs
