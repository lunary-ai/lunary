alter table account add column avatar_url text;
alter table account add column last_login_at timestamp with time zone;

alter table org add column saml_idp_xml text;
alter table org add column saml_enabled boolean default false;
