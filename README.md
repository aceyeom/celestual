# CELESTUAL

**CELESTUAL** — "does your ex still think about you?" — is an anonymous,
reciprocal matching site. Live at **https://celestual.us/**.

You enter your Instagram @ and your ex's @. You only find out it's mutual if
**they** independently enter **you** — anonymous, zero-rejection. One-sided
entries are never revealed.

It's a Vite + React SPA talking directly to **Supabase** (no app server).

```bash
cd still-app && npm install && npm run dev   # demo mode: enter @demo to see a match
```

```bash
npm run build        # CELESTUAL → dist/
```

`vercel.json` serves `dist/` at the root.

---

## Get started

- **Code & local dev:** [`still-app/README.md`](./still-app/README.md)
- **Go live:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Auth & payments setup:** [`SETUP-AUTH-AND-PAYMENTS.md`](./SETUP-AUTH-AND-PAYMENTS.md)
- **Backend:** `supabase/migrations/` (RPC + RLS) and
  `supabase/functions/still-notify/` (match emails via Resend)

---

## Repository layout

```
still-app/            CELESTUAL — the Vite + React SPA (served at /)
supabase/
  migrations/         schema, RPCs, RLS (still_* objects)
  functions/          still-checkout (paywall), still-notify (match emails),
                      still-search (Instagram @ typeahead)
package.json          repo-root build (still-app → dist/)
vercel.json           SPA routing
DEPLOYMENT.md         go-live guide
SETUP-AUTH-AND-PAYMENTS.md   Instagram sign-in + payments setup
```

> Note: the database objects use a `still_*` prefix and the edge functions are
> named `still-*` — that's the project's internal codename, retained so the
> live schema and deployed functions stay stable. The product/brand is CELESTUAL.
