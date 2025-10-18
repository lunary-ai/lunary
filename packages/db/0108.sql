-- convert alert notification targets to array columns

alter table alert
  add column emails text[] not null default '{}',
  add column webhook_urls text[] not null default '{}';

update alert
set emails = array[email]
where email is not null;

update alert
set webhook_urls = array[webhook_url]
where webhook_url is not null;

alter table alert
  drop column email,
  drop column webhook_url;
