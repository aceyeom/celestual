-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOLBOMI · 0005 — design revamp v2                                   ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Implements the v2 design decisions (docs/LOGIC-GAPS.md Part I):
--   · V1 two-color system: light + GREEN is the default everywhere;
--     gold is reserved for earned things (XP, titles, gilding)
--   · V5 stat vocabulary: plain primary names replace the invented
--     military jargon (전투력/지휘력/담력 → 체력/관계/도전 …)
-- Re-runnable: plain UPDATEs + defaults only.

set check_function_bodies = off;

-- ── default palette: 그린 (green interface, gold rewards) ───────────────
alter table profiles alter column palette set default '그린';
-- '골드' was the previous default nobody chose; migrate it. Users who later
-- unlock and pick 골드 (성장기 reward) set it again explicitly.
update profiles set palette = '그린' where palette in ('골드', '택티컬');

-- light stays the default theme (0004); make sure legacy dark-default rows
-- that never expressed a choice keep whatever they have — no theme update.

-- ── plain stat names (V5) ───────────────────────────────────────────────
update stat_defs set mil = '체력', real = '몸·건강'     where key = 'body';
update stat_defs set mil = '정신', real = '멘탈·집중'   where key = 'mind';
update stat_defs set mil = '자산', real = '돈·금융'     where key = 'money';
update stat_defs set mil = '기술', real = '기술·자격증' where key = 'craft';
update stat_defs set mil = '관계', real = '리더십·소통' where key = 'people';
update stat_defs set mil = '도전', real = '용기·새로움' where key = 'edge';
