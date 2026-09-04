# CELESTUAL — The mutual DM: telling someone on Instagram, end to end

The product's whole job is one sentence delivered to one person:

> ✦ You and @blah are mutual. They left a card for you. Read it at https://celestual.us

This is how that sentence reaches somebody through Instagram, using the same
ManyChat automation that already relays verification codes. It is the operator
guide: what it is, **whether it actually works** (§1 — read that first, it is
the part with a constraint in it), and then the steps to get it live.

Written for a beginner, top to bottom. ~25 minutes, and about half of it is
things you have already done once in
[MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md).

> **Your specific values** (used throughout):
>
> | Thing | Value |
> | --- | --- |
> | Instagram account people DM | `@celestual.us` |
> | Supabase project ref | `vwbsjwaqnycyghvwlxhd` |
> | The relay (already live) | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat` |
> | The new drain | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-mutual-dm` |
> | The migration | `supabase/migrations/0023_the_mutual_dm.sql` |
> | The 2 secrets it needs | `MANYCHAT_SHARED_SECRET` (you already have it) · `MANYCHAT_API_TOKEN` (new) |

---

## 0. The 30-second mental model

```
   somebody enters somebody back          Supabase                 ManyChat / Instagram
   ─────────────────────────────          ────────                 ────────────────────
   celestual_submit(bob → alice)
        │
        ├─ both rows flip to matched, in the same statement
        ├─ bob's screen says so immediately (this always worked)
        ├─ email queued for BOTH sides, at addresses they stored
        └─ celestual_dm_outbox: one row per person
                    │
                    ├── is alice's 24-hour window open? ──── yes ──▶ celestual-mutual-dm
                    │   (did she DM us in the last 23h)                    │
                    │                                          ManyChat sending API
                    │                                                     ▼
                    │                                            alice gets the DM now
                    │
                    └── no ──▶ it waits. The next time alice messages
                               @celestual.us about ANYTHING, the relay's
                               reply carries it (celestual-manychat).
```

Two carriers, one queue, and a row leaves the queue exactly once whichever
carrier gets there first.

---

## 1. Does this actually work? Yes, with one constraint — and it shapes everything

**A business cannot DM an Instagram user whenever it likes.** This is Meta's
rule, not ManyChat's, and no tool gets around it:

| Route | What it gives you | Can we use it? |
| --- | --- | --- |
| **The 24-hour standard messaging window** | A person messages you; you may reply freely for 24 hours | **Yes.** This is the entire mechanism below. |
| **`HUMAN_AGENT` tag** | Stretches the window to 7 days | **No.** Meta's policy is explicit that it is for a *human agent* answering a person's issue, not automation, and misuse is detected and penalised. It also needs its own permission from the app dashboard. An automated match notification is exactly what it is not for. |
| **The four standard message tags** (account update, post-purchase, confirmed event, …) | Sending outside the window for specific business cases | **No.** None of them describes this, and Meta bans tags for anything promotional or unsolicited. |
| **Marketing Messages API** (replaced Recurring Notifications in Feb 2026) | Opt-in marketing sends outside the window | **No, not for this.** It is paid, rolled out to limited countries, capped at one message per subscriber per 48 hours, and reaches only people who explicitly opted in to marketing. A once-in-a-lifetime reveal is not a marketing broadcast and should not ride a marketing channel. |

So: **there is no compliant way to make a match ring somebody's phone the
instant it happens.** Anybody who tells you otherwise is describing something
that will get the Instagram account restricted.

What there *is* — and what this ships — is a queue with two legal carriers:

**A. The push, when the window happens to be open.** `celestual_dm_due` returns
only rows whose person messaged us inside the last **23 hours** (one hour of
margin, because the timestamp we hold is when ManyChat relayed the message, not
when Meta received it). Those are ordinary replies inside a window that person
opened, and they need no tag at all.

**B. The reply, for everybody else.** The news sits in the queue, and the next
time that person messages `@celestual.us` about anything at all, the relay's
answer carries it. Replying to a message somebody just sent is always inside the
window. **This is the carrier that does the real work**, and the honest reason
is arithmetic: most people's last DM to you was their verification, days or
weeks ago.

**C. And the email goes out in parallel, immediately**, to both sides, at any
address they stored (§4 covers what changed there). It does not wait for
Instagram and it does not care about windows.

### What to actually expect

