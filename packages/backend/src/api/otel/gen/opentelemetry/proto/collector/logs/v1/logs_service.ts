// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.7.5
//   protoc               v5.29.3
// source: opentelemetry/proto/collector/logs/v1/logs_service.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { ResourceLogs } from "../../../logs/v1/logs.ts";

export const protobufPackage = "opentelemetry.proto.collector.logs.v1";

export interface ExportLogsServiceRequest {
  /**
   * An array of ResourceLogs.
   *
   *
   *
   * For data coming from a single resource this array will typically contain one
   * element. Intermediary nodes (such as OpenTelemetry Collector) that receive
   * data from multiple origins typically batch the data before forwarding further and
   * in that case this array will contain multiple elements.
   */
  resourceLogs: ResourceLogs[];
}

export interface ExportLogsServiceResponse {
  /**
   * The details of a partially successful export request.
   *
   * If the request is only partially accepted
   * (i.e. when the server accepts only parts of the data and rejects the rest)
   * the server MUST initialize the `partial_success` field and MUST
   * set the `rejected_<signal>` with the number of items it rejected.
   *
   * Servers MAY also make use of the `partial_success` field to convey
   * warnings/suggestions to senders even when the request was fully accepted.
   * In such cases, the `rejected_<signal>` MUST have a value of `0` and
   * the `error_message` MUST be non-empty.
   *
   * A `partial_success` message with an empty value (rejected_<signal> = 0 and
   * `error_message` = "") is equivalent to it not being set/present. Senders
   * SHOULD interpret it the same way as in the full success case.
   */
  partialSuccess?: ExportLogsPartialSuccess | undefined;
}

export interface ExportLogsPartialSuccess {
  /**
   * The number of rejected log records.
   *
   * A `rejected_<signal>` field holding a `0` value indicates that the
   * request was fully accepted.
   */
  rejectedLogRecords: bigint;
  /**
   * A developer-facing human-readable message in English. It should be used
   * either to explain why the server rejected parts of the data during a partial
   * success or to convey warnings/suggestions during a full success. The message
   * should offer guidance on how users can address such issues.
   *
   * error_message is an optional field. An error_message with an empty value
   * is equivalent to it not being set.
   */
  errorMessage: string;
}

function createBaseExportLogsServiceRequest(): ExportLogsServiceRequest {
  return { resourceLogs: [] };
}

