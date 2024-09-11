import { protos, DatastreamClient } from "@google-cloud/datastream";
import { parse as parseUrl } from "url";
import fs from "fs";
import Context from "@/src/utils/koa";
import sql from "@/src/utils/db";
import { BigQuery } from "@google-cloud/bigquery";

type ConnectionProfile = protos.google.cloud.datastream.v1.IConnectionProfile;

interface ParsedPostgresUri {
  hostname: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

function parsePostgresUri(uri: string): ParsedPostgresUri {
  const parsed = parseUrl(uri);

  if (!parsed.hostname || !parsed.auth || !parsed.pathname) {
    throw new Error("Invalid PostgreSQL connection URI");
  }

  const [username, password] = parsed.auth.split(":");

  if (!username || !password) {
    throw new Error("Username or password is missing from the URI");
  }

  return {
    hostname: parsed.hostname,
    port: parseInt(parsed.port, 10),
    username,
    password,
    database: parsed.pathname.slice(1),
  };
}

function createBigQueryConnectionProfile(
  displayName: string,
): ConnectionProfile {
  const connectionProfile: ConnectionProfile = {
    displayName: displayName,
    bigqueryProfile: {},
    staticServiceIpConnectivity: {},
  };

  return connectionProfile;
}

type PostgresqlSourceConfig =
  protos.google.cloud.datastream.v1.IPostgresqlSourceConfig;

type BigQueryDestinationConfig =
  protos.google.cloud.datastream.v1.IBigQueryDestinationConfig;

type Stream = protos.google.cloud.datastream.v1.IStream;

const location = "us-east1";

export async function createNewDatastream(
  apiKey: string,
  postgresURI: string,
  ctx: Context,
) {
  const projectId = apiKey.project_id as string;

  const datastreamClient = new DatastreamClient({
    credentials: apiKey,
    projectId,
  });

  const parsedUri = parsePostgresUri(postgresURI);

  const postgresConnectionProfile: ConnectionProfile = {
    displayName: "Lunary Data Warehouse Source",
    postgresqlProfile: {
      hostname: parsedUri.hostname,
      port: parsedUri.port || 5432,
      username: parsedUri.username,
      password: parsedUri.password,
      database: parsedUri.database,
    },
    staticServiceIpConnectivity: {},
  };

  const request1 = {
    parent: datastreamClient.locationPath(projectId, location),
    connectionProfileId: "lunary-data-warehouse-source",
    connectionProfile: postgresConnectionProfile,
  };

  try {
    await sql`revoke all privileges on all tables in schema public from lunary_bigquery_connector`;
    await sql`revoke all privileges on schema public from lunary_bigquery_connector`;
    await sql`revoke all privileges on all sequences in schema public from lunary_bigquery_connector`;
    await sql`revoke all privileges on all functions in schema public from lunary_bigquery_connector`;
    await sql`alter default privileges in schema public revoke all on tables from lunary_bigquery_connector`;
    await sql`alter default privileges in schema public revoke all on sequences from lunary_bigquery_connector`;
    await sql`alter default privileges in schema public revoke all on functions from lunary_bigquery_connector`;
    await sql`drop publication if exists lunary_bigquery_connector`;
    await sql`select pg_drop_replication_slot('lunary_bigquery_connector')`.catch(
      console.error,
    );
    await sql`drop user if exists lunary_bigquery_connector`;

    await sql`create publication lunary_bigquery_connector for all tables`;
    await sql`select pg_create_logical_replication_slot('lunary_bigquery_connector', 'pgoutput')`;
    await sql.unsafe(
      `create user lunary_bigquery_connector with encrypted password '${process.env.JWT_SECRET}'`,
    );
    await sql`grant select on all tables in schema public to lunary_bigquery_connector`;
    await sql`grant usage on schema public to lunary_bigquery_connector`;
    await sql`alter default privileges in schema public grant select on tables to lunary_bigquery_connector`;
    await sql`grant rds_replication to lunary_bigquery_connector`.catch(
      () => {},
    );
  } catch (error) {
    console.error(error);
    ctx.throw(
      500,
      "Could not configure the PostgreSQL source database. Have you read the tutorial at https://lunary.ai/docs/enterprise/bigquery#setup-postgtresl-source",
    );
  }

  await sql`grant RDS_REPLICATION to lunary_bigquery_connector`.catch(() => {});

  // TODO: delete connections and stream if they already exist

  try {
    const [operation1] =
      await datastreamClient.createConnectionProfile(request1);
    const [response1] = await operation1.promise();
  } catch (error) {
    if (error.code === 6) {
      console.info("Source Connection already exists. Skipping.");
    } else {
      throw error;
    }
  }

  const bigQueryConnectionProfile = createBigQueryConnectionProfile(
    "Lunary Data Warehouse Destination",
  );

  const request2 = {
    parent: datastreamClient.locationPath(apiKey.project_id, location),
    connectionProfileId: "lunary-data-warehouse-destination",
    connectionProfile: bigQueryConnectionProfile,
  };

  try {
    const [operation2] =
      await datastreamClient.createConnectionProfile(request2);
    const [response2] = await operation2.promise();
  } catch (error) {
    if (error.code === 6) {
      console.info("Destination Connection already exists. Skipping.");
    } else {
      throw error;
    }
  }

  const postgresSourceConfig: PostgresqlSourceConfig = {
    includeObjects: {
      postgresqlSchemas: [{ schema: "public" }],
    },
    replicationSlot: "lunary_bigquery_connector",
    publication: "lunary_bigquery_connector",
  };

  const bigqueryDestinationConfig: BigQueryDestinationConfig = {
    dataFreshness: { seconds: 300 },
    singleTargetDataset: {
      datasetId: `${projectId}:lunary`,
    },
  };

  const bigquery = new BigQuery({
    credentials: apiKey,
    projectId,
  });

  try {
    await bigquery.createDataset("lunary", {
      location: "US",
    });
  } catch (error) {
    if (error.code === 403) {
      ctx.throw(500, "You do not have the suh");
    }
    console.error(error);
    console.info("Dataset already exist. Skipping");
  }

  const streamConfig: Stream = {
    sourceConfig: {
      sourceConnectionProfile: `projects/${projectId}/locations/${location}/connectionProfiles/lunary-data-warehouse-source`,
      postgresqlSourceConfig: postgresSourceConfig,
    },
    destinationConfig: {
      destinationConnectionProfile: `projects/${projectId}/locations/${location}/connectionProfiles/lunary-data-warehouse-destination`,
      bigqueryDestinationConfig: bigqueryDestinationConfig,
    },
    displayName: `PostgreSQL to BigQuery Stream`,
    backfillAll: {},
  };

  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    streamId: "lunary-data-warehouse-stream",
    stream: streamConfig,
  };

  const [operation] = await datastreamClient.createStream(request);
  console.log(`Stream creation initiated. Operation name: ${operation.name}`);

  const [response] = await operation.promise();
  console.log("Stream created successfully:", response);

  if (typeof operation.result?.name !== "string") {
    throw new Error("Stream creation failed:", response);
  }

  const updateStreamRequest = {
    stream: {
      name: operation.result.name,
      state: protos.google.cloud.datastream.v1.Stream.State.RUNNING,
    },
    updateMask: {
      paths: ["state"],
    },
  };

  const [updateOperation] =
    await datastreamClient.updateStream(updateStreamRequest);
  console.log(
    `Stream update initiated. Operation name: ${updateOperation.name}`,
  );
  await sql`
    insert into _data_warehouse_connector (project_id, type, status) 
    values (${ctx.state.projectId}, 'BigQuery', 'created')
    on conflict (project_id) 
    do update set type = 'BigQuery', status = 'created', updated_at = now()
  `;
}
