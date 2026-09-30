-- ─────────────────────────────────────────────────────────────────────────────
-- 0078_the_filter_hears_plurals.sql
--
-- The list in the database reads the words folded flat, hears a slur's
-- plural, stops refusing memories as addresses, and, for a reply, refuses
-- the proposition and the "kys" the wall refuses.
--
-- ── the owner's ruling of 30 September ──────────────────────────────────────
-- A letter that said "lets fuck babe" was read, passed and put up, and a
-- person took it down eleven minutes later. The owner asked for the balance
-- to be tuned rather than tightened: the wall stays free for comedy, jokes,
-- swearing inside a feeling and flirting, and only the plainly bad comes
-- off. Most of that is the reading's (celestual-wall-moderate and
-- celestual-wall-reply, their prompts and their lexicon), and the list at
-- the front of every text (app/src/wall/moderate.js, and the same list in
-- both edge functions) took three changes. This migration is the database's
-- half of them, for the two places that keep a copy of the list where
-- nothing can edit it out:
--
--   celestual_text_caught  (0063) the list every private text goes through:
--                          a private note's words and the line across its
--                          top (0069, 0071, 0072, 0073), and a reply's
--                          words (through wall_reply_caught). Two of the
--                          three changes reach it.
--   wall_reply_caught      (0068) that list, the rule that a reply names
--                          nobody else, and now the third change.
--
-- ── 1. the words, folded flat (`celestual_text_norm`) ───────────────────────
-- The fold was `translate(lower(t), '0@1!3457', 'ooiieast')` with everything
-- but letters and spaces dropped, and it ran for the slurs alone. "n i g g e
-- r", a Cyrillic i, fullwidth letters, "niggerrr" and every plural went past
-- it: the slurs were matched whole, `\m nigger \M`, so "niggers" was not
-- "nigger". The fold is now moderate.js `norm`, step for step, so the
-- keyboard, the two functions and this list fold a text to the same string:
-- lower case, NFKD with the accents off (fullwidth letters come out plain),
-- the Cyrillic and Greek letters drawn like Latin ones as Latin (upper case
-- ones too, since `lower` in a C collation leaves them), the sexual emoji as
-- word tokens nobody types, apostrophes out, dots, underscores and hyphens
-- to spaces, a run of three or more single letters joined, leet inside a
-- word with a letter in it and never in a bare number, anything else to a
-- space, a run of three of one letter cut to two, and the spaces closed.
-- Each slur is then read with every letter allowed to repeat and the plural
-- that stem really takes, written beside it (`spic/s`, `nigga/s|z`, and
-- `coon/` and `dyke/` with none), after three idioms that carry a slur's
-- letters and none of its meaning ("spic and span", "a chink in the armor",
-- "chinks of light") are taken out. `trannie` joins the list, for its
-- plural. One suffix for every stem was the first cut, and it read the word
-- "spices" as spic and es and refused a recipe as a slur; "Coons" and
-- "Dykes" are surnames, and a plural of those two used as a slur is left to
-- the reading, which sees it through the lexicon's `hate` row.
--
-- ── 2. memories are not addresses ───────────────────────────────────────────
-- The list refused, at the keyboard and here: "we lived in the same dorm 2
-- years ago", "room 4 of my heart", "#2019 was ours", "it's 20 minutes each
-- way", "23 points on court", "i loved you.me? never", "i owe you 1000000000
-- hugs". None of those is contact. A room is now a number not then counted
-- in years, people or "of"; a hash and a year is a year; a street needs a
-- number that is not a count of something and a street word not after
-- "each", "on", "the" and their like; a short domain (`.me`, `.co`, `.ly`,
-- `.io`, `.gg`) after an everyday word is a sentence missing its space; and a
-- number that is one digit and then another over and over is a count said
-- big. A real address, room, link, email or number is caught exactly as
-- before, and the tests below hold both.
--
-- ── 3. what only public words may not carry ─────────────────────────────────
-- `celestual_public_caught`: a sexual proposition aimed at the person, in
-- its surest shapes ("lets fuck", "dtf", "sit on my face", "send nudes",
-- "i'd smash", two different sexual emoji side by side), as `sexual`, and
-- telling them to kill themselves ("kys", "go kill yourself", "you should
-- die"), as `harm`. Only the shapes no joke could share: never the fuck word
-- alone ("fuck you for leaving", "lets fuck some shit up" pass), never the
-- writer about themselves or hyperbole ("i could just die", "let's go die
-- on this hill", "cut yourself some slack", "shoot yourself in the foot"
-- pass), and never smash or bang without a first person who wants to
-- ("you're gonna smash it", "this song would bang" pass). A refusal here
-- leaves a writer no way past it, so anything a joke might share is the
-- reading's (celestual-wall-moderate's lexicon and prompt), not this list's. It is read by
-- wall_reply_caught, since a reply is as public as the letter it sits under,
-- and it is NOT read by celestual_text_caught, and must never be: a private
-- note is read by one person, and only if they sent one back, so flirting
-- there, however plain, is between two people who both asked. Wall letters
-- have no list in the database (their list is the edge function's, as it
-- always was), so this function has one caller.
--
-- ── what does not change ────────────────────────────────────────────────────
-- What each function answers is the shape it always was: an array of the
-- ids that caught, empty when nothing did, the same ids the edge functions
-- answer. Nothing about a ping, a reveal, a mutual or its answers moves, and
-- no answer anywhere says anything about the other person (0069, 0071,
-- 0072): the list reads the words a person typed, and nothing else. The four
-- functions read no table, so they are immutable and run as their caller,
-- as 0063's list always has, with the search path pinned; the service role
-- alone may call them, and the security definer functions that already did
-- (celestual_place, celestual_card_clean, wall_reply_write) read them as
-- their owner. Re-runnable: every function is `create or replace`, and the
-- grants are restated whole.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the fold ──────────────────────────────────────────────────────────────
create or replace function celestual_text_norm(p text)
returns text
language plpgsql immutable set search_path = public as $$
declare
  t   text := lower(coalesce(p, ''));
  m   text[];
  hit text;
  at  integer;
  w   text;
  ws  text[] := '{}';
