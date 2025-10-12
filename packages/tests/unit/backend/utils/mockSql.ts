import { mock } from "bun:test";

type SqlResult = unknown[] | Promise<unknown[]>;
type SqlResolver = (query: string, values: unknown[]) => SqlResult;

const sqlCalls: { query: string; values: unknown[] }[] = [];

let resolver: SqlResolver = () => [];

function isTemplateLiteralArg(
  candidate: any,
): candidate is TemplateStringsArray {
  return (
    Array.isArray(candidate) &&
    Object.prototype.hasOwnProperty.call(candidate, "raw")
  );
}

mock.module("@/src/utils/db", () => ({
  default: ((
    first: TemplateStringsArray | Record<string, unknown>,
    ...values: unknown[]
  ) => {
    if (!isTemplateLiteralArg(first)) {
      // Support helper usages like sql(objectLiteral)
      return first;
    }

    const query = (first as readonly string[]).join("?");
    const result = resolver(query, values);
    sqlCalls.push({ query, values });
    return Promise.resolve(result);
  }) as any,
}));

export function setSqlResolver(nextResolver: SqlResolver) {
  resolver = nextResolver;
}

export function resetSqlMock() {
  sqlCalls.length = 0;
  resolver = () => [];
}

export function getSqlCalls() {
  return [...sqlCalls];
}
