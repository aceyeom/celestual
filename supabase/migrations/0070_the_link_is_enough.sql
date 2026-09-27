-- ─────────────────────────────────────────────────────────────────────────────
-- 0070: the link is enough.
--
-- The owner, 27 September: "the email code link i don't see why i need the
-- number, just clicking on link would be fine no?"
--
-- It would, and since this it is. 0065 (section 3) made a link opened
-- anywhere but the browser that asked for it wait for the number on the
-- asking screen, and that is the road nearly everybody takes: the wall is
-- opened from Instagram, in Instagram's own browser, and the mail's link opens
-- in Safari or in Gmail's, which is another browser with another session. So
-- nearly every tap met "type your number", with the number on a screen in an
-- app they had just left.
--
-- What the number stopped was real, and it stays stopped. Somebody types a
-- person's address into the door, the person taps a link they never asked
-- for, and under 0064 the ASKING browser, the stranger's, was signed in as
-- them: their @, their private notes, who they like. The number made that tap
-- sign nobody in. This makes it sign in the one browser it is safe to sign
-- in: the one that opened the link, which is in the hands of whoever reads
-- that inbox.
--
-- ── the rule ─────────────────────────────────────────────────────────────────
-- A link opened is a link confirmed, with nothing typed and nothing more to
-- press, for the browser that opened it:
--
--   login   that browser is signed in as whoever holds the address
--           (celestual_user_bind_email_hash, 0065)
--   edu     that browser holds the campus proof, and is signed in with it
--           (celestual_user_bind_edu_hash, 0064)
--   alerts  the asking account's alert address is confirmed, from whatever
--           browser opens it, as it was before 0065. The worst a stranger
--           gets from that is their own alerts mailed to an inbox that can
--           stop them from any one of them.
--
-- Opened in the browser that asked (the same session), nothing is different.
-- Opened in any other, the asking browser is signed in by NOTHING. That was
-- the attack, and this is the whole of the fix: a link signs in only the
-- browser that opened it.
--
-- ── the asking screen, told ──────────────────────────────────────────────────
-- The screen that asked polls `status` and waits for `verified`. A link opened
-- elsewhere never makes it verified now, so `status` says what happened
-- instead, `elsewhere: true`, and the screen says so ("you opened the link
-- somewhere else") and offers a new link to open there. It answers
-- `expired: true` beside it, so a screen on the build before this stops
-- waiting and offers another link rather than waiting for ever.
--
-- One case is still `verified` for the asking screen: the browser that opened
-- the link and the one that asked are already the same person (somebody
-- signed in on both). Saying so signs nobody new in.
--
-- ── the letter goes with the link ────────────────────────────────────────────
-- A letter waiting on a campus link is held in the browser that wrote it
-- (store.js `draft`), and a link opened elsewhere left it there. So the link
-- carries it: `carry` is the waiting draft, or the letter a reply is waiting
-- to be written under, kept on the request row while the link is live. The
-- browser that opens the link, when it is not the one that asked, gets it
-- back with the confirmation, and the row lets go of it the moment it is
-- handed over. A carry on a link that ran out goes by the next sweep (a link
-- asked for anywhere, the asking screen's own poll, and a job every ten
-- minutes where pg_cron runs).
--
-- The page that opened the link shows the letter and posts it on one key,
-- with the draft's own nonce, so it is one letter wherever it goes up from
-- (wall_letters is unique on author and nonce, 0063). It is shown first
-- because the person who opens a link is not always the one who asked for
-- it: a stranger's letter never goes up under the address of somebody who
-- only tapped. A carry is the asker's own words handed to whoever reads the
-- inbox they typed, which is what they asked for, and nothing on it points
-- back at them.
--
-- ── the shape ────────────────────────────────────────────────────────────────
--   celestual_edu_verifications      + carry (jsonb, a campus link's, 4 kB at
--                                    most); `match` may be null
--   celestual_edu_link_open          + a form that takes `p_carry` in place of
--                                    the number; the number's form is kept, is
--                                    the same with nothing carried, and keeps
--                                    no number
--   celestual_edu_link_confirm       replaced: confirms for the browser that
--                                    opened it, takes a number and never reads
--                                    it, answers `carry`
--   celestual_edu_link_status        replaced: + `elsewhere`
--
-- Either way round with the function and the page. The function deployed
-- before this passes a number to the confirm, which is taken and ignored, so
-- a link it confirms confirms at once; its `link` passes a number to the old
-- form of the open, which is kept. The function after this asks for the form
-- with `p_carry` and falls back to the old one on a database before this.
-- Nothing is renamed or removed. Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the row carries the letter, and keeps no number ───────────────────────
alter table celestual_edu_verifications add column if not exists carry jsonb;

alter table celestual_edu_verifications drop constraint if exists celestual_edu_shape_ck;
alter table celestual_edu_verifications add constraint celestual_edu_shape_ck
  check ((kind = 'code' and code_hash is not null)
      or (kind = 'link' and link_hash is not null and session_hash is not null
          and (match is null or match between 10 and 99)));
alter table celestual_edu_verifications drop constraint if exists celestual_edu_carry_ck;
alter table celestual_edu_verifications add constraint celestual_edu_carry_ck
  check (carry is null
      or (kind = 'link' and jsonb_typeof(carry) = 'object' and octet_length(carry::text) <= 4096));
create index if not exists celestual_edu_carry_idx
  on celestual_edu_verifications (expires_at) where carry is not null;

comment on column celestual_edu_verifications.carry is
  '0070: what a campus link carries to the browser that opens it, when that is not the one that asked: the waiting draft, or the letter a reply waits under. Handed over once, and cleared when the link is used or runs out.';
comment on column celestual_edu_verifications.match is
  '0064, 0065, 0070: the number from 10 to 99 an asking screen showed. Since 0070 nothing asks for it and nothing new keeps one.';

-- ── 2. the open, with the letter ─────────────────────────────────────────────
-- 0065's checks and limits, word for word, with the number gone and the
-- carry beside them. A carry that is not an object, is over 4 kB, or rides a
-- link that is not a campus one is dropped, and the link still goes: the
-- letter is still in the browser that wrote it.
--
-- Called by name (PostgREST does). Its last argument is jsonb where the old
-- form's is an integer, so a bare null in that place is a question Postgres
-- cannot answer.
create or replace function celestual_edu_link_open(
  p_email     text,
  p_session   text,
  p_purpose   text,
  p_campus    text,
  p_ip        text,
  p_link_hash text,
  p_carry     jsonb
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
  v_carry jsonb;
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
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
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
    if jsonb_typeof(p_carry) = 'object' and octet_length(p_carry::text) <= 4096 then
      v_carry := p_carry;
    end if;
  end if;

  select count(*) into v_n from celestual_edu_verifications
   where email = ne and created_at > now() - interval '1 hour';
  if v_n >= 5 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
  if v_ip is not null then
    select count(*) into v_n from celestual_edu_verifications
     where ip = v_ip and created_at > now() - interval '1 hour';
    if v_n >= 15 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
  end if;

  insert into celestual_edu_verifications
    (token, email, slug, kind, purpose, session_hash, link_hash, match, campus, status, expires_at, ip, carry)
  values
    (v_token, ne, coalesce(nullif(p_campus, ''), p_purpose), 'link', p_purpose, v_hash, p_link_hash,
     null, case when p_purpose = 'login' then null else nullif(p_campus, '') end, 'pending', v_exp, v_ip,
     v_carry);

  -- the sweep: a carry goes the moment its link is spent or runs out, the
  -- row itself a day later, as before
  update celestual_edu_verifications set carry = null
   where carry is not null and (expires_at < now() or status <> 'pending');
  if random() < 0.2 then
    delete from celestual_edu_verifications where expires_at < now() - interval '1 day';
  end if;

  return jsonb_build_object('ok', true, 'request', v_token, 'expires_at', v_exp);
end;
$$;

-- The number's form, for the function deployed before this: the same open,
-- carrying nothing. The number it passes is not kept. It answers no number
-- either, and that function shows its own, which nothing asks for any more.
create or replace function celestual_edu_link_open(
  p_email     text,
  p_session   text,
  p_purpose   text,
  p_campus    text,
  p_ip        text,
  p_link_hash text,
  p_match     integer
) returns jsonb
language sql security definer set search_path = public, extensions as $$
  select celestual_edu_link_open(p_email, p_session, p_purpose, p_campus, p_ip, p_link_hash, null::jsonb)
$$;

-- ── 3. the confirm, for the browser that opened it ───────────────────────────
-- `p_match` is taken so the function and the page from before this still
-- call it, and never read. `p_session` is the browser that opened the link,
-- and it is the one the address is bound to, whichever browser asked: see
-- the head of this file. A confirm with no session has nobody to sign in and
-- spends nothing.
--
-- Answered again, as before, to the browser that confirmed it (a page loaded
-- twice). The asking browser is answered again only when it was that browser,
-- or for an alerts link, which it is the one confirming.
--
-- A link a wrong number burned under 0065 (`refused`) is run out, and says so.
--
-- Answers { ok, purpose, request, campus, school, same_device, carry }
--       | { ok: false, error: 'invalid' | 'expired' | 'used' | 'taken', purpose? }.
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
  v_carry  jsonb;
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
    if v_conf is null
       or not (v_conf = coalesce(r.confirmed_session_hash, r.session_hash)
               or (r.purpose = 'alerts' and v_same)) then
      return jsonb_build_object('ok', false, 'error', 'used', 'purpose', r.purpose);
    end if;
    v_campus := r.campus;
  elsif r.status = 'refused' then
    return jsonb_build_object('ok', false, 'error', 'expired', 'purpose', r.purpose);
  else
    if r.expires_at < now() then
      return jsonb_build_object('ok', false, 'error', 'expired', 'purpose', r.purpose);
    end if;
    if v_conf is null then
      return jsonb_build_object('ok', false, 'error', 'invalid', 'purpose', r.purpose);
    end if;

    if r.purpose = 'edu' then
      v_res := celestual_user_bind_edu_hash(v_conf, r.email);
      if not coalesce((v_res->>'ok')::boolean, false) then
        return jsonb_build_object('ok', false, 'error', 'taken', 'detail', v_res->'error', 'purpose', r.purpose);
      end if;
      v_campus := coalesce(celestual_campus_for_domain(split_part(r.email, '@', 2)), r.campus);
    elsif r.purpose = 'login' then
      v_res := celestual_user_bind_email_hash(v_conf, r.email);
      if not coalesce((v_res->>'ok')::boolean, false) then
        return jsonb_build_object('ok', false, 'error', 'invalid', 'purpose', r.purpose);
      end if;
      v_campus := v_res->>'campus';
    else
      -- the asking account's alert address, whichever browser opened it
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

    -- the letter, handed to the browser that opened it when that is not the
    -- one holding it, and let go of here, on this link and on every other
    -- link the same screen asked for (a resend carries it again)
    v_carry := case when not v_same then r.carry end;
    update celestual_edu_verifications
       set status = 'verified', verified_at = now(), confirmed_session_hash = v_conf,
           campus = v_campus, carry = null
     where id = r.id;
    update celestual_edu_verifications set carry = null
     where session_hash = r.session_hash and carry is not null and id <> r.id;
  end if;

  select name into v_school from wall_campuses where slug = v_campus and edu_domain is not null;
  return jsonb_build_object('ok', true, 'purpose', r.purpose, 'request', r.token,
                            'campus', v_campus, 'school', v_school,
                            'same_device', v_same, 'carry', v_carry);
end;
$$;

-- The two argument call (0064's function) is 0065's, unchanged: this check
-- with no number, which since this is the same check.

-- ── 4. the status, and where the link was opened ─────────────────────────────
-- For the session that asked and nobody else, as before. `verified` when the
-- link signed THIS browser in: it opened the link, or the link was for the
-- alerts, or the browser that opened it is already this browser's person.
-- `elsewhere` when it signed in another browser and not this one, with
-- `expired` beside it for a screen from before this (the head of this file).
-- A carry on a row that ran out goes here too.
create or replace function celestual_edu_link_status(p_request text, p_session text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r        celestual_edu_verifications%rowtype;
  v_campus text;
  v_school text;
  v_here   boolean := false;
  v_away   boolean := false;
  v_ask    uuid;
  v_open   uuid;
begin
  if p_session is null or length(p_session) < 16 or length(p_session) > 256 or p_request is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into r from celestual_edu_verifications
   where token = p_request and kind = 'link'
     and session_hash = encode(digest(p_session, 'sha256'), 'hex');
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;

  if r.status = 'verified' then
    -- a row confirmed before this with no opening session bound the asking one
    v_here := r.purpose = 'alerts' or r.confirmed_session_hash is null
              or r.confirmed_session_hash = r.session_hash;
    if not v_here then
      select celestual_user_live(user_id) into v_ask from celestual_sessions
       where token_hash = r.session_hash and expires_at > now();
      select celestual_user_live(user_id) into v_open from celestual_sessions
       where token_hash = r.confirmed_session_hash and expires_at > now();
      v_here := v_ask is not null and v_ask = v_open;
    end if;
    v_away := not v_here;
  end if;

  if r.carry is not null and (r.status <> 'pending' or r.expires_at < now()) then
    update celestual_edu_verifications set carry = null where id = r.id;
  end if;

  v_campus := case when r.purpose in ('edu', 'login')
                   then coalesce(r.campus, (celestual_campus_peek(split_part(r.email, '@', 2)))->>'slug') end;
  select name into v_school from wall_campuses where slug = v_campus and edu_domain is not null;
  if v_school is null and r.purpose in ('edu', 'login') then
    v_school := (celestual_campus_peek(split_part(r.email, '@', 2)))->>'name';
  end if;
  return jsonb_build_object('ok', true, 'verified', v_here, 'elsewhere', v_away, 'purpose', r.purpose,
                            'campus', v_campus, 'school', v_school,
                            'expired', v_away or r.status = 'refused'
                                       or (r.status <> 'verified' and r.expires_at < now()));
end;
$$;

revoke all on function celestual_edu_link_open(text, text, text, text, text, text, jsonb)   from public, anon, authenticated;
revoke all on function celestual_edu_link_open(text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function celestual_edu_link_confirm(text, text, integer) from public, anon, authenticated;
revoke all on function celestual_edu_link_confirm(text, text)          from public, anon, authenticated;
revoke all on function celestual_edu_link_status(text, text)           from public, anon, authenticated;
grant execute on function celestual_edu_link_open(text, text, text, text, text, text, jsonb)   to service_role;
grant execute on function celestual_edu_link_open(text, text, text, text, text, text, integer) to service_role;
grant execute on function celestual_edu_link_confirm(text, text, integer) to service_role;
grant execute on function celestual_edu_link_confirm(text, text)          to service_role;
grant execute on function celestual_edu_link_status(text, text)           to service_role;

comment on function celestual_edu_link_open(text, text, text, text, text, text, jsonb) is
  '0070: service role only. Opens a mailed link for an address and the asking session, with what a campus link carries to the browser that opens it. No number.';
comment on function celestual_edu_link_open(text, text, text, text, text, text, integer) is
  '0065, 0070: service role only. The form the function from before 0070 calls: the same open, carrying nothing, and the number it passes is not kept.';
comment on function celestual_edu_link_confirm(text, text, integer) is
  '0070: service role only. Confirms a mailed link for the browser that opened it, with nothing typed: a login signs that browser in, a campus link proves it, an alerts link confirms the asking account''s address. The asking browser is signed in only when it is the one that opened it. The number is taken and never read.';
comment on function celestual_edu_link_status(text, text) is
  '0070: service role only. Whether the asking session''s link signed it in (verified), or signed in another browser and not it (elsewhere, answered expired as well for a screen from before 0070).';

-- ── 5. the carries that ran out, every ten minutes ───────────────────────────
-- Where pg_cron runs. The sweeps above catch most of them sooner.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed: the carry sweep is not scheduled here';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'celestual-link-carry';
  perform cron.schedule('celestual-link-carry', '*/10 * * * *', $job$
    update celestual_edu_verifications set carry = null
     where carry is not null and (expires_at < now() or status <> 'pending')
  $job$);
end $$;