begin
  -- NFKD, and the accents it leaves as marks taken off
  t := normalize(t, NFKD);
  t := regexp_replace(t, '[\u0300-\u036f]', '', 'g');
  -- the letters drawn like Latin ones, lower case and upper
  t := lower(translate(t,
    'авеёкмнорстухіїјѕԁɡһαβεηικνορτυχωγАВЕКМНОРСТУХІЈЅΑΒΕΗΙΚΝΟΡΤΥΧΩΓ',
    'abeekmhopctyxiijsdghabeniknoptuxwyabekmhopctyxijsabeniknoptuxwy'));
  -- the emoji that are sexual when aimed at a person, as words
  t := regexp_replace(t, '👉\s*👌', ' empoke ', 'g');
  t := replace(t, '🍆', ' emeggplant ');
  t := replace(t, '🍑', ' empeach ');
  t := replace(t, '💦', ' emdroplets ');
  t := replace(t, '👅', ' emtongue ');
  -- apostrophes out; dots, underscores and hyphens to spaces
  t := regexp_replace(t, '[''’`]', '', 'g');
  t := regexp_replace(t, '[._-]', ' ', 'g');
  -- a run of three or more single letters joined, a leading a, i or u left
  -- standing: the first run each time round, until there is none
  loop
    m := regexp_match(t, '(^|[^a-z0-9@$!|])((?:[aiu] )?)((?:[a-z0-9@$!|] ){2,}[a-z0-9@$!|])(?![a-z0-9@$|])');
    exit when m is null;
    hit := m[1] || m[2] || m[3];
    at := strpos(t, hit);
    exit when at = 0;
    t := overlay(t placing m[1] || m[2] || replace(m[3], ' ', '') from at for char_length(hit));
  end loop;
  -- leet inside a word with a letter in it, never in a bare number
  foreach w in array regexp_split_to_array(t, '[^a-z0-9@$!|*]+') loop
    if w ~ '[a-z]' then
      w := translate(regexp_replace(w, '^[!|*@]+|[!|*@]+$', '', 'g'), '0@1!|345$7*', 'ooiiieasst');
    end if;
    ws := ws || w;
  end loop;
  t := array_to_string(ws, ' ');
  -- anything else a space, a run of one letter cut to two, spaces closed
  t := regexp_replace(t, '[^a-z0-9[:space:]]', ' ', 'g');
  t := regexp_replace(t, '([a-z])\1{2,}', '\1\1', 'g');
  return btrim(regexp_replace(t, '[[:space:]]+', ' ', 'g'));
end;
$$;

