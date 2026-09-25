-- ─────────────────────────────────────────────────────────────────────────────
-- 0064: the mail's links, and the alerts.
--
-- Two things the one wall (0063, docs/ONE-WALL.md) needs from the mail.
--
-- ── 1. a campus address is proved by a link ─────────────────────────────────
-- The six digit code stays for a tab on the old build (celestual-edu-verify
-- `send` / `verify`). The new proof is a magic link: the device that asks is
-- shown a number from 10 to 99, the email carries the same number and a link
-- to `/verify#t=<token>`, and whichever device opens the link confirms it.
-- The token is 32 random bytes; only its sha256 is kept, it lasts thirty
-- minutes and it works once. The number is how a person tells their own
-- request from somebody else's, since a link confirms on whatever device
-- opens it.
--
-- The request row is celestual_edu_verifications' (0007), which gains a kind,
-- a purpose (a campus address, or an address for alerts), the sha256 of the
-- asking session, the sha256 of the link, the number, and the sha256 of the
-- session that confirmed it.
--
-- ── 2. the alerts ───────────────────────────────────────────────────────────
-- Two emails, and both carry a way out:
--   mutual   "it's mutual.", to a person whose ping resolved, at the address
--            they confirmed (or the one they left on the ping, as before)
--   wrote    "someone wrote you a letter.", to the claimed owner of an @ who
--            turned it on with a confirmed address, three a day at most,
--            with a one tap removal link and a stop link
-- A proved campus address becomes the alert address when there is none, and
-- `wrote` is off until the owner turns it on; `mutual` is on.
--
-- Mail goes out of one queue, celestual_mail_outbox, drained by
-- celestual-notify through celestual_mail_take and celestual_mail_done. A row
-- going in pushes the drain through pg_net at once, and a five minute pg_cron
-- job sweeps whatever a push missed. A link in a mail is a row in
-- celestual_mail_tokens: its sha256 only, one kind, one use.
--
-- ── the shape ───────────────────────────────────────────────────────────────
--   celestual_edu_verifications  + kind, purpose, session_hash, link_hash,
--                                  match, confirmed_session_hash, campus
--   celestual_users              + alert_email, alert_email_verified_at,
--                                  alerts_wrote, alerts_mutual
--   celestual_mail_outbox, celestual_mail_tokens, celestual_mail_suppressions
--   celestual_user_bind_edu      fills the alert address; binds by hash too
--   celestual_edu_link_open / _confirm / _status   the link, service role
--   the triggers                 a letter up, a match made, a notification
--                                queued, a merge, a row in the outbox
--   the browser's five           celestual_alerts_get, celestual_alerts_set,
--                                celestual_alerts_off_by_token,
--                                wall_remove_by_token, wall_restore_by_token
--   the drain's two              celestual_mail_take, celestual_mail_done
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the request row ───────────────────────────────────────────────────────
alter table celestual_edu_verifications
  add column if not exists kind                   text not null default 'code',
  add column if not exists purpose                text not null default 'edu',
  add column if not exists session_hash           text,
  add column if not exists link_hash              text,
  add column if not exists match                  smallint,
  add column if not exists confirmed_session_hash text,
  add column if not exists campus                 text;
alter table celestual_edu_verifications alter column code_hash drop not null;

alter table celestual_edu_verifications drop constraint if exists celestual_edu_kind_ck;
alter table celestual_edu_verifications add constraint celestual_edu_kind_ck
  check (kind in ('code', 'link') and purpose in ('edu', 'alerts'));
alter table celestual_edu_verifications drop constraint if exists celestual_edu_shape_ck;
alter table celestual_edu_verifications add constraint celestual_edu_shape_ck
  check ((kind = 'code' and code_hash is not null)
      or (kind = 'link' and link_hash is not null and session_hash is not null
          and match between 10 and 99));
alter table celestual_edu_verifications drop constraint if exists celestual_edu_hashes_ck;
alter table celestual_edu_verifications add constraint celestual_edu_hashes_ck
  check ((session_hash is null or session_hash ~ '^[0-9a-f]{64}$')
     and (link_hash is null or link_hash ~ '^[0-9a-f]{64}$')
     and (confirmed_session_hash is null or confirmed_session_hash ~ '^[0-9a-f]{64}$'));
create unique index if not exists celestual_edu_link_uidx
  on celestual_edu_verifications (link_hash) where link_hash is not null;

comment on column celestual_edu_verifications.link_hash is
  '0064: sha256 of the magic link''s token. The token itself is only ever in the email.';
comment on column celestual_edu_verifications.match is
  '0064: the number from 10 to 99 shown on the asking device and printed in the email.';

