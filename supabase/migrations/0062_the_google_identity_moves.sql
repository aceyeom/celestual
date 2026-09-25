-- ─────────────────────────────────────────────────────────────────────────────
-- 0062: the google identity moves with a merge.
--
-- Two migrations were applied to the live project from the dashboard on 25
-- September and never written into this directory:
--
--   20260925140542  merge_moves_google_identity
--   20260925140623  fix_google_clear_pair_and_repair
--
-- This file is those two, so a database built from these files is the one
-- that runs, plus the one line they needed and did not have.
--
-- ── what they did ───────────────────────────────────────────────────────────
-- 0057 put a google login on the person's row, and `google_sub` is unique
-- (celestual_users_google_sub_idx). celestual_user_merge (0030) moved the @,
-- the campus address and the note from the absorbed row to the survivor, and
-- knew nothing of the google login, so a merge of two rows where only the
-- absorbed one had signed in with google left the login on the tombstone: the
-- person could never sign in with google again, because the login they held
-- belonged to a row that no longer existed. The first migration taught the
-- merge to move it, and to stop and ask when both rows hold a different one.
-- The second made the move clear `google_verified_at` along with the subject
-- (0057's `celestual_users_google_ck` holds the two together) and repaired
-- every row an earlier merge had stranded, following each tombstone to its
-- live survivor.
--
-- ── and the line they needed ────────────────────────────────────────────────
-- The stop and ask writes `kind 'google'` to celestual_merge_conflicts, and
-- that table's check (0030) admits only 'handle', 'edu' and 'content'. So the
-- branch they added threw a check violation instead of recording the pair,
-- and a bind that reached it failed with an error rather than answering
-- `conflict_google`. The check is widened here.
--
-- ── re-runnable ─────────────────────────────────────────────────────────────
-- Both are already applied live, so this has to be a no-op there and the same
-- result on a fresh database. The function is written as the first migration
-- wrote it, word for word, and then patched as the second patched it; the
-- patch is skipped when it has already been made (the second migration raised
-- instead, which on a second run is an error). The two repairs only act on a
-- tombstone that still carries a google login, and after one run there is
-- none, so a second run moves nothing.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. the check, widened first ──────────────────────────────────────────────
-- Before the function that writes the new kind, so there is no moment in this
-- file where the merge can reach a branch its own table refuses.
alter table celestual_merge_conflicts drop constraint if exists celestual_merge_conflicts_kind_ck;
alter table celestual_merge_conflicts add constraint celestual_merge_conflicts_kind_ck
  check (kind in ('handle', 'edu', 'content', 'google'));

-- ── 1. 20260925140542 merge_moves_google_identity ───────────────────────────
CREATE OR REPLACE FUNCTION public.celestual_user_merge(p_survivor uuid, p_absorbed uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a       celestual_users%rowtype;
  b       celestual_users%rowtype;
  v_moved jsonb := '{}'::jsonb;
  v_rows  jsonb := '[]'::jsonb;
  fk      record;
  n       bigint;
begin
  if p_survivor is null or p_absorbed is null or p_survivor = p_absorbed then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into a from celestual_users where id = p_survivor for update;
  if not found or a.merged_into is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into b from celestual_users where id = p_absorbed for update;
  if not found or b.merged_into is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if a.instagram_handle is not null and b.instagram_handle is not null
     and a.instagram_handle <> b.instagram_handle then
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('handle', a.id, b.id,
            jsonb_build_object('a_handle', a.instagram_handle, 'b_handle', b.instagram_handle,
                               'reason', p_reason));
    return jsonb_build_object('ok', false, 'error', 'conflict_handle');
  end if;

  if a.edu_email is not null and b.edu_email is not null and a.edu_email <> b.edu_email then
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('edu', a.id, b.id,
            jsonb_build_object('a_campus', a.edu_domain, 'b_campus', b.edu_domain,
                               'reason', p_reason));
    return jsonb_build_object('ok', false, 'error', 'conflict_edu');
  end if;

  if a.google_sub is not null and b.google_sub is not null and a.google_sub <> b.google_sub then
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('google', a.id, b.id, jsonb_build_object('reason', p_reason));
    return jsonb_build_object('ok', false, 'error', 'conflict_google');
  end if;

  begin
    if a.instagram_handle is null and b.instagram_handle is not null then
      update celestual_users set instagram_handle = null, handle_verified_at = null where id = b.id;
      update celestual_users
         set instagram_handle = b.instagram_handle, handle_verified_at = b.handle_verified_at
       where id = a.id;
      v_moved := v_moved || jsonb_build_object('handle', b.instagram_handle);
    elsif b.instagram_handle is not null then
      update celestual_users set instagram_handle = null, handle_verified_at = null where id = b.id;
      update celestual_users
         set handle_verified_at = least(a.handle_verified_at, b.handle_verified_at)
       where id = a.id;
    end if;

    if a.edu_email is null and b.edu_email is not null then
      update celestual_users set edu_email = null, edu_verified_at = null where id = b.id;
      update celestual_users
         set edu_email = b.edu_email, edu_verified_at = b.edu_verified_at
       where id = a.id;
      v_moved := v_moved || jsonb_build_object('edu_domain', b.edu_domain);
    elsif b.edu_email is not null then
      update celestual_users set edu_email = null, edu_verified_at = null where id = b.id;
      update celestual_users
         set edu_verified_at = least(a.edu_verified_at, b.edu_verified_at)
       where id = a.id;
    end if;

    -- google identity: unique on google_sub, so it must leave the absorbed row
    if b.google_sub is not null then
      update celestual_users set google_sub = null where id = b.id;
      if a.google_sub is null then
        update celestual_users
           set google_sub = b.google_sub,
               google_email = coalesce(a.google_email, b.google_email),
               google_verified_at = coalesce(a.google_verified_at, b.google_verified_at)
         where id = a.id;
        v_moved := v_moved || jsonb_build_object('google', true);
      end if;
    end if;

    if a.email is null and b.email is not null then
      update celestual_users set email = b.email where id = a.id;
      v_moved := v_moved || jsonb_build_object('email', b.email);
    end if;

    if exists (
      select 1 from pg_constraint c
       where c.contype = 'f' and c.confrelid = 'celestual_users'::regclass
         and c.conrelid <> 'celestual_users'::regclass
         and array_length(c.conkey, 1) <> 1
    ) then
      raise exception 'composite foreign key to celestual_users, merge cannot follow content'
        using errcode = 'foreign_key_violation';
    end if;

    for fk in
      select c.conrelid::regclass::text as tbl,
             quote_ident(att.attname) as col
        from pg_constraint c
        join pg_attribute att
          on att.attrelid = c.conrelid and att.attnum = c.conkey[1]
       where c.contype = 'f'
         and c.confrelid = 'celestual_users'::regclass
         and c.conrelid <> 'celestual_users'::regclass
       order by 1
    loop
      execute format('update %s set %s = $1 where %s = $2', fk.tbl, fk.col, fk.col)
        using a.id, b.id;
      get diagnostics n = row_count;
      if n > 0 then
        v_rows := v_rows || jsonb_build_array(jsonb_build_object('table', fk.tbl, 'rows', n));
      end if;
    end loop;

    update celestual_users
       set merged_into = a.id, merged_at = now(), updated_at = now()
     where id = b.id;
    update celestual_users set updated_at = now() where id = a.id;

    insert into celestual_user_merges (survivor_id, absorbed_id, reason, before_json, moved_json)
    values (a.id, b.id, p_reason,
            jsonb_build_object('survivor', to_jsonb(a), 'absorbed', to_jsonb(b)),
            jsonb_build_object('fields', v_moved, 'rows', v_rows));

  exception when unique_violation or foreign_key_violation then
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('content', p_survivor, p_absorbed,
            jsonb_build_object('reason', p_reason, 'sqlstate', sqlstate, 'message', sqlerrm));
    return jsonb_build_object('ok', false, 'error', 'conflict_content');
  end;

  return jsonb_build_object('ok', true, 'user', a.id, 'moved', v_moved, 'rows', v_rows);
end;
$function$;

-- repair: move google identity off already-merged rows onto their live survivor
with stuck as (
  select b.id as b_id, s.id as s_id, b.google_sub, b.google_email, b.google_verified_at
    from celestual_users b
    join celestual_users s on s.id = b.merged_into
   where b.merged_into is not null and b.google_sub is not null
     and s.merged_into is null and s.google_sub is null
), cleared as (
  update celestual_users u set google_sub = null
    from stuck where u.id = stuck.b_id
  returning stuck.*
)
update celestual_users u
   set google_sub = cleared.google_sub,
       google_email = coalesce(u.google_email, cleared.google_email),
       google_verified_at = coalesce(u.google_verified_at, cleared.google_verified_at),
       updated_at = now()
  from cleared where u.id = cleared.s_id;

-- ── 2. 20260925140623 fix_google_clear_pair_and_repair ──────────────────────
-- As applied, with one change: where the function already carries the
-- patched line (a second run, or the live project), the patch is skipped
-- rather than raised.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.celestual_user_merge(uuid,uuid,text)'::regprocedure);
  if position('set google_sub = null, google_verified_at = null where id = b.id' in d) > 0 then
    return;
  end if;
  if position('set google_sub = null where id = b.id' in d) = 0 then
    raise exception 'expected line not found';
  end if;
  d := replace(d, 'set google_sub = null where id = b.id',
                  'set google_sub = null, google_verified_at = null where id = b.id');
  execute d;
end $$;

do $$
declare r record; v_root uuid; v_next uuid; i int;
begin
  for r in select id, google_sub, google_email, google_verified_at, merged_into
             from celestual_users where merged_into is not null and google_sub is not null
  loop
    v_root := r.merged_into; i := 0;
    loop
      select merged_into into v_next from celestual_users where id = v_root;
      exit when v_next is null or i > 50;
      v_root := v_next; i := i + 1;
    end loop;
    if exists (select 1 from celestual_users where id = v_root and google_sub is null and merged_into is null) then
      update celestual_users set google_sub = null, google_verified_at = null where id = r.id;
      update celestual_users
         set google_sub = r.google_sub,
             google_email = coalesce(google_email, r.google_email),
             google_verified_at = coalesce(google_verified_at, r.google_verified_at),
             updated_at = now()
       where id = v_root;
    end if;
  end loop;
end $$;

-- `create or replace` keeps the grants 0030 gave it; restated so this file
-- stands on its own. The merge is never the browser's.
revoke all on function celestual_user_merge(uuid, uuid, text) from public, anon, authenticated;
grant execute on function celestual_user_merge(uuid, uuid, text) to service_role;

comment on function celestual_user_merge(uuid, uuid, text) is
  '0030, 0062: the merge rule. Older row survives. Moves the @, the campus address, the google login and the note; refuses on two different verified handles, campus addresses or google logins, and records the pair in celestual_merge_conflicts.';
