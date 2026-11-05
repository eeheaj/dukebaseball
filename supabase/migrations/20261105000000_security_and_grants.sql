-- Follow-up to 20261104000000_init.sql (already applied), based on the Supabase agent skill checklist:
--  1. Explicit Data API grants (newer projects don't auto-expose new tables).
--  2. Move is_staff() out of the exposed public schema (SECURITY DEFINER in public is callable by anyone).
--  3. UPDATE policies get WITH CHECK; policies use (select auth.uid()) for per-statement caching.
--  4. Index the receipts.logged_by foreign key.

-- 1. Grants. RLS still decides which rows each role can see or change.
grant select, insert, update, delete on public.profiles, public.partnerships, public.receipts to authenticated;
grant all on public.profiles, public.partnerships, public.receipts to service_role;

-- 2. Private helper schema + function
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'staff'
  );
$$;
revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

-- 3. Recreate policies that used public.is_staff(), then drop the old function.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "staff manage partnerships" on public.partnerships;
drop policy if exists "loggers add own receipts" on public.receipts;
drop policy if exists "staff edit receipts" on public.receipts;
drop policy if exists "staff delete receipts" on public.receipts;
drop function if exists public.is_staff();

create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "staff insert partnerships" on public.partnerships for insert to authenticated
  with check ((select private.is_staff()));
create policy "staff update partnerships" on public.partnerships for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff delete partnerships" on public.partnerships for delete to authenticated
  using ((select private.is_staff()));

create policy "loggers add own receipts" on public.receipts for insert to authenticated
  with check (logged_by = (select auth.uid()));
create policy "staff edit receipts" on public.receipts for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff delete receipts" on public.receipts for delete to authenticated
  using ((select private.is_staff()));

-- 4. Foreign-key index
create index if not exists receipts_logged_by_idx on public.receipts (logged_by);
