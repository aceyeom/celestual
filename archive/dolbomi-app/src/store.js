// Global store (zustand). Holds the live per-user snapshot plus auth + prefs.
//
// Online: Supabase Auth session → fetchSnapshot() (reference data ⨯ per-user
// state) and SECURITY DEFINER RPCs for writes. Offline (no Supabase env, or a
// failed network): the bundled src/data fallback so the app stays usable.
import { create } from 'zustand';
import * as api from './api/client';
import * as staticData from './data';

const OFFLINE_SNAPSHOT = {
  soldier: staticData.soldier,
  stats: staticData.stats,
  tonight: staticData.tonight,
  catalog: staticData.catalog,
  benefits: staticData.benefits,
  titles: staticData.offlineTitles,
  vacation: staticData.vacation,
  activity: staticData.activity,
};

const PREFS_KEY = 'dolbomi_prefs';
const LOCAL_OPPS_KEY = 'dolbomi_user_opps';
function loadLocalOpps() {
  try { return JSON.parse(localStorage.getItem(LOCAL_OPPS_KEY) || '[]'); } catch { return []; }
}
function saveLocalOpps(list) { try { localStorage.setItem(LOCAL_OPPS_KEY, JSON.stringify(list)); } catch { /* ignore */ } }

// light + green is the default everywhere; gold is the earned-reward color
const DEFAULT_PREFS = { theme: 'light', palette: '그린', path: 'haechi' };
function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch { return { ...DEFAULT_PREFS }; }
}
function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

const SIZE = { S: { min: 5, xp: 2 }, M: { min: 20, xp: 3 }, L: { min: 45, xp: 5 } };