-- ── 2. the list every private text goes through ─────────────────────────────
-- 0063's, with the slurs read over the fold and heard in the plural, and the
-- contact patterns loosened where they refused memories. Nothing sexual is on
-- it, and nothing ever will be (above).
create or replace function celestual_text_caught(p text)
returns text[]
language plpgsql immutable set search_path = public as $$
declare
  t text := coalesce(p, '');
  f text;
  m text;
  d text;
  s text;
  r text[] := '{}';
begin
  f := regexp_replace(celestual_text_norm(t),
    '\yspick? (?:and|n) span\y|\ychinks? in (?:the|his|her|my|your|their) armou?r\y|\ychinks? of (?:light|sunlight|daylight|sun|hope|blue)\y', ' ', 'g');
  -- each stem with the plural it really takes, after the slash (moderate.js
  -- SLURS, entry for entry): nothing after it is no plural at all
  foreach s in array array[
    'nigger/s', 'nigga/s|z', 'faggot/s', 'fag/s', 'tranny/', 'trannie/s', 'retard/s', 'retarded/', 'kike/s',
    'spic/s', 'chink/s', 'gook/s', 'wetback/s', 'coon/', 'dyke/', 'shemale/s'] loop
    if f ~ ('\y' || regexp_replace(split_part(s, '/', 1), '(.)', '\1+', 'g')
            || case when split_part(s, '/', 2) = '' then '' else '(?:' || split_part(s, '/', 2) || ')?' end
            || '\y') then
      r := r || 'slur'::text; exit;
    end if;
  end loop;
  if t ~* '(https?://|www\.|\y(?!(?:you|u|me|us|it|so|to|and|love|miss|home|time|here|there|this|that|with|for|all|see|call|text)\.(?:me|co|ly|io|gg)\y)[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\y)' then
    r := r || 'url'::text;
  end if;
  if t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    r := r || 'email'::text;
  end if;
  m := substring(t from '(\+?[0-9][0-9[:space:]().-]{8,}[0-9])');
  if m is not null then
    d := regexp_replace(m, '[^0-9]', '', 'g');
    if char_length(d) >= 9 and m !~ '\.[[:space:]]' and d !~ '^[0-9]([0-9])\1+$' then
      r := r || 'phone'::text;
    end if;
  end if;
  if t ~* '\y[0-9]{2,5}[[:space:]]+(?!(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|days?|weeks?|months?|years?|yrs?|times?|people|points?|pts|miles?|km|feet|ft|steps?|dollars?|bucks|games?|goals?|reps?|laps?|kids?|friends?|percent|degrees?|pages?|words?|texts?|messages?|calls?|nights?|of)\y)[a-z][a-z.''-]*([[:space:]]+[a-z][a-z.''-]*)?[[:space:]]+(?<!\y(?:each|the|all|on|in|at|a|my|your|every|one|other|that|this|no|any|half|out|to|for|by|his|her|their|our)[[:space:]])(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\y' then
    r := r || 'address'::text;
  end if;
  if t ~* '\y(room|rm|apt|apartment|suite|ste|dorm)[[:space:]]*#?[[:space:]]*[0-9]{1,4}[a-z]?\y(?![[:space:]]*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|days?|weeks?|months?|years?|yrs?|times?|people|points?|pts|miles?|km|feet|ft|steps?|dollars?|bucks|games?|goals?|reps?|laps?|kids?|friends?|percent|degrees?|pages?|words?|texts?|messages?|calls?|nights?|of)\y)|#[[:space:]]?(?!(?:19|20)[0-9][0-9]\y)[0-9]{3,4}\y' then
    r := r || 'room'::text;
  end if;
  return r;
end;
$$;