export const ExportLogsServiceRequest: MessageFns<ExportLogsServiceRequest> = {
  encode(
    message: ExportLogsServiceRequest,
    writer: BinaryWriter = new BinaryWriter(),
  ): BinaryWriter {
    for (const v of message.resourceLogs) {
      ResourceLogs.encode(v!, writer.uint32(10).fork()).join();
    }
    return writer;
  },

  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ExportLogsServiceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportLogsServiceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.resourceLogs.push(
            ResourceLogs.decode(reader, reader.uint32()),
          );
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportLogsServiceRequest {
    return {
      resourceLogs: globalThis.Array.isArray(object?.resourceLogs)
        ? object.resourceLogs.map((e: any) => ResourceLogs.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ExportLogsServiceRequest): unknown {
    const obj: any = {};
    if (message.resourceLogs?.length) {
      obj.resourceLogs = message.resourceLogs.map((e) =>
        ResourceLogs.toJSON(e),
      );
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportLogsServiceRequest>, I>>(
    base?: I,
  ): ExportLogsServiceRequest {
    return ExportLogsServiceRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportLogsServiceRequest>, I>>(
    object: I,
  ): ExportLogsServiceRequest {
    const message = createBaseExportLogsServiceRequest();
    message.resourceLogs =
      object.resourceLogs?.map((e) => ResourceLogs.fromPartial(e)) || [];
    return message;
  },
};

function createBaseExportLogsServiceResponse(): ExportLogsServiceResponse {
  return { partialSuccess: undefined };
}

export const ExportLogsServiceResponse: MessageFns<ExportLogsServiceResponse> =
  {
    encode(
      message: ExportLogsServiceResponse,
      writer: BinaryWriter = new BinaryWriter(),
    ): BinaryWriter {
      if (message.partialSuccess !== undefined) {
        ExportLogsPartialSuccess.encode(
          message.partialSuccess,
          writer.uint32(10).fork(),
        ).join();
      }
      return writer;
    },

    decode(
      input: BinaryReader | Uint8Array,
      length?: number,
    ): ExportLogsServiceResponse {
      const reader =
        input instanceof BinaryReader ? input : new BinaryReader(input);
      const end = length === undefined ? reader.len : reader.pos + length;
      const message = createBaseExportLogsServiceResponse();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 10) {
              break;
            }

            message.partialSuccess = ExportLogsPartialSuccess.decode(
              reader,
              reader.uint32(),
            );
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    },

    fromJSON(object: any): ExportLogsServiceResponse {
      return {
        partialSuccess: isSet(object.partialSuccess)
          ? ExportLogsPartialSuccess.fromJSON(object.partialSuccess)
          : undefined,
      };
    },

    toJSON(message: ExportLogsServiceResponse): unknown {
      const obj: any = {};
      if (message.partialSuccess !== undefined) {
        obj.partialSuccess = ExportLogsPartialSuccess.toJSON(
          message.partialSuccess,
        );
      }
      return obj;
    },

    create<I extends Exact<DeepPartial<ExportLogsServiceResponse>, I>>(
      base?: I,
    ): ExportLogsServiceResponse {
      return ExportLogsServiceResponse.fromPartial(base ?? ({} as any));
    },
    fromPartial<I extends Exact<DeepPartial<ExportLogsServiceResponse>, I>>(
      object: I,
    ): ExportLogsServiceResponse {
      const message = createBaseExportLogsServiceResponse();
      message.partialSuccess =
        object.partialSuccess !== undefined && object.partialSuccess !== null
          ? ExportLogsPartialSuccess.fromPartial(object.partialSuccess)
          : undefined;
      return message;
    },
  };

function createBaseExportLogsPartialSuccess(): ExportLogsPartialSuccess {
  return { rejectedLogRecords: 0n, errorMessage: "" };
}

export const ExportLogsPartialSuccess: MessageFns<ExportLogsPartialSuccess> = {
  encode(
    message: ExportLogsPartialSuccess,
    writer: BinaryWriter = new BinaryWriter(),
  ): BinaryWriter {
    if (message.rejectedLogRecords !== 0n) {
      if (
        BigInt.asIntN(64, message.rejectedLogRecords) !==
        message.rejectedLogRecords
      ) {
        throw new globalThis.Error(
          "value provided for field message.rejectedLogRecords of type int64 too large",
        );
      }
      writer.uint32(8).int64(message.rejectedLogRecords);
    }
    if (message.errorMessage !== "") {
      writer.uint32(18).string(message.errorMessage);
    }
    return writer;
  },

  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ExportLogsPartialSuccess {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportLogsPartialSuccess();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.rejectedLogRecords = reader.int64() as bigint;
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.errorMessage = reader.string();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportLogsPartialSuccess {
    return {
      rejectedLogRecords: isSet(object.rejectedLogRecords)
        ? BigInt(object.rejectedLogRecords)
        : 0n,
      errorMessage: isSet(object.errorMessage)
        ? globalThis.String(object.errorMessage)
        : "",
    };
  },

  toJSON(message: ExportLogsPartialSuccess): unknown {
    const obj: any = {};
    if (message.rejectedLogRecords !== 0n) {
      obj.rejectedLogRecords = message.rejectedLogRecords.toString();
    }
    if (message.errorMessage !== "") {
      obj.errorMessage = message.errorMessage;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportLogsPartialSuccess>, I>>(
    base?: I,
  ): ExportLogsPartialSuccess {
    return ExportLogsPartialSuccess.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportLogsPartialSuccess>, I>>(
    object: I,
  ): ExportLogsPartialSuccess {
    const message = createBaseExportLogsPartialSuccess();
    message.rejectedLogRecords = object.rejectedLogRecords ?? 0n;
    message.errorMessage = object.errorMessage ?? "";
    return message;
  },
};

/**
 * Service that can be used to push logs between one Application instrumented with
 * OpenTelemetry and an collector, or between an collector and a central collector (in this
 * case logs are sent/received to/from multiple Applications).
 */
export interface LogsService {
  Export(request: ExportLogsServiceRequest): Promise<ExportLogsServiceResponse>;
}

export const LogsServiceServiceName =
  "opentelemetry.proto.collector.logs.v1.LogsService";
export class LogsServiceClientImpl implements LogsService {
  private readonly rpc: Rpc;
  private readonly service: string;
  constructor(rpc: Rpc, opts?: { service?: string }) {
    this.service = opts?.service || LogsServiceServiceName;
    this.rpc = rpc;
    this.Export = this.Export.bind(this);
  }
  Export(
    request: ExportLogsServiceRequest,
  ): Promise<ExportLogsServiceResponse> {
    const data = ExportLogsServiceRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, "Export", data);
    return promise.then((data) =>
      ExportLogsServiceResponse.decode(new BinaryReader(data)),
    );
  }
}

interface Rpc {
  request(
    service: string,
    method: string,
    data: Uint8Array,
  ): Promise<Uint8Array>;
}

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | bigint
  | undefined;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends globalThis.Array<infer U>
    ? globalThis.Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : T extends {}
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
