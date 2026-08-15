# CFD Hostel Treats — Website (Next.js)

The web app for CFD Hostel Treats — a university hostel food-delivery system with
three roles (Customer, Manager, Admin). Built on Next.js 16 (App Router) + Supabase.

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Auth/DB:** Supabase (`@supabase/ssr`), email-OTP for all roles
- **State:** Zustand (cart), Framer Motion (micro-interactions)
- **Security:** Database RLS/RBAC is the real gate; `proxy.ts` only steers navigation

## Setup from Scratch

### 1. Clone & install

```bash
git clone <repo-url>
cd CFD-Hostel-Treats
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 3. Set environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

Required variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon/public key

### 4. Run database migrations

In the Supabase SQL Editor, run these files **in order**:
1. `supabase/migrations/0001_schema.sql` — Tables and indexes
2. `supabase/migrations/0002_rls_policies.sql` — Row Level Security policies
3. `supabase/migrations/0003_rpc_functions.sql` — Server-side RPC functions

Optionally seed test data:
```sql
-- Run in SQL Editor
\i supabase/seed.sql
```

### 5. Create Storage buckets

In the Supabase dashboard → Storage:
- Create **`item-images`** bucket (public) — for menu item photos and campus logos
- Create **`payment-screenshots`** bucket (private) — for customer payment proof

Add a storage policy on each bucket allowing `authenticated` users to upload.

### 6. Deploy the Edge Function

```bash
supabase functions deploy create-manager
```

This function creates manager accounts (requires the service role key, which is injected automatically).

### 7. Configure Supabase Auth

- **Email OTP length:** Default is 6 digits (the frontend handles 6–10)
- **Email domain restriction:** The app enforces `@cfd.nu.edu.pk` both client-side and via a database trigger

### 8. Bootstrap the first admin

RLS blocks self-promotion by design. After signing up:
```sql
UPDATE profiles SET role = 'admin' WHERE email = '<your-email>';
```

### 9. Run locally

```bash
npm run dev          # http://localhost:3000
```

### 10. Enable Realtime (optional)

For live order tracking updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

## Route map

- **Auth:** `/login` · `/verify` · `/register`
- **Customer (shop):** `/` (menu) · `/preorder` · `/cart` · `/track/[id]` · `/orders` · `/profile` · `/notifications`
- **Manager:** `/manager` · `/manager/orders/[id]` · `/manager/discounts` · `/manager/notify` · `/manager/end-shift`
- **Admin:** `/admin` · `/admin/inventory` · `/admin/orders` · `/admin/managers` ·
  `/admin/campuses` · `/admin/shift` · `/admin/discounts` · `/admin/reports` · `/admin/users` ·
  `/admin/audit` · `/admin/branding` · `/admin/preorders` · `/admin/restaurants`

## Where things live

- `proxy.ts` — session refresh + optimistic RBAC redirects
- `lib/supabase/{client,server}.ts` — Supabase factories
- `lib/domain/{constants,pricing,validators,preorder}.ts` — business logic ported from Flutter
- `lib/store/cart.ts` — persisted cart with refresh support
- `lib/db/server-helpers.ts` — cached server data helpers
- `components/` — `app-shell` (responsive sidebar + mobile bottom nav), role shells, UI primitives, and per-screen components
- `supabase/migrations/` — database schema, RLS policies, and RPC functions
- `supabase/functions/` — Edge Functions (create-manager)
