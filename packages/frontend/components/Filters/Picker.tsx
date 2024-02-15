import { Box, Button, Group, Select, Stack, Text } from "@mantine/core"
import { Fragment, useCallback, useEffect, useState } from "react"
import { FILTERS, Filter, FilterLogic, FilterParam, LogicData } from "shared"
import ErrorBoundary from "../Blocks/ErrorBoundary"
import { AddFilterButton } from "./AddFilter"
import FilterInputs from "./FiltersInputs"
import FiltersModal from "./FiltersModal"
import classes from "./index.module.css"
import { IconX } from "@tabler/icons-react"

function RenderFilterNode({
  minimal,
  node,
  disabled,
  filters,
  setNode,
  removeNode,
}: {
  minimal: boolean
  node: FilterLogic
  filters: Filter[]
  disabled: boolean
  setNode: (node: FilterLogic | LogicData) => void
  removeNode: () => void
}) {
  if (typeof node === "string" && ["AND", "OR"].includes(node)) return null

  if (Array.isArray(node)) {
    const currentOperator = node[0] as "AND" | "OR"

    const showFilterNode = (n, i) => (
      <RenderFilterNode
        minimal={minimal}
        key={i}
        filters={filters}
        node={n as FilterLogic}
        removeNode={() => {
          const newNode = [...node]
          newNode.splice(i, 1)
          setNode(newNode as FilterLogic)
        }}
        setNode={(newNode) => {
          const newNodeArray = [...node]
          newNodeArray[i] = newNode
          setNode(newNodeArray as FilterLogic)
        }}
      />
    )

    return node.map((n, i) => {
      const showOperator = i !== 0 && i !== node.length - 1 && !minimal
      return showOperator ? (
        <Group key={i} gap={showOperator ? "xs" : 0}>
          {showFilterNode(n, i)}
          {showOperator && (
            <Select
              variant="unstyled"
              c="dimmed"
              w={70}
              size="xs"
              fw="bold"
              data={["AND", "OR"]}
              value={currentOperator}
              onChange={(val) => {
                const newNodeArray = [...node]
                newNodeArray[0] = val
                setNode(newNodeArray as FilterLogic)
              }}
            />
          )}
        </Group>
      ) : (
        showFilterNode(n, i)
      )
    })
  }

  // ts assert node is LogicElement
  const s = node as LogicData

  const filter = filters.find((f) => f.id === s.id)

  if (!filter) return null

  return (
    <Group>
      <div className={classes["custom-input"]}>
        {filter?.params.map((param, i) => {
          const CustomInput = FilterInputs[param.type]
          if (!CustomInput) return null

          const isParamNotLabel = param.type !== "label"

          const paramData = isParamNotLabel ? s.params[param.id] : null

          const width =
            isParamNotLabel && param.width
              ? minimal
                ? param.width
                : param.width * 1.1
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
            <Fragment key={i}>
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
        <IconX
          opacity={0.5}
          cursor="pointer"
          size={14}
          onClick={() => {
            removeNode()
          }}
        />
      </div>
    </Group>
  )
}

export default function FilterPicker({
  value = ["AND"],
  onChange = (data) => {},
  minimal = false,
  restrictTo = (filter) => true,
  defaultOpened = false,
  disabled = false,
}: {
  value?: FilterLogic
  onChange?: (data: FilterLogic) => void
  minimal?: boolean
  restrictTo?: (filter: Filter) => boolean
  defaultOpened?: boolean
  disabled?: boolean
}) {
  const [modalOpened, setModalOpened] = useState(false)

  const options = FILTERS.filter(restrictTo)

  // insert {id: filterId, params: { [param1]: defaultValue, [param2]: defaultValue }}
  const insertFilters = (filters: Filter[]) => {
    const arr: FilterLogic =
      Array.isArray(value) && !!value.length ? [...value] : ["AND"]

    filters.forEach((filter) => {
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
    })

    onChange(arr)
  }

  const Container = minimal ? Group : Stack

  return (
    <Box style={disabled ? { pointerEvents: "none", opacity: 0.8 } : {}}>
      <Container>
        <>
          <RenderFilterNode
            minimal={minimal}
            node={value}
            disabled={disabled}
            setNode={(newNode) => {
              onChange(newNode as FilterLogic)
            }}
            removeNode={() => {
              onChange(["AND"])
            }}
            filters={options}
          />

          {!disabled && (
            <>
              {minimal ? (
                <AddFilterButton
                  filters={options}
                  onSelect={(filter) => insertFilters([filter])}
                  defaultOpened={defaultOpened}
                />
              ) : (
                <>
                  <Button
                    size="sm"
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
                      const filters = ids
                        .map((id) => options.find((option) => option.id === id))
                        .filter(Boolean)
                      insertFilters(filters)
                    }}
                  />
                </>
              )}
            </>
          )}
        </>
      </Container>
    </Box>
  )
}
