# The recruitment program

> ## ⛔ RETIRED — do not build from this document
>
> This describes the **0016 comment→DM→invite loop**: a reel goes up, someone
> comments "celestual", ManyChat DMs them a signing link, they sign, they get a
> tracking link. **0017 replaced that entire front door** with the self-serve
> signup at `celestual.us/trial`, and the code it depended on is gone:
> `supabase/functions/celestual-recruit` is deleted, `/recruit` redirects to
> `/trial`, and `openInvite` / `signAgreement` are removed from
> `app/src/api/recruit.js`.
>
> **Live runbook: [FIRST-LIGHT-TRIAL.md](./FIRST-LIGHT-TRIAL.md).**
>
> Kept only for the reasoning behind the *counting* model, which is unchanged and
> still in use: `celestual_recruit_visits`, `celestual_recruit_signups`, and the
> stats RPC are exactly what the trial's four-letter links run on today.

> **RETIRED (First Light, migration 0017).** The comment → DM → invite loop
> described here is no longer the way in: candidates now register on
> **`celestual.us/trial`** (email verification, in-app signature, a chosen
> four-letter code, root-level links `celestual.us/<code>`), and `/recruit`
> redirects there. The counting layer this doc specifies — `celestual_recruits`,
> the visit/attribute/stats RPCs — lives on unchanged underneath the trial.
> Current guide: **[FIRST-LIGHT-TRIAL.md](./FIRST-LIGHT-TRIAL.md)**. The
> ManyChat wiring below is kept for reference only.

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

Check it's up: `GET` the function URL returns
`{"ok":true,"service":"celestual-recruit"}`.

### 3. Build the automation

In ManyChat → **Automation → New Automation → Instagram → Comments**:

1. **Trigger**: *User comments on a post*. Pick the recruitment reel. Keyword:
   `celestual`. Set it to fire **every time**, not once per contact.
   > A "once per contact per 24h" trigger silently drops the second attempt, and
   > people re-comment when a DM doesn't arrive. This is the same trap
   > documented for the verification flow.
2. **Action → Send Message**: one short opening DM. ManyChat requires the
   contact to be opted in before an External Request's reply can be delivered,
   so this first message is what opens the thread.
3. **Action → External Request**:
   - Method: `POST`
   - URL: your `celestual-recruit` function URL
   - Header: `X-Celestual-Token: <MANYCHAT_SHARED_SECRET>`
   - Body (JSON), using the `+` field picker:
     ```json
     { "username": "{{instagram.username}}", "subscriber_id": "{{contact.id}}" }
     ```
   - **Response Mapping**: map JSONPath `$.reply` to a text field.
4. **Action → Send Message**: send that mapped field.

Every response carries `reply`, including the failure paths, so the automation
always has something to say.

### 4. What the DM says

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
