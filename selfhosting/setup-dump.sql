-- Table Definition
CREATE TABLE IF NOT EXISTS "public"."app" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now(),
    "owner" uuid,
    "name" text NOT NULL
);

-- Table Definition
CREATE TABLE IF NOT EXISTS "public"."event" (
    "id" int8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "timestamp" timestamptz DEFAULT now(),
    "app" uuid NOT NULL,
    "message" text,
    "history" _jsonb,
    "extra" jsonb,
    "type" text,
    "convo" uuid,
    "model" text
);

-- Table Definition
CREATE TABLE IF NOT EXISTS "public"."profile" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "updated_at" timestamptz
);


CREATE TABLE IF NOT EXISTS "public"."convo" (
    "id" uuid NOT NULL PRIMARY KEY,
    "created_at" timestamptz DEFAULT now(),
    "app" uuid NOT NULL,
    "tags" _text
);

ALTER TABLE "public"."app" ADD FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."event" ADD FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;
ALTER TABLE "public"."event" ADD FOREIGN KEY ("convo") REFERENCES "public"."convo"("id") ON DELETE CASCADE;

ALTER TABLE "public"."convo" ADD FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;


ALTER TABLE "public"."profile" ADD FOREIGN KEY ("id") REFERENCES "auth"."users"("id");


CREATE OR REPLACE FUNCTION public.upsert_convo(_id uuid, _app uuid, _tags text[]) RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO convo (id, app, tags)
    VALUES (_id, _app, _tags)
    ON CONFLICT (id) DO NOTHING;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_convos(_app uuid, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, app uuid, tags text[], messages bigint, calls bigint, start timestamp with time zone, "end" timestamp with time zone, first_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        convo.id as id,
        convo.app as app,
        convo.tags as tags,
        count(*) filter (where type like '%:message%') as messages,
        count(*) filter (where type = 'llm:call') as calls, 
        min(timestamp) as "start", 
        max(timestamp) as "end",
        (select message from event where convo = convo.id order by timestamp limit 1) as first_message
    FROM 
        convo
        LEFT JOIN event e1 on e1.convo = convo.id
    WHERE 
        convo.app = _app
    GROUP BY
        convo.id, convo.app
    ORDER BY start DESC
    LIMIT 100 OFFSET _offset;
END;
$function$

