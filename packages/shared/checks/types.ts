export type CheckLabel = {
  type: "label";
  label: string;
};

export type CheckParam = {
  type: "select" | "text" | "number" | "date" | "users";
  id: string;
  unit?: string;
  max?: number;
  min?: number;
  step?: number;
  width?: number;
  placeholder?: string;
  defaultValue?: string | number | boolean | string[];
  searchable?: boolean;
  allowCustom?: boolean;
  getItemValue?: (item: any) => string; // custom function to get value from item, for selects
  customSearch?: (query: string, item: any) => boolean; // custom search function for search in selects
  multiple?: boolean;
  resetParams?: string[];
  requires?: string[];
  options?:
    | Array<{ label: string; value: string }>
    | ((
        projectId: string,
        type: string | undefined,
        params?: Record<string, any>,
      ) => string | null);
};

export type Check = {
  id: string;
  uiType?: "basic" | "smart" | "ai";
  name: string;
  description?: string;
  soon?: boolean;
  params: (CheckParam | CheckLabel)[];
  disableInEvals?: boolean;
  uniqueInBar?: boolean; // if true, only one check of this type can be in a filter bar
  onlyInEvals?: boolean;
};

// [ 'AND, {id, params}, {id, params}, {id, params}, ['OR', {id, params}, {id, params}], ['OR', {id, params}, ['AND', {id, params}, {id, params}]] ]

export type LogicData = {
  id: string;
  params: any;
};

export type LogicNode = ["AND" | "OR", ...LogicElement[]];

export type LogicElement = LogicData | LogicNode;

export type CheckLogic = LogicNode;