-- ── 2. the alert address and the two switches ────────────────────────────────
alter table celestual_users
  add column if not exists alert_email             text,
  add column if not exists alert_email_verified_at timestamptz,
  add column if not exists alerts_wrote            boolean not null default false,
  add column if not exists alerts_mutual           boolean not null default true;

alter table celestual_users drop constraint if exists celestual_users_alert_email_ck;
alter table celestual_users add constraint celestual_users_alert_email_ck
  check ((alert_email is null
          or (alert_email = lower(alert_email)
              and alert_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
              and char_length(alert_email) <= 200))
     and (alert_email_verified_at is null or alert_email is not null));

comment on column celestual_users.alert_email is
  '0064: where the alerts go. Filled by a proved campus address when empty, or confirmed by its own link.';
comment on column celestual_users.alerts_wrote is
  '0064: "someone wrote you a letter", for a claimed @. Off until the owner turns it on.';
comment on column celestual_users.alerts_mutual is
  '0064: the mutual alert. On.';

-- The campus addresses already proved become the alert addresses they would
-- have become had they been proved today. Only where nothing is set, once.
update celestual_users
   set alert_email = edu_email, alert_email_verified_at = edu_verified_at
 where alert_email is null and edu_email is not null and edu_verified_at is not null
   and merged_into is null;

