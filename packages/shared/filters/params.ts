import type { FilterParam } from "./types"

export const FORMAT_PARAM: FilterParam = {
  type: "select",
  id: "type",
  options: [
    {
      label: "Is valid",
      value: "parsable",
    },
    {
      label: "Is partial",
      value: "partial",
    },
    {
      label: "Is not valid",
      value: "not_parsable",
    },
  ],
}

export const NUMBER_PARAM: FilterParam = {
  type: "select",
  id: "operator",
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
  options: [
    {
      label: "Matches",
      value: "match",
    },
    {
      label: "Does not match",
      value: "not_match",
    },
  ],
}
