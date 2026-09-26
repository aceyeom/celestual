-- ─────────────────────────────────────────────────────────────────────────────
-- 0065: the link for everybody, and the @ comes back with the person.
--
-- Two things the owner found on 26 September, and they are one thing: a
-- person who has proved who they are should not be asked again.
--
-- ── 1. "continue with email" is our link, not Supabase's code ───────────────
-- The door's third way in (0057) ran on Supabase Auth: signInWithOtp mailed a
-- code and verifyOtp checked it. The live project mailed Supabase's own
-- template, undesigned, with an EIGHT digit code, into a box that holds six,
-- so the code could never be typed back and nobody ever signed in that way.
-- Meanwhile the campus proof had already moved onto the product's own magic
-- link (0064: celestual-edu-verify `link` / `confirm` / `status`, the mail in
-- the black room, the number from 10 to 99 on both screens).
--
-- So the email login moves onto that link. A third purpose, `login`:
--
--   open      any address. No domain rule and no `taken`: a login moves the
--             device onto whoever holds the address, it never refuses one.
--   confirm   the address proves a person, by celestual_user_bind_email_hash
--             below: the device that asked, and the one that opened the link
--             if it is another, are signed in as the person who holds the
--             address (merged into them, or moved onto them), exactly what
--             0057's bind did off a Supabase JWT, plus two things it never
--             did: an address held as a campus proof or a google login's
--             address is the same person, and a .edu address opens its
--             campus the way the `edu` link does.
--   status    as before; a .edu login answers its campus.
--
-- The request row is 0064's, with `purpose` widened.
--
-- ── 2. the @ comes back with the person ──────────────────────────────────────
-- A ping is read, placed, kept and let go with the DM flow's proof (0004,
-- 0009): a secret minted in ONE browser, whose hash lives thirty days, sliding.
-- The person's row (0030) remembers that they own the @ for good
-- (`handle_verified_at`), but nothing turned that memory back into a proof on
-- another device, or on the same one after thirty idle days. So a person who
-- had DMd once, and then signed in by email on their laptop, was signed in,
-- read the wall, and was asked for the DM again before their private notes
-- would show: every new browser, every month.
--
-- celestual_session_handle_proof mints that proof from the session. The
-- browser mints a fresh secret and sends its hash with its session token; the
-- server looks the session up, and only if the person it resolves to holds a
-- VERIFIED @ does it write a verified row for that @ under that hash, the way
-- the pass list (0043) and the desk's sign in link (0039) already do. The
-- server decides, from the row, and the browser can only ever get a proof for
-- the @ its own person already owns. The DM is still the only thing that
-- claims an @ in the first place (celestual_user_bind_handle is untouched).
--
-- ── why the session may do this ──────────────────────────────────────────────
-- The session token is already the key to everything the @ owns on the wall:
-- it takes letters about the @ down (wall_owner_remove, 0063), turns the
-- alerts for it on and off (celestual_alerts_set, 0064), and it is bound to a
-- person only by a proof (the DM, a campus link, google, the login link). A
-- thirty day proof minted from it gives nothing the session did not already
-- hold. docs/SECURITY.md "Durable, DM-free recovery" is this, finally wired:
-- email ownership carries every return, cross-device.
--
-- ── 3. the number is typed, not printed ──────────────────────────────────────
-- 0064 showed a number from 10 to 99 on the asking screen and printed the same
-- number in the mail, so a person could tell their own request from somebody
-- else's before they tapped. That defends the careful reader and nobody else,
-- and a link confirms on whatever device opens it. So anybody who can type
-- somebody's address into the door and get them to tap one link they did not
-- ask for ("is this you?") is signed in as them on the device that asked:
-- their @, their private notes, their alerts. With `login` on every address,
-- that is every account.
--
-- So the number stops being printed and starts being asked. It is on the
-- asking screen and nowhere else. The link opened on the device that asked
-- (the same session) confirms at once, as before. Opened anywhere else, it
-- confirms nothing until the number on the asking screen is typed into the
-- page it opened: without a number it answers `match` and nothing is spent,
-- the right number confirms as before, and a wrong one burns the link
-- (`refused`, and run out, so the asking screen says so and asks again).
-- One guess in ninety, once a link, five links an address an hour. A person
-- who never asked has no screen to read a number off, and the page says to
-- close it.
--
--   celestual_edu_link_confirm(token, session, match)   the check
--   celestual_edu_link_confirm(token, session)          the deployed function's
--       call, kept: it is the same check with no number, so a link opened on
--       another device through it answers `match` and is never confirmed.
--       Closed, not open, while the function and the page catch up.
--
-- ── the shape ────────────────────────────────────────────────────────────────
--   celestual_edu_verifications      purpose + 'login'; status + 'refused'
--   celestual_user_bind_email_hash   new, service role: an address proves a person
--   celestual_edu_link_open          replaced: takes 'login'
--   celestual_edu_link_confirm       replaced: binds 'login', and asks the
--                                    number of another device (3 arguments;
--                                    the 2 argument call is the same check)
--   celestual_edu_link_status        replaced: a .edu login answers its campus
--   celestual_session_handle_proof   new, the browser's: the @'s proof, restored
--
-- Backward compatible: nothing is renamed or removed, and the replaced
-- functions answer 'edu' and 'alerts' as 0064 did, except that a link opened
-- on a device that did not ask for it now wants the number (section 3), so
-- the build that is live keeps working against this, and a tap from another
-- device waits for the build that asks. Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the request row takes a third purpose ─────────────────────────────────
alter table celestual_edu_verifications drop constraint if exists celestual_edu_kind_ck;
alter table celestual_edu_verifications add constraint celestual_edu_kind_ck
  check (kind in ('code', 'link') and purpose in ('edu', 'alerts', 'login'));

