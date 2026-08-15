-- ==========================================================================
-- CFD Hostel Treats — Full Database Schema
-- Reverse-engineered from the frontend code (lib/types/models.ts)
-- ==========================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ==========================================================================
-- CAMPUSES
-- ==========================================================================
create table public.campuses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  domain_suffix text not null,            -- e.g. '@cfd.nu.edu.pk'
  gender        text check (gender in ('Male','Female')) default null,
  logo_url      text,
  theme_color   text,                     -- hex, e.g. '#e8863c'
  payment_account_info text,
  cod_cap_percent int not null default 100 check (cod_cap_percent between 0 and 100),
  manager_discount_enabled boolean not null default false,
  shift_active  boolean not null default true,
  is_active     boolean not null default true,
  preorder_open boolean not null default false,
  preorder_opens_at  timestamptz,
  preorder_closes_at timestamptz,
  whatsapp_number    text,
  created_at    timestamptz not null default now()
);

-- ==========================================================================
-- PROFILES (1:1 with auth.users)
-- ==========================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  room_number text,
  block       text,
  campus_id   uuid references public.campuses(id) on delete set null,
  role        text not null default 'customer'
              check (role in ('customer','manager','admin')),
  gender      text check (gender in ('Male','Female')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ==========================================================================
-- RESTAURANTS
-- ==========================================================================
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references public.campuses(id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ==========================================================================
-- ITEMS
-- ==========================================================================
create table public.items (
  id                uuid primary key default gen_random_uuid(),
  campus_id         uuid not null references public.campuses(id) on delete cascade,
  name              text not null,
  description       text,
  price             numeric not null check (price >= 0),
  discounted_price  numeric check (discounted_price is null or discounted_price < price),
  delivery_fee      numeric not null default 0 check (delivery_fee >= 0),
  image_url         text,
  category          text not null,
  stock_quantity    int not null default 0 check (stock_quantity >= 0),
  is_available      boolean not null default true,
  custom_instruction text,
  tag               text,
  restaurant_id     uuid references public.restaurants(id) on delete set null,
  expected_arrival  text,
  is_preorder       boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ==========================================================================
-- ORDERS
-- ==========================================================================
create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text unique not null,
  customer_id             uuid references public.profiles(id) on delete set null,
  campus_id               uuid not null references public.campuses(id),
  room_number             text not null,
  block                   text not null,
  payment_method          text not null check (payment_method in ('online','cod')),
  payment_screenshot_url  text,
  payment_status          text not null default 'pending',
  order_status            text not null default 'placed'
                          check (order_status in ('placed','preparing','on_the_way','delivered','cancelled')),
  subtotal                numeric not null,
  delivery_fee            numeric not null,
  platform_fee            numeric not null,
  cod_fee                 numeric not null default 0,
  gst                     numeric not null,
  discount_amount         numeric not null default 0,
  total                   numeric not null,
  promo_code              text,
  rating                  int,
  is_preorder             boolean not null default false,
  created_at              timestamptz not null default now(),
  delivered_at            timestamptz
);

-- ==========================================================================
-- ORDER_ITEMS
-- ==========================================================================
create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  item_id     uuid references public.items(id) on delete set null,
  name        text not null,   -- snapshot at order time
  quantity    int not null check (quantity > 0),
  unit_price  numeric not null,
  total_price numeric not null,
  created_at  timestamptz not null default now()
);

-- ==========================================================================
-- NOTIFICATIONS
-- ==========================================================================
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references public.campuses(id) on delete cascade,
  title       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- ==========================================================================
-- AUDIT_LOG
-- ==========================================================================
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  text,
  action      text not null,
  entity      text,
  entity_id   text,
  campus_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

-- ==========================================================================
-- MANAGER_DEVICES (single-device-login enforcement)
-- ==========================================================================
create table public.manager_devices (
  manager_id  uuid primary key references public.profiles(id) on delete cascade,
  device_id   text not null,
  updated_at  timestamptz not null default now()
);

-- ==========================================================================
-- Enable RLS on every table
-- ==========================================================================
alter table public.campuses       enable row level security;
alter table public.profiles       enable row level security;
alter table public.restaurants    enable row level security;
alter table public.items          enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.notifications  enable row level security;
alter table public.audit_log      enable row level security;
alter table public.manager_devices enable row level security;

-- ==========================================================================
-- Indexes for performance
-- ==========================================================================
create index idx_profiles_campus on public.profiles(campus_id);
create index idx_items_campus on public.items(campus_id);
create index idx_orders_campus on public.orders(campus_id);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_created on public.orders(created_at);
create index idx_order_items_order on public.order_items(order_id);
create index idx_notifications_campus on public.notifications(campus_id);
create index idx_restaurants_campus on public.restaurants(campus_id);

-- Enable realtime for live order tracking
alter publication supabase_realtime add table public.orders;
