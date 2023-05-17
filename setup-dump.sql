-- Table Definition
CREATE TABLE "public"."apps" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" timestamptz DEFAULT now(),
    "owner" uuid,
    "name" text NOT NULL,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."events" (
    "id" int8 NOT NULL,
    "timestamp" timestamptz DEFAULT now(),
    "app" uuid NOT NULL,
    "message" text,
    "history" _jsonb,
    "type" text,
    "convo" uuid,
    "tags" _text,
    "model" text,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL,
    "updated_at" timestamptz,
    PRIMARY KEY ("id")
);

ALTER TABLE "public"."apps" ADD FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE "public"."events" ADD FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE CASCADE;
ALTER TABLE "public"."profiles" ADD FOREIGN KEY ("id") REFERENCES "auth"."users"("id");


-- DROP materialized view convos;

CREATE MATERIALIZED VIEW convos AS 
SELECT 
    convo as id,
    app,
    COUNT(*) FILTER (WHERE type LIKE '%:message%') AS messages,
    (SELECT ARRAY_AGG(DISTINCT u_tag) FROM (SELECT unnest(tags) AS u_tag FROM events e2 WHERE e2.convo = e1.convo) sub) AS tags,
    COUNT(*) FILTER (WHERE type = 'llm:call') AS calls,
    MIN(timestamp) AS start,
    MAX(timestamp) AS end,
    (SELECT message FROM events e2 WHERE e2.convo = e1.convo AND e2.type = 'user:message' ORDER BY timestamp LIMIT 1) AS first_message
FROM 
    events e1
GROUP BY 
    convo, app;

-- Set up the auto refresh 
CREATE extension IF NOT EXISTS pg_cron;

SELECT
  cron.schedule(
    'refresh-every-fifteen',
    '*/15 * * * *', -- every 15 minutes
    $$
        REFRESH MATERIALIZED VIEW convos;
    $$
  );

