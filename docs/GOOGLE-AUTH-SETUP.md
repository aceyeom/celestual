# Google sign in, and the mailed code: setting it up

The wall at the root of the site, and the campus wall at `/berkeley`, take two
new ways in since migration 0057: a Google account, and a six digit code mailed
to any address. Both run on Supabase Auth, which the product uses for nothing
else. This is every step, in order, written for somebody doing it for the first
time. It takes about twenty minutes and nothing in the code has to change.

What you will end up with:

- a Google "OAuth client" (a pair of keys that lets Google send people back to
  celestual after they pick an account)
- Supabase told about those keys, so it can accept Google logins
- Supabase told where it may send people back to (your site's addresses)
- the code email set to carry a six digit code instead of a link
- migration 0057 applied to the database

---

## 1. Apply the migration

The schema has to know about the two proofs before anybody can use them.

```
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste `supabase/migrations/0057_the_wall_for_everybody_and_the_login.sql`
into the SQL editor at **Supabase → SQL Editor → New query** and run it. It is
re-runnable. (0056 should already be applied; if not, run it first.)

---

## 2. Make a Google OAuth client

This is the part that lives on Google's side. You need a Google account; any
will do, but use the one you want to own the app.

1. Go to **https://console.cloud.google.com/** and sign in.
2. At the top, open the project picker and press **New project**. Name it
   `celestual`. Press **Create**, then make sure it is selected.
3. In the left menu go to **APIs & Services → OAuth consent screen**.
   - Choose **External** and press **Create**.
   - App name: `celestual`. User support email: your address. App logo: skip
     for now. Under **App domain**, application home page: `https://celestual.us`.
     Authorised domains: add `celestual.us` and `supabase.co`. Developer
     contact: your address. Press **Save and continue**.
   - Scopes: press **Add or remove scopes**, tick `.../auth/userinfo.email`
     and `.../auth/userinfo.profile` and `openid`. Save and continue.
   - Test users: skip. Save and continue. Back to dashboard.
   - Press **Publish app** so anybody can sign in, not only test users.
4. Now **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**. Name: `celestual web`.
   - Under **Authorised redirect URIs** press **Add URI** and paste the
     callback address from Supabase. It looks like
     `https://<your-project-ref>.supabase.co/auth/v1/callback`. You can copy
     it exactly from Supabase in step 3 below (it is shown on the Google
     provider's panel), so do step 3 first if you prefer.
   - Press **Create**. A box shows a **Client ID** and a **Client secret**.
     Keep this box open, or copy both somewhere private.

---

## 3. Tell Supabase about Google

1. Open your project at **https://supabase.com/dashboard**.
2. **Authentication → Providers → Google**. Switch it on.
3. Paste the **Client ID** and the **Client secret** from step 2.
4. The panel shows the **Callback URL (for OAuth)**. If you have not already,
   put that exact address into the Google client's authorised redirect URIs
   (step 2, part 4). Press **Save**.

---

## 4. Tell Supabase where it may send people back to

After somebody picks a Google account, Supabase sends them back to the page
they were on. It only sends people to addresses you have allowed.

1. **Authentication → URL Configuration**.
2. **Site URL**: `https://celestual.us`.
3. **Redirect URLs**: press **Add URL** for each of these:
   - `https://celestual.us/gate`
   - `https://celestual.us/berkeley/gate`
   - `https://celestual.us/**` (a wildcard, so a preview at another path works)
   - `http://localhost:5173/**` (so it works on your own machine)
   - if you use Vercel previews: `https://*-<your-team>.vercel.app/**`
4. Save.

---

## 5. Make the email a code, not a link

The "continue with email" door mails a six digit code. Out of the box Supabase
mails a link instead, so the template has to include the code.

1. **Authentication → Email Templates → Magic Link**.
2. Replace the body with something like:

```html
<h2>your code</h2>
<p>type this back into celestual and the wall opens.</p>
<p style="font-size:32px;letter-spacing:8px"><strong>{{ .Token }}</strong></p>
<p>it lasts one hour. if you did not ask for it, ignore it and nothing happens.</p>
```

   `{{ .Token }}` is what turns the mail into a code. Save.
3. **Authentication → Providers → Email**: make sure **Enable Email provider**
   is on, and **Confirm email** can stay off (the code is the confirmation).
4. Optional but recommended for real volume: **Project Settings → Auth → SMTP
   Settings**, and put in the Resend credentials the product already uses for
   the campus code, so the mail comes from `celestual` rather than from
   Supabase's shared sender, which is rate limited to a few mails an hour.

---

## 6. Check it

1. Run the site (`npm run dev`) or open the deployed one.
2. Open `/gate`. You should see three rows: instagram, google, email.
3. Press **continue with google**. Google's account picker opens; pick one. You
   land back on `/gate` and the sheet shows your address as signed in.
4. Press **continue with email**, type an address, press **send me a code**.
   The mail arrives with six digits; type them; the sheet signs you in.
5. Open `/berkeley/gate`. Under the address field there is **sign in with your
   berkeley.edu google**. A berkeley.edu Google account opens the composer; any
   other Google account signs in as a reader and the sheet says a
   `berkeley.edu` address is what writes there.

If Google says **redirect_uri_mismatch**, the callback URL in step 2 does not
match the one Supabase shows in step 3, character for character. If Supabase
sends you back to the site root rather than the gate, the gate's address is
missing from step 4. If the mail arrives as a link with no digits, step 5's
template does not contain `{{ .Token }}`.

---

## What it does not change

- Nobody becomes a Supabase Auth user in the product's sense. The Google or
  email session is spent once, to bind the proof to the browser's own row
  (`celestual_user_bind_login`, reading the proof off the verified JWT), and
  then signed out locally. The product's session stays the token
  `api/identity.js` mints.
- Instagram, proved by one DM, is still the door that lets the product tell
  somebody a ping is mutual, which is why the gate recommends it.
- The campus wall still writes by the campus. A Google account at
  `berkeley.edu` proves the campus because Google is the campus's own mail; a
  Google account anywhere else opens reading only.
- Nothing about any of this is attached to a letter.
