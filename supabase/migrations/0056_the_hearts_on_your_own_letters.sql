-- ─────────────────────────────────────────────────────────────────────────────
-- 0056: the hearts on your own letters.
--
-- The account sheet lists the letters this device put up, and each row says
-- how many hearted it. `wall_mine` (0050, 0053, 0055) answered a writer about
-- their own letters and where each stands, and never how they were received;
-- the count is public on every read of a letter (0042), so it rides here too.
-- The same function, one more key, nothing else moved.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

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
    -- read of the count is (0042).
    'hearts', (select count(*)::int from wall_hearts h where h.letter_id = l.id),
    'flagged', (l.status = 'live'
                and l.moderation->>'verdict' = 'review'
                and not (l.moderation ? 'desk')),
    'reasons', coalesce(l.moderation->'reasons', '[]'::jsonb),
    'down_by', case
      when l.status = 'live' and l.expires_at > now() then null
      when l.status = 'live' then 'lapsed'
      when l.moderation #>> '{desk,via}' in ('desk_shut', 'optout') then 'shut'
      when l.moderation #>> '{desk,via}' = 'report_upheld' then 'report'
      when l.status = 'removed' and l.moderation #>> '{desk,status}' in ('removed', 'rejected') then 'desk'
      when l.status = 'rejected' and l.moderation #>> '{desk,status}' = 'rejected' then 'desk'
      when l.status = 'removed' then 'report'
      when l.status = 'rejected' and (l.moderation->'reasons') ? 'expired_in_review' then 'lapsed'
      when l.status = 'rejected' then 'screen'
      when l.status = 'pending' then 'held'
      else null
    end
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
  '0056: the caller''s own letters, where each stands, whose hand took it down, and how many hearted it. Answers about the caller only.';
