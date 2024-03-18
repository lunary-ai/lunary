export const serverFetcher = {
  get: () => Promise.reject(new Error("Cannot make requests on the server.")),
  getFile: () =>
    Promise.reject(new Error("Cannot make requests on the server.")),
  getText: () =>
    Promise.reject(new Error("Cannot make requests on the server.")),
  getStream: () =>
    Promise.reject(new Error("Cannot make requests on the server.")),
  post: () => Promise.reject(new Error("Cannot make requests on the server.")),
  patch: () => Promise.reject(new Error("Cannot make requests on the server.")),
  delete: () =>
    Promise.reject(new Error("Cannot make requests on the server.")),
}
