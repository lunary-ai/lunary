import { fetcher } from "@/utils/fetcher"
import {
  Box,
  Button,
  Flex,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { useEffect, useState } from "react"
import { FILTERS, Filter } from "shared"
import { AddFilterButton } from "./AddFilter"
import ErrorBoundary from "../Blocks/ErrorBoundary"
import classes from "./index.module.css"
import FiltersModal from "./FiltersModal"

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
        allowDeselect={false}
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
  number: ({ label, width, min, max, step, value, onChange, unit }) => {
    return (
      <Flex align="center">
        <NumberInput
          size="xs"
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
      <Text size="xs" className={classes["input-label"]} component="div">
        {label}
      </Text>
    )
  },
}

export type SavedFilterData = {
  id: string
  paramsData: { id: string; value: any }[]
}

export default function FilterPicker({
  defaultValue = [],
  onChange = (data) => {},
  minimal = false,
  restrictTo = (filter) => true,
}: {
  defaultValue?: SavedFilterData[]
  onChange?: (data: SavedFilterData[]) => void
  minimal?: boolean
  restrictTo?: (filter: Filter) => boolean
}) {
  const [modalOpened, setModalOpened] = useState(false)

  const options = FILTERS.filter(restrictTo)

  const [selected, handlers] = useListState<SavedFilterData>(defaultValue)

  useEffect(() => {
    onChange(selected)
  }, [selected])

  const insertFilter = (filter: Filter) => {
    handlers.append({
      id: filter.id,
      paramsData: filter.params.map((param) => ({
        id: param.id,
        value: param.defaultValue,
      })),
    })
  }

  const Container = minimal ? Group : Stack

  return (
    <Box>
      <Container>
        <>
          {selected.map((s, i) => {
            const filter = options.find((option) => option.id === s.id)

            return (
              <Group>
                {!minimal && i !== 0 && (
                  <Text c="dimmed" size="xs" fw="bold">
                    AND
                  </Text>
                )}
                <div className={classes["custom-input"]}>
                  {filter?.params.map((param) => {
                    const CustomInput = FilterInputs[param.type]
                    if (!CustomInput) return null

                    const paramData =
                      param.id &&
                      s.paramsData.find(
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
                          width={minimal ? param.width : param.width * 1.5}
                          value={paramData}
                          onChange={onChangeParam}
                        />
                      </ErrorBoundary>
                    )
                  })}
                </div>
              </Group>
            )
          })}
          {minimal ? (
            <AddFilterButton filters={options} onSelect={insertFilter} />
          ) : (
            <>
              <Button
                size="xs"
                variant="light"
                onClick={() => setModalOpened(true)}
              >
                Add
              </Button>
              <FiltersModal
                opened={modalOpened}
                setOpened={setModalOpened}
                filters={options}
                onFinish={(ids) => {
                  for (const id of ids) {
                    const filter = options.find((option) => option.id === id)
                    if (!filter) return

                    insertFilter(filter)
                  }
                }}
              />
            </>
          )}
        </>
      </Container>
    </Box>
  )
}
