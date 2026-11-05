-- Sample data for local development (applied by `supabase db reset`).
insert into partnerships (company, contact_name, commitment_type, target, start_date, end_date, discount_pct, tags) values
  ('Chick-fil-A Durham', 'Sample Contact', 'spend', 10000, '2026-01-01', '2026-12-31', 15, '{food,travel}'),
  ('Under Armour', 'Sample Contact', 'units', 200, '2026-02-01', '2026-06-30', 30, '{apparel}');
