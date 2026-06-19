// DOLBOMI data + auth layer (Supabase-native).
//
// Auth is Supabase Auth (email/password). Reads merge the per-user mutable
// state from Supabase with the reference catalog from src/data and assemble the
// exact snapshot shapes the screens consume — so store.js and every screen are
// unchanged by the backend swap. Writes go through SECURITY DEFINER RPCs that
// own the game logic (stat growth, streak guard, title awards, regeneration).
import { supabase, hasSupabase } from './supabase';
import * as ref from '../data';

export { hasSupabase };

// ── auth ───────────────────────────────────────────────────────────────
export async function getSession() {
  if (!hasSupabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp({ email, password, name, rank, rankEn, branch, path, unit, dischargeDate }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, rank, rank_en: rankEn, branch, path, unit, discharge_date: dischargeDate } },
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (hasSupabase) await supabase.auth.signOut();
}

// ── date label helpers (Asia/Seoul) ────────────────────────────────────
const seoul = (d, opts) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...opts }).format(d);
function dayLabel(d, now = new Date()) {
  const fmt = (x) => seoul(x, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = fmt(now);
  const yest = fmt(new Date(now.getTime() - 86400000));
  const that = fmt(d);
  if (that === today) return '오늘';
  if (that === yest) return '어제';
  const [, m, day] = that.split('.').map((s) => s.trim());
  return `${Number(m)}.${Number(day)}`;
}
const timeLabel = (d) => seoul(d, { hour: '2-digit', minute: '2-digit', hour12: false });

// map a community `opportunities` row (+ its milestones/subquests rows) into
// the catalog entry shape the SPA consumes
function entryFromRefRows(o, msRows, sqRows) {
  const milestones = (msRows || [])
    .filter((m) => m.opp_id === o.id)
    .sort((a, b) => a.ord - b.ord)
    .map((m) => ({
      id: m.id, title: m.title, date: m.date_label,
      subquests: (sqRows || [])
        .filter((s) => s.opp_id === o.id && s.milestone_id === m.id)
        .sort((a, b) => a.ord - b.ord)
        .map((s) => ({ id: s.id, text: s.text, size: s.size, xp: s.xp, stat: s.stat, done: false, service: s.service || null })),
    }));
  return {
    id: o.id, cat: o.cat, stat: o.stat, title: o.title, hot: !!o.hot, sub: o.sub,
    what: o.what, eligibility: o.eligibility, applyWhere: o.apply_where, source: o.source,
    verified: o.verified, cost: o.cost, deadline: o.deadline, unlockDday: o.unlock_dday,
    started: !!o.started, reward: o.reward || {}, why: o.why, expectedPct: o.expected_pct || 0,
    status: o.status || 'on', img: o.img || null, tags: o.tags || [], community: true,
    milestones,
  };
}

// ── snapshot assembly (reference defs ⨯ per-user state) ─────────────────
export function assembleSnapshot({ profile, statsRows, tonightRows, subsRows, titlesRows, actRows, communityOpps = [], userOppRows = [] }) {
  const dischargeDate = profile.discharge_date;
  const soldier = {
    name: profile.name, rank: profile.rank, rankEn: profile.rank_en, title: profile.title,
    unit: profile.unit, branch: profile.branch, mos: profile.mos || '',
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    onboarded: !!profile.onboarded,
    role: profile.role || 'user',
    enlistDate: profile.enlist_date, dischargeDate,
    dday: ref.daysUntil(dischargeDate),
    served: ref.servedBetween(profile.enlist_date, dischargeDate),
    streak: profile.streak || 0,
    lastMood: profile.last_mood || null,
    lastCheckinDate: profile.last_checkin_date || null,
    goal: profile.goal || '',
  };

  const stats = (statsRows || []).map((s) => ({
    key: s.key, mil: s.mil, en: s.en, real: s.real, cur: s.cur, tgt: s.tgt,
  }));

  const tonight = (tonightRows || []).map((q) => ({
    id: q.id, stat: q.stat, txt: q.txt, min: q.min, xp: q.xp, hard: !!q.hard, done: !!q.done,
  }));

  // completion overrides, keyed opp/subquest
  const sub = {};
  for (const r of subsRows || []) sub[`${r.opp_id}/${r.subquest_id}`] = r;
  const soldierDday = soldier.dday;

  // bundle catalog + admin-published community entries + the user's own
  const buildEntry = (o) => {
    let totXp = 0, doneXp = 0;
    const milestones = o.milestones.map((m) => ({
      ...m,
      subquests: m.subquests.map((s) => {
        const st = sub[`${o.id}/${s.id}`];
        const done = st ? !!st.done : false;
        const verified = st ? !!st.verified : false;
        totXp += s.xp; if (done) doneXp += s.xp;
        return { ...s, done, verified };
      }),
    }));
    const fill = Math.round((doneXp / (totXp || 1)) * 100);
    const locked = o.unlockDday != null && soldierDday > o.unlockDday;
    const dday = o.deadline ? ref.daysUntil(o.deadline) : 0;
    return { ...o, fill, milestones, locked, dday, img: o.img || ref.fallbackImg(o.id) };
  };

  const userOpps = (userOppRows || [])
    .filter((r) => r.status !== 'published') // published copies live in the community set
    .map((r) => ({ ...r.payload, mine: true, shareStatus: r.status, rowId: r.id }));

  const bundleIds = new Set(ref.catalog.map((o) => o.id));
  const catalog = [
    ...ref.catalog,
    ...(communityOpps || []).filter((o) => !bundleIds.has(o.id)),
    ...userOpps,
  ].map(buildEntry);

  const benefits = ref.benefits;

  const owned = {};
  for (const r of titlesRows || []) owned[r.title_name] = r;
  const titles = ref.titles.map((t) => {
    const o = owned[t.name];
    return {
      name: t.name, desc: t.desc, rarity: t.rarity, legendary: !!t.legendary,
      owned: o ? !!o.owned : false,
      equipped: t.name === profile.title,
    };
  });

  const vacOpps = catalog.filter((o) => o.reward.kind === '휴가');
  const secured = vacOpps.reduce((nDays, o) => {
    const allDone = o.milestones.every((m) => m.subquests.every((s) => s.done));
    return nDays + (allDone ? (o.reward.maxDays || 0) : 0);
  }, 0);
  const vacation = {
    secured,
    ladder: vacOpps.map((o) => ({ id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note })),
  };

  const now = new Date();
  const activity = (actRows || []).map((a) => {
    const d = new Date(a.created_at);
    const row = { day: dayLabel(d, now), time: timeLabel(d), type: a.type, text: a.text };
    if (a.stat) row.stat = a.stat;
    if (a.xp != null) row.xp = a.xp;
    if (a.amount != null) row.amount = a.amount;
    if (a.streak != null) row.streak = a.streak;
    if (a.opp) row.opp = a.opp;
    if (a.legendary) row.legendary = !!a.legendary;
    return row;
  });

  return { soldier, stats, tonight, catalog, benefits, titles, vacation, activity, prefs: {
    theme: profile.theme, palette: profile.palette, path: profile.path,
  } };
}

export async function fetchSnapshot() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('no session');
  // idempotent: provisions profile + stats + tonight on first load
  await supabase.rpc('app_ensure_profile');

  const [profile, statsRows, tonightRows, subsRows, titlesRows, actRows, userOppRows, commOpps, commMs, commSq] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('stats').select('*').eq('user_id', user.id).order('ord'),
    supabase.from('tonight_quests').select('*').eq('user_id', user.id).order('ord'),
    supabase.from('user_subquests').select('*').eq('user_id', user.id),
    supabase.from('user_titles').select('*').eq('user_id', user.id),
    supabase.from('activity').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('user_opportunities').select('*').eq('user_id', user.id).order('created_at'),
    // community entries published by an admin carry a 'c-' id prefix
    supabase.from('opportunities').select('*').like('id', 'c-%').order('ord'),
    supabase.from('milestones').select('*').like('opp_id', 'c-%'),
    supabase.from('subquests').select('*').like('opp_id', 'c-%'),
  ]);
  const err = profile.error || statsRows.error || tonightRows.error || subsRows.error || titlesRows.error || actRows.error;
  if (err) throw err;

  // community/user-opp reads are best-effort: an un-migrated DB must not
  // break the whole snapshot
  const communityOpps = (commOpps.error || commMs.error || commSq.error)
    ? []
    : (commOpps.data || []).map((o) => entryFromRefRows(o, commMs.data, commSq.data));

  return assembleSnapshot({
    profile: profile.data,
    statsRows: statsRows.data,
    tonightRows: tonightRows.data,
    subsRows: subsRows.data,
    titlesRows: titlesRows.data,
    actRows: actRows.data,
    communityOpps,
    userOppRows: userOppRows.error ? [] : (userOppRows.data || []),
  });
}

