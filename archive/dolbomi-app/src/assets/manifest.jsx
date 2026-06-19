// Asset manifest — semantic keys → art files. Components never import art
// directly; they look it up here, so generated/commissioned replacements only
// touch this folder. 3D spot art: Microsoft Fluent Emoji (MIT,
// scripts/fetch-3d-assets.mjs). Guardians: bespoke folk-art SVG.
import body from './3d/body.png';
import mind from './3d/mind.png';
import money from './3d/money.png';
import craft from './3d/craft.png';
import people from './3d/people.png';
import edge from './3d/edge.png';
import cert from './3d/cert.png';
import language from './3d/language.png';
import education from './3d/education.png';
import contest from './3d/contest.png';
import career from './3d/career.png';
import moodLow from './3d/mood_low.png';
import moodMeh from './3d/mood_meh.png';
import moodOk from './3d/mood_ok.png';
import moodGood from './3d/mood_good.png';
import vacation from './3d/vacation.png';
import benefit from './3d/benefit.png';
import target from './3d/target.png';
import fire from './3d/fire.png';
import sparkles from './3d/sparkles.png';
import locked from './3d/locked.png';
import books from './3d/books.png';
import calendar from './3d/calendar.png';
import moon from './3d/moon.png';
import star from './3d/star.png';
import check from './3d/check.png';
import party from './3d/party.png';
import haechi from './guardians/haechi.svg';
import cheongryong from './guardians/cheongryong.svg';

// per-stat quest/category art (one illustration per category — Part I Q1)
export const STAT_ART = { body, mind, money, craft, people, edge };

// opportunity catalog categories
export const CAT_ART = {
  금융: money, 자격증: cert, 어학: language, 학점: books, 교육: education,
  대회: contest, 체력: body, 취업: career, 창업: edge,
};

// check-in moods
export const MOOD_ART = { low: moodLow, meh: moodMeh, ok: moodOk, good: moodGood };

// guardians (onboarding cards, ritual)
export const GUARDIAN_ART = { haechi, dragon: cheongryong };

// spot art (empty states, rewards, chrome)
export const SPOT = {
  vacation, benefit, target, fire, sparkles, locked, books,
  calendar, moon, star, check, party, contest, cert,
};

// <img> helper with consistent sizing
export function Art({ src, size = 40, style = {}, alt = '' }) {
  return (
    <img src={src} alt={alt} width={size} height={size} loading="lazy" draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, userSelect: 'none', ...style }} />
  );
}
