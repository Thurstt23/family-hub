create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_privileged boolean;
begin
  -- Check if the current Postgres session is a privileged role (Studio or Service Role)
  -- The API uses 'authenticator' which assumes 'anon' or 'authenticated' via set_config
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    is_privileged := true;
  else
    is_privileged := false;
  end if;

  if not is_privileged and not public.is_admin() then
    new.status := old.status;
    new.id     := old.id;
  end if;
  
  new.updated_at := now();
  return new;
end;
$$;