// ── mutations (RPCs) ────────────────────────────────────────────────────
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}
export const toggleTonight  = (questId)               => rpc('app_toggle_tonight', { p_quest_id: questId });
export const toggleSubquest = (oppId, subId, verified) => rpc('app_toggle_subquest', { p_opp_id: oppId, p_subquest_id: subId, p_verified: !!verified });
export const addTonight     = (oppId)                  => rpc('app_add_tonight', { p_opp_id: oppId });
export const checkin        = (mood, energy)           => rpc('app_checkin', { p_mood: mood, p_energy: energy ?? null });
export const equipTitle     = (name)                   => rpc('app_equip_title', { p_name: name });
export const completeOnboarding = (fields)             => rpc('app_complete_onboarding', { p: fields });
export const setTargets     = (targets, goal)          => rpc('app_set_targets', { p: { targets, goal } });

// ── user-created opportunities ──────────────────────────────────────────
export const saveUserOpp   = (payload, rowId = null)   => rpc('app_save_user_opp', { p_payload: payload, p_id: rowId });
export const deleteUserOpp = (rowId)                   => rpc('app_delete_user_opp', { p_id: rowId });
export const submitUserOpp = (rowId)                   => rpc('app_submit_user_opp', { p_id: rowId });
export const reviewUserOpp = (rowId, approve)          => rpc('app_review_user_opp', { p_id: rowId, p_approve: !!approve });

// admin: submissions awaiting review (RLS lets admins read everyone's rows)
export async function listSubmittedOpps() {
  const { data, error } = await supabase.from('user_opportunities')
    .select('*').eq('status', 'submitted').order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setPrefs(prefs) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const patch = {};
  if (prefs.theme   != null) patch.theme   = prefs.theme;
  if (prefs.palette != null) patch.palette = prefs.palette;
  if (prefs.path    != null) patch.path    = prefs.path;
  if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('id', user.id);
}
