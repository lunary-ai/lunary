import { serverFetcher } from "./server"

// Allows to load the fetcher only when window is defined to prevent next errors it runs the code on the server
export const fetcher =
  typeof window === "undefined"
    ? serverFetcher
    : await import("./client").then((module) => module.clientFetcher)
