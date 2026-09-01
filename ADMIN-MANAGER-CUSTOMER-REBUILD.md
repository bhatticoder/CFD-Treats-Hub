# CFD Treats Hub — Admin, Manager & Customer Rebuild Specification

This document describes the current product structure, routes, UI system, data flow, permissions, and rebuild requirements for Antigravity or a new Next.js project. It is based on the existing codebase. Use it as a blueprint, not as a substitute for recreating the database schema and server authorization.

## 1. Product model

CFD Treats Hub is a campus food ordering system with three user experiences:

- **Customer:** browse active food items, add items to a cart, place orders, pre-order, track orders, view notifications, and manage profile.
- **Manager / Partner:** operate one assigned restaurant or campus workflow: see today’s orders, update order status, manage discounts, send notifications, and close a shift.
- **Admin:** manage the platform: shifts, pre-orders, restaurants, categories, inventory, orders, managers, campuses, charges, discounts, vouchers, reports, users, audit logs, payment/contact settings, and branding.

The original app uses Next.js App Router, TypeScript, Firebase Authentication/Firestore for the current server-side session/data path, and Supabase utilities still present in parts of the codebase. For a clean rebuild, choose one database/auth source of truth and update every route consistently; do not mix session systems accidentally.

## 2. Routes and navigation

### Customer routes

| Route | Purpose | Dynamic behavior |
|---|---|---|
| `/` | Menu/home | Loads the signed-in customer profile, campus, active restaurants/items, categories, shift status, delivery status, and collection room. Filters inactive restaurants and non-pre-order items. |
| `/preorder` | Pre-order menu | Shows items marked as pre-order and allows scheduling/ordering according to campus pre-order rules. |
| `/cart` | Cart review | Reads cart lines, calculates subtotal/discount/total, validates availability and quantities, and submits to the order endpoint. |
| `/orders` | Customer order history | Loads the current user’s orders and order items, newest first. |
| `/track/[id]` | Single-order tracking | Loads one order belonging to the current user and displays status/timeline. Never trust a client-supplied order ID without server ownership filtering. |
| `/notifications` | Customer alerts | Shows push/in-app notifications and read state. |
| `/profile` | Profile | Shows and updates customer identity, campus, contact details, and preferences. |

Customer bottom/mobile navigation: **Home, Pre-order, Cart, Orders, Alerts, Profile**. Cart displays a live quantity badge from the cart store.

### Manager routes

| Route | Purpose | Dynamic behavior |
|---|---|---|
| `/manager` | Today’s Orders | Loads today’s orders, scoped to the manager’s assigned campus/restaurant. Allows status updates and order inspection. |
| `/manager/orders/[id]` | Order detail | Shows customer/order items/payment/delivery details and manager actions. Must verify that the manager may access the order. |
| `/manager/discounts` | Partner discounts | Lists and edits discounts owned by the manager’s restaurant/campus. |
| `/manager/notify` | Notify customers | Sends an operational notification through the push notification endpoint. Validate audience and message server-side. |
| `/manager/end-shift` | Shift & Summary | Closes or summarizes the current shift, showing totals and operational information. |

Manager navigation labels: **Today’s Orders, Discounts, Notify, Shift & Summary**. Brand label is **Partner**.

### Admin routes

| Route | Purpose | Dynamic behavior |
|---|---|---|
| `/admin` | Dashboard | Today’s orders, revenue, COD/pre-paid split, low-stock count, shift controls, and pre-order controls. |
| `/admin/shift` | Shift Control | Opens/closes campus ordering shifts and controls whether customers can order. |
| `/admin/preorders` | Pre-orders | Reviews, filters, and controls pre-orders; can update operational status. |
| `/admin/restaurants` | Restaurants | Creates/edits/activates restaurants and associates them with campuses. |
| `/admin/categories` | Categories | Creates/renames/organizes globally available item categories. |
| `/admin/inventory` | Inventory | Manages item stock, availability, price, restaurant, category, and pre-order flag. |
| `/admin/orders` | Orders | Global operational order list with filters and status/payment information. |
| `/admin/managers` | Managers | Creates managers, assigns roles/campuses/restaurants, and controls access. |
| `/admin/campuses` | Campuses | Creates and edits campuses, delivery settings, collection room, shift state, and theme/branding settings. |
| `/admin/charges` | Charges | Configures delivery/service/other charges applied during checkout. |
| `/admin/discounts` | Discounts | Creates and manages platform discounts, eligibility, dates, limits, and active state. |
| `/admin/vouchers` | Vouchers | Creates voucher codes, values/rules, expiry, usage limits, and active state. |
| `/admin/reports` | Reports | Aggregates sales, order, payment, inventory, and campus performance data. |
| `/admin/users` | Users | Lists customers and account/profile data; administrative actions must be audited. |
| `/admin/audit` | Audit Log | Displays security and business-operation events: actor, action, target, timestamp, and metadata. |
| `/admin/contact` | Payment & Contact | Stores payment instructions/contact information shown to customers and staff. |
| `/admin/branding` | Branding | Updates logo and theme color used by the shell and customer-facing pages. |

