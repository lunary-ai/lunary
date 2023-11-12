
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."org_plan" AS ENUM (
    'free',
    'pro',
    'unlimited'
);

ALTER TYPE "public"."org_plan" OWNER TO "postgres";

CREATE TYPE "public"."user_role" AS ENUM (
    'member',
    'admin'
);

ALTER TYPE "public"."user_role" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_model_names"("app_id" "uuid") RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    AS $$
begin
	return QUERY
	select 
		name
	from
		run
	where
		type = 'llm'
		and app = app_id
		and name is not null
	group by
		name;
end;
$$;

ALTER FUNCTION "public"."get_model_names"("app_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_related_runs"("run_id" "uuid") RETURNS TABLE("created_at" timestamp with time zone, "tags" "text"[], "app" "uuid", "id" "uuid", "status" "text", "name" "text", "ended_at" timestamp with time zone, "error" "jsonb", "input" "jsonb", "output" "jsonb", "params" "jsonb", "type" "text", "parent_run" "uuid", "completion_tokens" integer, "prompt_tokens" integer, "feedback" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE related_runs AS (
        SELECT r1.*
        FROM run r1
        WHERE r1.id = run_id

        UNION ALL

        SELECT r2.*
        FROM run r2
        INNER JOIN related_runs rr ON rr.id = r2.parent_run
    )
    SELECT rr.created_at, rr.tags, rr.app, rr.id, rr.status, rr.name, rr.ended_at, rr.error, rr.input, rr.output, 
           rr.params, rr.type, rr.parent_run, rr.completion_tokens, rr.prompt_tokens, rr.feedback
    FROM related_runs rr;
END; $$;

ALTER FUNCTION "public"."get_related_runs"("run_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."run" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tags" "text"[],
    "app" "uuid",
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "status" "text",
    "name" "text",
    "ended_at" timestamp with time zone,
    "error" "jsonb",
    "input" "jsonb",
    "output" "jsonb",
    "params" "jsonb",
    "type" "text" NOT NULL,
    "parent_run" "uuid",
    "completion_tokens" integer,
    "prompt_tokens" integer,
    "user" bigint,
    "feedback" "jsonb",
    "retry_of" "uuid"
);

ALTER TABLE "public"."run" OWNER TO "supabase_admin";

CREATE OR REPLACE FUNCTION "public"."get_runs"("search_pattern" "text") RETURNS SETOF "public"."run"
    LANGUAGE "plpgsql"
    AS $$
declare
	search_query TEXT := '%' || search_pattern || '%';
begin
	return QUERY
	select
		r.*
	from
		run as r
where
	type = 'llm'
	AND (r.input::TEXT ilike search_query
		or r.output::TEXT ilike search_query
		or r.error::TEXT ilike search_query
		)
order by
	r.created_at desc;
end;
$$;

ALTER FUNCTION "public"."get_runs"("search_pattern" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_runs"("app_id" "uuid", "search_pattern" "text") RETURNS SETOF "public"."run"
    LANGUAGE "plpgsql"
    AS $$
declare
	search_query TEXT := '%' || search_pattern || '%';
begin
	return QUERY
	select
		r.*
	from
		run as r
where
	type = 'llm'
	and r.app = app_id
	AND (r.input::TEXT ilike search_query
		or r.output::TEXT ilike search_query
		or r.error::TEXT ilike search_query
		)
order by
	r.created_at desc;
end;
$$;

ALTER FUNCTION "public"."get_runs"("app_id" "uuid", "search_pattern" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_runs_usage"("app_id" "uuid", "days" integer, "user_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("name" "text", "type" "text", "completion_tokens" bigint, "prompt_tokens" bigint, "errors" bigint, "success" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        run.name,
        run.type,
        COALESCE(SUM(run.completion_tokens), 0) AS completion_tokens,
        COALESCE(SUM(run.prompt_tokens), 0) AS prompt_tokens,
        SUM(CASE WHEN run.status = 'error' THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN run.status = 'success' THEN 1 ELSE 0 END) AS success
    FROM 
        run
    WHERE 
        run.app = app_id AND
        run.created_at >= NOW() - INTERVAL '1 day' * days AND
        (user_id IS NULL OR run.user = user_id)  AND
    	(run.type != 'agent' OR run.parent_run IS NULL)
GROUP BY
        run.name, run.type;
END; $$;

ALTER FUNCTION "public"."get_runs_usage"("app_id" "uuid", "days" integer, "user_id" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_runs_usage_by_user"("app_id" "uuid", "days" integer DEFAULT NULL::integer) RETURNS TABLE("user_id" bigint, "name" "text", "type" "text", "completion_tokens" bigint, "prompt_tokens" bigint, "errors" bigint, "success" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    run.user AS user_id,
    run.name,
    run.type,
    COALESCE(SUM(run.completion_tokens), 0) AS completion_tokens,
    COALESCE(SUM(run.prompt_tokens), 0) AS prompt_tokens,
    SUM(CASE WHEN run.status = 'error' THEN 1 ELSE 0 END) AS errors,
    SUM(CASE WHEN run.status = 'success' THEN 1 ELSE 0 END) AS success
  FROM 
    run
  WHERE 
    run.app = app_id AND
    (
      days IS NULL OR
      run.created_at >= NOW() - INTERVAL '1 day' * days
    ) AND
    (run.type != 'agent' OR run.parent_run IS NULL)
  GROUP BY
    user_id, run.name, run.type;
END;
$$;

ALTER FUNCTION "public"."get_runs_usage_by_user"("app_id" "uuid", "days" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_runs_usage_daily"("app_id" "uuid", "days" integer, "user_id" integer DEFAULT NULL::integer) RETURNS TABLE("date" "date", "name" "text", "type" "text", "completion_tokens" bigint, "prompt_tokens" bigint, "errors" bigint, "success" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        DATE(run.created_at) AS date,
        run.name,
        run.type,
        COALESCE(SUM(run.completion_tokens), 0) AS completion_tokens,
        COALESCE(SUM(run.prompt_tokens), 0) AS prompt_tokens,
        SUM(CASE WHEN run.status = 'error' THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN run.status = 'success' THEN 1 ELSE 0 END) AS success
    FROM 
        run
    WHERE 
        run.app = app_id AND
        run.created_at >= NOW() - INTERVAL '1 day' * days AND
        (user_id IS NULL OR run.user = user_id) AND
    	(run.type != 'agent' OR run.parent_run IS NULL)
    GROUP BY
        date, run.name, run.type;
END; $$;

ALTER FUNCTION "public"."get_runs_usage_daily"("app_id" "uuid", "days" integer, "user_id" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_tags"("app_id" "uuid") RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    AS $$
begin
	return QUERY
	select distinct unnest(tags)
	from
		run
	where
		type = 'llm'
		and app = app_id;
end;
$$;

ALTER FUNCTION "public"."get_tags"("app_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_trace_runs_roots"("search_pattern" "text") RETURNS SETOF "public"."run"
    LANGUAGE "plpgsql"
    AS $$
declare
	search_query TEXT := '%' || search_pattern || '%';
begin
	return QUERY
	select
		r.*
	from
		run as r
where
	type = 'agent'
	AND (r.input::TEXT ilike search_query
		or r.output::TEXT ilike search_query
		or r.error::TEXT ilike search_query
		)
	and parent_run is null
order by
	r.created_at desc;
end;
$$;

ALTER FUNCTION "public"."get_trace_runs_roots"("search_pattern" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_users"("app_id" "uuid") RETURNS SETOF character varying
    LANGUAGE "plpgsql"
    AS $$
begin
	return QUERY
	select
		u.external_id
	from
		run r
		left join app_user u on u.app = r.app
	where
		type = 'llm'
		and r.app = app_id
	group by 
		u.external_id;
end;
$$;

ALTER FUNCTION "public"."get_users"("app_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."api_key" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "api_key" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."api_key" OWNER TO "supabase_admin";

ALTER TABLE "public"."api_key" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."api_key_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."app" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner" "uuid",
    "name" "text" NOT NULL,
    "org_id" "uuid"
);

ALTER TABLE "public"."app" OWNER TO "supabase_admin";

CREATE TABLE IF NOT EXISTS "public"."app_user" (
    "id" bigint NOT NULL,
    "app" "uuid",
    "external_id" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_seen" timestamp with time zone,
    "props" "jsonb"
);

ALTER TABLE "public"."app_user" OWNER TO "supabase_admin";

ALTER TABLE "public"."app_user" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."app_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."log" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message" "text",
    "level" "text",
    "extra" "jsonb",
    "app" "uuid" NOT NULL,
    "run" "uuid"
);

ALTER TABLE "public"."log" OWNER TO "supabase_admin";

CREATE TABLE IF NOT EXISTS "public"."org" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "plan" "public"."org_plan" NOT NULL,
    "play_allowance" integer DEFAULT 3 NOT NULL,
    "stripe_customer" "text",
    "stripe_subscription" "text",
    "limited" boolean DEFAULT false NOT NULL,
    "api_key" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL
);

ALTER TABLE "public"."org" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profile" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "team_owner" "uuid",
    "stripe_customer" "text",
    "stripe_subscription" "text",
    "limited" boolean,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "play_allowance" integer DEFAULT 10 NOT NULL,
    "org_id" "uuid",
    "role" "public"."user_role"
);

ALTER TABLE "public"."profile" OWNER TO "supabase_admin";

ALTER TABLE ONLY "public"."api_key"
    ADD CONSTRAINT "api_key_api_key_key" UNIQUE ("api_key");

ALTER TABLE ONLY "public"."api_key"
    ADD CONSTRAINT "api_key_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."app"
    ADD CONSTRAINT "app_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."log"
    ADD CONSTRAINT "log_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."org"
    ADD CONSTRAINT "org_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "unique_id_by_app" UNIQUE ("app", "external_id");

CREATE INDEX "app_org_id_idx" ON "public"."app" USING "btree" ("org_id");

CREATE INDEX "app_user_app_last_seen_idx" ON "public"."app_user" USING "btree" ("app", "last_seen" DESC);

CREATE INDEX "app_user_lower_idx" ON "public"."app_user" USING "gin" ("lower"(("external_id")::"text") "public"."gin_trgm_ops");

CREATE INDEX "app_user_lower_idx1" ON "public"."app_user" USING "gin" ("lower"(("props")::"text") "public"."gin_trgm_ops");

CREATE INDEX "app_user_lower_idx2" ON "public"."app_user" USING "gin" ("lower"(("external_id")::"text") "public"."gin_trgm_ops");

CREATE INDEX "app_user_lower_idx3" ON "public"."app_user" USING "gin" ("lower"(("props")::"text") "public"."gin_trgm_ops");

CREATE INDEX "idx_run_parent_run" ON "public"."run" USING "btree" ("parent_run");

CREATE INDEX "profile_org_id_idx" ON "public"."profile" USING "btree" ("org_id");

CREATE INDEX "run_app_type_created_at_idx" ON "public"."run" USING "btree" ("app", "type", "created_at" DESC);

CREATE INDEX "run_lower_idx" ON "public"."run" USING "gin" ("lower"(("input")::"text") "public"."gin_trgm_ops");

CREATE INDEX "run_lower_idx1" ON "public"."run" USING "gin" ("lower"(("output")::"text") "public"."gin_trgm_ops");

CREATE INDEX "run_lower_idx2" ON "public"."run" USING "gin" ("lower"("name") "public"."gin_trgm_ops");

ALTER TABLE ONLY "public"."api_key"
    ADD CONSTRAINT "api_key_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."profile"("id");

ALTER TABLE ONLY "public"."app"
    ADD CONSTRAINT "app_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id");

ALTER TABLE ONLY "public"."app"
    ADD CONSTRAINT "app_owner_fkey" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."app"
    ADD CONSTRAINT "app_owner_fkey1" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."log"
    ADD CONSTRAINT "log_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."app"("id");

ALTER TABLE ONLY "public"."log"
    ADD CONSTRAINT "log_app_fkey1" FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."log"
    ADD CONSTRAINT "log_run_fkey" FOREIGN KEY ("run") REFERENCES "public"."run"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."log"
    ADD CONSTRAINT "log_run_fkey1" FOREIGN KEY ("run") REFERENCES "public"."run"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_id_fkey1" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id");

ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_team_owner_fkey" FOREIGN KEY ("team_owner") REFERENCES "public"."profile"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_app_fkey1" FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_parent_run_fkey" FOREIGN KEY ("parent_run") REFERENCES "public"."run"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_parent_run_fkey1" FOREIGN KEY ("parent_run") REFERENCES "public"."run"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_retry_of_fkey" FOREIGN KEY ("retry_of") REFERENCES "public"."run"("id");

ALTER TABLE ONLY "public"."run"
    ADD CONSTRAINT "run_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."app_user"("id") ON DELETE SET NULL;

CREATE POLICY "Profiles are viewable by users who created them." ON "public"."profile" FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON "public"."profile" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can update own profile." ON "public"."profile" FOR UPDATE USING (("auth"."uid"() = "id"));

ALTER TABLE "public"."api_key" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_key_policy" ON "public"."api_key" USING ((("auth"."uid"() = "org_id") OR ("org_id" = ( SELECT "profile"."team_owner"
   FROM "public"."profile"
  WHERE ("profile"."id" = "auth"."uid"())))));

ALTER TABLE "public"."app" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_owner_policy" ON "public"."app" USING ((("auth"."uid"() = "owner") OR ("owner" = ( SELECT "profile"."team_owner"
   FROM "public"."profile"
  WHERE ("profile"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."profile"
  WHERE (("profile"."id" = "auth"."uid"()) AND ("profile"."org_id" = "app"."org_id"))))));

