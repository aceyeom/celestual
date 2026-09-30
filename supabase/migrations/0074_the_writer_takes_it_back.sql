-- ─────────────────────────────────────────────────────────────────────────────
-- 0074_the_writer_takes_it_back.sql
--
-- A person who wrote a letter can take it back down.
--
-- ── the owner's ruling of 29 September ──────────────────────────────────────
-- "Give users who wrote a letter the option to take it back down", and above
-- all "users who just posted a letter to the wall". Every way a letter came
-- off the wall belonged to somebody else: the person it is about, who has
-- proved its @ (wall_owner_remove, 0063, and the email's link, 0064), a
-- reader who reports it (wall_report), and the desk. The one person who could
-- not was the one who wrote it, and the only door they had was reporting
-- their own letter, which needed a reader's proof, filed a report on a desk,
-- told them afterwards that a reader had taken it down, and, upheld, would
-- have shut the name of the person they wrote to. A letter is its writer's
-- words; taking them back is theirs to do, at any time while the letter
-- stands, and it is undone as easily for a day, since the moment right after
-- a letter goes up is the moment a person is likeliest to wish it had not.
--
-- ── 1. down, and up again ───────────────────────────────────────────────────
--   `wall_writer_remove(token, letter)` the session's user must be the
--                  letter's author. A letter that is up, or one still waiting
--                  on the desk ('pending', a note read before it goes up,
--                  0066), comes down: status 'removed', and on it the mark
--                  every hand that takes a letter down leaves in
--                  `moderation.desk`: `via` 'writer', when, the day it can be
--                  put back until (`undo_until`), the status it was taken
--                  from (`was`) and whatever the desk had said before
--                  (`prev`). No claim is filed and no report, so nothing about
--                  the name it was written to changes (wall_name_shut reads
--                  neither). Taken back twice is the same answer.
--   `wall_writer_restore(token, letter)` within the day, by the same author,
--                  a letter only its writer took down goes back to where it
--                  was: a letter that was up is up, and one that was waiting
--                  on the desk is waiting again, never up without the desk
--                  having read it. It does not go back when the reading
--                  refused it in the seconds between the write and the take
--                  back (the verdict lands on it all the same, wall_screened
--                  0050, and a letter the reading refused must never be put up
--                  by anybody but the desk), when the name it is written to
--                  has been shut or its person has left the product
--                  (wall_name_shut_any reads both), or when its thirty days
--                  are over.
--   errors         `no_session`, `not_yours`, `gone` (nothing there to take
--                  down, or nothing that can go back) and `expired` (the day
--                  is over, or the letter's thirty days are).
--
-- ── 2. the writer's list says so ────────────────────────────────────────────
-- wall_mine (0063) answered a removal nobody on the desk had made as
-- `report`, so that a letter its owner took down told its writer nothing
-- about who. A letter the writer took down themselves is theirs to be told
-- about in their own words: `down_by` is 'writer' for it, asked before that
-- branch, and the row carries `undo_until` while the day to put it back is
-- open, which is what the account's list opens the letter's own glass on
-- (app/src/wall/screens/You.jsx). The wall's notice never rises for it
-- (screens/Wall.jsx): a person does not need telling what they just did.
--
-- ── 3. and whose letter this is, told to the one person it is theirs ────────
-- The two reads of a letter, wall_letter and wall_letters_for, carry `yours`:
-- true when the session asking is the letter's author, and false for
-- everybody else, including nobody at all. It is the same kind of answer as
-- a reply's `mine` (0068): a fact about the caller, answered only about the
-- caller, and never anything else about authorship. Nobody can ask it about
-- anybody else, since the only session it reads is the one asking. It is
-- what puts `take it back` in the letter's options for its writer, and what
-- keeps `report this letter`, `this is about me` and `write to` off them.
--
-- And wall_letters_for carries `mine` now, as wall_letter always has: whether
-- the caller holds the verified @ the letters are written to. A letter opened
-- from a disc on the wall is read by its name and never by its id, so the
-- owner's `remove this letter` was never on its menu, and a letter opened by
-- its id lost it again when the name's letters were read under it (the client
-- keeps it now either way, app/src/wall/data.js `loadHandle`).
--
-- ── 4. what the desk can no longer undo ─────────────────────────────────────
-- Two desk paths could put a letter back up behind the back of the person who
-- took it down:
--   a report dismissed  celestual_desk_report_resolve set any 'removed'
--                  letter live when a report on it was dismissed. A report can
--                  be filed on a letter already down (wall_report inserts the
--                  row whatever the status), so dismissing it put back a
--                  letter its writer took back, or its owner removed. Neither
--                  is resurrected by a dismissal now; the report is still
--                  answered.
--   the desk's switch   celestual_desk_letter_set moves any letter to any
--                  status. It refuses to put up, or back into the queue, a
--                  letter its writer took back (`writer`), as it refuses one
--                  whose person has left (`optout`): the words are the
--                  writer's to withdraw. It can still take one further down
--                  (reject or remove it), which replaces the writer's mark with
--                  the desk's, and the writer's day to put it back ends there.
--                  A letter the owner of its @ took down stays the desk's to
--                  decide on this switch, as before: the owner's act is
--                  about their name, and the desk is who a wrong owner removal
--                  is taken up with.
--
-- ── what does not change ────────────────────────────────────────────────────
-- The allowance (wall_letters_spent, 0044) counts a letter that was taken
-- back, as it counts one a reader reported: it was written and read, and the
-- cap is the desk's switch and off (0052). The email to the person it is
-- written to (wall_letters_wrote_alert, 0064) is not sent for a letter taken
-- back before the mail goes out, since the drain skips a letter that is not
-- live; one already sent opens on "that letter has come down", as for any
-- letter that has.
--
-- Backward compatible: the reads answer what they answered, plus two keys; a
-- front end from before this file never asks for the two new functions, and
-- one after it that meets a database without them hides the row
-- (app/src/api/alerts.js answers 'missing'). Re-runnable: create or replace
-- throughout, and every grant restated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. down, and up again ────────────────────────────────────────────────────
create or replace function wall_writer_remove(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me    uuid := celestual_session_user(p_token);
  l       wall_letters%rowtype;
  v_until timestamptz := now() + interval '24 hours';
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.author_id is distinct from v_me then
    return jsonb_build_object('ok', false, 'error', 'not_yours');
  end if;
  -- taken back already: the same answer, with the day it was given
  if l.status = 'removed' and l.moderation #>> '{desk,via}' = 'writer' then
    return jsonb_build_object('ok', true, 'letter_id', l.id,
                              'undo_until', (l.moderation #>> '{desk,undo_until}')::timestamptz);
  end if;
  -- only a letter that stands, or waits on the desk, can be taken back: one
  -- the reading refused, one somebody else took down and one whose thirty
  -- days are over are already off the wall
  if l.status not in ('live', 'pending') or l.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'gone');
  end if;

  update wall_letters
     set status = 'removed',
         moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
           'desk', jsonb_strip_nulls(jsonb_build_object(
             'via', 'writer',
             'at', now(),
             'undo_until', v_until,
             'was', l.status,
             'prev', l.moderation->'desk')))
   where id = l.id;
  return jsonb_build_object('ok', true, 'letter_id', l.id, 'undo_until', v_until);
end;
$$;

create or replace function wall_writer_restore(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me  uuid := celestual_session_user(p_token);
  l     wall_letters%rowtype;
  v_was text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.author_id is distinct from v_me then
    return jsonb_build_object('ok', false, 'error', 'not_yours');
  end if;
  -- back already: the same answer, and where it stands
  if l.status in ('live', 'pending') then
    return jsonb_build_object('ok', true, 'letter_id', l.id, 'status', l.status);
  end if;
  if l.status <> 'removed' or coalesce(l.moderation #>> '{desk,via}', '') <> 'writer' then
    return jsonb_build_object('ok', false, 'error', 'gone');
  end if;
  if (l.moderation #>> '{desk,undo_until}')::timestamptz < now() or l.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  -- the reading refused it while it was down, or the name came off the wall
  -- or its person left: it stays where it is
  if coalesce(l.moderation->>'verdict', '') = 'reject' or wall_name_shut_any(l.target_handle) then
    return jsonb_build_object('ok', false, 'error', 'gone');
  end if;

  v_was := case when l.moderation #>> '{desk,was}' = 'pending' then 'pending' else 'live' end;
  update wall_letters
     set status = v_was,
         moderation = case when l.moderation #> '{desk,prev}' is null then moderation - 'desk'
                           else jsonb_set(moderation, '{desk}', l.moderation #> '{desk,prev}') end
   where id = l.id;
  return jsonb_build_object('ok', true, 'letter_id', l.id, 'status', v_was);
end;
$$;

revoke all on function wall_writer_remove(text, uuid)  from public;
revoke all on function wall_writer_restore(text, uuid) from public;
grant execute on function wall_writer_remove(text, uuid)  to anon, authenticated;
grant execute on function wall_writer_restore(text, uuid) to anon, authenticated;

comment on function wall_writer_remove(text, uuid) is
  '0074: the letter''s author takes it back down, up or waiting. Files nothing and shuts nothing. Undoable for 24 hours.';
comment on function wall_writer_restore(text, uuid) is
  '0074: puts back, where it was, a letter its author took down, within 24 hours, unless the reading refused it or the name is shut.';

-- ── 2. the writer's list says so ─────────────────────────────────────────────
-- 0063's definition, with the writer's own word asked before `report`, and
-- the day to put it back on the row while it is open.
create or replace function wall_mine(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  v_rows jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'handle', l.target_handle,
    'kind', l.target_kind,
    'name', l.target_name,
    'look', l.look,
    'body', l.body,
    'status', l.status,
    'at', l.created_at,
    -- how many hearted it. A count and never a list, the way every other
    -- read of the count is (0042), and the same sum they answer (0059).
    'hearts', l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
    'flagged', (l.status = 'live'
                and l.moderation->>'verdict' = 'review'
                and not (l.moderation ? 'desk')),
    'reasons', coalesce(l.moderation->'reasons', '[]'::jsonb),
    'down_by', case
      when l.status = 'live' and l.expires_at > now() then null
      when l.status = 'live' then 'lapsed'
      when l.status = 'removed' and l.moderation #>> '{desk,via}' = 'writer' then 'writer'
      when l.moderation #>> '{desk,via}' in ('desk_shut', 'optout') then 'shut'
      when l.moderation #>> '{desk,via}' = 'report_upheld' then 'report'
      when l.status = 'removed' and l.moderation #>> '{desk,status}' in ('removed', 'rejected') then 'desk'
      when l.status = 'rejected' and l.moderation #>> '{desk,status}' = 'rejected' then 'desk'
      when l.status = 'removed' then 'report'
      when l.status = 'rejected' and (l.moderation->'reasons') ? 'expired_in_review' then 'lapsed'
      when l.status = 'rejected' then 'screen'
      when l.status = 'pending' then 'held'
      else null
    end,
    -- the day a letter its writer took back can be put back until, while it
    -- is open; null for every other row
    'undo_until', case
      when l.status = 'removed' and l.moderation #>> '{desk,via}' = 'writer'
       and (l.moderation #>> '{desk,undo_until}')::timestamptz > now()
       and l.expires_at > now()
      then l.moderation #> '{desk,undo_until}'
    end,
    'campus',     l.campus,
    'verified',   l.verified,
    'salutation', l.salutation,
    'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
  ) order by l.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from wall_letters
     where author_id = v_me
       and created_at > now() - interval '30 days'
     order by created_at desc
     limit 12
  ) l;

  return jsonb_build_object('ok', true, 'letters', v_rows);
end;
$$;

revoke all on function wall_mine(text) from public;
grant execute on function wall_mine(text) to anon, authenticated;

comment on function wall_mine(text) is
  '0050, 0063, 0074: the caller''s own letters of the last thirty days and where each stands, with `writer` for one they took back and the day it can be put back.';

-- ── 3. the reads, and `yours` ────────────────────────────────────────────────
-- Each is its 0066 definition with `yours` beside `hearted`, and
-- wall_letters_for carrying `mine` as wall_letter does, asked once for the
-- key since every letter under it is written to the same @.
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh      text := wall_target_key(p_handle);
  v_me    uuid := celestual_session_user(p_token);
  v_rows  jsonb   := '[]'::jsonb;
  v_kind  text    := case when left(coalesce(nh, ''), 1) = '~' then 'name' else 'handle' end;
  v_name  text;
  v_mine  boolean := false;
  p       ig_profiles%rowtype;
  l       wall_letters%rowtype;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  -- a first name is nobody's to own (0053)
  if v_kind = 'handle' and v_me is not null then
    v_mine := exists (
      select 1 from celestual_users u
       where u.id = v_me and u.merged_into is null
         and u.handle_verified_at is not null
         and u.instagram_handle = nh);
  end if;

  for l in
    select * from wall_letters
     where target_handle = nh and status = 'live' and expires_at > now()
     order by created_at desc
  loop
    if v_name is null then v_name := l.target_name; end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'kind',     l.target_kind,
      'name',     l.target_name,
      'look',     l.look,
      'body',     l.body,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'mine',     v_mine,
      'hearts',   l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me),
      -- whether the caller wrote it, answered to the caller alone
      'yours',    v_me is not null and l.author_id = v_me,
      'verified',   l.verified,
      'salutation', l.salutation,
      'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
    ));
  end loop;

  if v_kind = 'handle' then
    select * into p from ig_profiles where handle = nh;
  end if;

  return jsonb_build_object(
    'ok', true, 'open', true, 'handle', nh, 'letters', v_rows,
    'kind', v_kind, 'name', v_name,
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path
  );
end;
$$;

create or replace function wall_letter(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me   uuid := celestual_session_user(p_token);
  l      wall_letters%rowtype;
  p      ig_profiles%rowtype;
  v_mine boolean;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );
  if l.target_kind = 'handle' then
    select * into p from ig_profiles where handle = l.target_handle;
  end if;

  return jsonb_build_object('ok', true, 'open', true,
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path,
    'letter', jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'kind',     l.target_kind,
      'name',     l.target_name,
      'look',     l.look,
      'body',     l.body,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'mine',     v_mine,
      'hearts',   l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me),
      -- whether the caller wrote it, answered to the caller alone
      'yours',    v_me is not null and l.author_id = v_me,
      'verified',   l.verified,
      'salutation', l.salutation,
      'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
    ));
end;
$$;

-- `create or replace` keeps the grants; restated so this file stands on its own.
revoke all on function wall_letters_for(text, text) from public;
revoke all on function wall_letter(text, uuid)      from public;
grant execute on function wall_letters_for(text, text) to anon, authenticated;
grant execute on function wall_letter(text, uuid)      to anon, authenticated;

comment on function wall_letters_for(text, text) is
  '0066, 0074: every live letter under a key, whole, to anybody; whether the caller holds its verified @ (mine) and, for each, whether the caller wrote it (yours).';
comment on function wall_letter(text, uuid) is
  '0066, 0074: one live letter, whole, to anybody; whether the caller holds its verified @ (mine) and whether the caller wrote it (yours).';

-- ── 4. what the desk can no longer undo ──────────────────────────────────────
-- 0046's two definitions, each with one guard more.
create or replace function celestual_desk_letter_set(p_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l wall_letters;
begin
  if p_status not in ('pending', 'live', 'rejected', 'removed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select * into v_l from wall_letters where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if p_status in ('pending', 'live')
     and exists (select 1 from celestual_suppressions s
                  where s.handle_hash = celestual_hash_handle(v_l.target_handle)) then
    return jsonb_build_object('ok', false, 'error', 'optout');
  end if;

  -- a letter its writer took back is not the desk's to put up again
  if p_status in ('pending', 'live')
     and v_l.status = 'removed' and v_l.moderation #>> '{desk,via}' = 'writer' then
    return jsonb_build_object('ok', false, 'error', 'writer');
  end if;

  update wall_letters
     set status = p_status,
         moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
           'desk', jsonb_build_object(
             'status', p_status,
             'note', nullif(btrim(coalesce(p_note, '')), ''),
             'at', now()
           ))
   where id = p_id
  returning * into v_l;

  return jsonb_build_object('ok', true, 'id', v_l.id, 'status', v_l.status, 'moderation', v_l.moderation);
end;
$$;

create or replace function celestual_desk_report_resolve(
  p_id     uuid,
  p_uphold boolean,
  p_note   text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_r wall_reports;
  v_letter uuid;
  v_target text;
  v_shut boolean := false;
  v_restored boolean := false;
  v_closed integer;
begin
  select * into v_r from wall_reports where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_r.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'already_resolved'); end if;

  v_letter := v_r.letter_id;
  select l.target_handle into v_target from wall_letters l where l.id = v_letter;
  v_shut := exists (select 1 from celestual_suppressions s
                     where s.handle_hash = celestual_hash_handle(v_target));

  update wall_reports
     set status = case when p_uphold then 'upheld' else 'dismissed' end,
         resolution = nullif(btrim(coalesce(p_note, '')), ''),
         resolved_at = now()
   where letter_id = v_letter and status = 'open';
  get diagnostics v_closed = row_count;

  if p_uphold then
    update wall_letters
       set status = 'removed',
           moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
             'desk', jsonb_build_object(
               'status', 'removed',
               'note', nullif(btrim(coalesce(p_note, '')), ''),
               'via', 'report_upheld',
               'at', now()
             ))
     where id = v_letter and status = 'live';
  elsif not v_shut then
    -- Dismissing a report puts the letter back, unless the person it is about
    -- has left, or the letter came down by the hand of its writer or of the
    -- owner of its @ (0074): the report is still answered, and the letter
    -- stays where the person who took it down put it.
    update wall_letters
       set status = 'live',
           moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
             'desk', jsonb_build_object(
               'status', 'live',
               'note', nullif(btrim(coalesce(p_note, '')), ''),
               'via', 'report_dismissed',
               'at', now()
             ))
     where id = v_letter and status = 'removed'
       and coalesce(moderation #>> '{desk,via}', '') not in ('writer', 'owner');
    v_restored := found;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'letter_id', v_letter,
    'upheld', p_uphold,
    'closed', v_closed,
    'restored', v_restored,
    'optout', v_shut
  );
end;
$$;

revoke all on function celestual_desk_letter_set(uuid, text, text)          from public, anon, authenticated;
revoke all on function celestual_desk_report_resolve(uuid, boolean, text)   from public, anon, authenticated;
grant execute on function celestual_desk_letter_set(uuid, text, text)        to service_role;
grant execute on function celestual_desk_report_resolve(uuid, boolean, text) to service_role;

comment on function celestual_desk_letter_set(uuid, text, text) is
  '0046, 0074: the desk moves a letter to a status. Never up or back into the queue for a person who left (optout) or a letter its writer took back (writer). Service role only.';
comment on function celestual_desk_report_resolve(uuid, boolean, text) is
  '0046, 0074: answers a report. Upheld takes the letter down; dismissed puts it back unless its person left or its writer or owner took it down. Service role only.';
