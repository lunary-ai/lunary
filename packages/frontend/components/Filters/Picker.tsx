import { fetcher } from "@/utils/fetcher"
import {
  Box,
  Flex,
  Group,
  Input,
  InputWrapper,
  MultiSelect,
  NumberInput,
  Select,
  Text,
  TextInput,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { useEffect, useState } from "react"
import { FILTERS } from "shared"
import { AddFilterButton } from "./AddFilter"
import ErrorBoundary from "../Blocks/ErrorBoundary"
import styles from "./index.module.css"

const FilterInputs = {
  select: ({ options, width, multiple, value, onChange }) => {
    const [data, setData] = useState<string[] | null>(null)

    useEffect(() => {
      if (typeof options === "function") {
        const fetchUrl = options()

        if (fetchUrl) {
          fetcher.get(fetchUrl).then((data) => {
            if (data) setData(data?.map((d) => d.tag))
          })
        }
      } else if (Array.isArray(options)) {
        setData(options)
      }
    }, [])

    const Component = multiple ? MultiSelect : Select

    return data ? (
      <Component
        size="xs"
        w={width}
        variant="unstyled"
        // placeholder={label}
        onChange={onChange}
        value={value}
        data={data}
      />
    ) : (
      "loading..."
    )
  },
  number: ({ label, width, value, onChange, unit }) => {
    return (
      <Flex align="center">
        <NumberInput
          size="xs"
          w={width}
          mr="xs"
          variant="unstyled"
          value={value}
          onChange={(n) => onChange(n)}
        />
        <Text size="xs">{unit}</Text>
      </Flex>
    )
  },
  text: ({ label, width, value, onChange }) => {
    return (
      <TextInput
        size="xs"
        w={width}
        variant="unstyled"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    )
  },
  label: ({ label }) => {
    return (
      <Text size="xs" className={styles.InputLabel} component="div">
        {label}
      </Text>
    )
  },
}

export default function FilterPicker({
  onChange = (data) => {},
  minimal = false,
  restrictTo = (filter) => true,
}) {
  const options = FILTERS.filter(restrictTo)

  const [selected, handlers] = useListState<{
    id: string
    paramsData: { id: string; value: any }[]
  }>([])

  useEffect(() => {
    onChange(selected)
  }, [selected])

  return (
    <Box>
      <Group>
        {selected.map((s, i) => {
          const filter = options.find((option) => option.id === s.id)

          return (
            <div className={styles.CustomInput}>
              {filter?.params.map((param) => {
                const CustomInput = FilterInputs[param.type]
                if (!CustomInput) return null

                const paramData = s.paramsData.find(
                  (paramData) => paramData.id === param.id,
                )?.value

                const onChangeParam = (value) => {
                  handlers.setItemProp(
                    i,
                    "paramsData",
                    s.paramsData.map((p) => {
                      if (p.id === param.id) {
                        return {
                          ...p,
                          value,
                        }
                      }

                      return p
                    }),
                  )
                }

                return (
                  <ErrorBoundary>
                    <CustomInput
                      {...param}
                      value={paramData}
                      onChange={onChangeParam}
                    />
                  </ErrorBoundary>
                )
              })}
            </div>
          )
        })}
        <AddFilterButton
          filters={options}
          onSelect={(filter) => {
            handlers.append({
              id: filter.id,
              paramsData: filter.params.map((param) => ({
                id: param.id,
                value: param.defaultValue,
              })),
            })
          }}
        />
      </Group>
    </Box>
  )
}
