create extension pg_trgm;

SELECT pg_catalog.set_config('search_path', '', false);

CREATE FUNCTION public.get_model_names(app_id uuid) RETURNS SETOF text
    LANGUAGE plpgsql
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

CREATE FUNCTION public.get_related_runs(run_id uuid) RETURNS TABLE(created_at timestamp with time zone, tags text[], app uuid, id uuid, status text, name text, ended_at timestamp with time zone, error jsonb, input jsonb, output jsonb, params jsonb, type text, parent_run uuid, completion_tokens integer, prompt_tokens integer, feedback jsonb)
    LANGUAGE plpgsql
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

CREATE TABLE public.run (
    created_at timestamp with time zone DEFAULT now(),
    tags text[],
    app uuid,
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    status text,
    name text,
    ended_at timestamp with time zone,
    error jsonb,
    input jsonb,
    output jsonb,
    params jsonb,
    type text NOT NULL,
    parent_run uuid,
    completion_tokens integer,
    prompt_tokens integer,
    "user" bigint,
    feedback jsonb,
    retry_of uuid
);

CREATE FUNCTION public.get_runs(search_pattern text) RETURNS SETOF public.run
    LANGUAGE plpgsql
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

CREATE FUNCTION public.get_runs_usage(app_id uuid, days integer, user_id bigint DEFAULT NULL::bigint) RETURNS TABLE(name text, type text, completion_tokens bigint, prompt_tokens bigint, errors bigint, success bigint)
    LANGUAGE plpgsql
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

CREATE FUNCTION public.get_runs_usage_by_user(app_id uuid, days integer) RETURNS TABLE(user_id bigint, name text, type text, completion_tokens bigint, prompt_tokens bigint, errors bigint, success bigint)
    LANGUAGE plpgsql
    AS $$
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
END; $$;

CREATE FUNCTION public.get_runs_usage_daily(app_id uuid, days integer, user_id integer DEFAULT NULL::integer) RETURNS TABLE(date date, name text, type text, completion_tokens bigint, prompt_tokens bigint, errors bigint, success bigint)
    LANGUAGE plpgsql
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

CREATE FUNCTION public.get_tags(app_id uuid) RETURNS SETOF text
    LANGUAGE plpgsql
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

CREATE FUNCTION public.get_trace_runs_roots(search_pattern text) RETURNS SETOF public.run
    LANGUAGE plpgsql
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

CREATE FUNCTION public.get_users(app_id uuid) RETURNS SETOF character varying
    LANGUAGE plpgsql
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

CREATE TABLE public.api_key (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    api_key uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid DEFAULT gen_random_uuid() NOT NULL
);

ALTER TABLE public.api_key ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.api_key_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.app (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    owner uuid NOT NULL,
    name text NOT NULL
);

CREATE TABLE public.app_user (
    id bigint NOT NULL,
    app uuid,
    external_id character varying,
    created_at timestamp with time zone DEFAULT now(),
    last_seen timestamp with time zone,
    props jsonb
);

ALTER TABLE public.app_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.log (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    message text,
    level text,
    extra jsonb,
    app uuid NOT NULL,
    run uuid
);

