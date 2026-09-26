-- ─────────────────────────────────────────────────────────────────────────────
-- 0068_the_replies.sql
--
-- A letter gets a thread under it, and the heart is anybody's.
--
-- ── the heart, open ─────────────────────────────────────────────────────────
-- A heart is a count and never a name (0042), and it was behind the read gate
-- because a heart on a letter you could not read was a heart on a redaction.
-- The owner's ruling of 26 September: likes are zero risk and add a lot of
-- interaction, so they are open to everybody. `wall_heart` takes a device
-- with no proof at all now. A device that has never been seen is given a
-- bare row and a session, as a name note's writer is (0063
-- `celestual_session_user_or_new`), so a heart is still one row per person
-- in the same table, keyed the way every heart before it was, folded by a
-- merge and gone with an erasure. The count every read answers is unchanged.
--
-- ── replies ─────────────────────────────────────────────────────────────────
-- The rules, as the owner gave them:
--
--   likes          anybody, on a reply as on a letter
--   replying       a device whose person is verified at a school (.edu, or
--                  the desk's pass list), the same accountability rule the
--                  @-notes keep; or the person the letter is to, proved by
--                  the Instagram claim, who needs nothing else and whose
--                  replies say so (`recipient`)
--   the first one  a person accepts the terms for replying once, on the
--                  server (`wall_reply_terms`), before their first reply
--   nobody else    no @, no handle and no full name of anybody, at the
--                  keyboard, in the edge function and here, where nothing
--                  can edit it out (`wall_reply_caught`)
--   the recipient  shuts the replies (no new ones, the ones there stay) or
--                  puts them away (nobody else sees the thread), and opens
--                  them again, on any letter to their @
--   reports        any device, once per reply. Three from three devices and
--                  the reply is put out of sight until a person at the desk
--                  restores it or removes it
--   screening      every reply is read before it is written: the list and
--                  the third party check, then the classifier, in
--                  celestual-wall-reply. A pass goes up, a review or no
--                  classifier is held for the desk and shown to its writer
--                  alone, a reject is refused and kept for the desk
--
-- ── anonymous to others, not to us ──────────────────────────────────────────
-- A reply's row carries its author, because the desk has to be able to act
-- on abuse, and nothing a browser can call ever returns it. A thread names
-- each writer by `who`: sixteen hex of a salted hash of the letter and the
-- author, so one person is one creature all the way down one thread and a
-- different one under the next letter, and nobody can follow them from one
-- to the other. The salt is a row in celestual_settings the desk never lists.
--
-- ── the write is the edge function's ────────────────────────────────────────
-- `wall_reply_write` is the service role's alone. The browser reads a thread,
-- presses a heart, files a report and, if the letter is to them, shuts or
-- puts away the replies; everything else goes through celestual-wall-reply,
-- which reads the reply before it asks this file to store it.
--
-- ── and the build that is up now keeps working ──────────────────────────────
-- Nothing here removes or renames anything a deployed tab calls. wall_heart
-- answers the same shape; the replies are new functions a tab on the old
-- build never asks for.
--
-- Re-runnable: create table if not exists, create or replace, and a guarded
-- insert for the salt.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the heart, for anybody ────────────────────────────────────────────────
-- As 0059's, with the gate taken off: a live letter, any device. Taking a
-- heart off needs a session that has one to take off; putting one on opens a
-- bare row for a device the product has never seen. The count is the same
-- sum every other read answers.
create or replace function wall_heart(p_token text, p_letter uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_on boolean := coalesce(p_on, true);
  v_me uuid    := celestual_session_user(p_token);
  l    wall_letters%rowtype;
  v_n  integer;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  if v_me is null and v_on then
    v_me := celestual_session_user_or_new(p_token);
    if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  end if;

  if v_on then
    insert into wall_hearts (letter_id, user_id) values (l.id, v_me)
      on conflict (letter_id, user_id) do nothing;
  elsif v_me is not null then
    delete from wall_hearts where letter_id = l.id and user_id = v_me;
  end if;

  v_n := l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id);
  return jsonb_build_object('ok', true, 'letter', l.id, 'hearts', v_n, 'hearted', v_on);
end;
$$;

revoke all on function wall_heart(text, uuid, boolean) from public;
grant execute on function wall_heart(text, uuid, boolean) to anon, authenticated;

comment on function wall_heart(text, uuid, boolean) is
  '0042, 0044, 0059, 0068: a heart on a letter, or off it, from any device (0068: no gate; a device never seen gets a bare row and a session). Answers the count the letter now shows: the seeded hearts and the pressed ones, added.';

-- ── 2. the tables ────────────────────────────────────────────────────────────
-- A reply. `recipient` is whether its author held the letter's @ when it was
-- written, kept on the row so a thread does not have to ask again and so a
-- claim taken back later does not rewrite what was said as whom.
create table if not exists wall_replies (
  id          uuid        primary key default gen_random_uuid(),
  letter_id   uuid        not null references wall_letters (id) on delete cascade,
  author_id   uuid        not null references celestual_users (id) on delete cascade,
  body        text        not null,
  recipient   boolean     not null default false,
  status      text        not null default 'held',
  moderation  jsonb       not null default '{}'::jsonb,
  nonce       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint wall_replies_body_len  check (char_length(body) between 1 and 280),
  constraint wall_replies_status_ck check (status in ('live', 'held', 'rejected', 'hidden', 'removed')),
  constraint wall_replies_nonce_ck  check (nonce is null or nonce ~ '^[A-Za-z0-9_-]{8,64}$')
);
create index if not exists wall_replies_letter_idx on wall_replies (letter_id, created_at);
create index if not exists wall_replies_author_idx on wall_replies (author_id, created_at);
create index if not exists wall_replies_desk_idx   on wall_replies (created_at desc) where status in ('held', 'hidden');
create unique index if not exists wall_replies_nonce_idx on wall_replies (author_id, nonce) where nonce is not null;

-- One like per (reply, person), as a heart is one per (letter, person).
create table if not exists wall_reply_likes (
  reply_id   uuid        not null references wall_replies (id) on delete cascade,
  user_id    uuid        not null references celestual_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);
create index if not exists wall_reply_likes_user_idx on wall_reply_likes (user_id);

-- One report per (reply, device), ever. `cleared_at` is the desk putting a
-- reply back: the reports that hid it stop counting, and three new devices
-- are needed to hide it again. A device that reported it once cannot count
-- twice, before or after.
create table if not exists wall_reply_reports (
  reply_id    uuid        not null references wall_replies (id) on delete cascade,
  reporter_id uuid        not null references celestual_users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  cleared_at  timestamptz,
  primary key (reply_id, reporter_id)
);
create index if not exists wall_reply_reports_user_idx on wall_reply_reports (reporter_id);

-- A thread the recipient has shut or put away. No row is open.
create table if not exists wall_reply_threads (
  letter_id uuid        primary key references wall_letters (id) on delete cascade,
  state     text        not null default 'open',
  set_by    uuid        references celestual_users (id) on delete set null,
  set_at    timestamptz not null default now(),
  constraint wall_reply_threads_state_ck check (state in ('open', 'locked', 'closed'))
);

-- The terms for replying, accepted once per person.
create table if not exists wall_reply_terms (
  user_id     uuid        primary key references celestual_users (id) on delete cascade,
  version     smallint    not null default 1,
  accepted_at timestamptz not null default now()
);

alter table wall_replies       enable row level security;
alter table wall_reply_likes   enable row level security;
alter table wall_reply_reports enable row level security;
alter table wall_reply_threads enable row level security;
alter table wall_reply_terms   enable row level security;
revoke all on wall_replies       from public, anon, authenticated;
revoke all on wall_reply_likes   from public, anon, authenticated;
revoke all on wall_reply_reports from public, anon, authenticated;
revoke all on wall_reply_threads from public, anon, authenticated;
revoke all on wall_reply_terms   from public, anon, authenticated;

comment on table wall_replies is
  '0068: replies under a letter. The author is kept for the desk and returned by nothing a browser can call; a thread names each writer by a salted hash of the letter and the author.';
comment on table wall_reply_likes is
  '0068: one like per (reply, person). Counted, never listed.';
comment on table wall_reply_reports is
  '0068: one report per (reply, device). Three uncleared reports put a live reply out of sight until the desk decides.';
comment on table wall_reply_threads is
  '0068: a thread its recipient shut (locked: no new replies) or put away (closed: nobody else sees it). No row is open.';
comment on table wall_reply_terms is
  '0068: who has accepted the terms for replying, and when.';

-- ── the merge ──
-- celestual_user_merge (0030, 0062) rewrites every single column key to
-- celestual_users, and a unique key it would collide on turns the merge into
-- a conflict for the desk. None of these is worth one: where the survivor
-- already liked, reported or accepted, the absorbed row is dropped, as a
-- heart is (0042 `wall_hearts_fold`); and a reply's nonce, which only
-- matters for the minute a send is retried, is let go.
create or replace function wall_reply_fold()
returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'wall_reply_likes' then
    if new.user_id is distinct from old.user_id and exists (
      select 1 from wall_reply_likes x where x.reply_id = new.reply_id and x.user_id = new.user_id
    ) then
      delete from wall_reply_likes where reply_id = old.reply_id and user_id = old.user_id;
      return null;
    end if;
  elsif tg_table_name = 'wall_reply_reports' then
    if new.reporter_id is distinct from old.reporter_id and exists (
      select 1 from wall_reply_reports x where x.reply_id = new.reply_id and x.reporter_id = new.reporter_id
    ) then
      delete from wall_reply_reports where reply_id = old.reply_id and reporter_id = old.reporter_id;
      return null;
    end if;
  elsif tg_table_name = 'wall_reply_terms' then
    if new.user_id is distinct from old.user_id and exists (
      select 1 from wall_reply_terms x where x.user_id = new.user_id
    ) then
      delete from wall_reply_terms where user_id = old.user_id;
      return null;
    end if;
  elsif tg_table_name = 'wall_replies' then
    if new.author_id is distinct from old.author_id and new.nonce is not null and exists (
      select 1 from wall_replies x where x.author_id = new.author_id and x.nonce = new.nonce and x.id <> new.id
    ) then
      new.nonce := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists wall_reply_likes_fold on wall_reply_likes;
create trigger wall_reply_likes_fold before update of user_id on wall_reply_likes
  for each row execute function wall_reply_fold();
drop trigger if exists wall_reply_reports_fold on wall_reply_reports;
create trigger wall_reply_reports_fold before update of reporter_id on wall_reply_reports
  for each row execute function wall_reply_fold();
drop trigger if exists wall_reply_terms_fold on wall_reply_terms;
create trigger wall_reply_terms_fold before update of user_id on wall_reply_terms
  for each row execute function wall_reply_fold();
drop trigger if exists wall_replies_fold on wall_replies;
create trigger wall_replies_fold before update of author_id on wall_replies
  for each row execute function wall_reply_fold();

-- ── 3. who, in a thread ──────────────────────────────────────────────────────
-- The salt, once. Twenty four random bytes; a second run keeps the first.
insert into celestual_settings (key, value)
values ('wall_reply_salt', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function wall_reply_who(p_letter uuid, p_user uuid)
returns text
language sql stable security definer set search_path = public, extensions as $$
  select left(encode(digest(
    coalesce((select value from celestual_settings where key = 'wall_reply_salt'), 'wall.reply.v1')
      || ':' || p_letter::text || ':' || p_user::text, 'sha256'), 'hex'), 16)
$$;

-- ── 4. who may reply ─────────────────────────────────────────────────────────
-- The recipient: the claimed owner of the letter's @ (0063 `wall_owner_remove`
-- asks the same). A letter to a first name has none.
create or replace function wall_reply_is_recipient(p_user uuid, p_letter uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and exists (
    select 1 from wall_letters l
      join celestual_users u on u.instagram_handle = l.target_handle
     where l.id = p_letter and l.target_kind = 'handle'
       and u.id = p_user and u.merged_into is null and u.handle_verified_at is not null)
$$;

-- A school address, proved: any .edu, or an address the desk passed (0043),
-- which is what wall_write's @-notes ask too (0063).
create or replace function wall_reply_is_edu(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and exists (
    select 1 from celestual_users u
     where u.id = p_user and u.merged_into is null and u.edu_verified_at is not null)
$$;

create or replace function wall_reply_state(p_letter uuid)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select t.state from wall_reply_threads t where t.letter_id = p_letter), 'open')
$$;

-- Why this person may not reply here, or null when they may. Closed shuts
-- everybody, the recipient included, until they open it; locked shuts
-- everybody but the recipient; and the rest is the school address.
create or replace function wall_reply_why(p_user uuid, p_letter uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_state text;
  v_rec   boolean;
begin
  if not exists (select 1 from wall_letters where id = p_letter and status = 'live' and expires_at > now()) then
    return 'gone';
  end if;
  v_state := wall_reply_state(p_letter);
  if v_state = 'closed' then return 'closed'; end if;
  v_rec := wall_reply_is_recipient(p_user, p_letter);
  if v_state = 'locked' and not v_rec then return 'locked'; end if;
  if not v_rec and not wall_reply_is_edu(p_user) then return 'edu'; end if;
  return null;
end;
$$;

-- How much one person may say: forty replies a day, and six under one letter
-- in ten minutes. Every reply that was read counts, whatever the reading
-- said, so a refused reply is not a free retry of the classifier.
create or replace function wall_reply_throttled(p_user uuid, p_letter uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from wall_replies r
           where r.author_id = p_user and r.created_at > now() - interval '1 day') >= 40
      or (select count(*) from wall_replies r
           where r.author_id = p_user and r.letter_id = p_letter
             and r.created_at > now() - interval '10 minutes') >= 6
$$;

-- ── 5. the list, where nobody can edit it out ───────────────────────────────
-- 0063's list (`celestual_text_caught`: slurs, links, emails, phones, street
-- addresses, rooms), and the rule that is only the replies': nobody else. An
-- @ anywhere, a word that looks like a handle (`jane.doe`, `j_doe`), two
-- capitalised words in a row that are neither of them a word a sentence
-- starts with or a place, and a first name followed by a surname. The lists
-- are the ones app/src/wall/replies-check.js and celestual-wall-reply carry,
-- word for word; this copy is the backstop, and those two say what was
-- caught.
create or replace function wall_reply_caught(p text)
returns text[]
language plpgsql immutable set search_path = public as $$
declare
  first_names text[] := array[
    'aaron','abby','abigail','adam','adrian','ahmed','aidan','aiden','aisha','alan','alex','alexa','alexander','alexis',
    'ali','alice','alicia','alina','alison','alyssa','amanda','amelia','amir','amy','ana','andre','andrea','andrew','andy',
    'angela','anika','anna','annie','anthony','antonio','arjun','ari','ariana','ariel','ashley','austin','ava','aya',
    'ayesha','bella','ben','benjamin','beth','bianca','blake','brandon','brendan','brian','brianna','brittany','brooke',
    'bryan','caleb','cameron','camila','carlos','carmen','caroline','carter','catherine','charlotte','chelsea','chloe',
    'chris','christian','christina','christopher','claire','clara','colin','connor','dani','daniel','daniela','danielle',
    'darius','david','derek','devin','diana','diego','dominic','dylan','eduardo','eli','elena','eliana','elias','elijah',
    'elizabeth','ella','ellie','emily','emma','eric','erica','erik','ethan','evan','evelyn','farah','fatima','felix',
    'fernando','gabby','gabriel','gabriela','gabriella','george','gianna','greg','hailey','hana','hannah','harry','hassan',
    'hector','henry','hugo','ian','isaac','isabel','isabella','isabelle','ivan','jacob','jake','james','jamie','jane',
    'jared','jasmine','jason','javier','jayden','jen','jenna','jennifer','jenny','jeremy','jesse','jessica','jin','joel',
    'joey','john','jonah','jonathan','jordan','jorge','jose','joseph','josh','joshua','juan','jules','julia','julian',
    'juliana','julie','justin','kai','karen','karina','kate','katherine','katie','kayla','kaylee','keith','kelly','kenji',
    'kevin','kim','kimberly','kyle','laila','laura','lauren','layla','leah','leila','leo','leon','liam','linda','lisa',
    'logan','lorenzo','lucas','lucia','lucy','luis','luke','lydia','madeline','madison','marco','marcus','maria','mariah',
    'mariana','marissa','martin','mason','matt','matthew','maya','megan','melissa','mia','michael','michelle','miguel',
    'mike','mila','mina','mohamed','mohammed','muhammad','nadia','naomi','natalia','natalie','nathan','nicholas','nick',
    'nicole','nikhil','nina','noah','noor','nora','nour','olivia','omar','oscar','owen','pablo','paige','paul','pilar',
    'priya','rachel','rafael','rahul','raj','rebecca','ren','riley','rohan','ryan','sabrina','sam','samantha','samir',
    'samuel','sara','sarah','sean','sebastian','serena','shreya','simon','sofia','sophia','sophie','stephanie','steven',
    'tara','taylor','thom','thomas','tiffany','timothy','tony','tyler','valentina','valeria','vanessa','victor',
    'victoria','vivian','wei','william','xavier','yasmin','yuki','yusuf','zach','zachary','zara','zoe'];
  surnames text[] := array[
    'smith','johnson','williams','brown','jones','garcia','miller','davis','rodriguez','martinez','hernandez','lopez',
    'gonzalez','wilson','anderson','thomas','taylor','moore','jackson','martin','lee','perez','thompson','harris',
    'sanchez','clark','ramirez','lewis','robinson','walker','allen','wright','scott','torres','nguyen','flores','adams',
    'nelson','baker','rivera','campbell','mitchell','carter','roberts','gomez','phillips','evans','turner','diaz','parker',
    'cruz','edwards','collins','reyes','stewart','morris','morales','murphy','rogers','gutierrez','ortiz','morgan',
    'cooper','peterson','bailey','kelly','howard','ramos','kim','cox','richardson','watson','chavez','james','bennett',
    'mendoza','ruiz','hughes','alvarez','castillo','sanders','patel','myers','ross','foster','jimenez','chen','wang','li',
    'zhang','liu','yang','huang','zhao','wu','zhou','xu','lin','guo','luo','tran','pham','huynh','dang','bui','ngo',
    'duong','choi','jung','kang','cho','yoon','jang','lim','han','seo','shin','kwon','hwang','ahn','yoo','singh','kumar',
    'shah','sharma','gupta','khan','hussain','cohen','levy','friedman','schwartz','silva','santos','oliveira','costa',
    'rossi','russo','muller','schmidt','fischer','weber','meyer','wagner','becker','tanaka','suzuki','sato','takahashi',
    'watanabe','ito','yamamoto','nakamura','kobayashi','kato','echevarria','okonkwo','kwarteng','haddad','brandt',
    'iversen','villarreal','arroyo','yeom'];
  stop text[] := array[
    'i','im','ive','id','ill','the','a','an','and','but','or','so','if','then','than','this','that','these','those',
    'there','here','it','its','you','your','youre','yours','we','our','us','he','she','they','them','him','her','his',
    'hers','my','me','mine','is','are','was','were','be','been','am','do','did','does','dont','not','no','yes','yeah',
    'yep','nope','ok','okay','oh','ah','hi','hey','hello','bye','lol','lmao','omg','wow','ya','yo','what','who','why',
    'how','when','where','which','just','also','too','very','really','love','loved','like','liked','happy','merry',
    'thank','thanks','good','great','best','dear','god','jesus','christ','lord','mr','mrs','ms','dr','prof','professor',
    'uc','cal','berkeley','stanford','oakland','san','francisco','bay','area','california','doe','moffitt','sproul',
    'sather','wheeler','dwinelle','haas','soda','evans','cory','memorial','glade','gate','hall','library','stadium',
    'plaza','street','st','avenue','ave','road','rd','park','campus','college','university','school','class','dorm',
    'unit','north','south','east','west','new','york','los','angeles','monday','tuesday','wednesday','thursday','friday',
    'saturday','sunday','january','february','march','april','may','june','july','august','september','october',
    'november','december','christmas','halloween','valentine','valentines','easter','thanksgiving','birthday',
    'instagram','insta','google','tiktok','snapchat','snap','twitter','facebook','spotify','netflix','iphone','apple',
    'english','spanish','french','chinese','korean','japanese','american','asian','african','european','mexican',
    'indian','math','physics','chemistry','biology','econ','history','science','go','bears','golden','bear','big','game',
    'never','always','every','everyone','everybody','someone','somebody','nobody','all','some','one','two','please',
    'sorry','same','honestly','literally','anyway','maybe','well','still','nah','idk','tbh','ngl','fr','pls','plz',
    'congrats','congratulations','welcome','sincerely','xoxo','miss','missed','hope','hoping','praying','rip','bless'];
  t   text := coalesce(p, '');
  r   text[] := coalesce(celestual_text_caught(p), '{}');
  w   text[];
  a   text;
  b   text;
  aw  text;
  bw  text;
  i   integer;
  tok text;
begin
  -- an @, anywhere
  if position('@' in t) > 0 then r := r || 'tag'::text; end if;

  w := regexp_split_to_array(btrim(t), '[[:space:]]+');

  -- a word shaped like a handle
  foreach tok in array w loop
    tok := regexp_replace(tok, '^[^A-Za-z0-9_.]+|[^A-Za-z0-9_.]+$', '', 'g');
    tok := regexp_replace(tok, '\.+$', '');
    if tok ~* '^[a-z0-9]{2,}([._][a-z0-9]{2,})+$' and tok ~* '[a-z]' then
      if not ('tag' = any(r)) then r := r || 'tag'::text; end if;
      exit;
    end if;
  end loop;

  -- a full name: two words side by side, nothing but a space between them
  if coalesce(array_length(w, 1), 0) >= 2 then
    for i in 1 .. array_length(w, 1) - 1 loop
      a := w[i];
      b := w[i + 1];
      continue when a ~ '[^[:alpha:]''’]$' or b !~ '^[[:alpha:]]';
      aw := regexp_replace(regexp_replace(a, '^[^[:alpha:]]+', ''), '[''’]s$', '');
      bw := regexp_replace(regexp_replace(b, '[^[:alpha:]''’]+$', ''), '[''’]s$', '');
      continue when aw = '' or bw = '';
      if (aw ~ '^[[:upper:]][[:lower:]]+$' and bw ~ '^[[:upper:]][[:lower:]]+$'
          and not (lower(aw) = any(stop)) and not (lower(bw) = any(stop)))
         or (lower(aw) = any(first_names)
             and (lower(bw) = any(surnames)
                  or (bw ~ '^[[:upper:]][[:lower:]]+$' and not (lower(bw) = any(stop))))) then
        r := r || 'name'::text;
        exit;
      end if;
    end loop;
  end if;
  return r;
end;
$$;

-- ── 6. the thread ────────────────────────────────────────────────────────────
-- Client-callable, by anybody, about any live letter. Never an author: each
-- reply carries `who`, whether it is the recipient's, whether it is this
-- device's own (`mine`), its likes and whether this device liked or reported
-- it. A live reply is everybody's; one that is held, out of sight after
-- reports, or taken down is its writer's alone to see. A thread put away
-- shows nobody anything but the recipient. `me` says what this device may do
-- and why not, and who it would reply as.
create or replace function wall_reply_thread(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me    uuid := celestual_session_user(p_token);
  l       wall_letters%rowtype;
  v_state text;
  v_rec   boolean;
  v_rows  jsonb;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_state := wall_reply_state(l.id);
  v_rec   := wall_reply_is_recipient(v_me, l.id);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',        r.id,
      'who',       wall_reply_who(l.id, r.author_id),
      'recipient', r.recipient,
      'body',      r.body,
      'status',    r.status,
      'at',        r.created_at,
      'mine',      v_me is not null and r.author_id = v_me,
      'likes',     (select count(*)::int from wall_reply_likes k where k.reply_id = r.id),
      'liked',     v_me is not null and exists (
                     select 1 from wall_reply_likes k where k.reply_id = r.id and k.user_id = v_me),
      'reported',  v_me is not null and exists (
                     select 1 from wall_reply_reports x
                      where x.reply_id = r.id and x.reporter_id = v_me and x.cleared_at is null)
    ) order by r.created_at, r.id), '[]'::jsonb)
    into v_rows
    from (
      select * from wall_replies r
       where r.letter_id = l.id
         and (r.status = 'live'
              or (v_me is not null and r.author_id = v_me and r.status in ('held', 'hidden', 'removed')))
         and (v_state <> 'closed' or v_rec)
       order by r.created_at, r.id
       limit 200
    ) r;

  return jsonb_build_object(
    'ok', true,
    'letter', l.id,
    'state', v_state,
    'count', case when v_state = 'closed' and not v_rec then 0 else
               (select count(*)::int from wall_replies r where r.letter_id = l.id and r.status = 'live') end,
    'recipient_replied', v_state <> 'closed' and exists (
      select 1 from wall_replies r where r.letter_id = l.id and r.status = 'live' and r.recipient),
    'replies', v_rows,
    'me', jsonb_build_object(
      'signed',    v_me is not null,
      'recipient', v_rec,
      'edu',       wall_reply_is_edu(v_me),
      'terms',     v_me is not null and exists (select 1 from wall_reply_terms t where t.user_id = v_me),
      'who',       case when v_me is not null then wall_reply_who(l.id, v_me) end,
      'can',       wall_reply_why(v_me, l.id) is null,
      'why',       wall_reply_why(v_me, l.id)
    )
  );
