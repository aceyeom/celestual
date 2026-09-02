#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-migrations.sh
#
# Applies every file in supabase/migrations to an empty PostgreSQL cluster and
# prints a fingerprint of the schema it produces. Phase 4a of the rebuild uses
# the fingerprint to prove the migration set reproduces production; every later
# phase uses the same command to prove its new migrations still apply cleanly on
# top of a set that does.
#
# There is no Docker in the rebuild container, so this does not run
# `supabase start`. It runs a bare PostgreSQL under a shim that supplies the
# parts of a hosted Supabase project the migrations reach for: the four roles,
# the extensions schema with pgcrypto in it, the auth schema with the two
# objects our SQL references, and the default privileges that make an
# unqualified `create table` visible to anon and authenticated the way it is on
# the platform.
#
# What that verifies: SQL validity, ordering, grants, RLS, policies, constraints
# and function bodies. What it does not verify: anything that depends on the
# real auth or storage services, or on PostgREST. Those are noted per migration
# where they matter.
#
# Usage:
#   scripts/verify-migrations.sh              apply and print the fingerprint
#   scripts/verify-migrations.sh --detail     also write the per-object detail
#   scripts/verify-migrations.sh --test       also run scripts/sql/test-*.sql
#
# Exits non-zero if any migration fails to apply, or if --test is given and a
# test raises. A test file asserts by raising, so a clean run is the result.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
WORK="${VERIFY_DIR:-/var/lib/postgresql/verify}"
PGDATA="$WORK/pgdata"
SOCK="$WORK/sock"
DETAIL=0
TEST=0
for arg in "$@"; do
  case "$arg" in
    --detail) DETAIL=1 ;;
    --test)   TEST=1 ;;
    *) echo "unknown option: $arg"; exit 2 ;;
  esac
done

[ -x "$PGBIN/initdb" ] || { echo "no PostgreSQL server binaries at $PGBIN"; exit 1; }

# postgres refuses to run as root, so everything below runs as the postgres user.
as_pg() { su postgres -c "$1"; }
psql_() { as_pg "$PGBIN/psql -h $SOCK -U postgres -d postgres -v ON_ERROR_STOP=1 $*"; }

echo "── cluster ──────────────────────────────────────────────────────────────"
as_pg "$PGBIN/pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true
rm -rf "$WORK"
mkdir -p "$PGDATA" "$SOCK" "$WORK/sql"
chown -R postgres:postgres "$WORK"
as_pg "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust --encoding=UTF8 --locale=C" >/dev/null
as_pg "$PGBIN/pg_ctl -D $PGDATA -o \"-k $SOCK -c listen_addresses=''\" -l $WORK/pg.log start" >/dev/null
sleep 1

echo "── supabase shim ────────────────────────────────────────────────────────"
cat > "$WORK/sql/shim.sql" <<'SQL'
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator noinherit login;
grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to postgres;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key default extensions.gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter database postgres set search_path to public, extensions;
SQL
chown postgres:postgres "$WORK/sql/shim.sql"
psql_ "-q -f $WORK/sql/shim.sql" >/dev/null

