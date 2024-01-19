import * as Sentry from "@sentry/bun"

Sentry.init({
  dsn: "https://39824297fdaaaa06ab62a4d077cdfc8b@o4506599397588992.ingest.sentry.io/4506599400407040",

  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
})

export default Sentry
