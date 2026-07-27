# The recruitment program

**comment → DM → agreement → a personal tracking link.**

A recruitment reel goes up with ad spend behind it. People enter by commenting
**`celestual`** under it. That comment auto-sends them a DM with the rules and an
agreement to sign. The moment they sign, they get a personal tracking link, and
every open and every signup that comes through it is counted against them, so we
can see who is actually bringing people in.

Nothing in this program can see who anyone pinged. It never touches
`celestual_entries`; the double blind is untouched.

---

## The pieces

| Piece | Where |
| --- | --- |
| Schema, RPCs, the opt-out wipe | `supabase/migrations/0016_recruit_program.sql` |
| The comment webhook | `supabase/functions/celestual-recruit/index.ts` |
| Client calls | `app/src/api/recruit.js` |
| The agreement + the numbers | `RecruitScreen` in `app/src/components/screens.jsx` |
| The rules copy | `recruit.*` in `app/src/i18n/strings.js` |

## The routes

| Route | What it is |
| --- | --- |
| `/recruit#t=<token>` | the agreement, opened from the DM. One-time token, 14 days. |
| `/recruit#c=<code>&k=<key>` | a signed recruit's own numbers, on any device |
| `/r/<code>` | the tracking link itself. Lands on the cold landing and remembers the code. |

Both secrets ride the URL **fragment**, so neither can appear in an access log,
and both are hashed in the browser before they touch the network. Same
discipline as the sign-in link (0013) and the emailed code (`/copy#c=`).

---

## Wiring the ManyChat comment automation

The reel's comments are the trigger. ManyChat is already connected to the
Instagram account for DM verification (`docs/MANYCHAT-SETUP.md`); this reuses
that connection and the same shared secret.

### 1. Set the secret

The function reads `MANYCHAT_SHARED_SECRET`, the **same** one
`celestual-manychat` uses. If it's already set, there is nothing to do.

```
Supabase → Edge Functions → Secrets
  MANYCHAT_SHARED_SECRET   (already set for celestual-manychat)
  CELESTUAL_SITE_URL       https://celestual.us     (optional, this is the default)
```

### 2. Deploy

```bash
supabase functions deploy celestual-recruit
supabase db push          # applies 0016_recruit_program.sql
```

Check it's up:

```bash
curl https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-recruit
#  {"ok":true,"service":"celestual-recruit"}
```

Then prove the whole backend half before touching ManyChat, by pretending to be
it (use a throwaway @ so you don't burn a real one into the table):

```bash
curl -s -X POST https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-recruit \
  -H 'Content-Type: application/json' \
  -H 'X-Celestual-Token: <MANYCHAT_SHARED_SECRET>' \
  -d '{"username":"test.recruit"}'
```

You should get `{"ok":true,"status":"invited","reply":"You're in. Here's how it
works. …"}` with a `celestual.us/recruit#t=…` link in it. Open that link: the
agreement should render. A `401` here means the header secret does not match the
Supabase secret, and nothing in ManyChat will fix that.

### 3. Build the automation

In ManyChat → **Automation → New Automation**, add the Instagram trigger
**"User comments on your post"**.

**Node order matters here.** The External Request goes **before** the message,
and there is exactly **ONE** message node in the whole flow:

```
  Trigger: comment on the reel, keyword "celestual"
     │
     ├─ Action · External Request   ← mints the token, returns the DM text
     │
     └─ Send Message: {{celestual_reply}}   ← the ONE private reply
```

> **Why one message.** Instagram allows **one private reply per comment**. An
> "opening DM" followed by a second message carrying the link would spend that
> one reply on a greeting and leave the link undeliverable until the person
> writes back. An External Request is a server call, not a message, so putting
> it first costs nothing and lets the single reply carry the rules and the link
> together.

**Step 1 — the trigger.**

- Pick the recruitment reel.
- Condition: **comment contains** `celestual`.
- Set it to trigger **every time**, not once per contact.
  > A "once per contact per 24h" setting silently drops the second attempt, and
  > people re-comment when a DM doesn't arrive. Same trap as the verification
  > flow (docs/MANYCHAT-SETUP.md §4).
- Optionally also enable the **public comment reply** ("sent, check your DMs").
  A public reply is not a private reply, so it costs nothing here, and it is
  free social proof under an ad.

**Step 2 — the External Request.** Add **Action → External Request**:

- **Request type:** `POST`
- **URL:** `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-recruit`
- **Headers:**
  - `Content-Type`: `application/json`
  - `X-Celestual-Token`: the exact `MANYCHAT_SHARED_SECRET` value
- **Body** — raw JSON, inserting the fields with the **`+` picker** (pick them,
  don't type the placeholders, or they won't resolve):

  ```json
  {
    "username": "{{Instagram Username}}",
    "subscriber_id": "{{Contact Id}}"
  }
  ```

  `username` is required. `subscriber_id` is optional (audit trail only).

- **Response Mapping:** map JSONPath **`$.reply`** to a new custom field, e.g.
  `celestual_reply`.

**Step 3 — the one message.** Add a **Send Message** node after the request
containing just `{{celestual_reply}}`.

Every response carries `reply`, including the failure paths, so the automation
is never left with nothing to say.

**Step 4 — set it LIVE.** Drafts don't fire.

### 4. What that one DM says

| Their state | `status` | The DM |
| --- | --- | --- |
| first comment | `invited` | the rules, and `celestual.us/recruit#t=<token>` |
| already signed | `signed` | their tracking link again |
| we couldn't read the account | `no_username` | comment again |
| our side failed | `error` | comment again in a minute |

---

## What signing records

`celestual_recruit_sign` writes: the Instagram @ (Meta-authenticated, never
typed), the agreement **version**, the name typed as the signature, and the
timestamp. A signature always records the version it signed, so changing the
rules never silently re-points an old signature at new terms.

**Changing the rules**: bump `c_agreement` in `celestual_recruit_sign` **and**
the `recruit.rule*` copy in `strings.js`, in the same change.

## What gets counted, and what doesn't

- **An open** is one integer per code per day. No IP, no user agent, no visitor
  id. Rate-limited per IP through the existing attempts table so a loop can't
  inflate a recruiter's numbers.
- **A signup** is `(code, handle)`, written only once the person has actually
  **verified** their handle. The primary key makes double-counting impossible,
  the server refuses a handle it has never verified, and a recruiter cannot
  credit themselves.
- **Nothing else.** No profile of the visitor, no path through the app, and no
  connection whatsoever to who anyone pinged.

## The opt-out reaches it

`celestual_suppress` (extended in 0016) erases a person's recruit record, the
traffic counted against their code, and any credit they gave someone else. The
public opt-out at `/optout` still needs no account and no login.

## Operating it

Who's actually bringing people in:

```sql
select r.handle,
       r.code,
       coalesce(v.opens, 0)   as opens,
       coalesce(s.signups, 0) as signups
  from celestual_recruits r
  left join (select code, sum(n) opens    from celestual_recruit_visits  group by code) v using (code)
  left join (select code, count(*) signups from celestual_recruit_signups group by code) s using (code)
 where r.status = 'signed'
 order by signups desc nulls last, opens desc;
```

Pulling someone's link (they broke a rule): set their row to `status='invited'`
and null the `code`. Existing `/r/<code>` links stop resolving, and
`celestual_recruit_attribute` stops crediting them.

```sql
update celestual_recruits set code = null, status = 'invited' where handle = '<handle>';
```