echo "── migrations ───────────────────────────────────────────────────────────"
cp "$MIGRATIONS"/*.sql "$WORK/sql/"
chown postgres:postgres "$WORK/sql"/*.sql
fail=0
for f in "$MIGRATIONS"/*.sql; do
  b="$(basename "$f")"
  if out=$(psql_ "-q -f $WORK/sql/$b" 2>&1); then
    echo "  ok   $b"
  else
    echo "  FAIL $b"; echo "$out" | sed 's/^/       /' | head -8; fail=1
  fi
done
[ "$fail" = 0 ] || { echo; echo "migration set does not apply cleanly"; exit 1; }

if [ "$TEST" = 1 ]; then
  echo
  echo "── tests ────────────────────────────────────────────────────────────────"
  shopt -s nullglob
  tests=("$ROOT"/scripts/sql/test-*.sql)
  if [ ${#tests[@]} -eq 0 ]; then
    echo "  no test files under scripts/sql"
  fi
  for t in "${tests[@]}"; do
    b="$(basename "$t")"
    cp "$t" "$WORK/sql/$b"; chown postgres:postgres "$WORK/sql/$b"
    echo "  $b"
    # Run once. A test file is not idempotent, so its output and its exit code
    # both come from the same run.
    set +e
    as_pg "$PGBIN/psql -h $SOCK -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f $WORK/sql/$b" \
      > "$WORK/$b.out" 2>&1
    rc=$?
    set -e
    sed -e 's/^psql:[^ ]*: //' -e 's/^NOTICE:  //' -e 's/^ERROR:  //' "$WORK/$b.out" \
      | grep -E "^(PASS|FAIL)" | sed 's/^/    /' || true
    if [ $rc -ne 0 ]; then
      echo
      echo "  $b FAILED:"
      sed 's/^/    /' "$WORK/$b.out" | tail -20
      exit 1
    fi
    echo "    $(grep -c 'NOTICE:  PASS' "$WORK/$b.out" || true) passed"
  done
fi

# ── the fingerprint ──────────────────────────────────────────────────────────
# One line per column, constraint, index, policy, trigger, view body and
# function body, hashed together. Run the same query against production to
# compare. Ordering is `collate "C"` on both sides so the two agree regardless
# of the database's own collation, and function bodies have CR stripped because
# production's were applied through the dashboard editor and carry CRLF.
cat > "$WORK/sql/lines.sql" <<'SQL'
with d(line) as (
  select 'C '||c.relname||'.'||a.attname||' '||format_type(a.atttypid,a.atttypmod)||
         ' nn='||a.attnotnull::int||' def='||coalesce(pg_get_expr(ad.adbin,ad.adrelid),'-')
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum
   where n.nspname='public' and c.relkind in ('r','v')
  union all
  select 'K '||conrelid::regclass::text||' '||conname||' '||pg_get_constraintdef(con.oid)
    from pg_constraint con join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  union all
  select 'I '||tablename||' '||indexdef from pg_indexes where schemaname='public'
  union all
  select 'P '||pol.polrelid::regclass::text||' '||pol.polname||' '||pol.polcmd::text||
         ' roles='||coalesce((select string_agg(r.rolname,',' order by r.rolname)
                                from pg_roles r where r.oid = any(pol.polroles)),'ALL')||
         ' using='||coalesce(pg_get_expr(pol.polqual,pol.polrelid),'-')||
         ' check='||coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),'-')
    from pg_policy pol join pg_class c on c.oid=pol.polrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  union all
  select 'G '||c.relname||' '||t.tgname||' '||pg_get_triggerdef(t.oid)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and not t.tgisinternal
  union all
  select 'W '||c.relname||' '||md5(pg_get_viewdef(c.oid, true))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('v','m')
  union all
  select 'D '||p.proname||'('||pg_get_function_identity_arguments(p.oid)||') '||
         md5(replace(p.prosrc, chr(13), ''))||' '||p.provolatile::text||' '||
         coalesce(array_to_string(p.proconfig,','),'-')
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  union all
  select 'X '||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'||
         ' anon='||has_function_privilege('anon', p.oid,'EXECUTE')::int||
         ' auth='||has_function_privilege('authenticated', p.oid,'EXECUTE')::int||
         ' pub='||has_function_privilege('public', p.oid,'EXECUTE')::int||
         ' secdef='||p.prosecdef::int
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  union all
  select 'R '||c.relname||' rls='||c.relrowsecurity::int||
         ' anonsel='||has_table_privilege('anon', c.oid,'SELECT')::int||
         ' anonins='||has_table_privilege('anon', c.oid,'INSERT')::int||
         ' authsel='||has_table_privilege('authenticated', c.oid,'SELECT')::int||
         ' authins='||has_table_privilege('authenticated', c.oid,'INSERT')::int
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','v')
)
SQL

# The CTE above is shared. The fingerprint rolls it up; the detail prints it raw.
{ cat "$WORK/sql/lines.sql"; cat <<'SQL'
select left(line,1) as kind, count(*) as n,
       md5(string_agg(line, chr(10) order by line collate "C")) as hash
from d group by 1
union all
select 'ALL', count(*), md5(string_agg(line, chr(10) order by line collate "C")) from d
order by 1;
SQL
} > "$WORK/sql/fingerprint.sql"
{ cat "$WORK/sql/lines.sql"; echo 'select line from d order by line collate "C";'; } > "$WORK/sql/detail.sql"
chown postgres:postgres "$WORK/sql/fingerprint.sql" "$WORK/sql/detail.sql"
echo
echo "── fingerprint ──────────────────────────────────────────────────────────"
echo "  C columns  K constraints  I indexes  P policies  G triggers"
echo "  W views    D function bodies  X execute grants  R table grants and RLS"
echo
as_pg "$PGBIN/psql -h $SOCK -U postgres -d postgres -tA -F'  ' -f $WORK/sql/fingerprint.sql" | sed 's/^/  /'

if [ "$DETAIL" = 1 ]; then
  as_pg "$PGBIN/psql -h $SOCK -U postgres -d postgres -tA -f $WORK/sql/detail.sql" > "$WORK/detail.txt"
  echo
  echo "  $(wc -l < "$WORK/detail.txt") detail lines written to $WORK/detail.txt"
fi

echo
echo "cluster left running at $SOCK. stop it with:"
echo "  su postgres -c '$PGBIN/pg_ctl -D $PGDATA stop'"
