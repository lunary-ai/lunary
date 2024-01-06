export const FORMAT_PARAM = {
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

export const NUMBER_PARAM = {
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

export const FIELD_PARAM = {
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

export const MATCH_PARAM = {
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