export const useStore = create((set, get) => ({
  loaded: false,
  online: false,
  authReady: false,
  needsAuth: false,
  session: null,
  authError: null,
  prefs: loadPrefs(),
  mood: null,
  toast: null,
  ...OFFLINE_SNAPSHOT,

  showToast(msg) { set({ toast: { msg, id: Date.now() } }); },

  // ── boot ───────────────────────────────────────────────────────────
  async bootstrap() {
    if (!api.hasSupabase) {
      // local dev / SSR with no cloud — straight to the offline demo
      const local = typeof localStorage === 'undefined' ? [] : loadLocalOpps();
      set({ ...OFFLINE_SNAPSHOT, catalog: [...staticData.catalog, ...local], loaded: true, online: false, authReady: true, needsAuth: false });
      return;
    }
    api.onAuthChange((session) => get()._onSession(session));
    const session = await api.getSession().catch(() => null);
    await get()._onSession(session);
  },

  async _onSession(session) {
    set({ session, authReady: true });
    if (session) {
      try {
        const snap = await api.fetchSnapshot();
        const prefs = { ...get().prefs, ...(snap.prefs || {}) };
        savePrefs(prefs);
        set({ ...snap, prefs, mood: moodFromKey(snap.soldier?.lastMood), loaded: true, online: true, needsAuth: false, authError: null });
      } catch {
        // signed in but data load failed — surface offline rather than a blank app
        set({ ...OFFLINE_SNAPSHOT, loaded: true, online: false, needsAuth: false });
      }
    } else {
      set({ loaded: true, online: false, needsAuth: true });
    }
  },

  async refresh() {
    if (!get().online) return;
    try {
      const snap = await api.fetchSnapshot();
      set({ ...snap });
    } catch { /* keep current */ }
  },

  // ── auth actions ───────────────────────────────────────────────────
  async signIn(email, password) {
    set({ authError: null });
    try { await api.signIn(email, password); return true; }
    catch (e) { set({ authError: e.message || '로그인 실패' }); return false; }
  },
  async signUp(fields) {
    set({ authError: null });
    try {
      await api.signUp(fields);
      // if email confirmation is on, there is no session yet
      const session = await api.getSession();
      if (!session) { set({ authError: '확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인하세요.' }); return false; }
      return true;
    } catch (e) { set({ authError: e.message || '가입 실패' }); return false; }
  },
  async signOut() {
    await api.signOut();
    set({ ...OFFLINE_SNAPSHOT, online: false, needsAuth: true, mood: null });
  },

  oppById: (id) => get().catalog.find((o) => o.id === id),

  // ── prefs (theme / palette / guardian path) ────────────────────────
  setPref(key, val) {
    const prefs = { ...get().prefs, [key]: val };
    set({ prefs });
    savePrefs(prefs);
    if (get().online) api.setPrefs({ [key]: val }).catch(() => {});
  },

  // ── mutations: optimistic local edit, then RPC + refetch ───────────
  async toggleTonight(id) {
    set((s) => ({ tonight: s.tonight.map((q) => (q.id === id ? { ...q, done: !q.done } : q)) }));
    if (!get().online) { applyLocalStat(set, get, tonightStat(get, id), tonightDelta(get, id)); return; }
    try { await api.toggleTonight(id); await get().refresh(); } catch { /* keep optimistic */ }
  },

  async toggleSubquest(oppId, subId, verified) {
    set((s) => ({
      catalog: s.catalog.map((o) => o.id !== oppId ? o : {
        ...o,
        milestones: o.milestones.map((m) => ({
          ...m,
          subquests: m.subquests.map((q) => q.id !== subId ? q : { ...q, done: !q.done, verified: !q.done ? !!verified : false }),
        })),
      }),
    }));
    recomputeFill(set, get, oppId);
    if (!get().online) { recomputeVacation(set, get); return; }
    try { await api.toggleSubquest(oppId, subId, verified); await get().refresh(); } catch { /* keep optimistic */ }
  },

  async addTonight(oppId) {
    if (!get().online) { addTonightLocal(set, get, oppId); get().showToast('오늘 밤 퀘스트에 추가했어요'); return; }
    try { await api.addTonight(oppId); await get().refresh(); get().showToast('오늘 밤 퀘스트에 추가했어요'); }
    catch { /* ignore */ }
  },

  async checkin(mood, energy) {
    set({ mood: moodFromKey(mood) });
    if (!get().online) return;
    try {
      const r = await api.checkin(mood, energy);
      await get().refresh();
      const before = r?.streak_before ?? 0;
      if (r?.streak === 1 && before > 1) get().showToast(`연속 기록이 끊겼어요 · ${before}일 → 1일부터 다시`);
      else if (r?.streak) get().showToast(`체크인 완료 · ${r.streak}일 연속`);
    } catch { /* ignore */ }
  },

  // 전역 목표 (per-stat discharge targets) — from a goal template, editable
  async setTargets(targets, goal = null) {
    set((s) => ({
      stats: s.stats.map((st) => targets[st.key] != null
        ? { ...st, tgt: Math.max(20, Math.min(100, targets[st.key])) } : st),
      soldier: goal ? { ...s.soldier, goal } : s.soldier,
    }));
    if (!get().online) return;
    try { await api.setTargets(targets, goal); await get().refresh(); } catch { /* keep optimistic */ }
  },

  // ── onboarding ───────────────────────────────────────────────────────
  async completeOnboarding(fields) {
    // optimistic so the gate opens instantly
    set((s) => ({ soldier: { ...s.soldier, ...fields, onboarded: true } }));
    const prefs = { ...get().prefs, path: fields.path };
    set({ prefs }); savePrefs(prefs);
    if (!get().online) return;
    try { await api.completeOnboarding(fields); await get().refresh(); } catch { /* keep optimistic */ }
  },

  // ── user-created opportunities (base-local events 등) ────────────────
  async saveUserOpp(payload, rowId = null) {
    if (!get().online) {
      const entry = localOppEntry(payload);
      const list = [...loadLocalOpps().filter((o) => o.id !== entry.id), entry];
      saveLocalOpps(list);
      set((s) => ({ catalog: [...s.catalog.filter((o) => o.id !== entry.id), entry] }));
      return entry.id;
    }
    try {
      const r = await api.saveUserOpp(payload, rowId);
      await get().refresh();
      return r?.id || null;
    } catch { return null; }
  },
  async deleteUserOpp(opp) {
    set((s) => ({ catalog: s.catalog.filter((o) => o.id !== opp.id) }));
    if (!get().online) { saveLocalOpps(loadLocalOpps().filter((o) => o.id !== opp.id)); return; }
    try { await api.deleteUserOpp(opp.rowId); await get().refresh(); } catch { /* keep optimistic */ }
  },
  async submitUserOpp(opp) {
    if (!get().online) return false;
    try { await api.submitUserOpp(opp.rowId); await get().refresh(); return true; }
    catch { return false; }
  },

  // ── admin review queue ───────────────────────────────────────────────
  async listSubmissions() {
    if (!get().online) return [];
    try { return await api.listSubmittedOpps(); } catch { return []; }
  },
  async reviewSubmission(rowId, approve) {
    if (!get().online) return false;
    try { await api.reviewUserOpp(rowId, approve); await get().refresh(); return true; }
    catch { return false; }
  },

  async equipTitle(name) {
    set((s) => ({
      titles: s.titles.map((t) => ({ ...t, equipped: t.name === name && t.owned })),
      soldier: { ...s.soldier, title: name },
    }));
    if (!get().online) return;
    try { await api.equipTitle(name); await get().refresh(); } catch { get().refresh(); }
  },
}));

