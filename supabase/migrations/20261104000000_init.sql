-- Duke Baseball Hub: initial schema

create type commitment_type as enum ('spend', 'units');
create type app_role as enum ('staff', 'logger');

-- One row per auth user; role controls who can edit partnerships.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role app_role not null default 'logger',
  created_at timestamptz not null default now()
);

create table partnerships (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  contact_email text,
  commitment_type commitment_type not null,
  target numeric(12, 2) not null check (target > 0),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  discount_pct numeric(5, 2) check (discount_pct between 0 and 100),
  deliverables text,
  tags text[] not null default '{}',
  contract_path text,          -- path in the private "contracts" storage bucket
  created_at timestamptz not null default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id) on delete restrict,
  vendor text not null,
  purchase_date date not null,
  amount numeric(12, 2) not null,
  units numeric(12, 2),
  event text,
  line_items jsonb not null default '[]',
  image_path text,             -- path in the private "receipts" storage bucket
  logged_by uuid references auth.users (id),  -- null while DEV_NO_AUTH is on
  created_at timestamptz not null default now()
);

create index receipts_partnership_idx on receipts (partnership_id);
create index receipts_vendor_date_idx on receipts (lower(vendor), purchase_date);

-- Helper for RLS policies
create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'staff');
$$;

-- Row-level security
alter table profiles enable row level security;
alter table partnerships enable row level security;
alter table receipts enable row level security;

create policy "read own profile" on profiles for select to authenticated using (id = auth.uid() or is_staff());

create policy "anyone signed in reads partnerships" on partnerships for select to authenticated using (true);
create policy "staff manage partnerships" on partnerships for all to authenticated using (is_staff()) with check (is_staff());

create policy "anyone signed in reads receipts" on receipts for select to authenticated using (true);
create policy "loggers add own receipts" on receipts for insert to authenticated with check (logged_by = auth.uid());
create policy "staff edit receipts" on receipts for update to authenticated using (is_staff());
create policy "staff delete receipts" on receipts for delete to authenticated using (is_staff());

-- Private storage buckets
insert into storage.buckets (id, name, public) values
  ('receipts', 'receipts', false),
  ('contracts', 'contracts', false);
