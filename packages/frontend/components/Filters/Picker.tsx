import { Box, Button, Group, Stack, Text } from "@mantine/core"
import { Fragment, useEffect, useState } from "react"
import { FILTERS, Filter, FilterLogic, FilterParam, LogicData } from "shared"
import ErrorBoundary from "../Blocks/ErrorBoundary"
import { AddFilterButton } from "./AddFilter"
import FilterInputs from "./FiltersInputs"
import FiltersModal from "./FiltersModal"
import classes from "./index.module.css"

function RenderFilterNode({
  minimal,
  node,
  filters,
  setNode,
}: {
  minimal: boolean
  node: FilterLogic
  filters: Filter[]
  setNode: (node: FilterLogic | LogicData) => void
}) {
  if (typeof node === "string" && ["AND", "OR"].includes(node)) return null

  if (Array.isArray(node)) {
    const currentOperator = node[0] as "AND" | "OR"

    const showFilterNode = (n, i) => (
      <RenderFilterNode
        minimal={minimal}
        filters={filters}
        node={n as FilterLogic}
        setNode={(newNode) => {
          const newNodeArray = [...node]
          newNodeArray[i] = newNode
          setNode(newNodeArray as FilterLogic)
        }}
      />
    )

    return (
      <Group>
        {node.map((n, i) => {
          const showOperator = i !== 0 && i !== node.length - 1
          return showOperator ? (
            <Group key={i} gap={showOperator ? "xs" : 0}>
              {showFilterNode(n, i)}
              {showOperator && (
                <Text c="dimmed" size="xs" fw="bold">
                  {currentOperator}
                </Text>
              )}
            </Group>
          ) : (
            showFilterNode(n, i)
          )
        })}
      </Group>
    )
  }

  // ts assert node is LogicElement
  const s = node as LogicData

  const filter = filters.find((f) => f.id === s.id)

  return (
    <Group>
      <div className={classes["custom-input"]}>
        {filter?.params.map((param) => {
          const CustomInput = FilterInputs[param.type]
          if (!CustomInput) return null

          const isParamNotLabel = param.type !== "label"

          const paramData = isParamNotLabel ? s.params[param.id] : null

          const width =
            isParamNotLabel && param.width
              ? minimal
                ? param.width
                : param.width * 1.5
              : undefined

          const onChangeParam = (value) => {
            isParamNotLabel &&
              setNode({
                id: s.id,
                params: {
                  ...(s.params || {}),
                  [param.id]: value,
                },
              })
          }

          return (
            <Fragment key={param.id}>
              <ErrorBoundary>
                <CustomInput
                  {...param}
                  width={width}
                  value={paramData}
                  onChange={onChangeParam}
                />
              </ErrorBoundary>
            </Fragment>
          )
        })}
      </div>
    </Group>
  )
}

export default function FilterPicker({
  defaultValue = ["AND"],
  onChange = (data) => {},
  minimal = false,
  restrictTo = (filter) => true,
}: {
  defaultValue?: FilterLogic
  onChange?: (data: FilterLogic) => void
  minimal?: boolean
  restrictTo?: (filter: Filter) => boolean
}) {
  const [modalOpened, setModalOpened] = useState(false)

  const options = FILTERS.filter(restrictTo)

  const [selected, setSelected] = useState<FilterLogic>(defaultValue)

  useEffect(() => {
    onChange(selected)
  }, [selected])

  // insert {id: filterId, params: { [param1]: defaultValue, [param2]: defaultValue }}
  const insertFilter = (filter: Filter) => {
    const arr: FilterLogic =
      Array.isArray(selected) && !!selected.length ? [...selected] : ["AND"]

    const filterLogic = {
      id: filter.id,
      params: filter.params
        .filter((param) => param.type !== "label")
        .reduce((acc, { id, defaultValue }: FilterParam) => {
          acc[id] = defaultValue
          return acc
        }, {}),
    }

    arr.push(filterLogic)

    setSelected(arr)
  }

  const Container = minimal ? Group : Stack

  return (
    <Box>
      <Container>
        <>
          <RenderFilterNode
            minimal={minimal}
            node={selected}
            setNode={(newNode) => {
              setSelected(newNode as FilterLogic)
            }}
            filters={options}
          />

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