| Their situation | What happens |
| --- | --- |
| They verified, or messaged the account, in the last 23 hours | DM within a minute of the match |
| They messaged us longer ago than that (the common case) | Email immediately. DM the next time they message the account — verifying on a new phone counts, and so does "hi" |
| They never message us again, but left an email | Email only. Same as today, plus the card line |
| Neither | The app tells them, exactly as it does now. Nothing is lost — the row waits 120 days |

A note worth keeping in view: the reveal was **never** delivered by DM before
this, and the app has always told the person who was looking. This adds a
channel for the person who is *not* looking. It does not replace anything.

**Sources for the rules above:**
[Messenger Platform & IG Messaging policy](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy) ·
[Instagram API overview](https://developers.facebook.com/docs/instagram-platform/overview/) ·
[ManyChat: sending outside the 24-hour and 7-day windows](https://help.manychat.com/hc/en-us/articles/14281199732892-How-to-send-messages-outside-the-24-hour-and-7-day-windows-in-Messenger-and-Instagram) ·
[Instagram Messaging 24-hour window guide (2026)](https://www.keyapi.ai/blog/instagram-messaging-api-policy/) ·
[Recurring Notifications → Marketing Messages, 2026](https://chatbotx.io/blog/facebook-recurring-notifications-meta-marketing-messages-the-complete-2026-guide-for-businesses/)

---

## 2. What the DM is allowed to say

The line names the pair, and says **whether** a card is waiting. It never
carries a word of the card. That is not a style choice — it is the same seal
migration 0022 put on the words themselves: a card is read once, in the
product, by the person it was written to. A DM is a screenshot, a notification
preview on a lock screen, a phone somebody else is holding.

There are exactly two forms:

```
✦ You and @blah are mutual. They left a card for you. Read it at https://celestual.us

✦ You and @blah are mutual. You each entered the other. It’s waiting at https://celestual.us
```

The second is for a mutual where the other person wrote no card. Both are true
sentences about something that actually happened, which is the standard every
line in this product has to meet (VOICE.md §4, and the FTC v. NGL note in
ULTIMATE-PRODUCT-FRAMEWORK §6.2). Note there is **no exclamation mark** — the
voice does not have one (VOICE.md §5), and `npm run lint:voice` would fail the
app copy for it.

Three at once is the ceiling; anything beyond is counted, not listed:

```
And 2 more waiting for you at https://celestual.us
```

---

## 3. What you need before you start

1. **The verification relay already live** — [MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md)
   §1–§5, working end to end. This guide extends that automation; it does not
   replace it.
2. **ManyChat on the Pro plan.** You already need this for the Instagram
   channel and External Requests. The sending API is the same plan.
3. **The Supabase CLI linked** (`supabase link --project-ref vwbsjwaqnycyghvwlxhd`).
4. **`RESEND_API_KEY` / `CELESTUAL_FROM_EMAIL` set**, if you want the email half
   (you almost certainly already have these — they are what
   `celestual-notify` has always run on).

---

## 4. Apply the migration

```bash
supabase db push          # applies 0023_the_mutual_dm.sql
```

or paste `supabase/migrations/0023_the_mutual_dm.sql` into the SQL editor and
Run. It is re-runnable and safe on top of 0001→0022.

What it changes, in one glance:

| | |
| --- | --- |
| `celestual_dm_contacts` | new. handle ⇄ ManyChat contact id + the last time they messaged us |
| `celestual_dm_outbox` | new. One row per person per match, delivered once |
| `celestual_submit` | queues both DMs and now queues email for **both** sides |
| `celestual_notifications.has_card` | new column, so the email can say a card is waiting |
| `celestual_erase_account` / `celestual_suppress` / `celestual_admin_delete_user` | also erase the two new tables |

**The email change is worth reading twice**, because it is the half that works
without Instagram at all:

- Before: only the **earlier entrant** was emailed, and only if they had left an
  address **on that particular ping**.
- Now: **both** sides are emailed, and an address bound at verification
  (`celestual_recovery`, migration 0013 — the same one the sign-in link uses)
  counts. Somebody who verified with their email and then placed a ping without
  retyping it is now reachable, and before they were not.
- Unchanged, deliberately: **no request can name where somebody else's reveal is
  sent.** The other person's mail only ever goes to an address *they* stored. A
  request may name its own sender's address, which is theirs, on their own ping,
  carrying a reveal the same call already returned to them on screen.

Verify it landed:

```sql
select count(*) from celestual_dm_outbox;                  -- 0, and no error
select value from celestual_settings where key='mutual_dm_enabled';   -- true
```

---

## 5. Get the ManyChat API token and set the secret

This is the only genuinely new credential.

**Step 1 — copy the token.** ManyChat → **Settings → API** → *API Key* (Pro
plan). It looks like `1234567:abcdef0123456789…`.

⚠ This token can send a DM from your account without anyone asking. Treat it
exactly like `MANYCHAT_SHARED_SECRET`: never in the repo, never in the browser,
rotate it if it leaks.

**Step 2 — store it:**

```bash
supabase secrets set MANYCHAT_API_TOKEN="paste-the-token-here"
```

**Step 3 — while you are here**, make sure the site URL is set, since it is
what the DM links to:

```bash
supabase secrets set CELESTUAL_SITE_URL="https://celestual.us"
```

---

## 6. Deploy the two functions

```bash
supabase functions deploy celestual-manychat  --no-verify-jwt   # updated
supabase functions deploy celestual-mutual-dm --no-verify-jwt   # new
supabase functions deploy celestual-notify                      # the card line
```

`celestual-mutual-dm` imports `supabase/functions/_shared/mutual.ts`, which
holds the copy and the ManyChat sender — the CLI bundles it automatically, and
`celestual-manychat` imports the same file, which is why the two carriers can
never say different things.

**Smoke-test the new one** in a browser:

```
https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-mutual-dm
```

| Browser shows | Meaning |
| --- | --- |
| `{"ok":true,"service":"celestual-mutual-dm","configured":true}` | deployed, and the API token is set |
| `…"configured":false` | deployed, but `MANYCHAT_API_TOKEN` is missing. Pushes are skipped; the reply path still delivers everything. Go back to §5 |
| `Missing authorization header` / `Invalid JWT` | redeploy with `--no-verify-jwt` |

---

## 7. Schedule the drain

The push only helps if something invokes it. Two ways, and doing both is right:

**A. A Database Webhook — fires the moment a match is made (recommended).**

Supabase Dashboard → **Database → Webhooks → Create a new hook**:

- **Table:** `celestual_dm_outbox`
- **Events:** `Insert`
- **Type:** HTTP Request → `POST`
- **URL:** `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-mutual-dm`
- **Headers:** `Content-Type: application/json`

(The same shape as the hook `celestual_notifications` uses for
`celestual-notify`, if you set that one up.)

**B. A sweeper, for the backoff retries.** Failed pushes wait 2m, 10m, 1h, 6h,
so something has to come back for them. In the SQL editor:

```sql
select cron.schedule(
  'celestual-mutual-dm',
  '*/10 * * * *',
  $$ select net.http_post(
       url := 'https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-mutual-dm',
       headers := '{"Content-Type":"application/json"}'::jsonb
     ) $$
);
```

**Overlapping drains are safe, and they will overlap** — a match inserts two
rows, so the webhook fires twice. `celestual_dm_due` does not read the queue, it
*claims* from it: each row it hands out is leased for five minutes and skipped
by anyone else, and a row that a crashed drain never sent simply comes back
around when its lease runs out. Nobody is told the same thing twice.

---

## 8. Update the ManyChat automation (one field), then add the second one

### 8.1 The verification automation — one edit

Open the automation you built in MANYCHAT-SETUP.md §4 and check the External
Request body. `subscriber_id` used to be optional; **it is now what makes a push
possible**, because it is the only way we learn which ManyChat contact a handle
is:

```json
{
  "username": "{{Instagram Username}}",
  "text": "{{Last Text Input}}",
  "subscriber_id": "{{Contact Id}}"
}
```

Insert the fields with the **`+` picker**, never by typing the placeholder.

**And that is the only edit.** The Response Mapping you already have —
`$.reply` → `celestual_reply` → a Send Message node — now carries the mutual
news too, appended under the verification line:

```
✦ @ace03d is verified on CELESTUAL — head back to the app to finish.

✦ You and @blah are mutual. They left a card for you. Read it at https://celestual.us
```

### 8.2 A second automation — so any message can carry it

This is the one that matters, because it is what catches the person whose
window closed weeks ago. Goal: *any* DM that isn't a verification gets whatever
is waiting.

1. New Automation → Instagram trigger. Either:
   - **Keyword** → `celestual`, `mutual`, or
   - **Default Reply** — and if you use it, open its settings and set it to
     trigger **"Every time"**, not the default once-per-contact-per-24-hours.
     (Same trap as verification: MANYCHAT-SETUP.md §4 Step 1.)

   > ⚠ **Never use `message contains` with a short word.** ManyChat's "contains"
   > is a raw substring match, not a word match. `contains` → `hi` fires on
   > *everyt**hi**ng*, *t**hi**s*, *w**hi**ch*, *not**hi**ng* — i.e. on most
   > sentences in English. That is exactly how this automation once answered a
   > stranger who wrote "good luck with everything in the future!". If you want
   > short greetings, use **`message is`** (exact match) with `hi`, `hey`, or
   > use Default Reply. Keep `contains` for strings nobody types by accident:
   > `celestual`, `star-`.
2. **Action → External Request:**
   - `POST` to `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat`
   - Headers: `Content-Type: application/json`, `X-Celestual-Token: <MANYCHAT_SHARED_SECRET>`
   - Body:

     ```json
     {
       "action": "check",
       "username": "{{Instagram Username}}",
       "subscriber_id": "{{Contact Id}}"
     }
     ```

3. **Response Mapping:** map **two** fields:
   - `$.reply` → `celestual_reply` (the text)
   - `$.send`  → `celestual_send`  (the permission)
4. **Condition node — required.** Between the request and the Send Message node,
   add a Condition: **`celestual_send` is `true`**. Only the true branch gets the
   **Send Message** node containing `{{celestual_reply}}`. The false branch ends
   the flow — no message, no typing indicator, nothing.
5. **Set it LIVE.** Drafts do not fire.

`action: "check"` skips code parsing entirely. Someone with news waiting gets
it. **Someone with nothing waiting gets nothing at all** — `reply` is empty and
`send` is `false`.

That silence is the point. This automation fires on ordinary DMs from anyone
who messages the account, and most of them have never used CELESTUAL: a
collaborator pitching themselves, somebody answering a human reply, a bot. It
used to answer all of them with "Nothing waiting yet. If someone you entered
enters you back, this is where you'll hear it." — a sentence about a product
they never signed up for, dropped into the middle of a real conversation. The
function cannot tell a member from a stranger on this path, so it no longer
tries to: it speaks when it has the news, and otherwise says nothing.

Without the Condition in step 4 the flow will try to send an empty message, so
do not skip it.

---

## 9. Test it end to end

**Step 1 — the backend alone, no Instagram.** In the SQL editor, with two test
handles you own:

```sql
-- pretend a match just happened
select celestual_submit('handle_a','handle_b','a@example.com', null, '{"words":"test"}'::jsonb);
select celestual_submit('handle_b','handle_a','b@example.com', null, '{"words":"back"}'::jsonb);

-- two DMs queued, two emails queued
select handle, other_handle, has_card, sent_at from celestual_dm_outbox order by handle;
select self_handle, other_handle, to_email, has_card from celestual_notifications order by self_handle;
```

**Step 2 — the reply path.** Pretend you are ManyChat relaying a DM:

```bash
curl -sX POST "https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat" \
  -H "Content-Type: application/json" \
  -H "X-Celestual-Token: YOUR-SHARED-SECRET" \
  -d '{"action":"check","username":"handle_a","subscriber_id":"123456789"}'
```

Expect:

```json
{"ok":true,"status":"mutual","reply":"✦ You and @handle_b are mutual. They left a card for you. Read it at https://celestual.us"}
```

Run it a second time and you get
`{"ok":true,"status":"nothing_waiting","reply":"","send":false}` — delivered
once, to one person, is the whole design, and there is nothing to say the second
time. Try it with a handle that has never used CELESTUAL and you get the same
silence: that is the check path refusing to talk to strangers.

**Step 3 — the push path.** The curl above just opened `handle_a`'s window (any
relayed message does). Queue something and drain it:

```bash
curl -sX POST "https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-mutual-dm"
# {"ok":true,"due":1,"pushed":1,"failed":0}
```

**Step 4 — the real thing.** From a test Instagram account: DM `@celestual.us`
anything at all, and watch the reply arrive. Then place the two pings from the
app and watch the DM land within a minute (your window is open — you just
messaged).

**Watch both sides while testing:**

- **ManyChat:** Automation → the flow → each contact's journey shows the
  trigger, the request, and what came back.
- **Supabase:** Edge Functions → Logs. The relay logs `dm_take`, the drain logs
  `pushed` / `push failed`. Handles are logged; nothing of any card ever is.

---

## 10. Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `{"ok":true,"due":0,"pushed":0}` forever, but rows are queued | Nobody's window is open — the normal state. Confirm with the query in §11; the reply path is what will deliver these. |
| `"configured":false` on the health check | `MANYCHAT_API_TOKEN` not set (§5). Pushes are skipped, nothing is lost. |
| Push fails with a ManyChat error mentioning the window / 24 hours | The contact's window closed between the queue and the drain. It backs off and stops after 5 tries; the reply path still has it. |
| Push fails with `subscriber not found` | The stored `subscriber_id` is not a ManyChat contact (usually: the field was typed by hand instead of picked, or it is an old Meta IGSID). Have that person message the account once — the next relay overwrites it with the right id. |
| Verification works, but no mutual news ever appended | `celestual_dm_take` is finding nothing. Check `select * from celestual_dm_outbox where handle='theirhandle'` — if it is empty, the match predates this migration (only new matches queue) or `mutual_dm_enabled` is false. |
| Nothing at all queues on a new match | `select value from celestual_settings where key='mutual_dm_enabled'` — if `false`, that is the kill switch (§11). |
| `attempts` is above 0 on a row that was delivered fine | Normal. Attempts are counted when a drain *claims* a row, not when one fails, so a clean push leaves 1 behind. `last_error` is what tells you something actually went wrong. |
| The DM arrives twice | It should be impossible from our side: a claim leases the row for five minutes, delivery is guarded by `sent_at`, and `(match_id, handle)` is unique. Two arrivals means two *rows* or two ManyChat sends — check whether both automations fired on the same message, and whether a Send Message node is in a loop. |
| The account auto-replies to strangers / interrupts a human conversation | The check automation's trigger is too broad — almost always `message contains` with a short word (`hi` matches "everyt**hi**ng"). Fix the trigger per §8.2, and confirm the flow has the `celestual_send` Condition: with it, a message to somebody with no news waiting produces no send at all. |
| The Send Message node errors, or an empty DM goes out | `$.send` is not mapped, or the Condition on `celestual_send` is missing (§8.2 step 4). `reply` is deliberately empty when there is nothing to say. |
| A person gets the news but their card link shows nothing | They are being told the truth and the app is the problem, not the DM. Check `celestual_counterpart_card` and that they are signed in as the matched handle. |
| Email now arrives for the person who placed the *second* ping | Working as designed since 0023 — both sides are told (§4). |

---

## 11. Operating notes

**The kill switch.** No deploy needed, takes effect on the next match:

```sql
update celestual_settings set value='false' where key='mutual_dm_enabled';
```

Email is unaffected — it is a separate queue and a separate promise.

**What is waiting, and how it will get there:**

```sql
select o.handle, o.other_handle, o.has_card, o.attempts, o.sent_via,
       (c.last_inbound_at > now() - interval '23 hours') as window_open
  from celestual_dm_outbox o
  left join celestual_dm_contacts c on c.handle = o.handle
 where o.sent_at is null
 order by o.created_at desc;
```

**Retention.** Delivered rows are kept 30 days, undelivered 120, then pruned by
the drain. Contacts idle for 400 days are dropped. An erase, an opt-out and an
admin delete each take both tables with them, on both sides of the pair.

**Rate limits.** ManyChat's sending API allows 25 requests/second; the drain
takes 50 rows at a time, sequentially. You will not come close.

**Privacy, stated plainly.** `celestual_dm_contacts` is a handle and a ManyChat
contact id. `celestual_dm_outbox` is two handles and a boolean. Neither table
can see who pinged whom (that is a salted hash in `celestual_entries`), and
neither holds a single word of anybody's card. Everything the DM says, the
person receiving it already has the right to know.

**Meta ToS position, restated.** Nobody OAuths anything. Every message this
sends is either a direct reply to a message that person just sent, or a message
inside a 24-hour window they opened themselves, through an official Meta
messaging partner. No tags, no marketing channel, no unsolicited sends, and a
kill switch that stops all of it in one statement.

---

Back to: [MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) (the verification relay this
extends) ·
[SECURITY.md](./SECURITY.md) · [../supabase/README.md](../supabase/README.md)
