# CFD Hostel Treats — Website (Next.js)

The web app for CFD Hostel Treats — a university hostel food-delivery system with
three roles (Customer, Manager, Admin). Built on the same Supabase backend as the
original Flutter app in `../cfd`.

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Auth/DB:** Supabase (`@supabase/ssr`), email-OTP for all roles
- **State:** Zustand (cart), Framer Motion (micro-interactions)
- **Security:** the database RLS/RBAC is the real gate; `proxy.ts` only steers navigation

## Run locally

```bash
npm install
# .env.local already contains NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev          # http://localhost:3000
```

`npm run build` type-checks and lints the whole app.

## Backend prerequisites (one-time, in the Supabase project)

The frontend reuses the existing backend. Ensure these are applied:

1. **Migrations** — run `../cfd/supabase/migrations/0001_secure_schema.sql` then
   `0002_notifications.sql` in the SQL editor.
2. **Edge Function** — `supabase functions deploy create-manager` (used by Admin →
   Managers → Add). Needs the service-role key, injected automatically at runtime.
3. **Storage buckets** — create **public** buckets `item-images` and
   `payment-screenshots`, and add a storage policy allowing `authenticated`
   uploads (customers upload payment proof; admin uploads item/logo images).
4. **Realtime** — add the `orders` table to the realtime publication so live order
   tracking updates instantly (otherwise it falls back to 15s polling):
   `alter publication supabase_realtime add table orders;`
5. **Bootstrap the first admin** (RLS blocks self-promotion by design):
   `update profiles set role='admin' where email='<founder-email>';`

## Route map

- **Auth:** `/login` · `/verify` · `/register`
- **Customer (shop):** `/` (menu) · `/cart` · `/track/[id]` · `/orders` · `/profile` · `/notifications`
- **Manager:** `/manager` · `/manager/orders/[id]` · `/manager/discounts` · `/manager/end-shift`
- **Admin:** `/admin` · `/admin/inventory` · `/admin/orders` · `/admin/managers` ·
  `/admin/campuses` · `/admin/discounts` · `/admin/reports` · `/admin/users` ·
  `/admin/audit` · `/admin/branding`

## Where things live

- `proxy.ts` — session refresh + optimistic RBAC redirects
- `lib/supabase/{client,server}.ts` — Supabase factories
- `lib/domain/{constants,pricing,validators}.ts` — business logic ported from Flutter
- `lib/store/cart.ts` — persisted cart
- `components/` — `app-shell` (responsive sidebar/bottom-nav), role shells, UI primitives, and per-screen components
