import type { FilterParam } from "./types"

export const FORMAT_PARAM: FilterParam = {
  type: "select",
  id: "type",
  width: 120,
  defaultValue: "valid",
  options: [
    {
      label: "Is valid",
      value: "valid",
    },
    {
      label: "Is partial",
      value: "partial",
    },
    {
      label: "Contains valid",
      value: "contains",
    },
    {
      label: "Is not valid",
      value: "invalid",
    },
  ],
}

export const NUMBER_PARAM: FilterParam = {
  type: "select",
  id: "operator",
  width: 50,
  defaultValue: "eq",
  options: [
    {
      label: ">=",
      value: "gte",
    },
    {
      label: "<=",
      value: "lte",
    },
    {
      label: "=",
      value: "eq",
    },
    {
      label: "!=",
      value: "neq",
    },
    {
      label: ">",
      value: "gt",
    },
    {
      label: "<",
      value: "lt",
    },
  ],
}

export const FIELD_PARAM: FilterParam = {
  type: "select",
  id: "field",
  width: 80,
  defaultValue: "input",
  options: [
    {
      label: "Input",
      value: "input",
    },
    {
      label: "Output",
      value: "output",
    },
  ],
}

export const MATCH_PARAM: FilterParam = {
  type: "select",
  id: "type",
  width: 120,
  defaultValue: "contains",
  options: [
    {
      label: "Contains",
      value: "contains",
    },
    {
      label: "Not contains",
      value: "not_contains",
    },
  ],
}
