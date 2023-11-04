CREATE TYPE user_role AS ENUM ('member', 'admin');

CREATE TYPE org_plan AS ENUM ('free', 'pro', 'unlimited', 'custom');
CREATE TABLE public.org (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    plan org_plan not null,
    play_allowance int4 NOT NULL DEFAULT 10,
    stripe_customer text,
    stripe_subscription text,
    limited bool,
    admin_id uuid not null, -- Temporary column
    PRIMARY KEY (id)
);

--- Modify the profile table to include org_id and role
ALTER TABLE public.profile
ADD COLUMN org_id uuid,
ADD COLUMN role user_role;


--- Create orgs and add org_id to admins
WITH inserted_orgs AS (
  INSERT INTO public.org (name, admin_id, plan)
  SELECT 
    COALESCE(p.name, p.email) || '''s org', 
    p.id, 
    p.plan::org_plan
  FROM public.profile p
  WHERE p.team_owner is null
  RETURNING id, admin_id
)
UPDATE public.profile p
SET 
  org_id = io.id,
  role = 'admin'
FROM inserted_orgs io
WHERE p.id = io.admin_id;

--- Add members to orgs
WITH cte AS (
    SELECT
        member.id AS member_id,
        admin.org_id AS org_id
    FROM
        profile member
        LEFT JOIN profile admin ON member.team_owner = admin.id
    WHERE
        member.team_owner IS NOT NULL
)
UPDATE profile
SET org_id = cte.org_id, role = 'member'
FROM cte
WHERE profile.id = cte.member_id;

--- Remove the temporary admin_id column as it's redundant
ALTER TABLE public.org DROP COLUMN admin_id;

--- Change apps to reference orgs directly
ALTER TABLE public.app
ADD COLUMN org_id uuid;

--- Update the app table to set the org_id based on the owner's profile
UPDATE public.app a
SET org_id = p.org_id
FROM public.profile p
WHERE a.owner = p.id;

ALTER TABLE app 
ADD FOREIGN KEY (org_id)
REFERENCES org(id);

ALTER TABLE app
ALTER COLUMN owner DROP NOT NULL;



ALTER TABLE org DROP COLUMN admin_id;

ALTER TABLE public.profile
ADD FOREIGN KEY (org_id)
REFERENCES public.org (id);

CREATE INDEX ON public.profile(org_id);
CREATE INDEX ON public.app(org_id);
