-- Allow receipts that aren't tied to a partnership ("Not a partner purchase").
-- They are still logged and exported, but don't count toward any partnership's progress.
alter table public.receipts alter column partnership_id drop not null;

comment on column public.receipts.partnership_id is
  'Partnership this spend counts toward; null = not a partner purchase';
