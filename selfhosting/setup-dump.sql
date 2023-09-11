
-- Table Definition
CREATE TABLE IF NOT EXISTS "public"."profile" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text,
    "email" text,
    "plan" text NOT NULL DEFAULT 'free',
    "updated_at" timestamptz,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."app" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" timestamptz DEFAULT now(),
    "owner" uuid  NOT NULL,
    "name" text NOT NULL,
    PRIMARY KEY ("id")
);


-- Table Definition
CREATE TABLE "public"."log" (
    "id" int8 NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "message" text,
    "level" text,
    "extra" jsonb,
    "app" uuid NOT NULL,
    "run" uuid,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."run" (
    "created_at" timestamptz DEFAULT now(),
    "tags" _text,
    "app" uuid,
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "status" text,
    "name" text,
    "ended_at" timestamptz,
    "error" jsonb,
    "input" jsonb,
    "output" jsonb,
    "params" jsonb,
    "type" text NOT NULL,
    "parent_run" uuid,
    "completion_tokens" int4,
    "prompt_tokens" int4,
    PRIMARY KEY ("id")
);


ALTER TABLE "public"."app" ADD FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."log" ADD FOREIGN KEY ("run") REFERENCES "public"."run"("id") ON DELETE CASCADE;
ALTER TABLE "public"."log" ADD FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;
ALTER TABLE "public"."profile" ADD FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."run" ADD FOREIGN KEY ("parent_run") REFERENCES "public"."run"("id") ON DELETE CASCADE;
ALTER TABLE "public"."run" ADD FOREIGN KEY ("app") REFERENCES "public"."app"("id") ON DELETE CASCADE;



--
-- Name: app; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app ENABLE ROW LEVEL SECURITY;

--
-- Name: log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.log ENABLE ROW LEVEL SECURITY;


--
-- Name: profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

--
-- Name: run; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.run ENABLE ROW LEVEL SECURITY;


--
-- Name: profile Profiles are viewable by users who created them.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by users who created them." ON public.profile FOR SELECT USING ((auth.uid() = id));


--
-- Name: profile Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profile FOR INSERT WITH CHECK ((auth.uid() = id));

--
-- Name: profile Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profile FOR UPDATE USING ((auth.uid() = id));


--
-- Name: app app_owner_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_owner_policy ON public.app USING (auth.uid() = app.owner);



--
-- Name: log log_owner_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY log_owner_policy ON public.log USING ((( SELECT app.owner
   FROM public.app
  WHERE (app.id = log.app)) = auth.uid()));


--
-- Name: run run_owner_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY run_owner_policy ON public.run USING ((( SELECT app.owner
   FROM public.app
  WHERE (app.id = run.app)) = auth.uid()));



--
-- Name: run run_owner_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_user_owner_policy ON public.app_user USING ((( SELECT app.owner
   FROM public.app
  WHERE (app.id = app_user.app)) = auth.uid()));


--
-- Name: get_related_runs(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_related_runs(run_id uuid)
 RETURNS TABLE(created_at timestamp with time zone, tags text[], app uuid, id uuid, status text, name text, ended_at timestamp with time zone, error jsonb, input jsonb, output jsonb, params jsonb, type text, parent_run uuid, completion_tokens integer, prompt_tokens integer)
 LANGUAGE plpgsql
AS $function$
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
           rr.params, rr.type, rr.parent_run, rr.completion_tokens, rr.prompt_tokens
    FROM related_runs rr;
END; $function$



--
-- Name: get_runs_usage(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_runs_usage(app_id uuid, days integer, user_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(name text, type text, completion_tokens bigint, prompt_tokens bigint, errors bigint, success bigint)
 LANGUAGE plpgsql
AS $function$
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


CREATE OR REPLACE FUNCTION public.get_runs_usage_daily(app_id uuid, days integer, user_id integer DEFAULT NULL)
 RETURNS TABLE(date date, name text, type text, completion_tokens bigint, prompt_tokens bigint, errors bigint, success bigint)
 LANGUAGE plpgsql
AS $function$
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
END; $function$

CREATE OR REPLACE FUNCTION public.get_runs_usage_by_user(app_id uuid, days integer)
 RETURNS TABLE(user_id bigint, name text, type text, completion_tokens bigint, prompt_tokens bigint, errors bigint, success bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY 
    SELECT 
        run.user as user_id,
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
    	(run.type != 'agent' OR run.parent_run IS NULL)
    GROUP BY
        user_id, run.name, run.type;
END; $function$
    


--
-- Name: idx_run_parent_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_parent_run ON public.run USING btree (parent_run);

