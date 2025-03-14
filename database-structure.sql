--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Homebrew)
-- Dumped by pg_dump version 15.12 (Homebrew)

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: hughcrt
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO hughcrt;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: hughcrt
--

COMMENT ON SCHEMA public IS '';


--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: api_key_type; Type: TYPE; Schema: public; Owner: hughcrt
--

CREATE TYPE public.api_key_type AS ENUM (
    'public',
    'private'
);


ALTER TYPE public.api_key_type OWNER TO hughcrt;

--
-- Name: granularity_type; Type: TYPE; Schema: public; Owner: hughcrt
--

CREATE TYPE public.granularity_type AS ENUM (
    'hourly',
    'daily',
    'weekly',
    'monthly'
);


ALTER TYPE public.granularity_type OWNER TO hughcrt;

--
-- Name: model_unit; Type: TYPE; Schema: public; Owner: hughcrt
--

CREATE TYPE public.model_unit AS ENUM (
    'CHARACTERS',
    'TOKENS',
    'MILLISECONDS',
    'IMAGES'
);


ALTER TYPE public.model_unit OWNER TO hughcrt;

--
-- Name: org_plan; Type: TYPE; Schema: public; Owner: hughcrt
--

CREATE TYPE public.org_plan AS ENUM (
    'free',
    'pro',
    'team',
    'unlimited',
    'custom'
);


ALTER TYPE public.org_plan OWNER TO hughcrt;

--
-- Name: provider_name; Type: TYPE; Schema: public; Owner: hughcrt
--

CREATE TYPE public.provider_name AS ENUM (
    'openai',
    'azure_openai',
    'amazon_bedrock',
    'google_ai_studio',
    'google_vertex',
    'anthropic',
    'x_ai'
);


ALTER TYPE public.provider_name OWNER TO hughcrt;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: hughcrt
--

CREATE TYPE public.user_role AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer',
    'collaborator',
    'prompt_editor',
    'billing',
    'analytics'
);


ALTER TYPE public.user_role OWNER TO hughcrt;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _data_warehouse_connector; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public._data_warehouse_connector (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid NOT NULL,
    type text,
    status text
);


ALTER TABLE public._data_warehouse_connector OWNER TO hughcrt;

