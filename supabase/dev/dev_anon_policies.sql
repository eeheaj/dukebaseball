-- DEV ONLY. Lets the backend save receipts using just the publishable key while DEV_NO_AUTH=true.
-- Skip this file if SUPABASE_SECRET_KEY is set in .env (the secret key bypasses RLS on the server).
--
-- Anyone holding the publishable key can read partnerships, read/insert receipts and upload
-- receipt images while these are in place. Remove them before real use:
--
--   drop policy if exists "dev anon read partnerships" on partnerships;
--   drop policy if exists "dev anon read receipts" on receipts;
--   drop policy if exists "dev anon insert receipts" on receipts;
--   drop policy if exists "dev anon upload receipt images" on storage.objects;
--   revoke select on partnerships from anon;
--   revoke select, insert on receipts from anon;

grant select on partnerships to anon;
grant select, insert on receipts to anon;

create policy "dev anon read partnerships" on partnerships for select to anon using (true);
create policy "dev anon read receipts" on receipts for select to anon using (true);
create policy "dev anon insert receipts" on receipts for insert to anon with check (logged_by is null);
create policy "dev anon upload receipt images" on storage.objects for insert to anon
  with check (bucket_id = 'receipts');
