-- ─────────────────────────────────────────────────────────────────────────────
-- 0051: five days between.
--
-- The allowance stays three letters (0044), and the window they are counted
-- over shortens from seven days to five. Nothing else about the count moves:
-- `wall_letters_spent` still reads the window from this one function,
-- `wall_write` still refuses the fourth with `cap`, and `wall_quota` still
-- answers the caller with `resets_at`, which is the moment the oldest spent
-- letter falls out of the window. The composer now says only that: not the
-- number, not the limit, but how many days to wait before drafting again.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function wall_letter_window()
returns interval
language sql immutable set search_path = public as $$ select interval '5 days' $$;

-- The grants are unchanged and `create or replace` keeps them; restated so
-- this file stands on its own.
revoke all on function wall_letter_window() from public, anon, authenticated;
grant execute on function wall_letter_window() to service_role;

comment on function wall_letter_window() is
  '0051: the window the three letters are counted over. Five days, rolling.';

comment on function wall_quota(text) is
  '0044, 0051: three letters in any five days. Answers about the caller only — there is no argument for anybody else.';
