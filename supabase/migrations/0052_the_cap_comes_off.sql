-- ─────────────────────────────────────────────────────────────────────────────
-- 0052: the cap comes off, and it comes off at the desk.
--
-- Three letters in any five days (0044, 0051) was a number in a function, so
-- lifting it for an evening meant a migration and putting it back meant
-- another one. Both numbers move into `celestual_settings`, where the resolver
-- and the apify caps have lived since 0039, and the desk gets the switch:
--
--   wall_letter_cap        'true' | 'false'. Off, nothing counts and nothing
--                          is refused. Seeded OFF by this migration, which is
--                          what it was written for — see the last section.
--   wall_letter_allowance  the number, default 3. Read every call, so a change
--                          takes on the next letter and not on a deploy.
--
-- The window stays five days and stays in `wall_letter_window()`: when the cap
-- is off there is no window to speak of, and when it is on, five days is the
-- decision 0051 made about the shape of the thing rather than a dial.
--
-- ── what the switch does NOT touch ──────────────────────────────────────────
-- Everything else about writing a letter. The campus gate (`wall_gate`, a
-- berkeley.edu address), the screen at the keyboard and again on the server
-- (layer 1), the classifier that reads the letter where it stands (0050), a
-- name that has come off the wall: all unchanged. This is the ration on how
-- MANY a person may write, and nothing about WHAT may be written. The eight
-- free reads (0045, 0049) are a different allowance for a different person
-- and are not on this switch either.
--
-- ── what the quota says with it off ─────────────────────────────────────────
-- `wall_quota` gains one key, `capped`, and answers the caller with an
-- allowance that never runs down: `left` is the whole allowance, `used` is
-- still the true count of what was written in the window, and `resets_at` is
-- null because nothing is waiting to come back. That shape is deliberate. An
-- app built before this migration reads the same four fields it always did
-- and sees a writer who is nowhere near their limit, which is exactly what
-- the switch means; an app built after it reads `capped` and draws nothing at
-- all. Neither order of deploying is a composer that has gone dark.
--
-- ── putting it back ─────────────────────────────────────────────────────────
-- One row, one tap, no deploy: the desk's settings screen, `the letters`. Or
--
--   select celestual_desk_setting_set('wall_letter_cap', 'true');
--
-- and the next letter is counted. The seed below is `on conflict do nothing`,
-- so re-running this file never turns the cap back off under a desk that has
-- turned it on — which is the one way a re-runnable migration could do harm
-- here.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the switch, and the number ───────────────────────────────────────────
-- Both read through 0039's helpers, so a missing row is the default rather
-- than an error, and the default is the cap ON. If somebody deletes the row
-- the ration comes back, which is the safe direction for a row to be missing
-- in.
create or replace function wall_letter_cap_on()
returns boolean
language sql stable security definer set search_path = public as $$
  select celestual_setting('wall_letter_cap', 'true') = 'true'
$$;

-- `stable` rather than `immutable` now, because it reads a table. The same
-- change handle_search_limit made in 0039, for the same reason.
create or replace function wall_letter_allowance()
returns integer
language sql stable security definer set search_path = public as $$
  select celestual_setting_int('wall_letter_allowance', 3)
$$;

revoke all on function wall_letter_cap_on()    from public, anon, authenticated;
revoke all on function wall_letter_allowance() from public, anon, authenticated;
grant execute on function wall_letter_cap_on()    to service_role;
grant execute on function wall_letter_allowance() to service_role;

comment on function wall_letter_cap_on() is
  '0052: whether the writer''s allowance is counted at all. The desk''s switch, on by default.';
comment on function wall_letter_allowance() is
  '0052: how many letters in the window. The desk''s number, three by default.';

-- ── 2. the desk holds both ──────────────────────────────────────────────────
-- As 0039 wrote them, with the two keys added to the whitelist. The salt is
-- still not on the list and still cannot be added to it from the desk.
create or replace function celestual_desk_settings()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'ok', true,
    'settings', jsonb_build_object(
      'require_ig_verification', celestual_setting('require_ig_verification', 'false'),
      'resolver_enabled',        celestual_setting('resolver_enabled', 'true'),
      'wall_letter_cap',         celestual_setting('wall_letter_cap', 'true'),
      'wall_letter_allowance',   celestual_setting_int('wall_letter_allowance', 3),
      'cap_user',                celestual_setting_int('cap_user', 20),
      'cap_device',              celestual_setting_int('cap_device', 20),
      'cap_ip',                  celestual_setting_int('cap_ip', 200),
      'cap_global',              celestual_setting_int('cap_global', 1000)
    ),
    'defaults', jsonb_build_object(
      'require_ig_verification', 'false',
      'resolver_enabled', 'true',
      'wall_letter_cap', 'true',
      'wall_letter_allowance', 3,
      'cap_user', 20, 'cap_device', 20, 'cap_ip', 200, 'cap_global', 1000
    ),
    'updated', (
      select coalesce(jsonb_object_agg(key, updated_at), '{}'::jsonb)
        from celestual_settings
       where key in ('require_ig_verification', 'resolver_enabled',
                     'wall_letter_cap', 'wall_letter_allowance',
                     'cap_user', 'cap_device', 'cap_ip', 'cap_global')
    )
  );
end;
$$;