-- ── 3. what only public words may not carry ─────────────────────────────────
-- moderate.js `caughtOnWall`, regular expression for regular expression (the
-- JavaScript's `\b` is `\y` here), one `n ~` for each entry in its list, so
-- scripts/check-moderation.mjs can hold the two to the same source and run
-- this copy's patterns against its tables. Read by wall_reply_caught alone.
create or replace function celestual_public_caught(p text)
returns text[]
language plpgsql immutable set search_path = public as $$
declare
  n text := celestual_text_norm(p);
  r text[] := '{}';
begin
  if n ~ '\y(?:lets|let us|wanna|wana|want to|tryna|trying to|gonna|going to|finna|(?<!\y(?:my|your|his|her|the|an|their|student|photo) )id|ill|i would|i will|we should|lemme|let me|can i|could i|come|down to|would you|will you)(?:\s+(?:just|finally|so|really|already|now))?\s+(?:f+u+c*k+|f+v+c*k+|f+c+k+|f+k+|ph+u+c*k+)\y(?!\s+(?:up|around|about|off|over|with|it|this|that|shit|stuff|things|everything|the|my|his|her|their|our|them|us|school|class|work|your (?:life|shit|day|car|plans|world|stuff|game|chances))\y)(?!(?:\s+\S+){0,3}\s+(?:up|over|around)\y)'
     or n ~ '\y(?:lets|letus|letme|lemme|wanna|wana|tryna|wantto)(?:f+u+c*k+|f+v+c*k+|f+c+k+|f+k+|ph+u+c*k+)(?:you|u|me)?\y'
     or n ~ '\y(?:f+u+c*k+|f+v+c*k+|f+c+k+|f+k+|ph+u+c*k+)(?:ing|in|n|ed|s)? me (?:daddy|mommy|mami|papi)\y'
     or n ~ '^(?:(?:babe|baby|please|pls|plz|just|now|come on|so) )*(?:f+u+c*k+|f+v+c*k+|f+c+k+|f+k+|ph+u+c*k+) me(?: (?:harder|hard|senseless|baby|babe|already|now|tonight|rn|pls|please|plz|daddy|mommy|papi|mami))+$'
     or n ~ '\ydtf\y'
     or n ~ '\y(?:send|drop|show) (?:me )?(?:(?:your|ur|some) )?(?:nudes|noods|nudez|nude pics|naked pics|tits|titties|boobs|dick pics?|cock|pussy)\y'
     or n ~ '\ysit on (?:my|your|ur) (?:face|dick|cock)\y'
     or n ~ '\yride (?:my|your|ur) (?:face|dick|cock)\y'
     or n ~ '\ysuck (?:my|me|your|ur) (?:dick|cock|balls|tits)\y|\ysuck (?:you|u|me) off\y'
     or n ~ '\y(?:eat|lick) (?:you|u|me) out\y|\y(?:eat|lick) (?:your|ur|my) (?:pussy|cock|dick)\y'
     or n ~ '\y(?:give|gimme) (?:me )?(?:head|a blowjob|a bj|a handjob)\y(?!\s+(?:pats?|scratches|rubs?|massages?|starts?|to toe|over heels|first|games?|space|phones?)\y)'
     or n ~ '\y(?:(?<!\y(?:my|your|his|her|the|an|their|student|photo) )id|i would|i wanna|i want to|i tryna|i need to|i gotta|let me|lemme|can i|could i)(?:\s+(?:so|totally|def|definitely|lowkey|highkey|honestly|really|just|fr))?\s+(?:(?:smash|bang|rail|pipe)(?:\s+(?:you|u|ya|her|him|them|that|dat))?|(?:hit|tap) (?:it|that|dat)|clap (?:you|ya|u|them cheeks|those cheeks|dem cheeks))(?=\s*$|\s+(?:tbh|ngl|lol|lmao|fr|ong|rn|tonight|already|babe|baby|honestly|and|but|anyway|though|tho)\y)'
     or n ~ '\y(?:lets|let us|wanna|wana|want to|tryna|trying to|gonna|going to|finna|(?<!\y(?:my|your|his|her|the|an|their|student|photo) )id|ill|i would|i will|we should|lemme|let me|can i|could i|come|down to|would you|will you)\s+(?:emeggplant|empeach|emdroplets|emtongue)'
     or n ~ '\yempoke\y'
     or n ~ '\yemeggplant (?:empeach|emdroplets|emtongue)\y|\yempeach (?:emeggplant|emdroplets|emtongue)\y|\y(?:emdroplets|emtongue) (?:emeggplant|empeach)\y' then
    r := r || 'sexual'::text;
  end if;
  if n ~ '\ykys\y'
     or n ~ '(?<!\y(?:dont|do not|never|not|wont|didnt|shouldnt|cant|no need)\y.*)(?:^|\y(?:go|pls|please|plz|just|you should|u should|you need to|u need to|you gotta|u gotta|why dont you|why dont u|hope you|hope u|you can|u can|you could|u could)\s)(?:(?:just|go|and|fucking|fkn|fking|already|pls|please|ahead and|actually|really|seriously)\s){0,3}(?:kill|unalive|hang|drown|end|shoot) (?:yourself|urself|yourselves|your self|ur self|yoself)\y(?!\s+(?:laughing|over|in the foot|trying|with|doing|for|on|by|out|off)\y)'
     or n ~ '(?<!\y(?:dont|do not|never|not|wont|didnt|shouldnt|cant|no need)\y.*)\y(?:you|u|ya) (?:(?:should|shoulda|need to|oughta)(?: just)?(?: go)?(?: and)?|can (?:just )?go) die\y(?!\s+(?:on|for|laughing|of|trying|inside|happy|a|in peace|in my arms|with|from|when|if|before|after)\y)'
     or n ~ '(?<!\y(?:dont|do not|never|not|wont|didnt|shouldnt|cant|no need)\y.*)\ywhy dont (?:you|u|ya) (?:just )?(?:go )?(?:and )?die\y(?!\s+(?:on|for|laughing|of|trying|inside|happy|a|with|from)\y)'
     or n ~ '(?<!\y(?:dont|do not|never|not|wont|didnt|shouldnt|cant|no need)\y.*)(?<!\y(?:i|im|ill|id|ive|we|lets|gonna|wanna|imma|finna|will|would|could|might|may|well|to|all|can|should|gotta|just|pls|please|plz|now|so|then)\s)(?:\y(?:just|pls|please|plz|now|so|then) )?\ygo die\y(?=\s*$|\s+(?:already|pls|please|plz|lol|lmao|loser|bitch|asshole|idiot|in a (?:fire|ditch|hole))\y)'
     or n ~ '(?<!\y(?:dont|do not|never|not|wont|didnt|shouldnt|cant|no need)\y.*)(?<!\y(?:i|im|ill|id|ive|we|lets|gonna|wanna|imma|finna|will|would|could|might|may|well|to|all|can|should|gotta|just|pls|please|plz|now|so|then)\s)(?:\y(?:just|pls|please|plz|now|so|then) )?\ygo (?:drink bleach|jump off (?:a|the) (?:bridge|building|roof|cliff)|slit (?:your|ur) wrists)\y' then
    r := r || 'harm'::text;
  end if;
  return r;
end;
$$;

-- ── 4. the replies' list ─────────────────────────────────────────────────────
-- 0068's, word for word, with the public rules read after the list: the
-- order celestual-wall-reply's `deterministic` gives its reasons in.
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
  r   text[] := coalesce(celestual_text_caught(p), '{}') || celestual_public_caught(p);
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

-- ── grants ───────────────────────────────────────────────────────────────────
-- The service role's alone, as 0063 and 0068 left the two lists; the new two
-- the same. The security definer functions that call them read them as their
-- owner.
revoke all on function celestual_text_norm(text)     from public, anon, authenticated;
revoke all on function celestual_text_caught(text)   from public, anon, authenticated;
revoke all on function celestual_public_caught(text) from public, anon, authenticated;
revoke all on function wall_reply_caught(text)       from public, anon, authenticated;
grant execute on function celestual_text_norm(text)     to service_role;
grant execute on function celestual_text_caught(text)   to service_role;
grant execute on function celestual_public_caught(text) to service_role;
grant execute on function wall_reply_caught(text)       to service_role;

comment on function celestual_text_norm(text) is
  '0078: the words folded flat, as app/src/wall/moderate.js norm() folds them: lower case, NFKD without accents, lookalike letters as Latin, sexual emoji as word tokens, apostrophes out, dots and hyphens to spaces, runs of single letters joined, leet inside words, three of a letter cut to two.';
comment on function celestual_text_caught(text) is
  '0063, 0078: the wall''s layer 1 list (celestual-wall-moderate deterministic()) in SQL: slur (over the fold, plurals heard), url, email, phone, address, room. Empty when nothing is caught. Nothing sexual, ever: private notes read it.';
comment on function celestual_public_caught(text) is
  '0078: what only public words may not carry (moderate.js caughtOnWall): sexual, a proposition aimed at the person; harm, telling them to hurt themselves. Read by wall_reply_caught, never by celestual_text_caught.';
comment on function wall_reply_caught(text) is
  '0068, 0078: a reply''s list: celestual_text_caught, celestual_public_caught, then tag (an @ or a handle) and name (a full name). Empty when nothing is caught.';
