import { setTimeout } from "node:timers/promises";
import { TimeoutError } from "./errors";

export async function withTimeout<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  ms: number,
  errorMessage: string = "Function execution timeout",
) {
  const timeoutPromise = setTimeout(ms).then(() => {
    throw new TimeoutError(errorMessage);
  });

  return Promise.race([asyncFn(), timeoutPromise]);
}