--
-- Name: _db_migration; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public._db_migration (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public._db_migration OWNER TO hughcrt;

--
-- Name: _db_migration_async; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public._db_migration_async (
    id integer NOT NULL,
    name text NOT NULL,
    statement text NOT NULL,
    operation text DEFAULT 'create'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL
);


ALTER TABLE public._db_migration_async OWNER TO hughcrt;

--
-- Name: _db_migration_index_id_seq; Type: SEQUENCE; Schema: public; Owner: hughcrt
--

CREATE SEQUENCE public._db_migration_index_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public._db_migration_index_id_seq OWNER TO hughcrt;

--
-- Name: _db_migration_index_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hughcrt
--

ALTER SEQUENCE public._db_migration_index_id_seq OWNED BY public._db_migration_async.id;


--
-- Name: _email_block_list; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public._email_block_list (
    email text NOT NULL
);


ALTER TABLE public._email_block_list OWNER TO hughcrt;

--
-- Name: account; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.account (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    password_hash text,
    recovery_token text,
    name text,
    org_id uuid,
    role public.user_role NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    avatar_url text,
    last_login_at timestamp with time zone,
    single_use_token text,
    export_single_use_token text
);


ALTER TABLE public.account OWNER TO hughcrt;

--
-- Name: account_project; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.account_project (
    account_id uuid NOT NULL,
    project_id uuid NOT NULL
);


ALTER TABLE public.account_project OWNER TO hughcrt;

--
-- Name: api_key; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.api_key (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type public.api_key_type NOT NULL,
    api_key uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL
);


ALTER TABLE public.api_key OWNER TO hughcrt;

--
-- Name: api_key_id_seq; Type: SEQUENCE; Schema: public; Owner: hughcrt
--

CREATE SEQUENCE public.api_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_key_id_seq OWNER TO hughcrt;

--
-- Name: api_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hughcrt
--

ALTER SEQUENCE public.api_key_id_seq OWNED BY public.api_key.id;


--
-- Name: chart; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.chart (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dashboard_id uuid,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    data_key text NOT NULL,
    aggregation_method text,
    primary_dimension text,
    secondary_dimension text,
    is_custom boolean DEFAULT false NOT NULL,
    checks jsonb,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    granularity public.granularity_type,
    sort_order integer DEFAULT 0 NOT NULL,
    color text,
    custom_chart_id uuid
);


ALTER TABLE public.chart OWNER TO hughcrt;

--
-- Name: checklist; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.checklist (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    slug text NOT NULL,
    data jsonb NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_id uuid,
    project_id uuid NOT NULL
);


ALTER TABLE public.checklist OWNER TO hughcrt;

--
-- Name: custom_chart; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.custom_chart (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    data_key text NOT NULL,
    aggregation_method text,
    primary_dimension text,
    secondary_dimension text,
    checks jsonb,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    granularity public.granularity_type,
    color text
);


ALTER TABLE public.custom_chart OWNER TO hughcrt;

--
-- Name: dashboard; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.dashboard (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_id uuid,
    project_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    checks jsonb DEFAULT '["and"]'::jsonb NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    granularity public.granularity_type,
    is_home boolean DEFAULT false NOT NULL
);


ALTER TABLE public.dashboard OWNER TO hughcrt;

--
-- Name: dataset; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.dataset (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    owner_id uuid,
    slug text NOT NULL,
    format character varying DEFAULT 'chat'::character varying NOT NULL
);


ALTER TABLE public.dataset OWNER TO hughcrt;

--
-- Name: dataset_prompt; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.dataset_prompt (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dataset_id uuid NOT NULL,
    messages jsonb NOT NULL
);


ALTER TABLE public.dataset_prompt OWNER TO hughcrt;

--
-- Name: dataset_prompt_variation; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.dataset_prompt_variation (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    variables jsonb NOT NULL,
    ideal_output text,
    prompt_id uuid NOT NULL
);


ALTER TABLE public.dataset_prompt_variation OWNER TO hughcrt;

--
-- Name: evaluation; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.evaluation (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    project_id uuid NOT NULL,
    owner_id uuid,
    dataset_id uuid,
    models text[] NOT NULL,
    checks jsonb NOT NULL,
    providers jsonb,
    checklist_id uuid
);


ALTER TABLE public.evaluation OWNER TO hughcrt;

--
-- Name: evaluation_result; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.evaluation_result (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    evaluation_id uuid NOT NULL,
    prompt_id uuid,
    variation_id uuid,
    model text,
    output jsonb,
    results jsonb,
    passed boolean DEFAULT false,
    completion_tokens integer,
    cost double precision,
    duration text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    provider jsonb,
    status text DEFAULT 'success'::text NOT NULL,
    error text
);


ALTER TABLE public.evaluation_result OWNER TO hughcrt;

--
-- Name: evaluation_result_v2; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.evaluation_result_v2 (
    run_id uuid NOT NULL,
    evaluator_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    result jsonb NOT NULL
);


ALTER TABLE public.evaluation_result_v2 OWNER TO hughcrt;

--
-- Name: evaluator; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.evaluator (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid NOT NULL,
    owner_id uuid,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    type character varying NOT NULL,
    mode character varying,
    description text,
    params jsonb,
    filters jsonb
);


ALTER TABLE public.evaluator OWNER TO hughcrt;

--
-- Name: external_user; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.external_user (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    external_id character varying,
    last_seen timestamp with time zone,
    props jsonb
);


ALTER TABLE public.external_user OWNER TO hughcrt;

--
-- Name: external_user_id_seq; Type: SEQUENCE; Schema: public; Owner: hughcrt
--

CREATE SEQUENCE public.external_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.external_user_id_seq OWNER TO hughcrt;

--
-- Name: external_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hughcrt
--

ALTER SEQUENCE public.external_user_id_seq OWNED BY public.external_user.id;


--
-- Name: ingestion_rule; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.ingestion_rule (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid NOT NULL,
    type bpchar,
    filters jsonb
);


ALTER TABLE public.ingestion_rule OWNER TO hughcrt;

--
-- Name: model_mapping; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.model_mapping (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    pattern text NOT NULL,
    unit public.model_unit NOT NULL,
    input_cost double precision,
    output_cost double precision,
    tokenizer text NOT NULL,
    start_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    provider text,
    CONSTRAINT model_mapping_input_cost_check CHECK ((input_cost >= (0)::double precision)),
    CONSTRAINT model_mapping_output_cost_check CHECK ((output_cost >= (0)::double precision))
);


ALTER TABLE public.model_mapping OWNER TO hughcrt;

--
-- Name: org; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.org (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    plan public.org_plan NOT NULL,
    play_allowance integer DEFAULT 3 NOT NULL,
    stripe_customer text,
    stripe_subscription text,
    limited boolean DEFAULT false NOT NULL,
    plan_period text DEFAULT 'monthly'::text NOT NULL,
    canceled boolean DEFAULT false NOT NULL,
    saml_idp_xml text,
    saml_enabled boolean DEFAULT false,
    eval_allowance integer DEFAULT 500,
    seat_allowance integer,
    data_retention_days integer,
    custom_charts_enabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.org OWNER TO hughcrt;

--
-- Name: project; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.project (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    org_id uuid NOT NULL
);


ALTER TABLE public.project OWNER TO hughcrt;

--
-- Name: provider_config; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.provider_config (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name public.provider_name NOT NULL,
    api_key text NOT NULL,
    extra_config jsonb
);


ALTER TABLE public.provider_config OWNER TO hughcrt;

--
-- Name: provider_config_model; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.provider_config_model (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_config_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(100)
);


ALTER TABLE public.provider_config_model OWNER TO hughcrt;

--
-- Name: run; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.run (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration interval GENERATED ALWAYS AS ((ended_at - created_at)) STORED,
    tags text[],
    project_id uuid NOT NULL,
    status text,
    name text,
    error jsonb,
    input jsonb,
    output jsonb,
    params jsonb,
    type text NOT NULL,
    parent_run_id uuid,
    prompt_tokens integer,
    completion_tokens integer,
    cost double precision,
    external_user_id bigint,
    feedback jsonb,
    is_public boolean DEFAULT false NOT NULL,
    template_version_id integer,
    runtime text,
    metadata jsonb
);


ALTER TABLE public.run OWNER TO hughcrt;

--
-- Name: run_score; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.run_score (
    run_id uuid NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    value jsonb NOT NULL,
    comment text,
    CONSTRAINT value_type_check CHECK ((jsonb_typeof(value) = ANY (ARRAY['number'::text, 'string'::text, 'boolean'::text])))
);


ALTER TABLE public.run_score OWNER TO hughcrt;

--
-- Name: template; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.template (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    owner_id uuid,
    name text,
    "group" text,
    slug text,
    project_id uuid NOT NULL,
    mode text
);


ALTER TABLE public.template OWNER TO hughcrt;

--
-- Name: template_id_seq; Type: SEQUENCE; Schema: public; Owner: hughcrt
--

CREATE SEQUENCE public.template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.template_id_seq OWNER TO hughcrt;

--
-- Name: template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hughcrt
--

ALTER SEQUENCE public.template_id_seq OWNED BY public.template.id;


--
-- Name: template_version; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.template_version (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    extra jsonb,
    content jsonb,
    template_id integer NOT NULL,
    version integer,
    test_values jsonb,
    is_draft boolean,
    notes text,
    published_at timestamp with time zone
);


ALTER TABLE public.template_version OWNER TO hughcrt;

--
-- Name: template_version_id_seq; Type: SEQUENCE; Schema: public; Owner: hughcrt
--

CREATE SEQUENCE public.template_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.template_version_id_seq OWNER TO hughcrt;

--
-- Name: template_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hughcrt
--

ALTER SEQUENCE public.template_version_id_seq OWNED BY public.template_version.id;


--
-- Name: view; Type: TABLE; Schema: public; Owner: hughcrt
--

CREATE TABLE public.view (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_id uuid,
    project_id uuid NOT NULL,
    columns jsonb,
    icon text,
    type text DEFAULT 'llm'::text NOT NULL
);


ALTER TABLE public.view OWNER TO hughcrt;

--
-- Name: _db_migration_async id; Type: DEFAULT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public._db_migration_async ALTER COLUMN id SET DEFAULT nextval('public._db_migration_index_id_seq'::regclass);


--
-- Name: api_key id; Type: DEFAULT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.api_key ALTER COLUMN id SET DEFAULT nextval('public.api_key_id_seq'::regclass);


--
-- Name: external_user id; Type: DEFAULT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.external_user ALTER COLUMN id SET DEFAULT nextval('public.external_user_id_seq'::regclass);


--
-- Name: template id; Type: DEFAULT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template ALTER COLUMN id SET DEFAULT nextval('public.template_id_seq'::regclass);


--
-- Name: template_version id; Type: DEFAULT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template_version ALTER COLUMN id SET DEFAULT nextval('public.template_version_id_seq'::regclass);


--
-- Name: _data_warehouse_connector _data_warehouse_connector_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public._data_warehouse_connector
    ADD CONSTRAINT _data_warehouse_connector_pkey PRIMARY KEY (id);


--
-- Name: _db_migration_async _db_migration_index_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public._db_migration_async
    ADD CONSTRAINT _db_migration_index_pkey PRIMARY KEY (id);


--
-- Name: _db_migration _db_migration_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public._db_migration
    ADD CONSTRAINT _db_migration_pkey PRIMARY KEY (id);


--
-- Name: _email_block_list _email_block_list_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public._email_block_list
    ADD CONSTRAINT _email_block_list_pkey PRIMARY KEY (email);


--
-- Name: account account_email_key; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_email_key UNIQUE (email);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: account_project account_project_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.account_project
    ADD CONSTRAINT account_project_pkey PRIMARY KEY (account_id, project_id);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);


--
-- Name: chart chart_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.chart
    ADD CONSTRAINT chart_pkey PRIMARY KEY (id);


--
-- Name: checklist checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_pkey PRIMARY KEY (id);


--
-- Name: custom_chart custom_chart_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.custom_chart
    ADD CONSTRAINT custom_chart_pkey PRIMARY KEY (id);


--
-- Name: dashboard dashboard_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dashboard
    ADD CONSTRAINT dashboard_pkey PRIMARY KEY (id);


--
-- Name: dataset dataset_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset
    ADD CONSTRAINT dataset_pkey PRIMARY KEY (id);


--
-- Name: dataset_prompt dataset_prompt_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset_prompt
    ADD CONSTRAINT dataset_prompt_pkey PRIMARY KEY (id);


--
-- Name: dataset_prompt_variation dataset_prompt_variation_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset_prompt_variation
    ADD CONSTRAINT dataset_prompt_variation_pkey PRIMARY KEY (id);


--
-- Name: evaluation evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_pkey PRIMARY KEY (id);


--
-- Name: evaluation_result evaluation_result_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result
    ADD CONSTRAINT evaluation_result_pkey PRIMARY KEY (id);


--
-- Name: evaluation_result_v2 evaluation_result_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result_v2
    ADD CONSTRAINT evaluation_result_v2_pkey PRIMARY KEY (run_id, evaluator_id);


--
-- Name: evaluator evaluator_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluator
    ADD CONSTRAINT evaluator_pkey PRIMARY KEY (id);


--
-- Name: evaluator evaluator_project_id_slug_unique; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluator
    ADD CONSTRAINT evaluator_project_id_slug_unique UNIQUE (project_id, slug);


--
-- Name: external_user external_user_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.external_user
    ADD CONSTRAINT external_user_pkey PRIMARY KEY (id);


--
-- Name: ingestion_rule ingestion_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.ingestion_rule
    ADD CONSTRAINT ingestion_rule_pkey PRIMARY KEY (id);


--
-- Name: model_mapping model_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.model_mapping
    ADD CONSTRAINT model_mapping_pkey PRIMARY KEY (id);


--
-- Name: org org_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.org
    ADD CONSTRAINT org_pkey PRIMARY KEY (id);


--
-- Name: project project_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_pkey PRIMARY KEY (id);


--
-- Name: provider_config_model provider_config_model_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.provider_config_model
    ADD CONSTRAINT provider_config_model_pkey PRIMARY KEY (id);


--
-- Name: provider_config provider_config_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.provider_config
    ADD CONSTRAINT provider_config_pkey PRIMARY KEY (id);


--
-- Name: run run_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_pkey PRIMARY KEY (id);


--
-- Name: run_score run_score_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.run_score
    ADD CONSTRAINT run_score_pkey PRIMARY KEY (run_id, label);


--
-- Name: template template_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template
    ADD CONSTRAINT template_pkey PRIMARY KEY (id);


--
-- Name: template_version template_version_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template_version
    ADD CONSTRAINT template_version_pkey PRIMARY KEY (id);


--
-- Name: ingestion_rule unique_project_type; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.ingestion_rule
    ADD CONSTRAINT unique_project_type UNIQUE (project_id, type);


--
-- Name: view view_pkey; Type: CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.view
    ADD CONSTRAINT view_pkey PRIMARY KEY (id);


--
-- Name: _data_warehouse_connector_project_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE UNIQUE INDEX _data_warehouse_connector_project_id_idx ON public._data_warehouse_connector USING btree (project_id);


--
-- Name: account_org_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX account_org_id_idx ON public.account USING btree (org_id);


--
-- Name: api_key_project_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX api_key_project_id_idx ON public.api_key USING btree (project_id);


--
-- Name: dataset_project_id_slug_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX dataset_project_id_slug_idx ON public.dataset USING btree (project_id, slug);


--
-- Name: dataset_prompt_dataset_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX dataset_prompt_dataset_id_idx ON public.dataset_prompt USING btree (dataset_id);


--
-- Name: dataset_prompt_variation_prompt_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX dataset_prompt_variation_prompt_id_idx ON public.dataset_prompt_variation USING btree (prompt_id);


--
-- Name: evaluation_project_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX evaluation_project_id_idx ON public.evaluation USING btree (project_id);


--
-- Name: external_user_project_id_created_at_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX external_user_project_id_created_at_idx ON public.external_user USING btree (project_id, created_at DESC NULLS LAST);


--
-- Name: external_user_project_id_created_at_idx1; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX external_user_project_id_created_at_idx1 ON public.external_user USING btree (project_id, created_at);


--
-- Name: external_user_project_id_external_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE UNIQUE INDEX external_user_project_id_external_id_idx ON public.external_user USING btree (project_id, external_id);


--
-- Name: external_user_project_id_last_seen_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX external_user_project_id_last_seen_idx ON public.external_user USING btree (project_id, last_seen DESC NULLS LAST);


--
-- Name: external_user_project_id_last_seen_idx1; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX external_user_project_id_last_seen_idx1 ON public.external_user USING btree (project_id, last_seen);


--
-- Name: idx_evaluator_type; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX idx_evaluator_type ON public.evaluator USING btree (type);


--
-- Name: idx_run_id_parent_run_id_feedback; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX idx_run_id_parent_run_id_feedback ON public.run USING btree (id, parent_run_id, feedback);


--
-- Name: idx_run_parent_run_id_feedback; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX idx_run_parent_run_id_feedback ON public.run USING btree (parent_run_id, feedback);


--
-- Name: project_org_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX project_org_id_idx ON public.project USING btree (org_id);


--
-- Name: provider_config_model_provider_config_id_name_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE UNIQUE INDEX provider_config_model_provider_config_id_name_idx ON public.provider_config_model USING btree (provider_config_id, name);


--
-- Name: run_external_user_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_external_user_id_idx ON public.run USING btree (external_user_id);


--
-- Name: run_metadata_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_metadata_idx ON public.run USING gin (metadata);


--
-- Name: run_name_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_name_idx ON public.run USING btree (name);


--
-- Name: run_parent_run_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_parent_run_id_idx ON public.run USING btree (parent_run_id);


--
-- Name: run_project_id_cost_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_cost_idx ON public.run USING btree (project_id, cost);


--
-- Name: run_project_id_cost_idx1; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_cost_idx1 ON public.run USING btree (project_id, cost DESC NULLS LAST);


--
-- Name: run_project_id_cost_idx2; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_cost_idx2 ON public.run USING btree (project_id, cost);


--
-- Name: run_project_id_created_at_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_created_at_idx ON public.run USING btree (project_id, created_at);


--
-- Name: run_project_id_created_at_idx1; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_created_at_idx1 ON public.run USING btree (project_id, created_at DESC NULLS LAST);


--
-- Name: run_project_id_created_at_idx2; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_created_at_idx2 ON public.run USING btree (project_id, created_at);


--
-- Name: run_project_id_duration_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_duration_idx ON public.run USING btree (project_id, duration DESC NULLS LAST);


--
-- Name: run_project_id_duration_idx1; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_duration_idx1 ON public.run USING btree (project_id, duration);


--
-- Name: run_project_id_expr_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_expr_idx ON public.run USING btree (project_id, ((error IS NOT NULL)));


--
-- Name: run_project_id_expr_idx1; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_expr_idx1 ON public.run USING btree (project_id, ((prompt_tokens + completion_tokens)) DESC NULLS LAST);


--
-- Name: run_project_id_expr_idx2; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_expr_idx2 ON public.run USING btree (project_id, ((prompt_tokens + completion_tokens)));


--
-- Name: run_project_id_external_user_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_external_user_id_idx ON public.run USING btree (project_id, external_user_id);


--
-- Name: run_project_id_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_idx ON public.run USING btree (project_id);


--
-- Name: run_project_id_input_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_input_idx ON public.run USING gin (project_id, ((input)::text) public.gin_trgm_ops);


--
-- Name: run_project_id_output_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_output_idx ON public.run USING gin (project_id, ((output)::text) public.gin_trgm_ops);


--
-- Name: run_project_id_type_created_at_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_type_created_at_idx ON public.run USING btree (project_id, type, created_at DESC);


--
-- Name: run_project_id_type_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_type_idx ON public.run USING btree (project_id, type);


--
-- Name: run_project_id_type_name_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_project_id_type_name_idx ON public.run USING btree (project_id, type, name);


--
-- Name: run_tags_idx; Type: INDEX; Schema: public; Owner: hughcrt
--

CREATE INDEX run_tags_idx ON public.run USING gin (tags);


--
-- Name: account account_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(id) ON DELETE CASCADE;


--
-- Name: account_project account_project_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.account_project
    ADD CONSTRAINT account_project_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_project account_project_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.account_project
    ADD CONSTRAINT account_project_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: api_key api_key_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: checklist checklist_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: dataset dataset_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset
    ADD CONSTRAINT dataset_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: dataset dataset_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset
    ADD CONSTRAINT dataset_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: dataset_prompt dataset_prompt_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset_prompt
    ADD CONSTRAINT dataset_prompt_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.dataset(id) ON DELETE CASCADE;


--
-- Name: dataset_prompt_variation dataset_prompt_variation_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dataset_prompt_variation
    ADD CONSTRAINT dataset_prompt_variation_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.dataset_prompt(id) ON DELETE CASCADE;


--
-- Name: evaluation evaluation_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklist(id) ON DELETE SET NULL;


--
-- Name: evaluation evaluation_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.dataset(id) ON DELETE SET NULL;


--
-- Name: evaluation evaluation_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: evaluation evaluation_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: evaluation_result_v2 evaluation_result_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result_v2
    ADD CONSTRAINT evaluation_result_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.evaluator(id) ON DELETE CASCADE;


--
-- Name: evaluation_result_v2 evaluation_result_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result_v2
    ADD CONSTRAINT evaluation_result_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.run(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: evaluator evaluator_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluator
    ADD CONSTRAINT evaluator_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: evaluator evaluator_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluator
    ADD CONSTRAINT evaluator_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: external_user external_user_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.external_user
    ADD CONSTRAINT external_user_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: chart fk_chart_custom_chart_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.chart
    ADD CONSTRAINT fk_chart_custom_chart_id FOREIGN KEY (custom_chart_id) REFERENCES public.custom_chart(id) ON DELETE CASCADE;


--
-- Name: chart fk_chart_dashboard_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.chart
    ADD CONSTRAINT fk_chart_dashboard_id FOREIGN KEY (dashboard_id) REFERENCES public.dashboard(id) ON DELETE CASCADE;


--
-- Name: view fk_checklist_owner_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.view
    ADD CONSTRAINT fk_checklist_owner_id FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: checklist fk_checklist_project_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT fk_checklist_project_id FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: view fk_checklist_project_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.view
    ADD CONSTRAINT fk_checklist_project_id FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: _data_warehouse_connector fk_checklist_project_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public._data_warehouse_connector
    ADD CONSTRAINT fk_checklist_project_id FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: custom_chart fk_custom_chart_project_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.custom_chart
    ADD CONSTRAINT fk_custom_chart_project_id FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: dashboard fk_dashboard_owner_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dashboard
    ADD CONSTRAINT fk_dashboard_owner_id FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: dashboard fk_dashboard_project_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.dashboard
    ADD CONSTRAINT fk_dashboard_project_id FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: evaluation_result fk_evaluation_result_evaluation_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result
    ADD CONSTRAINT fk_evaluation_result_evaluation_id FOREIGN KEY (evaluation_id) REFERENCES public.evaluation(id) ON DELETE CASCADE;


--
-- Name: evaluation_result fk_evaluation_result_prompt_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result
    ADD CONSTRAINT fk_evaluation_result_prompt_id FOREIGN KEY (prompt_id) REFERENCES public.dataset_prompt(id) ON DELETE CASCADE;


--
-- Name: evaluation_result fk_evaluation_result_variation_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.evaluation_result
    ADD CONSTRAINT fk_evaluation_result_variation_id FOREIGN KEY (variation_id) REFERENCES public.dataset_prompt_variation(id) ON DELETE CASCADE;


--
-- Name: model_mapping fk_model_org_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.model_mapping
    ADD CONSTRAINT fk_model_org_id FOREIGN KEY (org_id) REFERENCES public.org(id) ON DELETE CASCADE;


--
-- Name: provider_config fk_project_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.provider_config
    ADD CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES public.project(id);


--
-- Name: provider_config_model fk_provider_config_id; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.provider_config_model
    ADD CONSTRAINT fk_provider_config_id FOREIGN KEY (provider_config_id) REFERENCES public.provider_config(id);


--
-- Name: ingestion_rule ingestion_rule_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.ingestion_rule
    ADD CONSTRAINT ingestion_rule_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: project project_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(id) ON DELETE CASCADE;


--
-- Name: run run_external_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_external_user_id_fkey FOREIGN KEY (external_user_id) REFERENCES public.external_user(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: run run_parent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_parent_run_id_fkey FOREIGN KEY (parent_run_id) REFERENCES public.run(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: run run_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: run run_template_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.run
    ADD CONSTRAINT run_template_version_id_fkey FOREIGN KEY (template_version_id) REFERENCES public.template_version(id) ON DELETE SET NULL;


--
-- Name: template template_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template
    ADD CONSTRAINT template_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.account(id) ON DELETE SET NULL;


--
-- Name: template template_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template
    ADD CONSTRAINT template_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: template_version template_version_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hughcrt
--

ALTER TABLE ONLY public.template_version
    ADD CONSTRAINT template_version_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: hughcrt
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