comment on column celestual_edu_verifications.purpose is
  '0064, 0065: what the link proves. edu: a school address. alerts: where the alerts go. login: an address that signs a person in.';
comment on column celestual_edu_verifications.match is
  '0064, 0065: the number from 10 to 99 shown on the asking device, and only there. A link opened on another device confirms only once it is typed there; a wrong one refuses the link.';
comment on column celestual_edu_verifications.status is
  '0007, 0065: pending, verified, or refused (a link opened on another device with the wrong number, which is then spent).';

-- ── 2. an address proves a person ────────────────────────────────────────────
-- By the session's hash, because the link is confirmed on whatever device
-- opens it and all that is kept of the asking device is its hash (0064).
--
-- Who holds the address: the person who signed in with it before
-- (`email` with `email_verified_at`), or proved it as their campus address
-- (`edu_email`), or signed in with a google account at it (`google_email`).
-- Those are three ways of having shown the same inbox, and a person who
-- proved berkeley.edu to post and signs in with it a week later on a new
-- laptop is the same person, not a new one.
--
--   nobody holds it   it lands on this device's person (a new one when the
--                     device has none), unless that person already signs in
--                     with a different address: then this is somebody else
--                     on this device, and the device moves to a new person.
--                     It never grows an account by an address the account's
--                     owner did not bring.
--   this device's     nothing to move.
--   another person    the two are one person, and the merge rule (0030, 0062)
--                     makes them one, older row surviving. Where the rule
--                     refuses (two different @s, campus addresses or google
--                     logins), the device moves onto the person who holds
--                     the address and neither row changes: signing in with an
--                     address is becoming the person it belongs to.
--
-- Then the address is written on the row as its login, a .edu address also
-- proves its campus (celestual_user_bind_edu_hash, 0064, as the `edu` link
-- does, and a refusal there is not a refusal here), and it becomes the alert
-- address when there is none, as a campus address does.
create or replace function celestual_user_bind_email_hash(p_hash text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ne       text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_me     uuid;
  v_owner  uuid;
  v_mine   text;
  v_a      uuid;
  v_b      uuid;
  v_res    jsonb;
  v_campus text;
begin
  if ne is null or ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(ne) > 200 then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_me := celestual_session_user_hash(p_hash);

  select id into v_owner from celestual_users
   where merged_into is null
     and ((email = ne and email_verified_at is not null) or edu_email = ne or google_email = ne)
   order by coalesce(email = ne and email_verified_at is not null, false) desc,
            coalesce(edu_email = ne, false) desc,
            created_at
   limit 1;

  if v_owner is null then
    if v_me is not null then
      select email into v_mine from celestual_users where id = v_me and email_verified_at is not null;
      if v_mine is not null and v_mine <> ne then v_me := null; end if;
    end if;
    if v_me is null then
      insert into celestual_users default values returning id into v_me;
    end if;

  elsif v_me is null or v_me = v_owner then
    v_me := v_owner;

  elsif exists (
    select 1 from celestual_users x, celestual_users y
     where x.id = v_me and y.id = v_owner
       and ((x.instagram_handle <> y.instagram_handle)
         or (x.edu_email <> y.edu_email)
         or (x.google_sub <> y.google_sub)
         or (x.email_verified_at is not null and y.email_verified_at is not null and x.email <> y.email))
  ) then
    -- Two people, each proved as somebody else: the device moves onto the
    -- one who holds the address, and neither row changes. Not a conflict for
    -- the desk, the way two @s on one session are not (0030's switch).
    v_me := v_owner;

  else
    select case when x.created_at <= y.created_at then x.id else y.id end,
           case when x.created_at <= y.created_at then y.id else x.id end
      into v_a, v_b
      from celestual_users x, celestual_users y
     where x.id = v_me and y.id = v_owner;
    v_res := celestual_user_merge(v_a, v_b, 'bind_email');
    v_me := case when coalesce((v_res->>'ok')::boolean, false) then v_a else v_owner end;
  end if;

  -- the login, on the row it landed on. A proved address replaces a note
  -- (0030's `email` held unproved) and never a different proved one.
  update celestual_users
     set email = case when email is null or email = ne or email_verified_at is null then ne else email end,
         email_verified_at = case when email is null or email = ne or email_verified_at is null
                                  then coalesce(case when email = ne then email_verified_at end, now())
                                  else email_verified_at end,
         updated_at = now()
   where id = v_me;

  perform celestual_session_bind(v_me, p_hash);

  -- a .edu address is a school's own mail, so it proves the campus, on the
  -- same row, the way the campus link does. Only when the row holds no other
  -- campus address: two would be a conflict for the desk, and a login is not
  -- the place to raise one.
  if ne ~ '\.edu$'
     and exists (select 1 from celestual_users where id = v_me and (edu_email is null or edu_email = ne)) then
    begin
      v_res := celestual_user_bind_edu_hash(p_hash, ne);
      if coalesce((v_res->>'ok')::boolean, false) then
        v_campus := celestual_campus_for_domain(split_part(ne, '@', 2));
      end if;
    exception when others then
      v_campus := null;
    end;
  end if;

  -- where the alerts go, when nothing is set: the address this person just
  -- showed they read. A confirmed alert address is never overwritten, and a
  -- stop pressed on this address before (celestual_mail_suppressions) stands.
  update celestual_users
     set alert_email = ne, alert_email_verified_at = now(), updated_at = now()
   where id = v_me
     and (alert_email is null or (alert_email = ne and alert_email_verified_at is null));

  return jsonb_build_object('ok', true, 'user', celestual_user_public(v_me), 'campus', v_campus);
end;
$$;

revoke all on function celestual_user_bind_email_hash(text, text) from public, anon, authenticated;
grant execute on function celestual_user_bind_email_hash(text, text) to service_role;

comment on function celestual_user_bind_email_hash(text, text) is
  '0065: service role only. An address proved by the login link signs the session in as the person who holds it (by login, campus proof or google), merged or moved; a .edu address also proves its campus.';

-- ── 3. the link, with a third purpose ────────────────────────────────────────
-- 0064's three, word for word for `edu` and `alerts`, and `login` beside them.

create or replace function celestual_edu_link_open(
  p_email     text,
  p_session   text,
  p_purpose   text,
  p_campus    text,
  p_ip        text,
  p_link_hash text,
  p_match     integer
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ne      text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_hash  text;
  v_me    uuid;
  v_n     int;
  v_ip    text := nullif(left(btrim(coalesce(p_ip, '')), 64), '');
  v_token text := gen_random_uuid()::text;
  v_exp   timestamptz := now() + interval '30 minutes';
begin
  if ne is null or ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(ne) > 200 then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if p_purpose is null or p_purpose not in ('edu', 'alerts', 'login') then
    return jsonb_build_object('ok', false, 'error', 'purpose');
  end if;
  if p_session is null or length(p_session) < 16 or length(p_session) > 256 then
    return jsonb_build_object('ok', false, 'error', 'session');
  end if;
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$'
     or p_match is null or p_match not between 10 and 99 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  -- the function decides which addresses prove a campus; this says again
  -- that it is one at all, as celestual_user_bind_edu will on confirm
  if p_purpose = 'edu' and ne !~ '\.edu$' and not celestual_pass_email(ne) then
    return jsonb_build_object('ok', false, 'error', 'domain');
  end if;
  v_hash := encode(digest(p_session, 'sha256'), 'hex');

  if p_purpose = 'edu' then
    select u.id into v_me from celestual_sessions s join celestual_users u on u.id = celestual_user_live(s.user_id)
     where s.token_hash = v_hash and s.expires_at > now();
    if v_me is not null and exists (
      select 1 from celestual_users where id = v_me and edu_email is not null and edu_email <> ne
    ) then
      return jsonb_build_object('ok', false, 'error', 'taken');
    end if;
  end if;

  -- the limits the code has always had: five an address, fifteen an address
  -- on the network, an hour, codes and links of every purpose together
  select count(*) into v_n from celestual_edu_verifications
   where email = ne and created_at > now() - interval '1 hour';
  if v_n >= 5 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
  if v_ip is not null then
    select count(*) into v_n from celestual_edu_verifications
     where ip = v_ip and created_at > now() - interval '1 hour';
    if v_n >= 15 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
  end if;

  insert into celestual_edu_verifications
    (token, email, slug, kind, purpose, session_hash, link_hash, match, campus, status, expires_at, ip)
  values
    (v_token, ne, coalesce(nullif(p_campus, ''), p_purpose), 'link', p_purpose, v_hash, p_link_hash,
     p_match, case when p_purpose = 'login' then null else nullif(p_campus, '') end, 'pending', v_exp, v_ip);

  if random() < 0.2 then
    delete from celestual_edu_verifications where expires_at < now() - interval '1 day';
  end if;

  return jsonb_build_object('ok', true, 'request', v_token, 'expires_at', v_exp);
end;
$$;

-- Confirm. `login` binds the address to the asking session's person and then
-- to the opening session's, which finds the same person and follows it.
--
-- The number (section 3). `p_match` is what was typed on the page that
-- opened the link, or null when nothing was. The device that asked needs
-- none. Any other gets `match` for no number, with nothing spent, and
-- `mismatch` for a wrong one, which refuses the link for good and runs its
-- clock out, so the asking screen's `status` reads it as run out. Every
-- refusal names the link's purpose, so the page can say where to ask again.
--
-- Answers { ok, purpose, request, campus, school, same_device }
--       | { ok: false, error: 'invalid' | 'expired' | 'used' | 'taken'
--                          | 'match' | 'mismatch', purpose? }.
create or replace function celestual_edu_link_confirm(p_token text, p_session text, p_match integer)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r        celestual_edu_verifications%rowtype;
  v_conf   text;
  v_same   boolean;
  v_res    jsonb;
  v_me     uuid;
  v_campus text;
  v_school text;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into r from celestual_edu_verifications
   where link_hash = encode(digest(p_token, 'sha256'), 'hex') and kind = 'link'
   for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if p_session is not null and length(p_session) between 16 and 256 then
    v_conf := encode(digest(p_session, 'sha256'), 'hex');
  end if;
  v_same := v_conf is not null and v_conf = r.session_hash;

  if r.status = 'verified' then
    if v_conf is null or v_conf not in (coalesce(r.confirmed_session_hash, ''), r.session_hash) then
      return jsonb_build_object('ok', false, 'error', 'used', 'purpose', r.purpose);
    end if;
    v_campus := r.campus;
  elsif r.status = 'refused' then
    return jsonb_build_object('ok', false, 'error', 'mismatch', 'purpose', r.purpose);
  else
    if r.expires_at < now() then
      return jsonb_build_object('ok', false, 'error', 'expired', 'purpose', r.purpose);
    end if;

    -- another device: the number on the asking screen, or nothing happens
    if not v_same then
      if p_match is null then
        return jsonb_build_object('ok', false, 'error', 'match', 'purpose', r.purpose);
      end if;
      if p_match is distinct from r.match::integer then
        update celestual_edu_verifications
           set status = 'refused', expires_at = least(expires_at, now())
         where id = r.id;
        return jsonb_build_object('ok', false, 'error', 'mismatch', 'purpose', r.purpose);
      end if;
    end if;

    if r.purpose = 'edu' then
      v_res := celestual_user_bind_edu_hash(r.session_hash, r.email);
      if not coalesce((v_res->>'ok')::boolean, false) then
        return jsonb_build_object('ok', false, 'error', 'taken', 'detail', v_res->'error');
      end if;
      if v_conf is not null and v_conf <> r.session_hash then
        -- the second device follows the first; a refusal there is not one here
        perform celestual_user_bind_edu_hash(v_conf, r.email);
      end if;
      v_campus := coalesce(celestual_campus_for_domain(split_part(r.email, '@', 2)), r.campus);
    elsif r.purpose = 'login' then
      v_res := celestual_user_bind_email_hash(r.session_hash, r.email);
      if not coalesce((v_res->>'ok')::boolean, false) then
        return jsonb_build_object('ok', false, 'error', 'invalid');
      end if;
      v_campus := v_res->>'campus';
      if v_conf is not null and v_conf <> r.session_hash then
        -- the device that opened the link is signed in as the same person
        perform celestual_user_bind_email_hash(v_conf, r.email);
      end if;
    else
      v_me := celestual_session_user_hash(r.session_hash);
      if v_me is null then
        insert into celestual_users default values returning id into v_me;
        perform celestual_session_bind(v_me, r.session_hash);
      end if;
      update celestual_users
         set alert_email = r.email, alert_email_verified_at = now(), updated_at = now()
       where id = v_me;
      delete from celestual_mail_suppressions where email = r.email;
      v_campus := null;
    end if;

    update celestual_edu_verifications
       set status = 'verified', verified_at = now(), confirmed_session_hash = v_conf, campus = v_campus
     where id = r.id;
  end if;

  select name into v_school from wall_campuses where slug = v_campus and edu_domain is not null;
  return jsonb_build_object('ok', true, 'purpose', r.purpose, 'request', r.token,
                            'campus', v_campus, 'school', v_school,
                            'same_device', v_same);
end;
$$;

-- The call the deployed function makes, with no number: the same check. A
-- link opened on the device that asked confirms through it; opened anywhere
-- else it answers `match` and nothing is spent, until the function that
-- passes the number is deployed beside the page that asks for it.
create or replace function celestual_edu_link_confirm(p_token text, p_session text)
returns jsonb
language sql security definer set search_path = public, extensions as $$
  select celestual_edu_link_confirm(p_token, p_session, null::integer)
$$;

-- Status, for the device that asked and for nobody else. A login at a .edu
-- answers the campus it opens, as a campus link does. A link refused for a
-- wrong number (section 3) is run out to the screen that asked, which then
-- says so and offers another, as it does after thirty minutes.
create or replace function celestual_edu_link_status(p_request text, p_session text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r        celestual_edu_verifications%rowtype;
  v_campus text;
  v_school text;
begin
  if p_session is null or length(p_session) < 16 or length(p_session) > 256 or p_request is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into r from celestual_edu_verifications
   where token = p_request and kind = 'link'
     and session_hash = encode(digest(p_session, 'sha256'), 'hex');
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  v_campus := case when r.purpose in ('edu', 'login')
                   then coalesce(r.campus, (celestual_campus_peek(split_part(r.email, '@', 2)))->>'slug') end;
  select name into v_school from wall_campuses where slug = v_campus and edu_domain is not null;
  if v_school is null and r.purpose in ('edu', 'login') then
    v_school := (celestual_campus_peek(split_part(r.email, '@', 2)))->>'name';
  end if;
  return jsonb_build_object('ok', true, 'verified', r.status = 'verified', 'purpose', r.purpose,
                            'campus', v_campus, 'school', v_school,
                            'expired', r.status = 'refused' or (r.status <> 'verified' and r.expires_at < now()));
end;
$$;

revoke all on function celestual_edu_link_open(text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function celestual_edu_link_confirm(text, text, integer) from public, anon, authenticated;
revoke all on function celestual_edu_link_confirm(text, text) from public, anon, authenticated;
revoke all on function celestual_edu_link_status(text, text)  from public, anon, authenticated;
grant execute on function celestual_edu_link_open(text, text, text, text, text, text, integer) to service_role;
grant execute on function celestual_edu_link_confirm(text, text, integer) to service_role;
grant execute on function celestual_edu_link_confirm(text, text) to service_role;
grant execute on function celestual_edu_link_status(text, text)  to service_role;

comment on function celestual_edu_link_confirm(text, text, integer) is
  '0065: service role only. Confirms a mailed link. On a device that did not ask for it, only with the number the asking screen shows: none answers match and spends nothing; a wrong one refuses the link.';

-- ── 4. the @ comes back with the person ──────────────────────────────────────
-- The browser mints a secret, keeps it, and sends its sha256 with its
-- session token. When the session's person holds a verified @, a verified
-- row is written for that @ under that hash, thirty days sliding like every
-- proof (0009), stamped `verified_via = 'session'` so the desk can tell it
-- from a DM. Nothing is written for a person with no @, for an @ the desk has
-- banned (0020), or for a hash already standing (two tabs asking at once are
-- one row). A dozen an hour an @ is more than any person needs and less than
-- a table anybody could fill.
--
-- Answers { ok, handle } | { ok: false, error: 'no_session' | 'invalid' |
-- 'unclaimed' | 'banned' | 'rate' }.
create or replace function celestual_session_handle_proof(p_token text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash   text := lower(coalesce(p_proof_hash, ''));
  v_me     uuid;
  v_handle text;
  v_n      int;
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then
    return jsonb_build_object('ok', false, 'error', 'no_session');
  end if;
  if v_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_me := celestual_session_user(p_token);
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select instagram_handle into v_handle from celestual_users
   where id = v_me and merged_into is null
     and instagram_handle is not null and handle_verified_at is not null;
  if v_handle is null then return jsonb_build_object('ok', false, 'error', 'unclaimed'); end if;
  if celestual_is_banned(v_handle) then return jsonb_build_object('ok', false, 'error', 'banned'); end if;

  if exists (select 1 from celestual_ig_verifications
              where handle = v_handle and proof_hash = v_hash and status = 'verified' and expires_at > now()) then
    return jsonb_build_object('ok', true, 'handle', v_handle);
  end if;

  select count(*) into v_n from celestual_ig_verifications
   where handle = v_handle and verified_via = 'session' and created_at > now() - interval '1 hour';
  if v_n >= 12 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;

  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_via, verified_at, expires_at)
  values (v_handle, substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), v_hash, 'verified',
          'session:' || v_handle, 'session', now(), now() + c_session_ttl);

  insert into celestual_members (handle, handle_hash)
  values (v_handle, celestual_hash_handle(v_handle))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', v_handle);
end;
$$;

revoke all on function celestual_session_handle_proof(text, text) from public;
grant execute on function celestual_session_handle_proof(text, text) to anon, authenticated, service_role;

comment on function celestual_session_handle_proof(text, text) is
  '0065: the browser''s. Mints the DM flow''s proof for the verified @ the session''s person already owns, under a hash the browser minted, so a person signed in by any proof reads their own pings without a second DM. Never claims an @.';