Admin navigation labels: **Dashboard, Shift Control, Pre-orders, Restaurants, Categories, Inventory, Orders, Managers, Campuses, Charges, Discounts, Vouchers, Reports, Users, Audit Log, Payment & Contact, Branding**. Brand label is **Admin Panel**.

## 3. Shared UI and exact visual language

### Color tokens

Keep the existing palette as the design source of truth:

```css
--bg: #241310;             /* deep roasted brown page background */
--bg-muted: #2c1913;       /* slightly lighter app-shell background */
--surface: #33201a;        /* cards, sidebar, panels */
--surface-muted: #2a1712;  /* secondary surfaces */
--border: #573721;         /* warm brown borders */
--primary: #e8863c;        /* brand orange and primary buttons */
--primary-hover: #d2732c;
--primary-soft: #3e2417;   /* active navigation/background tint */
--on-primary: #ffffff;
--accent-fresh: #2e9e4b;   /* open/success */
--accent-warm: #e85d2c;    /* sale/discount */
--text: #f6e7d5;           /* cream primary text */
--text-muted: #c9af97;
--text-faint: #9b7e67;
--success: #2e9e4b;
--error: #e5533d;
--warn: #e8a33c;
--info: #4aa3c9;
--radius: 1rem;
```

Use semantic classes/tokens rather than random colors. The page background is deep roasted brown, the shell/sidebar is dark brown, cards are warm brown, borders are muted brown, and the primary action is orange. Green indicates open/success, red-orange indicates discount/sale, yellow indicates warnings, and blue indicates information. Do not introduce gradients or a second unrelated palette.

### Typography

- Use the existing Outfit font variable for body and headings.
- Body text is cream or muted cream, with relaxed readable line height.
- Headings are bold/extrabold and compact.
- Labels and metadata use muted/faint cream.
- Keep one primary font family; do not add decorative fonts.

### Shell layout

`AppShell` is the shared layout for all three roles:

- Desktop: fixed/sticky left sidebar, width approximately `16rem`, full viewport height, surface background, right border.
- Sidebar header: 64px logo in a rounded square/object-contain treatment, role brand name, and “CFD Treats Hub”.
- Sidebar links: rounded-xl rows, icon + label + optional badge. Active link uses `bg-primary-soft text-primary font-semibold`; inactive links use muted text and `bg-bg-muted` on hover.
- Main content: flexible width, `PageContainer` constrains content to a comfortable max width with responsive horizontal padding.
- Mobile: sticky top bar with logo, role title, cart shortcut where applicable, and menu button.
- Mobile: fixed bottom navigation shows the first five role links; active link is orange.
- Mobile drawer: surface panel from the left with the complete navigation and logout.
- Logout: signs out, routes to `/login`, and refreshes the router.
- Branding: if a valid six-digit campus theme color exists, it temporarily overrides `--primary` and `--primary-hover` for the current shell.

### Components and interaction patterns

- Cards are warm surface panels with rounded corners and warm borders.
- Primary buttons are orange with cream/white text; secondary actions are outlined.
- Statuses should use badges/chips with semantic colors.
- Tables/lists need loading, empty, error, and mobile-responsive states.
- Forms must show field labels, validation, disabled/loading states, and accessible error text.
- Use icons consistently, approximately 20–24px, from Lucide or the chosen icon library.
- Keep destructive actions behind confirmation and record them in the audit log.

## 4. Authentication and roles

### Customer flow