end;
$$;

-- ── 7. a like, a report, and the recipient's say ─────────────────────────────
-- A like, from any device, on a live reply in a thread that is not put away.
create or replace function wall_reply_like(p_token text, p_reply uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_on boolean := coalesce(p_on, true);
  v_me uuid    := celestual_session_user(p_token);
  r    wall_replies%rowtype;
  v_n  integer;
begin
  select x.* into r from wall_replies x
    join wall_letters l on l.id = x.letter_id
   where x.id = p_reply and x.status = 'live' and l.status = 'live' and l.expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if wall_reply_state(r.letter_id) = 'closed' then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  if v_me is null and v_on then
    v_me := celestual_session_user_or_new(p_token);
    if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  end if;

  if v_on then
    insert into wall_reply_likes (reply_id, user_id) values (r.id, v_me)
      on conflict (reply_id, user_id) do nothing;
  elsif v_me is not null then
    delete from wall_reply_likes where reply_id = r.id and user_id = v_me;
  end if;

  select count(*)::int into v_n from wall_reply_likes k where k.reply_id = r.id;
  return jsonb_build_object('ok', true, 'reply', r.id, 'likes', v_n, 'liked', v_on);
end;
$$;

-- A report, from any device, once. The third uncleared one puts a live reply
-- out of sight (`hidden`) until the desk decides. Taken back (`p_on` false)
-- within the same visit, it stops counting, and a reply its reports alone
-- put out of sight comes back when they fall under three again; a reply the
-- desk has decided about stays where the desk put it.
create or replace function wall_reply_report(p_token text, p_reply uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_on boolean := coalesce(p_on, true);
  v_me uuid    := celestual_session_user(p_token);
  r    wall_replies%rowtype;
  v_n  integer;
begin
  select * into r from wall_replies where id = p_reply and status in ('live', 'hidden');
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  if v_me is null and v_on then
    v_me := celestual_session_user_or_new(p_token);
  end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if r.author_id = v_me then return jsonb_build_object('ok', false, 'error', 'mine'); end if;

  if v_on then
    insert into wall_reply_reports (reply_id, reporter_id) values (r.id, v_me)
      on conflict (reply_id, reporter_id) do nothing;
  else
    delete from wall_reply_reports
     where reply_id = r.id and reporter_id = v_me and cleared_at is null;
  end if;

  select count(*)::int into v_n from wall_reply_reports x where x.reply_id = r.id and x.cleared_at is null;

  if r.status = 'live' and v_n >= 3 then
    update wall_replies
       set status = 'hidden', updated_at = now(),
           moderation = moderation || jsonb_build_object('hidden_at', now(), 'hidden_by', 'reports')
     where id = r.id
    returning * into r;
  elsif r.status = 'hidden' and v_n < 3 and not (r.moderation ? 'desk') then
    update wall_replies
       set status = 'live', updated_at = now(),
           moderation = moderation - 'hidden_at' - 'hidden_by'
     where id = r.id
    returning * into r;
  end if;

  return jsonb_build_object('ok', true, 'reply', r.id, 'reported', v_on, 'hidden', r.status = 'hidden');
end;
$$;

-- The recipient's say over the thread under a letter to their @: open,
-- locked (no new replies but theirs, the ones there stay) or closed (nobody
-- else sees it). Nobody else can.
create or replace function wall_reply_thread_set(p_token text, p_letter uuid, p_state text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if p_state is null or p_state not in ('open', 'locked', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  if not exists (select 1 from wall_letters where id = p_letter and status = 'live' and expires_at > now()) then
    return jsonb_build_object('ok', false, 'error', 'gone');
  end if;
  if not wall_reply_is_recipient(v_me, p_letter) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  if p_state = 'open' then
    delete from wall_reply_threads where letter_id = p_letter;
  else
    insert into wall_reply_threads (letter_id, state, set_by, set_at)
    values (p_letter, p_state, v_me, now())
    on conflict (letter_id) do update
      set state = excluded.state, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;
  return jsonb_build_object('ok', true, 'letter', p_letter, 'state', p_state);
end;
$$;

-- ── 8. the write, the edge function's ────────────────────────────────────────
-- What celestual-wall-reply asks before it spends a reading: may this device
-- reply here, is it the recipient, has it accepted the terms, and what the
-- letter says, for the classifier to read the reply against. Service role.
create or replace function wall_reply_can(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me  uuid := celestual_session_user(p_token);
  l     wall_letters%rowtype;
  v_why text;
begin
  select * into l from wall_letters where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'edu'); end if;
  v_why := wall_reply_why(v_me, l.id);
  if v_why is not null then return jsonb_build_object('ok', false, 'error', v_why); end if;
  if wall_reply_throttled(v_me, l.id) then
    return jsonb_build_object('ok', false, 'error', 'throttle');
  end if;
  return jsonb_build_object(
    'ok', true,
    'recipient', wall_reply_is_recipient(v_me, l.id),
    'terms', exists (select 1 from wall_reply_terms t where t.user_id = v_me),
    'addressee', case when l.target_kind = 'name' then coalesce(l.target_name, '') else '@' || l.target_handle end,
    'letter_body', l.body
  );
end;
$$;

-- The terms, agreed with a send, kept on their own. celestual-wall-reply
-- calls this before the list reads the reply, because a reply the list
-- catches is never written, and the agreement that came with it was lost
-- with it: the person who had just agreed was asked to again. The write
-- still keeps the agreement itself (below), so a send that reaches it
-- without this having run loses nothing. Service role.
create or replace function wall_reply_agree(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  insert into wall_reply_terms (user_id) values (v_me) on conflict (user_id) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- The answer a write gives about a reply, in one place, so a replay says
-- exactly what the first send said.
create or replace function wall_reply_answer(p_reply uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true, 'id', r.id, 'status', r.status, 'recipient', r.recipient,
    'reasons', case when r.status = 'rejected' then coalesce(r.moderation->'reasons', '[]'::jsonb) end)
    from wall_replies r where r.id = p_reply
$$;

create or replace function wall_reply_replay(p_token text, p_nonce text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid;
  v_id uuid;
begin
  if p_nonce is null or p_nonce !~ '^[A-Za-z0-9_-]{8,64}$' then return null; end if;
  v_me := celestual_session_user(p_token);
  if v_me is null then return null; end if;
  select id into v_id from wall_replies where author_id = v_me and nonce = p_nonce;
  if v_id is null then return null; end if;
  return wall_reply_answer(v_id) || jsonb_build_object('replay', true);
end;
$$;

-- The write. The status is the reading's decision (`live`, `held` or
-- `rejected`) and this file's checks stand over it: who may reply, the
-- thread's state, the terms, the throttle, and the list again, so a body the
-- list catches is never stored at all. `p_accept` is the person accepting the
-- terms with this send, which is recorded before the reply is.
create or replace function wall_reply_write(
  p_token      text,
  p_letter     uuid,
  p_body       text,
  p_status     text,
  p_moderation jsonb,
  p_nonce      text,
  p_accept     boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me     uuid := celestual_session_user(p_token);
  v_body   text := btrim(coalesce(p_body, ''));
  v_id     uuid;
  v_why    text;
  v_caught text[];
begin
  if p_nonce is null or p_nonce !~ '^[A-Za-z0-9_-]{8,64}$' then
    return jsonb_build_object('ok', false, 'error', 'nonce');
  end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'edu'); end if;

  -- the same send, again
  select id into v_id from wall_replies where author_id = v_me and nonce = p_nonce;
  if v_id is not null then return wall_reply_answer(v_id) || jsonb_build_object('replay', true); end if;

  if v_body = '' then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  if char_length(v_body) > 280 then return jsonb_build_object('ok', false, 'error', 'long'); end if;
  if p_status is null or p_status not in ('live', 'held', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  v_why := wall_reply_why(v_me, p_letter);
  if v_why is not null then return jsonb_build_object('ok', false, 'error', v_why); end if;

  if not exists (select 1 from wall_reply_terms where user_id = v_me) then
    if not coalesce(p_accept, false) then return jsonb_build_object('ok', false, 'error', 'terms'); end if;
    insert into wall_reply_terms (user_id) values (v_me) on conflict (user_id) do nothing;
  end if;

  if wall_reply_throttled(v_me, p_letter) then
    return jsonb_build_object('ok', false, 'error', 'throttle');
  end if;

  v_caught := wall_reply_caught(v_body);
  if coalesce(array_length(v_caught, 1), 0) > 0 then
    return jsonb_build_object('ok', false, 'error', 'caught', 'reasons', to_jsonb(v_caught));
  end if;

  insert into wall_replies (letter_id, author_id, body, recipient, status, moderation, nonce)
  values (p_letter, v_me, v_body, wall_reply_is_recipient(v_me, p_letter), p_status,
          coalesce(p_moderation, '{}'::jsonb), p_nonce)
  returning id into v_id;

  return wall_reply_answer(v_id);
end;
$$;

-- ── 9. the desk ──────────────────────────────────────────────────────────────
-- The replies a person has to look at, and the rest. `waiting` (the default)
-- is the held and the hidden together, oldest first, since the oldest has
-- waited longest; every other tab is newest first. The desk sees who wrote
-- each one: that is what "anonymous to others, not to us" means.
create or replace function celestual_desk_replies(
  p_status text default 'waiting',
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_s    text := coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'all');
  v_lim  integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off  integer := greatest(coalesce(p_offset, 0), 0);
  v_set  text[];
  v_rows jsonb;
  v_n    bigint;
begin
  v_set := case v_s
    when 'waiting' then array['held', 'hidden']
    when 'all' then array['live', 'held', 'rejected', 'hidden', 'removed']
    when 'held' then array['held']
    when 'hidden' then array['hidden']
    when 'live' then array['live']
    when 'removed' then array['removed']
    when 'rejected' then array['rejected']
  end;
  if v_set is null then return jsonb_build_object('ok', false, 'error', 'bad_status'); end if;

  select count(*) into v_n from wall_replies r where r.status = any(v_set);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'status', r.status,
      'body', r.body,
      'recipient', r.recipient,
      'moderation', r.moderation,
      'created_at', r.created_at,
      'updated_at', r.updated_at,
      'reports', (select count(*)::int from wall_reply_reports x where x.reply_id = r.id and x.cleared_at is null),
      'reports_all', (select count(*)::int from wall_reply_reports x where x.reply_id = r.id),
      'likes', (select count(*)::int from wall_reply_likes k where k.reply_id = r.id),
      'letter_id', l.id,
      'letter_status', l.status,
      'letter_target', l.target_handle,
      'letter_kind', l.target_kind,
      'letter_name', l.target_name,
      'letter_body', l.body,
      'thread_state', wall_reply_state(l.id),
      'author_id', r.author_id,
      'author_handle', case when au.handle_verified_at is not null then au.instagram_handle end,
      'author_edu', au.edu_email,
      'author_replies', (select count(*)::int from wall_replies r2 where r2.author_id = r.author_id),
      'author_down', (select count(*)::int from wall_replies r3
                       where r3.author_id = r.author_id and r3.status in ('rejected', 'removed'))
    ) order by case when v_s = 'waiting' then extract(epoch from r.created_at) else -extract(epoch from r.created_at) end), '[]'::jsonb)
    into v_rows
    from (
      select * from wall_replies x
       where x.status = any(v_set)
       order by case when v_s = 'waiting' then extract(epoch from x.created_at) else -extract(epoch from x.created_at) end
       limit v_lim offset v_off
    ) r
    join wall_letters l on l.id = r.letter_id
    left join celestual_users au on au.id = r.author_id;

  return jsonb_build_object(
    'ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows,
    'counts', jsonb_build_object(
      'waiting',    (select count(*) from wall_replies where status in ('held', 'hidden')),
      'held',       (select count(*) from wall_replies where status = 'held'),
      'hidden',     (select count(*) from wall_replies where status = 'hidden'),
      'live',       (select count(*) from wall_replies where status = 'live'),
      'removed',    (select count(*) from wall_replies where status = 'removed'),
      'rejected',   (select count(*) from wall_replies where status = 'rejected'),
      'replies_7d', (select count(*) from wall_replies where created_at > now() - interval '7 days')
    )
  );
end;
$$;

-- A person's decision on one reply: `live` puts it up (a held one) or back
-- (one out of sight after reports, whose reports are then cleared), and
-- `removed` takes it down. Kept on the row with the note, as a letter's is.
create or replace function celestual_desk_reply_set(p_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r wall_replies%rowtype;
begin
  if p_status is null or p_status not in ('live', 'removed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;
  select * into r from wall_replies where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  update wall_replies
     set status = p_status, updated_at = now(),
         moderation = moderation || jsonb_build_object('desk', jsonb_build_object(
           'status', p_status, 'note', nullif(btrim(coalesce(p_note, '')), ''), 'at', now(), 'from', r.status))
   where id = p_id;

  if p_status = 'live' then
    update wall_reply_reports set cleared_at = now() where reply_id = p_id and cleared_at is null;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status, 'was', r.status);
end;
$$;

-- ── 10. grants ───────────────────────────────────────────────────────────────
-- The browser reads a thread, likes, reports and, as the recipient, shuts.
-- Everything else is the service role's.
revoke all on function wall_reply_fold()                              from public, anon, authenticated;
revoke all on function wall_reply_who(uuid, uuid)                     from public, anon, authenticated;
revoke all on function wall_reply_is_recipient(uuid, uuid)            from public, anon, authenticated;
revoke all on function wall_reply_is_edu(uuid)                        from public, anon, authenticated;
revoke all on function wall_reply_state(uuid)                         from public, anon, authenticated;
revoke all on function wall_reply_why(uuid, uuid)                     from public, anon, authenticated;
revoke all on function wall_reply_throttled(uuid, uuid)               from public, anon, authenticated;
revoke all on function wall_reply_caught(text)                        from public, anon, authenticated;
revoke all on function wall_reply_thread(text, uuid)                  from public;
revoke all on function wall_reply_like(text, uuid, boolean)           from public;
revoke all on function wall_reply_report(text, uuid, boolean)         from public;
revoke all on function wall_reply_thread_set(text, uuid, text)        from public;
revoke all on function wall_reply_can(text, uuid)                     from public, anon, authenticated;
revoke all on function wall_reply_agree(text)                         from public, anon, authenticated;
revoke all on function wall_reply_answer(uuid)                        from public, anon, authenticated;
revoke all on function wall_reply_replay(text, text)                  from public, anon, authenticated;
revoke all on function wall_reply_write(text, uuid, text, text, jsonb, text, boolean) from public, anon, authenticated;
revoke all on function celestual_desk_replies(text, integer, integer) from public, anon, authenticated;
revoke all on function celestual_desk_reply_set(uuid, text, text)     from public, anon, authenticated;

grant execute on function wall_reply_thread(text, uuid)           to anon, authenticated;
grant execute on function wall_reply_like(text, uuid, boolean)    to anon, authenticated;
grant execute on function wall_reply_report(text, uuid, boolean)  to anon, authenticated;
grant execute on function wall_reply_thread_set(text, uuid, text) to anon, authenticated;
grant execute on function wall_reply_caught(text)                 to service_role;
grant execute on function wall_reply_can(text, uuid)              to service_role;
grant execute on function wall_reply_agree(text)                  to service_role;
grant execute on function wall_reply_replay(text, text)           to service_role;
grant execute on function wall_reply_write(text, uuid, text, text, jsonb, text, boolean) to service_role;
grant execute on function celestual_desk_replies(text, integer, integer) to service_role;
grant execute on function celestual_desk_reply_set(uuid, text, text)     to service_role;

comment on function wall_reply_thread(text, uuid) is
  '0068: a letter''s replies, for anybody. Each writer is `who`, a salted hash of the letter and the author; never the author. Held, hidden and removed replies are their writer''s alone; a closed thread is the recipient''s alone.';
comment on function wall_reply_like(text, uuid, boolean) is
  '0068: a like on a live reply, from any device (a device never seen gets a bare row and a session).';
comment on function wall_reply_report(text, uuid, boolean) is
  '0068: a report on a reply, once per device. Three uncleared reports hide a live reply until the desk decides; p_on false takes a report back.';
comment on function wall_reply_thread_set(text, uuid, text) is
  '0068: the recipient opens, locks (no new replies but theirs) or closes (nobody else sees it) the thread under a letter to their @.';
comment on function wall_reply_write(text, uuid, text, text, jsonb, text, boolean) is
  '0068: service role only (celestual-wall-reply). The status is the reading''s; the school address or the recipient, the thread''s state, the terms, the throttle and the list are checked here. Idempotent on (author, nonce).';
comment on function celestual_desk_replies(text, integer, integer) is
  '0068: the replies queue. waiting (held and hidden, oldest first), held, hidden, live, removed, rejected, all; with the author, for the desk.';
comment on function celestual_desk_reply_set(uuid, text, text) is
  '0068: the desk puts a reply up or back (live, clearing its reports) or takes it down (removed).';