// ── helpers ──────────────────────────────────────────────────────────
function moodFromKey(key) {
  if (!key) return null;
  return staticData.moods.find((m) => m.key === key) || null;
}

function tonightStat(get, id) { return get().tonight.find((q) => q.id === id)?.stat; }
function tonightDelta(get, id) {
  const q = get().tonight.find((x) => x.id === id);
  return q ? (q.done ? q.xp : -q.xp) : 0; // q.done already reflects the optimistic flip
}

function applyLocalStat(set, get, statKey, delta) {
  if (!statKey || !delta) return;
  set((s) => ({
    stats: s.stats.map((st) => st.key !== statKey ? st
      : { ...st, cur: Math.max(0, Math.min(staticData.STAT_CAP, st.cur + delta)) }),
  }));
}

function recomputeFill(set, get, oppId) {
  set((s) => ({
    catalog: s.catalog.map((o) => {
      if (o.id !== oppId) return o;
      const all = o.milestones.flatMap((m) => m.subquests);
      const tot = all.reduce((a, q) => a + q.xp, 0) || 1;
      const got = all.filter((q) => q.done).reduce((a, q) => a + q.xp, 0);
      return { ...o, fill: Math.round((got / tot) * 100) };
    }),
  }));
}

function recomputeVacation(set, get) {
  const vacOpps = get().catalog.filter((o) => o.reward.kind === '휴가');
  const secured = vacOpps.reduce((n, o) => {
    const allDone = o.milestones.every((m) => m.subquests.every((s) => s.done));
    return n + (allDone ? (o.reward.maxDays || 0) : 0);
  }, 0);
  set({ vacation: { secured, ladder: vacOpps.map((o) => ({ id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note })) } });
}

// offline mirror of the server-side payload builder in app_save_user_opp —
// ids assigned, XP fixed by size, never trusted from the form
const SIZE_XP = { S: 15, M: 38, L: 90 };
function localOppEntry(p) {
  const subquests = (p.steps || []).slice(0, 12).map((st, i) => ({
    id: `s${i + 1}`, text: (st.text || `단계 ${i + 1}`).slice(0, 80),
    size: SIZE_XP[st.size] ? st.size : 'M', xp: SIZE_XP[st.size] || 38,
    stat: p.stat || 'edge', done: false, service: null,
  }));
  const id = p.id || `u-local-${Date.now()}`;
  const deadline = p.deadline || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  return {
    id, cat: p.cat || '교육', stat: p.stat || 'edge', title: (p.title || '').slice(0, 80), hot: false,
    sub: (p.sub || '직접 등록한 기회').slice(0, 80), what: (p.what || '').slice(0, 400),
    eligibility: p.eligibility || '본인 확인', applyWhere: p.applyWhere || '',
    source: '직접 등록', verified: '', cost: p.cost || '무료', deadline, started: false,
    reward: { kind: p.reward?.kind || 'cert', finish: p.reward?.finish || '완료',
      maxDays: Math.min(10, p.reward?.maxDays || 0), label: p.reward?.finish || '완료', note: '직접 등록 · 부대 내규 확인' },
    why: (p.why || '').slice(0, 160), expectedPct: 0, status: 'on', tags: p.tags || [],
    milestones: [{ id: 'm1', title: '실행', date: '~마감', subquests }],
    fill: 0, dday: staticData.daysUntil(deadline), img: staticData.fallbackImg(id),
    mine: true, shareStatus: 'private',
  };
}

function addTonightLocal(set, get, oppId) {
  const o = get().catalog.find((x) => x.id === oppId);
  if (!o) return;
  const next = o.milestones.flatMap((m) => m.subquests).find((s) => !s.done);
  if (!next) return;
  const txt = next.text;
  if (get().tonight.some((q) => q.txt === txt && !q.done)) return;
  const sz = SIZE[next.size] || SIZE.M;
  set((s) => ({ tonight: [...s.tonight, { id: `local-${Date.now()}`, stat: next.stat, txt, min: sz.min, xp: sz.xp, hard: next.size === 'L', done: false }] }));
}
