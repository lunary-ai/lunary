drop function get_users; 

CREATE OR REPLACE FUNCTION public.get_users(app_id uuid)
 RETURNS SETOF record
 LANGUAGE sql
AS $function$
    SELECT DISTINCT ON (u.external_id) u.*
    FROM run r
    INNER JOIN app_user u ON u.id = r."user"
    WHERE r."type" = 'llm'
      AND r.app = app_id
      AND u.external_id IS NOT NULL
    ORDER BY u.external_id;
$function$
