create table if not exists public.item_categories (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.item_categories enable row level security;

-- Policies (Admins can do everything, others can only read)
create policy "Allow read access to anyone"
  on public.item_categories for select using (true);

create policy "Allow all access to admins"
  on public.item_categories
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create index if not exists idx_item_categories_campus on public.item_categories(campus_id);