ALTER TABLE "public"."app_user" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_user_owner_policy" ON "public"."app_user" USING (((( SELECT "app"."owner"
   FROM "public"."app"
  WHERE ("app"."id" = "app_user"."app")) = "auth"."uid"()) OR (( SELECT "app"."owner"
   FROM "public"."app"
  WHERE ("app"."id" = "app_user"."app")) = ( SELECT "profile"."team_owner"
   FROM "public"."profile"
  WHERE ("profile"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM ("public"."app"
     JOIN "public"."profile" ON (("app"."org_id" = "profile"."org_id")))
  WHERE (("app"."id" = "app_user"."app") AND ("profile"."id" = "auth"."uid"()))))));

ALTER TABLE "public"."log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_owner_policy" ON "public"."log" USING (((( SELECT "app"."owner"
   FROM "public"."app"
  WHERE ("app"."id" = "log"."app")) = "auth"."uid"()) OR (( SELECT "app"."owner"
   FROM "public"."app"
  WHERE ("app"."id" = "log"."app")) = ( SELECT "profile"."team_owner"
   FROM "public"."profile"
  WHERE ("profile"."id" = "auth"."uid"())))));

ALTER TABLE "public"."profile" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."run" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "run_owner_policy" ON "public"."run" USING (((( SELECT "app"."owner"
   FROM "public"."app"
  WHERE ("app"."id" = "run"."app")) = "auth"."uid"()) OR (( SELECT "app"."owner"
   FROM "public"."app"
  WHERE ("app"."id" = "run"."app")) = ( SELECT "profile"."team_owner"
   FROM "public"."profile"
  WHERE ("profile"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM ("public"."app"
     JOIN "public"."profile" ON (("app"."org_id" = "profile"."org_id")))
  WHERE (("app"."id" = "run"."app") AND ("profile"."id" = "auth"."uid"()))))));

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_model_names"("app_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_model_names"("app_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_model_names"("app_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_related_runs"("run_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_related_runs"("run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_related_runs"("run_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."run" TO "postgres";
GRANT ALL ON TABLE "public"."run" TO "anon";
GRANT ALL ON TABLE "public"."run" TO "authenticated";
GRANT ALL ON TABLE "public"."run" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_runs"("search_pattern" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_runs"("search_pattern" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_runs"("search_pattern" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_runs"("app_id" "uuid", "search_pattern" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_runs"("app_id" "uuid", "search_pattern" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_runs"("app_id" "uuid", "search_pattern" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_runs_usage"("app_id" "uuid", "days" integer, "user_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_runs_usage"("app_id" "uuid", "days" integer, "user_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_runs_usage"("app_id" "uuid", "days" integer, "user_id" bigint) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_runs_usage_by_user"("app_id" "uuid", "days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_runs_usage_by_user"("app_id" "uuid", "days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_runs_usage_by_user"("app_id" "uuid", "days" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_runs_usage_daily"("app_id" "uuid", "days" integer, "user_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_runs_usage_daily"("app_id" "uuid", "days" integer, "user_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_runs_usage_daily"("app_id" "uuid", "days" integer, "user_id" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_tags"("app_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tags"("app_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tags"("app_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_trace_runs_roots"("search_pattern" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trace_runs_roots"("search_pattern" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trace_runs_roots"("search_pattern" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_users"("app_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_users"("app_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users"("app_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";

GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";

GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";

GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";

GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";

GRANT ALL ON TABLE "public"."api_key" TO "postgres";
GRANT ALL ON TABLE "public"."api_key" TO "anon";
GRANT ALL ON TABLE "public"."api_key" TO "authenticated";
GRANT ALL ON TABLE "public"."api_key" TO "service_role";

GRANT ALL ON SEQUENCE "public"."api_key_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."api_key_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."api_key_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."api_key_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."app" TO "postgres";
GRANT ALL ON TABLE "public"."app" TO "anon";
GRANT ALL ON TABLE "public"."app" TO "authenticated";
GRANT ALL ON TABLE "public"."app" TO "service_role";

GRANT ALL ON TABLE "public"."app_user" TO "postgres";
GRANT ALL ON TABLE "public"."app_user" TO "anon";
GRANT ALL ON TABLE "public"."app_user" TO "authenticated";
GRANT ALL ON TABLE "public"."app_user" TO "service_role";

GRANT ALL ON SEQUENCE "public"."app_user_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "public"."app_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_user_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."log" TO "postgres";
GRANT ALL ON TABLE "public"."log" TO "anon";
GRANT ALL ON TABLE "public"."log" TO "authenticated";
GRANT ALL ON TABLE "public"."log" TO "service_role";

GRANT ALL ON TABLE "public"."org" TO "anon";
GRANT ALL ON TABLE "public"."org" TO "authenticated";
GRANT ALL ON TABLE "public"."org" TO "service_role";

GRANT ALL ON TABLE "public"."profile" TO "postgres";
GRANT ALL ON TABLE "public"."profile" TO "anon";
GRANT ALL ON TABLE "public"."profile" TO "authenticated";
GRANT ALL ON TABLE "public"."profile" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