CREATE TABLE public.profile (
    id uuid NOT NULL,
    email text,
    name text,
    plan text DEFAULT 'free'::text NOT NULL,
    team_owner uuid,
    stripe_customer text,
    stripe_subscription text,
    limited boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_api_key_key UNIQUE (api_key);

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app
    ADD CONSTRAINT app_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT unique_id_by_app UNIQUE (app, external_id);

CREATE INDEX app_user_lower_idx ON public.app_user USING gin (lower((external_id)::text) public.gin_trgm_ops);

CREATE INDEX app_user_lower_idx1 ON public.app_user USING gin (lower((props)::text) public.gin_trgm_ops);

CREATE INDEX app_user_lower_idx2 ON public.app_user USING gin (lower((external_id)::text) public.gin_trgm_ops);

CREATE INDEX app_user_lower_idx3 ON public.app_user USING gin (lower((props)::text) public.gin_trgm_ops);

CREATE INDEX idx_run_parent_run ON public.run USING btree (parent_run);

CREATE INDEX run_lower_idx ON public.run USING gin (lower((input)::text) public.gin_trgm_ops);

CREATE INDEX run_lower_idx1 ON public.run USING gin (lower((output)::text) public.gin_trgm_ops);

CREATE INDEX run_lower_idx2 ON public.run USING gin (lower(name) public.gin_trgm_ops);

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.profile(id);

ALTER TABLE ONLY public.app
    ADD CONSTRAINT app_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.app
    ADD CONSTRAINT app_owner_fkey1 FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_app_fkey FOREIGN KEY (app) REFERENCES public.app(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_app_fkey FOREIGN KEY (app) REFERENCES public.app(id);

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_app_fkey1 FOREIGN KEY (app) REFERENCES public.app(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_run_fkey FOREIGN KEY (run) REFERENCES public.run(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_run_fkey1 FOREIGN KEY (run) REFERENCES public.run(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_id_fkey1 FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_team_owner_fkey FOREIGN KEY (team_owner) REFERENCES public.profile(id);

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_app_fkey FOREIGN KEY (app) REFERENCES public.app(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_app_fkey1 FOREIGN KEY (app) REFERENCES public.app(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_parent_run_fkey FOREIGN KEY (parent_run) REFERENCES public.run(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_parent_run_fkey1 FOREIGN KEY (parent_run) REFERENCES public.run(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_retry_of_fkey FOREIGN KEY (retry_of) REFERENCES public.run(id);

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_user_fkey FOREIGN KEY ("user") REFERENCES public.app_user(id) ON DELETE SET NULL;

CREATE POLICY "Profiles are viewable by users who created them." ON public.profile FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profile FOR INSERT WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update own profile." ON public.profile FOR UPDATE USING ((auth.uid() = id));

ALTER TABLE public.api_key ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_key_policy ON public.api_key USING (((auth.uid() = org_id) OR (org_id = ( SELECT profile.team_owner
   FROM public.profile
  WHERE (profile.id = auth.uid())))));

ALTER TABLE public.app ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_owner_policy ON public.app USING (((auth.uid() = owner) OR (owner = ( SELECT profile.team_owner
   FROM public.profile
  WHERE (profile.id = auth.uid())))));

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_user_owner_policy ON public.app_user USING (((( SELECT app.owner
   FROM public.app
  WHERE (app.id = app_user.app)) = auth.uid()) OR (( SELECT app.owner
   FROM public.app
  WHERE (app.id = app_user.app)) = ( SELECT profile.team_owner
   FROM public.profile
  WHERE (profile.id = auth.uid())))));

ALTER TABLE public.log ENABLE ROW LEVEL SECURITY;

CREATE POLICY log_owner_policy ON public.log USING (((( SELECT app.owner
   FROM public.app
  WHERE (app.id = log.app)) = auth.uid()) OR (( SELECT app.owner
   FROM public.app
  WHERE (app.id = log.app)) = ( SELECT profile.team_owner
   FROM public.profile
  WHERE (profile.id = auth.uid())))));

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.run ENABLE ROW LEVEL SECURITY;

CREATE POLICY run_owner_policy ON public.run USING (((( SELECT app.owner
   FROM public.app
  WHERE (app.id = run.app)) = auth.uid()) OR (( SELECT app.owner
   FROM public.app
  WHERE (app.id = run.app)) = ( SELECT profile.team_owner
   FROM public.profile
  WHERE (profile.id = auth.uid())))));

create trigger "User Signup" after insert on auth.users for each row execute function supabase_functions.http_request('<your_vercel_project_url>/api/webhook/signup', 'POST', '{"Content-type":"application/json"}', '{}', '1000');