create or replace function celestual_desk_setting_set(p_key text, p_value text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v text := btrim(coalesce(p_value, ''));
begin
  if p_key in ('require_ig_verification', 'resolver_enabled', 'wall_letter_cap') then
    if v not in ('true', 'false') then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  elsif p_key in ('cap_user', 'cap_device', 'cap_ip', 'cap_global') then
    if v !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  -- One letter is the smallest allowance worth having. A nought here would
  -- shut the composer for the whole campus while the switch still said the
  -- cap was on, which is the one value this key must not be able to take:
  -- closing the wall is `wall_campuses.is_open`, and it says so.
  elsif p_key = 'wall_letter_allowance' then
    if v !~ '^[1-9][0-9]{0,5}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'bad_key');
  end if;

  insert into celestual_settings (key, value, updated_at) values (p_key, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true, 'key', p_key, 'value', v);
end;
$$;

revoke all on function celestual_desk_settings()               from public, anon, authenticated;
revoke all on function celestual_desk_setting_set(text, text)  from public, anon, authenticated;
grant execute on function celestual_desk_settings()                to service_role;
grant execute on function celestual_desk_setting_set(text, text)   to service_role;

-- ── 3. wall_quota, with the switch in it ────────────────────────────────────
-- As 0044 wrote it, plus `capped` and the branch above. It still answers about
-- the CALLER and nobody else, and there is still no argument for anybody else.
create or replace function wall_quota(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me    uuid    := celestual_session_user(p_token);
  v_limit int     := wall_letter_allowance();
  v_on    boolean := wall_letter_cap_on();
  v_spent jsonb;
  v_used  int;
begin
  if v_me is null then
    return jsonb_build_object('ok', true, 'signed_in', false, 'capped', v_on,
      'limit', v_limit, 'used', 0, 'left', v_limit, 'resets_at', null);
  end if;

  v_spent := wall_letters_spent(v_me);
  v_used  := coalesce((v_spent->>'used')::int, 0);

  -- Off: what was written is still counted honestly, and nothing is spent by
  -- it. Nothing is waiting to come back, so there is no date to hand the
  -- composer and no line for it to draw.
  if not v_on then
    return jsonb_build_object(
      'ok', true, 'signed_in', true, 'capped', false,
      'limit', v_limit, 'used', v_used, 'left', v_limit, 'resets_at', null);
  end if;

  return jsonb_build_object(
    'ok', true, 'signed_in', true, 'capped', true,
    'limit', v_limit,
    'used',  v_used,
    'left',  greatest(v_limit - v_used, 0),
    'resets_at', case
      when v_used = 0 or (v_spent->>'oldest') is null then null
      else (v_spent->>'oldest')::timestamptz + wall_letter_window()
    end
  );
end;
$$;

revoke all on function wall_quota(text) from public;
grant execute on function wall_quota(text) to anon, authenticated;

comment on function wall_quota(text) is
  '0044, 0051, 0052: the desk''s allowance in the desk''s window, or `capped` false and nothing counted. Answers about the caller only — there is no argument for anybody else.';

-- ── 4. wall_write, asking the switch before it counts ───────────────────────
-- As 0044 and 0050 left it. The order is untouched: the campus gate first,
-- then the name, then the count — so a person outside the gate is still told
-- they are outside the gate rather than told how many letters they have left.
-- The only new line is the one that skips the count.
--
-- This is still the statement that inserts, so this is still where the fourth
-- letter is refused: two requests that both ask `wall_quota` before either
-- writes both pass, and only this function sees them both.
create or replace function wall_write(
  p_token   text,
  p_target  text,
  p_body    text,
  p_seal    text,
  p_source  text,
  p_campus  text,
  p_status  text,
  p_moderation jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh   text := celestual_norm(p_target);
  v_me uuid := celestual_session_user(p_token);
  v_id uuid;
  v_source text := case when p_source ~ '^[a-z0-9_-]{1,32}$' then p_source end;
  v_spent  jsonb;
  v_used   int;
  v_limit  int := wall_letter_allowance();
begin
  if nh is null or char_length(nh) < 3 then
    return jsonb_build_object('ok', false, 'error', 'handle');
  end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if p_status not in ('pending', 'live', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;

  if not wall_gate(v_me, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  if wall_name_shut(nh, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'removed');
  end if;

  -- A letter the screen is about to reject is written anyway (spec section 9:
  -- rejected content is stored so it appears at the desk) and does not spend
  -- one, so it is not counted here either. Neither is anything at all while
  -- the desk's switch is off (0052).
  if p_status <> 'rejected' and wall_letter_cap_on() then
    v_spent := wall_letters_spent(v_me);
    v_used  := coalesce((v_spent->>'used')::int, 0);
    if v_used >= v_limit then
      return jsonb_build_object(
        'ok', false, 'error', 'cap',
        'limit', v_limit, 'used', v_used, 'left', 0,
        'resets_at', (v_spent->>'oldest')::timestamptz + wall_letter_window());
    end if;
  end if;

  insert into wall_letters (target_handle, body, sealed_line, author_id, campus,
                            source_code, status, moderation)
  values (nh, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, v_source, p_status, p_moderation)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status);
end;
$$;

-- The grants are unchanged and `create or replace` keeps them; restated so
-- this file stands on its own. wall_write stays service role only: the browser
-- may not write a letter, it may only ask celestual-wall-moderate to.
revoke all on function wall_write(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb) to service_role;

-- ── 5. and it is off ────────────────────────────────────────────────────────
-- Seeded off, because that is what this migration was asked for: the wall is
-- being filled by the people who built it, and three letters in five days is
-- a ration on a stranger, not on a founder at a table with a list of names.
-- `do nothing` on conflict, so this file is re-runnable without ever undoing
-- a desk that has turned the cap back on.
insert into celestual_settings (key, value) values ('wall_letter_cap', 'false')
  on conflict (key) do nothing;
