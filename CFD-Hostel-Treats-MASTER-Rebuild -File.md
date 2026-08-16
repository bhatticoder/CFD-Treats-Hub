# CFD Hostel Treats — Full Audit & Rebuild Specification

> **Purpose of this document:** This is a complete, rigorous audit of the existing `CFD-Hostel-Treats-main` repository, followed by a full specification an AI coding agent (Claude Code / Antigravity / etc.) can use to **rebuild this project from scratch correctly**, without repeating the bugs and gaps found below.
>
> Give this entire file to the agent as the brief. It contains: (1) what's broken and why, (2) the exact target architecture, (3) the full database schema, (4) every server function the frontend expects to exist, (5) every page/route/component the app needs, and (6) the business rules the app must enforce.

---

## 0. What this project actually is

A Next.js 16 (App Router) + Supabase web app for **CFD Hostel Treats**, a late-night food delivery service for a university hostel (domain: `cfd.nu.edu.pk`). It is a **port of an earlier Flutter/Dart app** (comments throughout the code reference `cfd/lib/core/...` as the original source of truth for business logic). Three roles: `customer`, `manager` (delivery/shift staff per campus), `admin`.

Core flows: browse menu → add to cart → pay online (upload screenshot) or COD → place order → track order status → manager delivers it. Plus a separate "pre-order" flow for next-day items, campus/hostel management, discounts, notifications, and reporting.

---

## 1. THE #1 CRITICAL PROBLEM: There is no backend in this repository

This is the single biggest issue and almost certainly the root cause of "everything is broken." The Next.js frontend is written **entirely on the assumption that a Supabase Postgres database with specific tables, Row Level Security (RLS) policies, RPC functions, an Edge Function, and two Storage buckets already exist** — but **none of that is in the repository**:

- No `supabase/` folder at all (no `supabase/migrations/*.sql`, no `supabase/config.toml`, no `supabase/functions/`).
- `lib/types/models.ts` literally has a comment saying types "mirror the Supabase schema (`cfd/supabase/migrations/*.sql`)" — **that path does not exist anywhere in this repo.** It was either never committed, deleted, or exists only on the previous developer's machine / a different Supabase project the client doesn't have access to.
- The frontend calls **8 Postgres RPC functions** that are defined nowhere:
  `place_order`, `place_preorder`, `mark_delivered`, `manager_set_discount`, `register_manager_device`, `is_active_device`, `end_shift`, plus the implicit total-recompute logic those RPCs are supposed to run server-side.
- It calls **1 Supabase Edge Function** (`create-manager`) that doesn't exist.
- It reads/writes **2 Storage buckets** (`item-images`, `payment-screenshots`) that must be created with specific public/private + RLS settings, done nowhere in-repo.
- Every single table read/write (`campuses`, `profiles`, `restaurants`, `items`, `orders`, `order_items`, `notifications`, `audit_log`) relies entirely on Row Level Security policies for correctness and multi-tenant isolation — **none of those policies exist in the repo either.**

**Practical effect:** even if you fix every bug listed below, the app will not run at all against a fresh Supabase project until the entire database layer is (re)built. Section 5 of this document gives the full schema, RLS policy requirements, and RPC specifications needed to make the existing frontend (or its rebuild) actually work.

