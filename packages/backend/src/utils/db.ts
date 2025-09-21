import postgres from "postgres";
import ssh2 from "ssh2";

const isProduction = process.env.NODE_ENV === "production";

const options = {
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  transform: {
    ...postgres.camel,
    undefined: null,
  },
  types: {
    bigint: {
      ...postgres.BigInt,

      // Convert Postgres BIGINT to JS Number
      // Postgres BIGINT range: -9_223_372_036_854_775_808 to 9_223_372_036_854_775_807
      // JS Number.MAX_SAFE_INTEGER: 9_007_199_254_740_991
      // Values outside JS safe range will be capped at +/- Infinity, because above Number.MAX_SAFE_INTEGER there are rounding approximations
      parse: (x: string) => {
        const number = Number(x);
        if (!Number.isSafeInteger(number)) {
          return Infinity;
        }
        return number;
      },
    },
  },
  max: isProduction ? 100 : 50,
  connection: {
    application_name: `backend-${isProduction ? "production" : "development"}-${new Date().getTime()}`,
  },
  debug: process.env.LUNARY_DB_DEBUG ? debugFn : () => {},
  onnotice: process.env.LUNARY_DB_DEBUG ? console.warn : () => {},
};

if (process.env.NODE_ENV === "development") {
  console.log("Using SSH tunnel for database connection");
  const privateKey = await Bun.file(process.env.SSH_PRIVATE_KEY_PATH!).text();
  options.socket = ({
    host: [host],
    port: [port],
  }: {
    host: string;
    port: number;
  }) =>
    new Promise((resolve, reject) => {
      const ssh = new ssh2.Client();
      ssh
        .on("error", (error) => {
          console.log("SSH connection error:", error);
          reject(error);
        })
        .on("ready", () =>
          ssh.forwardOut("127.0.0.1", 12345, host, port, (err, socket) =>
            err ? reject(err) : resolve(socket),
          ),
        )
        .connect({
          host: "88.198.48.232",
          port: 3855,
          username: "root",
          privateKey,
        });
    });
}

const sql = postgres(process.env.DATABASE_URL!, options);

function debugFn(
  connection: number,
  query: string,
  parameters: any[],
  paramTypes: any[],
) {
  for (let i = parameters.length - 1; i >= 0; i--) {
    const value =
      parameters[i] == null
        ? "null"
        : `'${String(parameters[i]).replace(/'/g, "''")}'`;

    const re = new RegExp(`\\$${i + 1}(?!\\d)`, "g");
    query = query.replace(re, value);
  }

  console.debug("connection:", connection);
  console.debug("query:\n", query, "\n");
  console.debug("parameters:", parameters);
  console.debug("paramTypes:", paramTypes);
  console.debug("-----\n");
}

export async function checkDbConnection() {
  try {
    await sql`select 1`;
    console.info("✅ Connected to database");
  } catch (error) {
    console.error("❌ Could not connect to database");
    process.exit(1);
  }
}

export default sql;