1. Customer enters an email on `/login`.
2. Firebase sends a passwordless email link with `handleCodeInApp: true` and a redirect to `/verify` on the current origin.
3. `/verify` validates the link, recovers the email from browser storage or prompts for it when opened on another device.
4. Firebase returns an ID token.
5. The client POSTs the ID token to `/api/auth/session`.
6. The server verifies the ID token with Firebase Admin and creates an HTTP-only `firebase_session` cookie.
7. Server pages read and verify the session cookie before loading user data.
8. New users are sent to `/register`; existing users go to `/`.

Never expose service-account credentials in browser code. The Firebase Web API key is public, but Admin private key/client email/project credentials are server-only.

### Role checks

Create one server-side authorization function used by every protected route:

```ts
// conceptual shape
requireRole("admin");
requireRole("manager");
requireRole("customer");
```

For managers, also check assigned campus/restaurant on every query. For customers, always scope orders, carts, profiles, notifications, and tracking records to the authenticated user ID. Do not rely on hidden UI links for authorization.

### Database-reset behavior

If the database is empty, normal role resolution cannot identify an admin. A temporary UI-only preview mode may render `/admin` without data, but it must be disabled in production and must never grant real data access or mutation privileges.

## 5. Data model blueprint

Use these core collections/tables. Exact field names can be adapted, but relationships and ownership rules should remain:

- `users` / auth users: provider ID, email, created time.
- `profiles`: user ID, full name, email, role, campus ID, restaurant ID, phone, status.
- `campuses`: name, active flag, `shift_active`, `delivery_active`, collection room, theme color, pre-order configuration.
- `restaurants`: campus ID, name, description, logo, active flag, manager ID.
- `item_categories`: name, sort order, active flag.
- `items`: campus ID, restaurant ID, category, name, description, image, price, stock quantity, active flag, `is_preorder`.
- `orders`: user ID, campus ID, restaurant ID, status, payment method, subtotal, discount, charges, total, delivery/collection details, timestamps.
- `order_items`: order ID, item ID, item name snapshot, unit price snapshot, quantity, line total.
- `preorders`: user ID, campus ID, item/order details, scheduled date/time, status.
- `discounts`: owner scope, title/code, type, value, minimum/order rules, start/end dates, active flag, usage limits.
- `vouchers`: code, value/type, validity, usage count/limit, user/campus scope, active flag.
- `charges`: campus/scope, type, amount, active flag.
- `notifications`: recipient/audience, title, body, type, read flag, timestamps.
- `push_subscriptions`: user ID, endpoint, keys, browser/device metadata.
- `audit_logs`: actor ID, role, action, entity type/ID, metadata, IP/request ID, timestamp.
- `branding_settings`: campus ID, logo URL, theme color, contact/payment instructions.
- `shift_summaries`: campus ID, opened/closed by, totals, start/end timestamps.

Use foreign keys/references, indexes for campus/user/status/time queries, uniqueness for voucher codes, and transactional order placement. Never calculate authoritative prices from client-submitted totals.

## 6. Dynamic behavior by panel

### Admin dashboard

At render time, load the active admin campus, campuses list, today’s orders, revenue, COD total, prepaid total, and low-stock items. Display four summary cards:

1. Today’s Orders
2. Revenue
3. COD / Pre-paid
4. Low Stock Items

Below cards, render shift control and compact pre-order control. Dashboard queries should be server-side and scoped to the selected campus.

### Shift control

- Admin selects campus if allowed.
- Opening a shift enables customer ordering for that campus.
- Closing a shift prevents new orders but preserves existing orders and tracking.
- Customer menu reads `campus.shift_active`; default behavior should be explicit, not silently assumed.
- Every change records actor, campus, old value, new value, and timestamp.

### Restaurants, categories, inventory

- Restaurant activation controls whether its items appear to customers.
- Categories are globally available in the current menu implementation, then items are ordered by category/name.
- Inventory updates affect item availability and low-stock dashboard counts.
- Prevent ordering inactive, out-of-stock, or hidden items on the server even if the UI is stale.
- Preserve item name/price snapshots in order items so historical orders do not change when a catalog item changes.

### Orders and pre-orders