**Also missing:** a `.env.example` file. Nobody who clones this repo can know they need `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (found by reading `lib/supabase/client.ts`) until the app crashes.

---

## 2. Confirmed code-level bugs and gaps

These were found by reading every file in the repo, plus running `tsc --noEmit`, `next build`, and `eslint` against it. TypeScript compiled with zero errors and the production build succeeded (aside from a sandbox network restriction on Google Fonts) — so the bugs below are **logic/architecture bugs, not syntax errors.**

### 2.1 Critical — will break the app in production

1. **No way to ever re-open a shift.** `campus.shift_active` can only be set to `false` (via the `end_shift` RPC, called from `components/end-shift.tsx`). There is **no button, page, or RPC anywhere in the entire codebase that sets `shift_active` back to `true`.** Once a manager ends their shift, the customer home page (`app/(shop)/page.tsx`) will show "ALL FINISHED FOR TODAY" **permanently**, for every future night, until someone manually flips a boolean in the Supabase dashboard. This is a full outage bug baked into the design.
2. **University-email restriction is not enforced anywhere.** `lib/domain/constants.ts` defines `DEFAULT_DOMAIN_SUFFIX = "@cfd.nu.edu.pk"` — this constant is **never imported or used by any file in the codebase.** `lib/domain/validators.ts`'s `validateEmail(value, domainSuffix?)` takes an optional domain-suffix parameter to enforce this, but **every call site (`app/(auth)/login/page.tsx`) calls it with just `validateEmail(email)` — the second argument is never passed.** Result: any email address at all can request an OTP and log in/register, regardless of which campus's domain it's supposed to belong to. Each `campus` row even has its own `domain_suffix` (multi-campus support exists in the data model), but nothing anywhere cross-checks a signup email against it. This must be enforced (ideally server-side, e.g. in a Postgres trigger on `profiles` insert or in Supabase Auth hooks — client-side checks alone are not real enforcement).
3. **Admin role is architecturally ambiguous — "one campus" vs "all campuses" — and the code does both, inconsistently.**
   - `app/(admin)/admin/inventory/page.tsx`, `discounts/page.tsx`, `branding/page.tsx`, `reports/page.tsx`, `orders/page.tsx`, and the dashboard (`page.tsx`) all scope every query to `profile.campus_id` — i.e., **one admin = one campus.**
   - `app/(admin)/admin/campuses/page.tsx`, `managers/page.tsx`, `users/page.tsx`, `preorders/page.tsx`, and `audit/page.tsx` fetch data **across ALL campuses** with no filter — i.e., **one admin = platform-wide super-admin.**
   - `CampusesManager` lets an admin create arbitrary additional campuses, but there is **no campus switcher anywhere in the UI.** If a real deployment ever has 2+ campuses (which the UI explicitly supports creating), the "single-campus" admin pages listed above will only ever operate on whichever campus is in *that admin's own profile* — there is no way for an admin to manage inventory, orders, reports, discounts, or branding for a second campus. Decide up front: is `admin` campus-scoped (add a `super_admin` role for platform-wide screens) or platform-wide (add a campus selector to every "single campus" screen)? The rebuild must pick one model consistently.
4. **Manager order queries have zero campus filtering — full reliance on unverified RLS.** `app/(manager)/manager/page.tsx` (today's orders) and `app/(manager)/manager/end-shift/page.tsx` query the `orders` table with **only a date filter**, no `.eq("campus_id", ...)` at all — unlike literally every admin page, which explicitly filters by campus in the query as defense-in-depth. If RLS is even slightly misconfigured, a manager at one campus will see and be able to update/deliver orders belonging to a different campus. `app/(manager)/manager/orders/[id]/page.tsx` fetches a single order **by ID with no ownership check of any kind** — any authenticated manager could view/act on any order from any campus by guessing/incrementing the UUID if RLS isn't airtight. Fix: filter every manager query by the manager's own `campus_id` in the query itself, not just RLS.
5. **Customer notifications are not scoped to the customer's campus.** `app/(shop)/notifications/page.tsx` does `supabase.from("notifications").select("*")` — no campus filter. Meanwhile `components/send-notify.tsx` (used by managers) explicitly tells the sender "Sent to all customers on **your campus**" after inserting a notification scoped to `campus_id`. So the UX promises campus-scoped notifications, but the read query would show every campus's notifications to every customer (again, unless RLS silently saves this — which is unverifiable since RLS doesn't exist in the repo). Fix: filter by the customer's own `campus_id`.

### 2.2 High — broken/incomplete features

6. **Push notifications don't actually work.** `components/notification-prompt.tsx` calls `Notification.requestPermission()` and does nothing else — no service worker registration, no push subscription, no VAPID keys, nothing sent to the backend. Granting the permission accomplishes nothing. If real push notifications are wanted, this needs a service worker + Web Push subscription flow + a backend table to store subscriptions + a way to trigger sends (e.g., from the `notifications` insert). As shipped, "Alerts" are only ever visible by opening the `/notifications` page in-app.
7. **`HumanCheck` (slide-to-verify on login) is decorative only.** It's a pure client-side boolean gate before calling `signInWithOtp`. It sends nothing to the server and proves nothing — anyone can call the Supabase Auth API directly and skip it entirely. Fine as friction/UX, but do not treat it as bot/abuse protection. If real protection is needed, use a real CAPTCHA (hCaptcha/Turnstile) verified server-side, or Supabase's built-in rate limiting.
8. **`CampusesManager` (admin) can only create campuses — never edit, deactivate, or delete one.** Once created, a campus's `gender`, `domain_suffix`, `is_active` can never be changed from the UI. There's also no way to set a campus's `shift_active` from this screen (see bug #1) or its preorder window (that part is handled OK, in `PreorderControl`).
9. **OTP length is hardcoded and inconsistent with the validation regex.** `app/(auth)/verify/page.tsx` sets `const OTP_LENGTH = 8` (with a comment saying to keep it in sync with the Supabase Auth dashboard's "Email OTP length" setting), and shows 8 input dots + auto-submits only when exactly 8 digits are typed. But Supabase's *default* email OTP is 6 digits, and the validation regex is `/^\d{6,10}$/` (6–10 digits accepted). If the Supabase project is left at the 6-digit default, auto-submit-on-length-8 will never fire for a real 6-digit code, and the placeholder UI (8 dot-placeholders) will visually mislead the user — they'll have to notice the manual "Verify & continue" button instead. Fix: read/derive this from actual project config, or just don't auto-submit at a fixed length — auto-submit once the input satisfies the general regex, and stop hardcoding 8.
10. **`InventoryManager` (admin add/edit item modal) has no field for `discounted_price`.** The `Item` model has a `discounted_price` column and both `AdminDiscounts`/`ManagerDiscounts` screens can set it — but if the discount screens are ever removed/consolidated, there's no way to set a sale price directly from the item editor itself. Minor, but worth normalizing: either keep discount price only in the dedicated Discounts screens (current approach — fine, just document it as intentional) or add it to the item editor too, not half of one and half of the other silently.
11. **Two different write patterns for the same kind of mutation, with no clear rule for which to use.** `AdminDiscounts` sets `discounted_price` via a **raw table `.update()`** call (relying entirely on RLS to restrict this to admins), while `ManagerDiscounts` sets the same column via an **RPC (`manager_set_discount`)** that presumably enforces the `manager_discount_enabled` campus flag server-side. Similarly, order status changes are sometimes a raw `.update()` (`order_status: "cancelled"` in `admin-orders.tsx`) and sometimes an RPC (`mark_delivered`). This inconsistency means half the write-security surface of the app depends on RLS alone with no server-side business-rule enforcement, and half goes through RPCs that can enforce rules. **Rebuild rule: every write that has a business rule attached (stock decrement, discount permission check, status transition validity, pricing) must go through a `SECURITY DEFINER` RPC — never a raw client-side table write.** Simple CRUD with no business rule (e.g., toggling `is_active` on a restaurant) can remain a raw table write gated by RLS.

### 2.3 Medium — data integrity / UX correctness

12. **Cart persists full item snapshots to `localStorage` indefinitely (via `zustand/persist`, key `cfd-cart`).** `lib/store/cart.ts` stores the entire `Item` object (price, stock, discount, availability) at add-to-cart time. If a customer adds items, closes the tab, and returns two days later, the cart will show stale prices/stock/discount badges until they revisit the menu page (nothing refreshes cart line data against the DB). The final order total is safely re-priced server-side (comment confirms this intent — good), but the **displayed** cart total and per-item stock caps (`increment()` checks `l.item.stock_quantity` from the stale snapshot) can be wrong for days. Fix: re-fetch/re-validate cart item data against the DB when the cart page loads, or at minimum expire the persisted cart after a short TTL.
13. **Server pages use non-null assertions on the auth user (`user!.id`) instead of handling the null case.** Found in `app/(shop)/page.tsx`, `app/(shop)/preorder/page.tsx`, `app/(shop)/profile/page.tsx`, `app/(manager)/manager/discounts/page.tsx`. The `proxy.ts` middleware is supposed to guarantee a logged-in user reaches these routes, but if that guarantee is ever violated (race condition, direct navigation during a session edge case, a bug in the proxy), these pages will throw an unhandled runtime error (`Cannot read properties of null`) instead of redirecting to `/login`. Defensive code should handle `user == null` explicitly on every server page that needs it, not just trust the middleware.
14. **`eslint` fails out of the box with 5 errors** (React Compiler purity rules from `eslint-config-next` 16): impure `Date.now()` calls during render in `preorder-control.tsx`, and synchronous `setState` inside `useEffect` in `reports.tsx`, `app-shell.tsx`, and `customer-shell.tsx`. `npm run lint` does not pass on this repo today. These are all easy, mechanical fixes (move `Date.now()` into state updated by an interval/effect; wrap the `setState` calls appropriately or acknowledge via the correct pattern) but they were never cleaned up.
15. **No mobile bottom navigation.** `AppShell` (`components/app-shell.tsx`) is a desktop-first sidebar layout; on mobile it collapses to a hamburger-menu drawer only. For a delivery app used primarily on phones (per the project's own hostel/mobile-first context), a persistent bottom tab bar (Home / Cart / Orders / Profile) is the expected pattern and is missing entirely — every navigation action on mobile currently requires opening the drawer.
16. **No visible loading/error state for `next/font` Google Fonts fetch failures**, no `.env.example`, no `README.md` anywhere in the repo — a fresh clone has zero setup documentation.

### 2.4 Dependency/version notes (verified, not bugs)

- `proxy.ts` (not `middleware.ts`) is **correct** for Next.js 16 — Next 16 renamed the middleware convention to `proxy.ts`/`export function proxy`. This is not a mistake by the previous developer.
- `package.json` installs cleanly (`npm install` → 380 packages, no errors) and `tsc --noEmit` reports **zero type errors**. The versions pinned (Next 16.2.10, React 19.2.4, lucide-react 1.24.0, Tailwind 4) are internally consistent.

---

## 3. What must NOT be lost in the rebuild (things the current app gets right)

- **Server-side re-pricing intent.** Cart/pricing totals shown client-side (`lib/domain/pricing.ts`) are explicitly documented as *display-only*; the real total is meant to be recomputed inside `place_order`/`place_preorder` server-side so a forged client total is impossible. **Keep this pattern** — it's the correct approach, it just needs the RPC to actually exist (see Section 5).
- **`cache()`-wrapped server data helpers** (`lib/db/server-helpers.ts`) to dedupe repeated `auth.getUser()`/profile lookups within one request — good pattern, keep it.
- **Optimistic UI updates with rollback** (e.g. `AdminDiscounts`'s manager-discount toggle) — good pattern, keep it, just make sure every optimistic write has a real rollback path (most already do).
- The **preorder-open logic** (`lib/domain/preorder.ts`, `isPreorderOpen`) — manual switch OR scheduled time window — is a sound, simple design. Keep it, but make sure the equivalent SQL function (`preorder_is_open()`, referenced in a comment but not present) is actually implemented server-side too, since RLS policies on `items`/`orders` for preorders will need to check the same condition.
- The general component structure (thin server "page.tsx" data-fetchers → client components for interactivity) is a good Next.js App Router pattern. Keep it.

---

## 4. Rebuild instructions — Tech stack & project setup

Build a **new** Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + Supabase project, structured the same way as the current repo (it's a reasonable structure), but:

1. Start the Supabase project **first** and commit the schema as `supabase/migrations/*.sql` **in this repo, from day one.** Never let the schema live only in someone's Supabase dashboard.
2. Add a `.env.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` documented, plus a `README.md` with setup steps (create Supabase project → run migrations → create storage buckets → set env vars → `npm run dev`).
3. Decide the **admin scoping model explicitly** before writing any admin screen (see bug #3). Recommendation: introduce a `super_admin` role (platform-wide: campuses, managers, all users, all preorders, audit log) separate from `admin` (single-campus: inventory, orders, discounts, branding, reports for their own `campus_id`). Update the `Role` type, RLS policies, and `proxy.ts` routing accordingly.
4. Enforce the university-email-domain rule **server-side**, e.g. a Postgres trigger/RLS check on `profiles` insert that validates the new profile's `email` ends with the chosen `campus.domain_suffix`, not just a client-side `validateEmail()` call (keep the client check too, for fast UX feedback, but it must not be the only gate).
5. Add real "start shift" / "end shift" controls — a manager or admin action that flips `campuses.shift_active` **both ways**, not just off.
6. Fix the 5 eslint purity errors as part of initial setup so `npm run lint` is clean from commit one.
7. Add a persistent bottom tab bar for the customer-facing shell on mobile viewports.

### Dependencies to use (versions confirmed working as of this audit)
```
next 16.x, react 19.x, react-dom 19.x
@supabase/ssr, @supabase/supabase-js
zustand (cart store with persist middleware)
framer-motion (item add/remove animations)
lucide-react (icons)
clsx + tailwind-merge (cn utility)
tailwindcss v4 (@tailwindcss/postcss)
@vercel/analytics (optional)
```

---

## 5. Database schema (Postgres / Supabase) — reverse-engineered from the frontend

Every column below is required because the frontend code (kept from the audit) reads or writes it. Build this as proper `supabase/migrations/0001_init.sql` (or split into logical migrations), with RLS **enabled on every table**.

### 5.1 Tables

**`campuses`**
| column | type | notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| name | text not null | |
| domain_suffix | text not null | e.g. `@cfd.nu.edu.pk`; enforce email domain match on signup |
| gender | text check in ('Male','Female') null | |
| logo_url | text null | |
| theme_color | text null | hex, validated client-side as `^#[0-9a-fA-F]{6}$` |
| payment_account_info | text null | shown to customer at checkout |
| cod_cap_percent | int not null default 100 | 0–100 |
| manager_discount_enabled | boolean not null default false | |
| shift_active | boolean not null default true | **must be toggleable both directions — see bug #1** |
| is_active | boolean not null default true | |
| preorder_open | boolean not null default false | manual override switch |
| preorder_opens_at | timestamptz null | scheduled window start |
| preorder_closes_at | timestamptz null | scheduled window end (nullable = stays open once started) |
| whatsapp_number | text null | shown to customer when preorders closed |
| created_at | timestamptz not null default now() | |

**`profiles`** (1:1 with `auth.users`, PK = auth user id)
| column | type | notes |
|---|---|---|
| id | uuid pk references auth.users(id) | |
| email | text not null | |
| full_name | text null | |
| phone | text null | Pakistani format `03XXXXXXXXX` or `+923XXXXXXXXX` |
| room_number | text null | digits only |
| block | text null | one of `Iqbal`/`Jinnah` (extend as needed) |
| campus_id | uuid null references campuses(id) | |
| role | text not null default 'customer' check in ('customer','manager','admin'[,'super_admin']) | |
| gender | text check in ('Male','Female') null | |
| is_active | boolean not null default true | deactivated → forced logout, blocked login |
| created_at | timestamptz not null default now() | |

**`restaurants`**
| id uuid pk, campus_id uuid fk, name text not null, is_active boolean default true, created_at timestamptz |

**`items`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| campus_id | uuid fk not null | |
| name | text not null | |
| description | text null | |
| price | numeric not null | base price |
| discounted_price | numeric null | must be `< price` when set |
| delivery_fee | numeric not null default 0 | |
| image_url | text null | from `item-images` bucket |
| category | text not null | one of the `CATEGORIES` constant (excl. "All") |
| stock_quantity | int not null default 0 | |
| is_available | boolean not null default true | manual hide/show |
| custom_instruction | text null | shown to the delivery manager, not the customer |
| tag | text null | e.g. `"FEW LEFT"` |
| restaurant_id | uuid fk null | |
| expected_arrival | text null | free-text ETA, e.g. "9:30 PM" |
| is_preorder | boolean not null default false | menu item vs pre-order item |
| created_at | timestamptz not null default now() | |

**`orders`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| order_number | text unique not null | human-friendly, e.g. sequential per campus/day |
| customer_id | uuid fk profiles | |
| campus_id | uuid fk not null | |
| room_number | text not null | |
| block | text not null | |
| payment_method | text not null check in ('online','cod') | |
| payment_screenshot_url | text null | from `payment-screenshots` bucket |
| payment_status | text not null default 'pending' | |
| order_status | text not null default 'placed' check in ('placed','preparing','on_the_way','delivered','cancelled') | |
| subtotal | numeric not null | |
| delivery_fee | numeric not null | |
| platform_fee | numeric not null | |
| cod_fee | numeric not null default 0 | |
| gst | numeric not null | |
| discount_amount | numeric not null default 0 | |
| total | numeric not null | |
| promo_code | text null | |
| rating | int null | |
| is_preorder | boolean not null default false | |
| created_at | timestamptz not null default now() | |
| delivered_at | timestamptz null | |

**`order_items`**
| id uuid pk, order_id uuid fk, item_id uuid fk null (nullable so deleting a menu item doesn't break order history), name text not null (snapshot at order time), quantity int not null, unit_price numeric not null, total_price numeric not null, created_at timestamptz |

**`notifications`**
| id uuid pk, campus_id uuid fk not null, title text not null, message text not null, created_at timestamptz |

**`audit_log`**
| id bigint identity pk, actor_id uuid null, actor_role text null, action text not null, entity text null, entity_id text null, campus_id uuid null, detail jsonb null, created_at timestamptz default now() |
Populate this from inside every `SECURITY DEFINER` RPC below (price changes, stock changes, order placement, delivery, shift end, discount changes).

**`manager_devices`** (new table needed — implied by `register_manager_device`/`is_active_device` RPCs; not modeled in `lib/types/models.ts` today, add it)
| manager_id uuid pk references profiles(id), device_id text not null, updated_at timestamptz not null default now() |
Single-device-login enforcement: each manager can have exactly one active `device_id`; registering a new one invalidates the old (the frontend polls `is_active_device` every 20s and force-logs-out if it no longer matches).

### 5.2 Row Level Security — required policies (summary; write the actual SQL)

- **profiles**: user can `select`/`update` their own row; insert own row only once (registration), with the email-domain-vs-campus check enforced (trigger or check constraint using a function that looks up `campuses.domain_suffix`); `admin`/`super_admin` can select/update profiles within their scope (see admin-model decision in Section 4.3).
- **campuses**: public/anon can `select` active campuses (needed for the registration dropdown, pre-login). Only `admin`(own campus)/`super_admin` can `update`; only `super_admin` can `insert`.
- **restaurants, items**: public `select` where `is_active`/`is_available` as appropriate; only staff of that `campus_id` can `insert`/`update`/`delete`.
- **orders, order_items**: customer can `select` only their own orders; manager/admin can `select`/`update` only orders where `campus_id` matches their own profile's `campus_id` (this is the fix for bug #4 — enforce it in RLS **and** in the query itself); **no direct client `insert` on `orders`/`order_items` at all** — creation only happens via the `place_order`/`place_preorder` RPCs (which run as `SECURITY DEFINER` and do the pricing/stock-decrement atomically).
- **notifications**: customer can `select` only rows where `campus_id` = their own profile's `campus_id` (fix for bug #5); manager/admin can `insert` for their own campus only.
- **audit_log**: `admin`/`super_admin` read-only; never client-writable (only written by RPCs internally).
- **manager_devices**: a manager can only read/write their own row (`manager_id = auth.uid()`).

### 5.3 Required RPC functions (all `SECURITY DEFINER`, all must exist — this is currently the #1 gap)

Signatures below are reverse-engineered exactly from the frontend call sites, so the rebuilt RPCs must match these parameter names precisely (or the frontend calls must be updated to match new RPCs — pick one and be consistent).

1. **`place_order(p_room_number text, p_block text, p_payment_method text, p_payment_screenshot_url text, p_items jsonb)`** → returns the created order (id at minimum; frontend does `Array.isArray(data) ? data[0] : data` then reads `.id`).
   `p_items` shape: `[{ item_id: uuid, quantity: int }, ...]`.
   Must, atomically in one transaction:
   - Look up the caller's `profile` (via `auth.uid()`) to get `campus_id`.
   - Re-fetch each item's **current** `price`/`discounted_price`/`delivery_fee`/`stock_quantity` server-side (never trust client-sent prices).
   - Reject if any item is unavailable, out of stock, belongs to a different campus, or `quantity` exceeds `stock_quantity`.
   - Reject if `campuses.shift_active` is false for that campus.
   - Decrement `stock_quantity` per item.
   - Compute `subtotal`, `delivery_fee`, `platform_fee` (constant, currently ₨5), `cod_fee` (constant, currently ₨30, only if `payment_method = 'cod'`), `gst` (5% of subtotal+fees−discount), `discount_amount`, `total` — mirroring the formula in `lib/domain/pricing.ts`'s `computeTotals` exactly.
   - Enforce `cod_cap_percent`: if `payment_method = 'cod'`, reject (or flag for manual review) once today's COD order count/value for the campus exceeds `cod_cap_percent`% of total nightly orders — this business rule exists in the schema (`cod_cap_percent`) but nothing in the current frontend enforces it; it must live here.
   - Insert the `orders` row + one `order_items` row per line (snapshotting `name`/`unit_price` at order time).
   - Insert an `audit_log` entry.
   - Return the new order.
2. **`place_preorder(p_room_number text, p_block text, p_payment_method text, p_payment_screenshot_url text, p_items jsonb)`** → same contract as `place_order` but: only accepts items where `is_preorder = true`; does not check/decrement `stock_quantity` (pre-order items have no stock cap per the UI copy "no stock needed"); requires `preorder_is_open(campus)` to be true (mirror `lib/domain/preorder.ts`'s `isPreorderOpen` logic in SQL); sets `is_preorder = true` on the order.
3. **`mark_delivered(p_order_id uuid)`** → sets `order_status = 'delivered'`, `delivered_at = now()`. Must verify caller is a manager/admin of that order's `campus_id`. Writes audit log.
4. **`manager_set_discount(p_item_id uuid, p_discounted numeric | null)`** → sets `items.discounted_price`. Must verify: caller is a manager, the item belongs to the manager's own campus, and `campuses.manager_discount_enabled` is true for that campus (this is the server-side enforcement of the admin's toggle — currently `AdminDiscounts`'s raw-table-write path does **not** get this same protection, which is bug #11; make both paths go through this RPC, or an equivalent `admin_set_discount`). Reject `p_discounted >= item.price`. Writes audit log.
5. **`register_manager_device(p_device_id text)`** → upserts `(manager_id = auth.uid(), device_id = p_device_id, updated_at = now())` into `manager_devices`, replacing any previous device for that manager (single-device-login).
6. **`is_active_device(p_device_id text)`** → returns boolean: `true` if `p_device_id` still matches the manager's current `manager_devices.device_id` row, else `false` (used for the 20-second polling kick-out in `manager-shell.tsx`).
7. **`end_shift()`** → sets `campuses.shift_active = false` for the caller's own campus. **Also build the missing counterpart** (e.g. `start_shift()`) that sets it back to `true` — required to fix bug #1. Writes audit log.
8. **Multi-campus admin note:** if the admin model split from Section 4.3 is adopted, several of these RPCs (or their RLS checks) need a `super_admin` bypass for the campus-ownership check.

### 5.4 Edge Function

**`create-manager`** (invoked from `components/admin/managers-manager.tsx` via `supabase.functions.invoke("create-manager", { body: { email, full_name, phone, campus_id } })`) — must run with the Supabase **service role key** (never exposed client-side) to:
1. Create an `auth.users` entry for the given email (no password — managers sign in via the same email-OTP flow as customers).
2. Insert a matching `profiles` row with `role = 'manager'`, `is_active = true`, the given `campus_id`, `full_name`, `phone`.
3. Return `{ error: string }` on failure (the frontend checks `data.error` in addition to the SDK-level `error`) or the created record on success.
Must validate the caller invoking it is themselves an `admin`/`super_admin` (check their JWT/role before doing anything, since this function has service-role power).

### 5.5 Storage buckets

- **`item-images`** — public read (menu photos need to load for anyone), write restricted to staff (admin/manager) via a storage policy checking their role. Also used for campus logos (`components/admin/branding.tsx` uploads to this same bucket under a `logos/` prefix — consider a separate `campus-logos` bucket for clarity instead of overloading `item-images`).
- **`payment-screenshots`** — **must be private**, not public — these are financial evidence images. Write: authenticated customer uploading under their own `uid/` prefix. Read: only the uploading customer + staff of that order's campus. (Currently the frontend does `getPublicUrl()` on this bucket, which only works if the bucket is public — if you make it private as recommended, switch to signed URLs (`createSignedUrl`) instead, and update every place that reads `payment_screenshot_url` to fetch a signed URL when displaying it to managers.)

---

## 6. Application routes & pages to rebuild

Route groups: `(auth)`, `(shop)` [customer], `(manager)`, `(admin)`. Middleware (`proxy.ts`) redirects based on `profiles.role` + `is_active`, and forces incomplete registrations to `/register`. Rebuild this routing logic as-is (it was correct in the audit) but add the `super_admin` case if that role is introduced.

**Auth**
- `/login` — email input + slide-to-verify "human check" (keep as UX friction only, not real bot protection) → `signInWithOtp`.
- `/register` — collect name/phone/gender/campus(hostel, filtered by gender)/block/room; insert `profiles` row.
- `/verify` — OTP entry (6 digits by default — verify against actual Supabase project setting rather than hardcoding, per bug #9) or magic-link landing.
- `/auth/callback` — exchanges PKCE code / token_hash for a session, redirects home.

**Customer `(shop)`**
- `/` — menu grid, category + restaurant filters, redirects to `/preorder` if preorder window is open, shows "ALL FINISHED" banner if `!shift_active`.
- `/preorder` — pre-order browsing grouped by restaurant, or a WhatsApp-contact card if closed.
- `/cart` — line items, room/block/payment method, screenshot upload, bill breakdown, place order.
- `/orders` — order history list.
- `/track/[id]` — live status timeline (Placed → Preparing → On the way → Delivered) with Supabase Realtime subscription + polling fallback.
- `/notifications` — campus-scoped list (fix bug #5).
- `/profile` — read-only profile summary + logout.
- Persistent shell: sidebar (desktop) **and bottom tab bar (mobile — new, fixes bug #15)**: Home / Pre-order / Cart(badge) / Orders / Alerts / Profile.

**Manager `(manager)`**
- `/manager` — today's orders, sorted by block+room for delivery routing, filter tabs (all/pending/delivered). **Must filter by manager's own campus_id explicitly (fix bug #4).**
- `/manager/orders/[id]` — order detail, status transition buttons (Start preparing → Out for delivery → Deliver, with a confirm step), shows `custom_instruction` per item.
- `/manager/discounts` — set/remove item discounts (only if `manager_discount_enabled`), via the `manager_set_discount` RPC.
- `/manager/notify` — broadcast a notification to their own campus's customers.
- `/manager/end-shift` — today's delivery/COD/prepaid/pending summary, blocked from ending shift while orders are pending, confirm step, signs out on confirm.
- Single-device-login enforcement via `manager_devices` + 20s polling (keep this pattern, wire it to real RPCs).

**Admin `(admin)`** — *(re-scope per the Section 4.3 decision before building)*
- `/admin` — dashboard: today's order count/revenue/COD-vs-prepaid/low-stock count, compact preorder control.
- `/admin/preorders` — cross-campus preorder review (by time/restaurant/customer), per-campus open/close + schedule controls.
- `/admin/restaurants`, `/admin/inventory`, `/admin/orders`, `/admin/discounts`, `/admin/reports`, `/admin/branding` — single-campus scoped (or add a campus selector if going platform-wide).
- `/admin/managers` — cross-campus manager list, add manager (Edge Function), deactivate.
- `/admin/campuses` — cross-campus: add/**edit**/**deactivate** campus (rebuild must add edit/deactivate — bug #8), including `shift_active` control.
- `/admin/users` — cross-campus student list, reassign campus.
- `/admin/audit` — cross-campus immutable audit log.

---

## 7. Business rules & constants to preserve exactly

From `lib/domain/constants.ts` and `pricing.ts` — keep these values unless the client explicitly wants them changed:

```
PLATFORM_FEE = ₨5 (flat, per order)
GST_PERCENT = 5%
COD_EXTRA_CHARGE = ₨30 (flat, only if payment_method = cod)
HOSTEL_BLOCKS = ["Iqbal", "Jinnah"]
GENDERS = ["Male", "Female"]
CATEGORIES = ["All","Burgers","Pizza","Snacks","Drinks","Desserts"]
ORDER_STATUSES = placed → preparing → on_the_way → delivered (or cancelled at any point before delivered)
```

**Pricing formula** (must be computed identically client-side for display AND server-side in the RPC for the real charge):
```
itemTotal   = Σ (discounted_price ?? price) × quantity
deliveryFee = Σ item.delivery_fee × quantity
platformFee = 5 (flat)
codCharge   = isCod ? 30 : 0
subtotalBeforeGst = itemTotal + deliveryFee + platformFee + codCharge − discountAmount
gst         = subtotalBeforeGst × 5%
grandTotal  = subtotalBeforeGst + gst
```

**Validators** (`lib/domain/validators.ts` — keep, but wire `validateEmail`'s domain-suffix param through to the actual selected/registered campus — fix bug #2):
```
email: standard email regex, optionally must end with a given campus's domain_suffix
phone: /^(03\d{9}|\+923\d{9})$/  (Pakistani mobile)
room:  digits only
otp:   /^\d{6}$/  — match this to whatever the Supabase project's real OTP length is
```

**Preorder-open logic** (`lib/domain/preorder.ts` — keep, but also implement identically as a Postgres function for RLS/RPC use):
```
isOpen = campus.preorder_open === true
      OR (now >= preorder_opens_at AND (preorder_closes_at is null OR now <= preorder_closes_at))
```

---

## 8. Design system to preserve

Dark "party-vibe" theme (deep roasted brown background, brand orange primary `#e8863c`, cream text, green for "open/success", red-orange for sale tags) — defined via CSS variables in `app/globals.css` and Tailwind v4's `@theme inline`. Keep the token names (`--bg`, `--surface`, `--primary`, `--text`, `--success`, `--error`, `--warn`, `--info`, etc.) so components can keep using semantic Tailwind classes like `bg-surface text-text border-border`. Font: Google "Outfit" via `next/font/google`. Currency formatting: `₨` + rounded integer (no decimals), via a shared `money()` helper — keep this exact formatting, it matches the original Flutter app intentionally.

---

## 9. Suggested build order for the agent

1. Supabase project + full schema migration (Section 5.1) + RLS (5.2) + RPCs (5.3) + Edge Function (5.4) + Storage buckets (5.5), committed to `supabase/` in the repo, seeded with at least one test campus/admin/manager/customer for local dev.
2. Next.js scaffold + design tokens (`globals.css`) + shared UI kit (`Button`, `Card`, `Input`, `Modal`, `Switch`, `Badge`, skeletons) — these were solid in the audit, port them close to as-is, just fix the 5 eslint purity errors while doing so.
3. Auth flow (login/register/verify/callback) + `proxy.ts` role routing, **with the email-domain check actually wired up** (bug #2) and defensive null-user handling on every server page (bug #13).
4. Customer shop: menu, cart, place-order (via real RPC), order tracking, notifications (campus-scoped), profile. Add the mobile bottom nav (bug #15). Re-validate cart contents against the DB on cart page load (bug #12).
5. Manager: today's orders (campus-filtered explicitly, bug #4), order detail/status flow, discounts (via RPC), notify, end-shift **and start-shift** (bug #1), single-device enforcement.
6. Admin: decide + implement the campus-scoping model first (bug #3), then build inventory, restaurants, discounts, branding, reports, orders, campuses (with edit/deactivate — bug #8), managers (with the real Edge Function), users, audit log, preorders.
7. Run `npm run lint`, `tsc --noEmit`, and `next build` after every phase — keep them green throughout, not just at the end.
8. Write the `README.md` and `.env.example` this repo never had.
