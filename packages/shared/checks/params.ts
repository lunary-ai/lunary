import type { CheckParam } from "./types"

export const FORMAT_PARAM: CheckParam = {
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
      label: "Is invalid",
      value: "invalid",
    },
    // {
    //   label: "Is partial",
    //   value: "partial",
    // },
    {
      label: "Contains valid",
      value: "contains",
    },
  ],
}

export const NUMBER_PARAM: CheckParam = {
  type: "select",
  id: "operator",
  width: 50,
  defaultValue: "lt",
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

export const FIELD_PARAM: CheckParam = {
  type: "select",
  id: "field",
  width: 80,
  defaultValue: "output",
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

export const FIELD_PARAM_ANY: CheckParam = {
  type: "select",
  id: "field",
  width: 80,
  defaultValue: "output",
  options: [
    {
      label: "Input",
      value: "input",
    },
    {
      label: "Output",
      value: "output",
    },
    {
      label: "Any",
      value: "any",
    },
  ],
}

export const MATCH_PARAM: CheckParam = {
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

export const PERCENT_PARAM: CheckParam = {
  type: "number",
  unit: "%",
  id: "percent",
  width: 50,
  min: 0,
  step: 5,
  max: 100,
  defaultValue: 50,
}