- Status transitions should be explicit and validated, for example: `pending → accepted → preparing → ready → completed`, with cancellation paths.
- Manager sees only assigned operational scope; admin sees global or selected-campus scope.
- Customer sees only their own orders.
- Every status update records actor and timestamp.
- Pre-orders need scheduled time/date validation, campus shift/pre-order window validation, and separate filtering from immediate menu items.

### Discounts and vouchers

- Apply only active rules within validity dates.
- Validate minimum subtotal, campus/restaurant scope, user eligibility, usage limit, and aggregate quantity/value server-side.
- Recompute subtotal, discount, charges, and total on the server.
- Prevent duplicate redemption with a transaction/idempotency key.

### Manager operations

- `/manager` loads today’s orders in the manager’s assigned scope.
- Order detail actions update status and optionally add operational notes.
- Discounts are scoped to the manager’s permitted restaurant/campus.
- Notifications require server authorization, message length validation, rate limiting, and delivery/error reporting.
- End-shift calculates summary totals and closes only the manager’s permitted shift scope.

### Customer operations

- Home menu filters inactive restaurants and immediate-order items, groups by category, and exposes delivery/collection information.
- Cart badge is derived from line quantities.
- Cart submit must validate item existence, active state, inventory, quantity, current price, discounts, charges, and campus.
- Order tracking must enforce `order.user_id == session.user.id`.
- Notifications must enforce recipient ownership or authorized audience.

## 7. API/server actions blueprint

Existing server concerns include:

- `/api/auth/session`: verify Firebase ID token and set/delete `firebase_session`.
- `/api/order/place`: authoritative order placement.
- `/api/order/rate`: customer rating after eligible order completion.
- `/api/cart/data`: cart-related server data.
- `/api/shift`: shift reads/updates.
- `/api/shift-control`: administrative shift controls.
- `/api/push/subscribe`: save browser push subscription.
- `/api/push/send`: authorized notification delivery.
- `/api/admin/create-manager`: admin-only manager creation.

For every endpoint: validate input with a schema, authenticate first, authorize scope second, use parameterized/database-safe operations, return generic client errors, log detailed server diagnostics without secrets, and add idempotency for mutations that can be retried.

## 8. Rebuild checklist for Antigravity

1. Create Next.js App Router TypeScript project.
2. Recreate the color tokens and Outfit typography above.
3. Build `AppShell`, `PageContainer`, `AdminShell`, `ManagerShell`, and `CustomerShell` first.
4. Create all routes listed in this document, including empty/loading/error states.
5. Implement Firebase email-link auth and one server session strategy.
6. Recreate the data model and role/campus/restaurant authorization.
7. Build admin pages in this order: dashboard, shift, restaurants/categories, inventory, orders, managers/campuses, discounts/vouchers, reports, users/audit, branding/contact.
8. Build manager pages and scope every query to the manager assignment.
9. Build customer menu, preorder, cart, checkout, orders, tracking, notifications, and profile.
10. Add server-side order/discount/inventory validation and audit logging.
11. Add responsive desktop sidebar, mobile top bar, drawer, and bottom tabs.
12. Test with three accounts: admin, manager, customer; also test empty database and unauthorized IDs.
13. Configure deployment runtime variables separately from browser variables; never commit secrets.

## 9. Visual acceptance criteria

A rebuild matches the current UI when:

- The overall background is deep roasted brown, not black or white.
- Cards/sidebar use warm brown surfaces with muted brown borders.
- Orange is the dominant action/accent color.
- Text is cream with muted/faint cream hierarchy.
- Desktop has a 16rem left sidebar and responsive content area.
- Mobile has a sticky top bar, drawer navigation, and bottom tabs.
- Active nav rows use a dark orange-tinted background and orange text.
- Customer cart quantity appears as an orange circular badge.
- All panels use the same logo, border radius, spacing rhythm, icon treatment, and typography.
- Empty/error/loading states are intentional and do not expose raw database or credential errors.

## 10. Security warnings

- Rotate any Firebase service-account key or magic-link code that has been shared publicly.
- Do not copy `.env.local`, private keys, service-account JSON, or session cookies into the new project or documentation.
- Disable temporary admin preview mode before production.
- Do not use client-only role checks or localStorage as the source of authorization.
- Do not trust client totals, prices, stock, discount values, or user IDs.

This document intentionally contains no credentials or live tokens.
