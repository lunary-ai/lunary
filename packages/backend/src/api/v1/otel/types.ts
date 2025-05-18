export interface ResourceSpans {
  /** Resource information associated with these spans */
  resource?: Resource;
  /** Spans grouped by instrumentation scope */
  scopeSpans: ScopeSpans[];
  /** Schema URL describing the resource data */
  schemaUrl?: string;
}

export interface Resource {
  /** Attributes describing the resource */
  attributes: KeyValue[];
  /** Number of attributes dropped during collection */
  droppedAttributesCount?: number;
  /** Entity references that participate in this resource */
  entityRefs?: EntityRef[];
}

export interface ScopeSpans {
  /** Instrumentation scope that produced the spans */
  scope?: InstrumentationScope;
  /** Spans produced by the scope */
  spans: Span[];
  /** Schema URL describing the span data */
  schemaUrl?: string;
}

/* Other referenced message types */

export interface InstrumentationScope {
  name?: string;
  version?: string;
  attributes?: KeyValue[];
  droppedAttributesCount?: number;
}

export interface KeyValue {
  key: string;
  value: AnyValue;
}

export interface EntityRef {
  schemaUrl?: string;
  type: string;
  idKeys: string[];
  descriptionKeys?: string[];
}

export interface AnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: number;
  doubleValue?: number;
  arrayValue?: AnyValue[];
  kvlistValue?: KeyValue[];
  bytesValue?: Uint8Array;
}

export interface Span {
  traceId: Uint8Array;
  spanId: Uint8Array;
  traceState?: string;
  parentSpanId?: Uint8Array;
  flags?: number;
  name: string;
  kind: SpanKind;
  startTimeUnixNano: number;
  endTimeUnixNano: number;
  attributes: KeyValue[];
  droppedAttributesCount?: number;
  events: SpanEvent[];
  droppedEventsCount?: number;
  links: SpanLink[];
  droppedLinksCount?: number;
  status?: Status;
}

export enum SpanKind {
  UNSPECIFIED = 0,
  INTERNAL = 1,
  SERVER = 2,
  CLIENT = 3,
  PRODUCER = 4,
  CONSUMER = 5,
}

export interface SpanEvent {
  timeUnixNano: number;
  name: string;
  attributes: KeyValue[];
  droppedAttributesCount?: number;
}

export interface SpanLink {
  traceId: Uint8Array;
  spanId: Uint8Array;
  traceState?: string;
  attributes: KeyValue[];
  droppedAttributesCount?: number;
  flags?: number;
}

export interface Status {
  message?: string;
  code: StatusCode;
}

export enum StatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export interface ExportTraceServiceRequest {
  resourceSpans: ResourceSpans[];
}

/** Response returned by the endpoint */
export interface ExportTraceServiceResponse {
  partialSuccess?: ExportTracePartialSuccess;
}

export interface ExportTracePartialSuccess {
  rejectedSpans: number;
  errorMessage?: string;
}