-- ── 3. the queue, the links and the stops ────────────────────────────────────
create table if not exists celestual_mail_outbox (
  id           uuid        primary key default gen_random_uuid(),
  kind         text        not null,
  user_id      uuid        references celestual_users (id) on delete cascade,
  to_email     text        not null,
  handle       text,                        -- the recipient's @
  other_handle text,                        -- mutual: the @ on the other side
  has_card     boolean     not null default false,
  match_id     uuid        references celestual_matches (id) on delete cascade,
  letter_id    uuid        references wall_letters (id) on delete cascade,
  status       text        not null default 'queued',
  attempts     int         not null default 0,
  last_error   text,
  due_at       timestamptz not null default now(),
  taken_until  timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint celestual_mail_outbox_kind_ck   check (kind in ('mutual', 'wrote')),
  constraint celestual_mail_outbox_status_ck check (status in ('queued', 'sent', 'failed', 'skipped')),
  constraint celestual_mail_outbox_email_ck  check (to_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint celestual_mail_outbox_wrote_ck  check (kind <> 'wrote' or (letter_id is not null and user_id is not null)),
  constraint celestual_mail_outbox_mutual_ck check (kind <> 'mutual' or (handle is not null and other_handle is not null))
);
create unique index if not exists celestual_mail_outbox_wrote_uidx
  on celestual_mail_outbox (letter_id) where kind = 'wrote';
create unique index if not exists celestual_mail_outbox_mutual_uidx
  on celestual_mail_outbox (match_id, handle) where kind = 'mutual' and match_id is not null;
create index if not exists celestual_mail_outbox_due_idx
  on celestual_mail_outbox (due_at) where status = 'queued';
create index if not exists celestual_mail_outbox_user_idx
  on celestual_mail_outbox (user_id, kind, created_at);
alter table celestual_mail_outbox enable row level security;
revoke all on celestual_mail_outbox from public, anon, authenticated;
comment on table celestual_mail_outbox is
  '0064: every alert this product mails, queued. Drained by celestual-notify through celestual_mail_take and celestual_mail_done.';

create table if not exists celestual_mail_tokens (
  token_hash text        primary key,
  kind       text        not null,
  scope      text,
  user_id    uuid        references celestual_users (id) on delete cascade,
  email      text,
  letter_id  uuid        references wall_letters (id) on delete cascade,
  outbox_id  uuid        references celestual_mail_outbox (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  undone_at  timestamptz,
  constraint celestual_mail_tokens_hash_ck   check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint celestual_mail_tokens_kind_ck   check (kind in ('remove', 'off')),
  constraint celestual_mail_tokens_remove_ck check (kind <> 'remove' or letter_id is not null),
  constraint celestual_mail_tokens_off_ck    check (kind <> 'off' or (scope in ('wrote', 'mutual') and email is not null))
);
create index if not exists celestual_mail_tokens_expires_idx on celestual_mail_tokens (expires_at);
alter table celestual_mail_tokens enable row level security;
revoke all on celestual_mail_tokens from public, anon, authenticated;
comment on table celestual_mail_tokens is
  '0064: the links in a mail. sha256 only; a removal link works once for thirty days, a stop link for a year.';

create table if not exists celestual_mail_suppressions (
  email      text        not null,
  scope      text        not null,
  created_at timestamptz not null default now(),
  primary key (email, scope),
  constraint celestual_mail_suppressions_scope_ck check (scope in ('wrote', 'mutual'))
);
alter table celestual_mail_suppressions enable row level security;
revoke all on celestual_mail_suppressions from public, anon, authenticated;
comment on table celestual_mail_suppressions is
  '0064: an address that pressed stop on a kind of mail. Nothing of that kind is sent to it again until its owner turns it back on.';

-- ── 4. binding a campus address, by the session's hash ───────────────────────
-- The link is confirmed on whatever device opens it, and the device that
-- asked may be another one: all that is kept of the asking session is its
-- hash. So the bind takes a hash, and celestual_user_bind_edu (0030, 0043)
-- hashes its token and hands it on. The rules are 0043's, word for word, plus
-- one: the proved address becomes the alert address when there is none.
create or replace function celestual_session_user_hash(p_hash text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  update celestual_sessions
     set last_seen_at = now(),
         expires_at   = case when expires_at < now() + interval '335 days'
                             then now() + interval '365 days' else expires_at end
   where token_hash = p_hash and expires_at > now()
   returning user_id into v_user;
  if v_user is null then return null; end if;
  return celestual_user_live(v_user);
end;
$$;

create or replace function celestual_user_bind_edu_hash(p_hash text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ne      text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_me    uuid;
  v_owner uuid;
  v_a     uuid;
  v_b     uuid;
  v_res   jsonb;
begin
  if ne is null or ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if ne !~ '\.edu$' and not celestual_pass_email(ne) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_me := celestual_session_user_hash(p_hash);
  select id into v_owner from celestual_users where edu_email = ne and merged_into is null;

  if v_owner is null then
    if v_me is null then
      insert into celestual_users (edu_email, edu_verified_at) values (ne, now())
      returning id into v_me;
    elsif (select edu_email from celestual_users where id = v_me) is null then
      update celestual_users set edu_email = ne, edu_verified_at = now(), updated_at = now()
       where id = v_me;
    else
      insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
      values ('edu', v_me, v_me, jsonb_build_object('existing',
              (select edu_domain from celestual_users where id = v_me),
              'incoming', split_part(ne, '@', 2), 'reason', 'bind_edu'));
      return jsonb_build_object('ok', false, 'error', 'conflict_edu');
    end if;

  elsif v_me is null or v_me = v_owner then
    v_me := v_owner;

  else
    select case when x.created_at <= y.created_at then x.id else y.id end,
           case when x.created_at <= y.created_at then y.id else x.id end
      into v_a, v_b
      from celestual_users x, celestual_users y
     where x.id = v_me and y.id = v_owner;

    v_res := celestual_user_merge(v_a, v_b, 'bind_edu');
    if not (v_res->>'ok')::boolean then
      return v_res;
    end if;
    v_me := v_a;
  end if;

  perform celestual_session_bind(v_me, p_hash);

  -- 0064: the address the person just proved is where their alerts go, when
  -- nothing else is. A confirmed alert address is never overwritten.
  update celestual_users
     set alert_email = ne, alert_email_verified_at = now(), updated_at = now()
   where id = v_me
     and (alert_email is null or (alert_email = ne and alert_email_verified_at is null));

  return jsonb_build_object('ok', true, 'user', celestual_user_public(v_me));
end;
$$;

create or replace function celestual_user_bind_edu(p_token text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
begin
  if ne is null or ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if ne !~ '\.edu$' and not celestual_pass_email(ne) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  return celestual_user_bind_edu_hash(encode(digest(p_token, 'sha256'), 'hex'), ne);
end;
$$;

revoke all on function celestual_session_user_hash(text)         from public, anon, authenticated;
revoke all on function celestual_user_bind_edu_hash(text, text)  from public, anon, authenticated;
revoke all on function celestual_user_bind_edu(text, text)       from public, anon, authenticated;
grant execute on function celestual_user_bind_edu_hash(text, text) to service_role;
grant execute on function celestual_user_bind_edu(text, text)      to service_role;

comment on function celestual_user_bind_edu(text, text) is
  '0030, 0043, 0064: service role only. Takes the address on trust, so only celestual-edu-verify (and the desk''s sign in link) may call it. Fills the alert address when there is none.';

-- A merge (0030, 0062) moves the identifiers and not the alerts, so when the
-- row absorbed had a confirmed alert address and the survivor has none, the
-- address and its two switches follow it. Nothing else is touched.
create or replace function celestual_users_merge_alerts()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.merged_into is not null and old.merged_into is null
     and new.alert_email is not null and new.alert_email_verified_at is not null then
    update celestual_users s
       set alert_email = new.alert_email,
           alert_email_verified_at = new.alert_email_verified_at,
           alerts_wrote = new.alerts_wrote or s.alerts_wrote,
           alerts_mutual = new.alerts_mutual
     where s.id = new.merged_into
       and (s.alert_email is null or s.alert_email_verified_at is null);
  end if;
  return null;
end;
$$;
drop trigger if exists celestual_users_merge_alerts on celestual_users;
create trigger celestual_users_merge_alerts
  after update of merged_into on celestual_users
  for each row execute function celestual_users_merge_alerts();

-- ── 5. the link, in the database ─────────────────────────────────────────────
-- SERVICE ROLE ONLY, all three. celestual-edu-verify mints the token, keeps
-- it for the email and hands only its sha256 here.

-- Open a request. The address was checked by the function (a .edu, a
-- subdomain of the campus asked for, or a pass for `edu`; any address for
-- `alerts`); this checks the limits and the one refusal the schema can see:
-- a device already proved at a different campus address (`taken`), which the
-- bind would refuse on the other side of the email.
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
  if p_purpose not in ('edu', 'alerts') then return jsonb_build_object('ok', false, 'error', 'purpose'); end if;
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
  -- on the network, an hour, codes and links together
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
     p_match, nullif(p_campus, ''), 'pending', v_exp, v_ip);

  if random() < 0.2 then
    delete from celestual_edu_verifications where expires_at < now() - interval '1 day';
  end if;

  return jsonb_build_object('ok', true, 'request', v_token, 'expires_at', v_exp);
end;
$$;

-- Confirm. The token is the email's; `p_session` is the device that opened
-- it. An `edu` link binds the address to the asking session's person, and to
-- the opening session's too when it is another device, and opens the campus;
-- an `alerts` link confirms the asking person's alert address. Once: a second
-- open answers `used`, except to the device that confirmed it, which is
-- answered again (a page loaded twice).
create or replace function celestual_edu_link_confirm(p_token text, p_session text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r        celestual_edu_verifications%rowtype;
  v_conf   text;
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

  if r.status = 'verified' then
    if v_conf is null or v_conf not in (coalesce(r.confirmed_session_hash, ''), r.session_hash) then
      return jsonb_build_object('ok', false, 'error', 'used');
    end if;
    v_campus := r.campus;
  else
    if r.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

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
                            'same_device', v_conf is not null and v_conf = r.session_hash);
end;
$$;

-- Status, for the device that asked and for nobody else.
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
  v_campus := case when r.purpose = 'edu' then coalesce(r.campus, (celestual_campus_peek(split_part(r.email, '@', 2)))->>'slug') end;
  select name into v_school from wall_campuses where slug = v_campus and edu_domain is not null;
  if v_school is null and r.purpose = 'edu' then
    v_school := (celestual_campus_peek(split_part(r.email, '@', 2)))->>'name';
  end if;
  return jsonb_build_object('ok', true, 'verified', r.status = 'verified', 'purpose', r.purpose,
                            'campus', v_campus, 'school', v_school,
                            'expired', r.status <> 'verified' and r.expires_at < now());
end;
$$;

revoke all on function celestual_edu_link_open(text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function celestual_edu_link_confirm(text, text) from public, anon, authenticated;
revoke all on function celestual_edu_link_status(text, text)  from public, anon, authenticated;
grant execute on function celestual_edu_link_open(text, text, text, text, text, text, integer) to service_role;
grant execute on function celestual_edu_link_confirm(text, text) to service_role;
grant execute on function celestual_edu_link_status(text, text)  to service_role;

-- ── 6. what queues a mail ────────────────────────────────────────────────────
-- A letter to a claimed @, up and read. "Up" is `live`; "read" is a verdict
-- other than `unread`, so an @-note (which goes up before the screen reads
-- it, 0050) queues its mail when the screen's verdict lands, and a letter the
-- screen takes down never queues one. Once per letter, three a day per
-- person, never to the person who wrote it, never to an address that pressed
-- stop. A restored letter does not mail again.
create or replace function wall_letters_wrote_alert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u   celestual_users%rowtype;
  v_n int;
begin
  if new.status <> 'live' or new.target_kind <> 'handle' or new.expires_at <= now()
     or coalesce(new.moderation->>'verdict', '') = 'unread' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'live' and coalesce(old.moderation->>'verdict', '') <> 'unread' then
    return null;
  end if;

  select * into u from celestual_users
   where instagram_handle = new.target_handle and merged_into is null and handle_verified_at is not null;
  if not found or not u.alerts_wrote or u.alert_email is null or u.alert_email_verified_at is null then
    return null;
  end if;
  if u.id = new.author_id or u.id = celestual_user_live(new.author_id) then return null; end if;
  if exists (select 1 from celestual_mail_suppressions where email = u.alert_email and scope = 'wrote') then
    return null;
  end if;

  select count(*) into v_n from celestual_mail_outbox
   where user_id = u.id and kind = 'wrote' and status <> 'skipped'
     and created_at > now() - interval '24 hours';
  if v_n >= 3 then return null; end if;

  insert into celestual_mail_outbox (kind, user_id, to_email, handle, letter_id)
  values ('wrote', u.id, u.alert_email, new.target_handle, new.id)
  on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists wall_letters_wrote_alert on wall_letters;
create trigger wall_letters_wrote_alert
  after insert or update of status, moderation on wall_letters
  for each row execute function wall_letters_wrote_alert();

-- A match: each side that is a person with a confirmed alert address and the
-- mutual alert on is queued, whether or not they left an address on the
-- ping. celestual_submit (0023) makes the match after both pings are marked
-- matched, so whether a card waits is known here, and it is THAT a card
-- waits, never a word of it.
create or replace function celestual_matches_mutual_alert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s record;
  u celestual_users%rowtype;
begin
  for s in select new.handle_a as me, new.handle_b as them
           union all select new.handle_b, new.handle_a loop
    select * into u from celestual_users
     where instagram_handle = s.me and merged_into is null and handle_verified_at is not null;
    continue when not found;
    continue when not u.alerts_mutual or u.alert_email is null or u.alert_email_verified_at is null;
    continue when exists (select 1 from celestual_mail_suppressions
                           where email = u.alert_email and scope = 'mutual');
    insert into celestual_mail_outbox (kind, user_id, to_email, handle, other_handle, has_card, match_id)
    values ('mutual', u.id, u.alert_email, s.me, s.them,
            celestual_counterpart_card(s.me, s.them) is not null, new.id)
    on conflict do nothing;
  end loop;
  return null;
end;
$$;
drop trigger if exists celestual_matches_mutual_alert on celestual_matches;
create trigger celestual_matches_mutual_alert
  after insert on celestual_matches
  for each row execute function celestual_matches_mutual_alert();

-- The mutual mail celestual_submit still queues (0023) moves to the outbox as
-- it is written. Where the match already queued this person (above) it is
-- the same mail and is not sent twice; where the person turned the mutual
-- alert off it is not sent; otherwise it goes, to the address on the ping as
-- it always did. The row is stamped so the old drain (celestual_notify_take)
-- never takes it, and says where it went.
create or replace function celestual_notifications_to_outbox()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u celestual_users%rowtype;
begin
  if new.sent_at is not null or new.failed_at is not null then return new; end if;

  if new.match_id is not null and exists (
       select 1 from celestual_mail_outbox
        where kind = 'mutual' and match_id = new.match_id and handle = new.self_handle) then
    new.sent_at := now();
    new.last_error := 'celestual_mail_outbox';
    return new;
  end if;

  select * into u from celestual_users
   where instagram_handle = new.self_handle and merged_into is null and handle_verified_at is not null;
  if found and not u.alerts_mutual then
    new.sent_at := now();
    new.last_error := 'alerts_off';
    return new;
  end if;

  if new.to_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    insert into celestual_mail_outbox (kind, user_id, to_email, handle, other_handle, has_card, match_id)
    values ('mutual', u.id, lower(new.to_email), new.self_handle, new.other_handle, new.has_card, new.match_id)
    on conflict do nothing;
  end if;
  new.sent_at := now();
  new.last_error := 'celestual_mail_outbox';
  return new;
end;
$$;
drop trigger if exists celestual_notifications_to_outbox on celestual_notifications;
create trigger celestual_notifications_to_outbox
  before insert on celestual_notifications
  for each row execute function celestual_notifications_to_outbox();

-- ── 7. the push, and the sweep ───────────────────────────────────────────────
-- A row in the outbox calls celestual-notify at once through pg_net, the way
-- the mutual DM's outbox calls celestual-mutual-dm (a Database Webhook on
-- celestual_dm_outbox, docs/MANYCHAT-MUTUAL-DM.md). One call a statement, not
-- a row, and after the commit (pg_net queues the request in the same
-- transaction and sends it once it lands). The function is unauthenticated
-- and answers counts; it takes only rows that are owed (verify_jwt = false,
-- the same posture as celestual-notify has always had).
--
-- Without pg_net (a bare PostgreSQL, the test cluster) it does nothing, and
-- a push that fails never refuses the row: the sweep below takes it within
-- five minutes. The address is the project's, as 0060 writes it, and a row in
-- celestual_settings, `mail_push_url`, moves it without a migration.
create or replace function celestual_mail_outbox_push()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return null; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := $4)'
      using celestual_setting('mail_push_url',
                              'https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-notify'),
            '{"from":"outbox"}'::jsonb,
            '{"Content-Type":"application/json"}'::jsonb,
            5000;
  exception when others then
    raise warning 'celestual_mail_outbox_push: %', sqlerrm;
  end;
  return null;
end;
$$;
drop trigger if exists celestual_mail_outbox_push on celestual_mail_outbox;
create trigger celestual_mail_outbox_push
  after insert on celestual_mail_outbox
  for each statement execute function celestual_mail_outbox_push();

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_cron or pg_net is not installed: the mail sweep is not scheduled here';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'celestual-mail-sweep';
  perform cron.schedule('celestual-mail-sweep', '*/5 * * * *', $job$
    select net.http_post(
      url                  := 'https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-notify',
      body                 := '{"from":"cron"}'::jsonb,
      headers              := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 30000
    )
    where exists (select 1 from celestual_mail_outbox
                   where status = 'queued' and due_at <= now()
                     and (taken_until is null or taken_until <= now()))
       or exists (select 1 from celestual_notifications
                   where sent_at is null and failed_at is null
                     and (next_attempt_at is null or next_attempt_at <= now()))
  $job$);
end $$;

-- ── 8. the drain ─────────────────────────────────────────────────────────────
-- A link in a mail: 32 random bytes, base64url, and only the sha256 kept.
create or replace function celestual_mail_token_mint(
  p_kind text, p_scope text, p_user uuid, p_email text, p_letter uuid, p_outbox uuid, p_ttl interval
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_raw text := rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
begin
  insert into celestual_mail_tokens (token_hash, kind, scope, user_id, email, letter_id, outbox_id, expires_at)
  values (encode(digest(v_raw, 'sha256'), 'hex'), p_kind, p_scope, p_user, p_email, p_letter, p_outbox, now() + p_ttl);
  return v_raw;
end;
$$;

-- SERVICE ROLE ONLY. Claims the rows that are owed, under skip locked, for
-- ten minutes, and hands each one back with what its mail needs: the
-- address, the @s, whether a card waits, and its links, minted here. A row
-- that is no longer owed (the letter came down, the person turned it off or
-- pressed stop, the address is no longer confirmed) is closed as skipped and
-- never handed out.
create or replace function celestual_mail_take(p_limit integer default 50)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r       celestual_mail_outbox%rowtype;
  u       celestual_users%rowtype;
  v_to    text;
  v_skip  text;
  v_off   text;
  v_rm    text;
  v_rows  jsonb := '[]'::jsonb;
  v_lim   int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  for r in
    select * from celestual_mail_outbox
     where status = 'queued' and due_at <= now()
       and (taken_until is null or taken_until <= now())
     order by created_at
     limit v_lim
     for update skip locked
  loop
    v_skip := null;
    v_to := r.to_email;
    u := null;
    if r.user_id is not null then
      select * into u from celestual_users where id = celestual_user_live(r.user_id);
    end if;

    if r.kind = 'wrote' then
      if u.id is null or not u.alerts_wrote then v_skip := 'alerts_off';
      elsif u.alert_email is null or u.alert_email_verified_at is null then v_skip := 'no_address';
      elsif not exists (select 1 from wall_letters l
                         where l.id = r.letter_id and l.status = 'live' and l.expires_at > now()) then
        v_skip := 'letter_down';
      else
        v_to := u.alert_email;
      end if;
    else
      if u.id is not null and not u.alerts_mutual then v_skip := 'alerts_off';
      elsif u.id is not null and u.alert_email is not null and u.alert_email_verified_at is not null then
        v_to := u.alert_email;
      end if;
    end if;
    if v_skip is null and exists (select 1 from celestual_mail_suppressions
                                   where email = v_to and scope = r.kind) then
      v_skip := 'stopped';
    end if;

    if v_skip is not null then
      update celestual_mail_outbox set status = 'skipped', last_error = v_skip, taken_until = null
       where id = r.id;
      continue;
    end if;

    v_off := celestual_mail_token_mint('off', r.kind, u.id, v_to, null, r.id, interval '365 days');
    v_rm  := case when r.kind = 'wrote'
                  then celestual_mail_token_mint('remove', null, u.id, v_to, r.letter_id, r.id, interval '30 days') end;

    update celestual_mail_outbox set taken_until = now() + interval '10 minutes', to_email = v_to
     where id = r.id;

    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'kind', r.kind, 'to_email', v_to, 'handle', r.handle,
      'other_handle', r.other_handle, 'has_card', r.has_card, 'letter_id', r.letter_id,
      'attempts', r.attempts, 'off_token', v_off, 'remove_token', v_rm));
  end loop;

  if random() < 0.05 then
    delete from celestual_mail_outbox where status <> 'queued' and created_at < now() - interval '60 days';
    delete from celestual_mail_tokens where expires_at < now() - interval '30 days';
  end if;

  return v_rows;
end;
$$;

-- SERVICE ROLE ONLY. How a send went. A failure backs off one, five, thirty
-- and a hundred and twenty minutes and is given up after the fifth.
create or replace function celestual_mail_done(p_id uuid, p_ok boolean, p_error text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  if coalesce(p_ok, false) then
    update celestual_mail_outbox
       set status = 'sent', sent_at = now(), attempts = attempts + 1, taken_until = null, last_error = null
     where id = p_id and status = 'queued';
    return jsonb_build_object('ok', found);
  end if;
  update celestual_mail_outbox
     set attempts = attempts + 1,
         last_error = left(coalesce(p_error, 'error'), 500),
         taken_until = null,
         status = case when attempts + 1 >= 5 then 'failed' else status end,
         due_at = now() + (array[1, 5, 30, 120])[least(attempts + 1, 4)] * interval '1 minute'
   where id = p_id and status = 'queued'
  returning attempts into v_n;
  return jsonb_build_object('ok', v_n is not null, 'attempts', v_n);
end;
$$;

revoke all on function celestual_mail_token_mint(text, text, uuid, text, uuid, uuid, interval) from public, anon, authenticated;
revoke all on function celestual_mail_take(integer)            from public, anon, authenticated;
revoke all on function celestual_mail_done(uuid, boolean, text) from public, anon, authenticated;
grant execute on function celestual_mail_take(integer)            to service_role;
grant execute on function celestual_mail_done(uuid, boolean, text) to service_role;

revoke all on function wall_letters_wrote_alert()          from public, anon, authenticated;
revoke all on function celestual_matches_mutual_alert()    from public, anon, authenticated;
revoke all on function celestual_notifications_to_outbox() from public, anon, authenticated;
revoke all on function celestual_mail_outbox_push()        from public, anon, authenticated;
revoke all on function celestual_users_merge_alerts()      from public, anon, authenticated;

-- ── 9. the browser's five ────────────────────────────────────────────────────
create or replace function celestual_mail_mask(p_email text)
returns text
language sql immutable set search_path = public as $$
  select case when p_email is null or position('@' in p_email) < 2 then null
              else left(p_email, 1) || '***@' || split_part(p_email, '@', 2) end
$$;
revoke all on function celestual_mail_mask(text) from public, anon, authenticated;

-- What this person's alerts are. The address comes back masked: the browser
-- needs to say where the mail goes, not to read an address back.
create or replace function celestual_alerts_get(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  u    celestual_users%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into u from celestual_users where id = v_me;
  return jsonb_build_object(
    'ok',             true,
    'handle',         u.instagram_handle,
    'claimed',        u.handle_verified_at is not null,
    'email',          celestual_mail_mask(u.alert_email),
    'email_verified', u.alert_email_verified_at is not null,
    'wrote',          u.alerts_wrote,
    'mutual',         u.alerts_mutual);
end;
$$;

-- Turn either on or off; null leaves it. `wrote` needs a claimed @ and both
-- need a confirmed address to turn on. Turning one on takes the address off
-- the stop list for that kind, since the person has just asked for it.
create or replace function celestual_alerts_set(p_token text, p_wrote boolean, p_mutual boolean)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  u    celestual_users%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into u from celestual_users where id = v_me;
  if p_wrote is true and u.handle_verified_at is null then
    return jsonb_build_object('ok', false, 'error', 'claim');
  end if;
  if (p_wrote is true or p_mutual is true) and (u.alert_email is null or u.alert_email_verified_at is null) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  update celestual_users
     set alerts_wrote = coalesce(p_wrote, alerts_wrote),
         alerts_mutual = coalesce(p_mutual, alerts_mutual),
         updated_at = now()
   where id = v_me
  returning * into u;
  if p_wrote is true then
    delete from celestual_mail_suppressions where email = u.alert_email and scope = 'wrote';
  end if;
  if p_mutual is true then
    delete from celestual_mail_suppressions where email = u.alert_email and scope = 'mutual';
  end if;
  return jsonb_build_object('ok', true, 'wrote', u.alerts_wrote, 'mutual', u.alerts_mutual);
end;
$$;

-- The email's stop link (`/alerts#off=`) and its List-Unsubscribe. Turns
-- that kind of mail off for the person and puts the address on the stop
-- list, so an address with no person behind it (a ping's) is stopped too.
-- Pressed twice, it answers ok twice.
create or replace function celestual_alerts_off_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  t celestual_mail_tokens%rowtype;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into t from celestual_mail_tokens
   where token_hash = encode(digest(p_token, 'sha256'), 'hex') and kind = 'off'
   for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if t.used_at is null and t.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if t.user_id is not null then
    update celestual_users
       set alerts_wrote  = case when t.scope = 'wrote'  then false else alerts_wrote end,
           alerts_mutual = case when t.scope = 'mutual' then false else alerts_mutual end,
           updated_at = now()
     where id = celestual_user_live(t.user_id);
  end if;
  insert into celestual_mail_suppressions (email, scope) values (t.email, t.scope)
  on conflict do nothing;
  update celestual_mail_tokens set used_at = coalesce(used_at, now()) where token_hash = t.token_hash;
  return jsonb_build_object('ok', true, 'scope', t.scope);
end;
$$;

-- The email's removal link (`/r#t=`). Takes the letter down on the tap, as the
-- owner's own button does (wall_owner_remove, 0063): no claim, nothing else
-- shut, and a day to undo. Once, within thirty days.
create or replace function wall_remove_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  t celestual_mail_tokens%rowtype;
  v jsonb;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into t from celestual_mail_tokens
   where token_hash = encode(digest(p_token, 'sha256'), 'hex') and kind = 'remove'
   for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if t.used_at is not null then
    return jsonb_build_object('ok', false, 'error', 'used', 'letter_id', t.letter_id,
      'undo_until', case when t.undone_at is null then t.used_at + interval '24 hours' end);
  end if;
  if t.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

  v := wall_owner_down(t.letter_id, 'mail');
  if not (v->>'ok')::boolean then return v; end if;
  update celestual_mail_tokens set used_at = now() where token_hash = t.token_hash;
  return jsonb_build_object('ok', true, 'letter_id', t.letter_id, 'undo_until', v->'undo_until');
end;
$$;

-- And the undo, on the same link, within a day of the removal.
create or replace function wall_restore_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  t celestual_mail_tokens%rowtype;
  v jsonb;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into t from celestual_mail_tokens
   where token_hash = encode(digest(p_token, 'sha256'), 'hex') and kind = 'remove'
   for update;
  if not found or t.used_at is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if t.undone_at is not null then return jsonb_build_object('ok', true, 'letter_id', t.letter_id); end if;
  if t.used_at < now() - interval '24 hours' then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

  v := wall_owner_up(t.letter_id);
  if not (v->>'ok')::boolean then return v; end if;
  update celestual_mail_tokens set undone_at = now() where token_hash = t.token_hash;
  return jsonb_build_object('ok', true, 'letter_id', t.letter_id);
end;
$$;

revoke all on function celestual_alerts_get(text)                   from public;
revoke all on function celestual_alerts_set(text, boolean, boolean) from public;
revoke all on function celestual_alerts_off_by_token(text)          from public;
revoke all on function wall_remove_by_token(text)                   from public;
revoke all on function wall_restore_by_token(text)                  from public;
grant execute on function celestual_alerts_get(text)                   to anon, authenticated;
grant execute on function celestual_alerts_set(text, boolean, boolean) to anon, authenticated;
grant execute on function celestual_alerts_off_by_token(text)          to anon, authenticated, service_role;
grant execute on function wall_remove_by_token(text)                   to anon, authenticated;
grant execute on function wall_restore_by_token(text)                  to anon, authenticated;

comment on function celestual_alerts_get(text) is
  '0064: this person''s alerts: the claimed @, the alert address masked and whether it is confirmed, and the two switches.';
comment on function celestual_alerts_set(text, boolean, boolean) is
  '0064: turn "someone wrote you" and the mutual alert on or off. Errors claim (wrote needs a claimed @) and email (no confirmed address).';
comment on function celestual_alerts_off_by_token(text) is
  '0064: the email''s stop link and its List-Unsubscribe. Idempotent.';
comment on function wall_remove_by_token(text) is
  '0064: the email''s one tap removal. No claim, nothing else shut, a day to undo. Once, within thirty days.';
comment on function wall_restore_by_token(text) is
  '0064: the undo of wall_remove_by_token, within a day.';
comment on function celestual_mail_take(integer) is
  '0064: service role only. Claims the owed mail for ten minutes and mints its links.';
