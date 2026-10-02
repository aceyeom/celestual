// collect.mjs — 네이버 상위 블로그 글을 모아 본문 구조 지표를 추출한다.
//
// ⚠ 반드시 사용자 PC(정상 IP·실제 브라우저)에서 실행한다. 클라우드/서버에서
//    돌리면 네이버가 차단한다.
//
// 상위글 URL 확보 방법 (둘 중 하나, 자동 선택):
//   1) 네이버 공식 검색 API — 환경변수 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가
//      있으면 이 방법으로 키워드별 상위글 링크를 가져온다. (차단 위험 최저)
//      발급: https://developers.naver.com → 애플리케이션 등록 → 검색 API
//   2) 수동 URL — tools/urls.json 에 { "topicId": ["url1","url2",...] } 형태로
//      실제 통합검색 1~3위 글 URL을 직접 넣으면 그 글들을 분석한다.
//
// 본문 구조 분석은 Playwright(헤드풀)로 각 글을 실제로 열어 수행한다.
//
// 실행:
//   cd food_portal/tools
//   npm install && npx playwright install chromium
//   (API 방식) NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=yyy npm run collect
//   (수동 방식) npm run collect           # urls.json 사용
//
// 결과: tools/output/collected-<topicId>.json

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output');

// ── 사람다운 지연(차단 회피) ───────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const humanPause = () => sleep(rand(2500, 6000)); // 글 사이 2.5~6초

// ── 상위글 URL 확보: 네이버 공식 검색 API ──────────────────────────────────
async function fetchTopUrlsViaApi(keyword, topN) {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return null; // API 미설정

  const url =
    'https://openapi.naver.com/v1/search/blog.json?sort=sim&display=' +
    encodeURIComponent(String(Math.min(topN, 20))) +
    '&query=' +
    encodeURIComponent(keyword);
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
  });
  if (!res.ok) {
    console.warn(`  [API] ${keyword}: HTTP ${res.status} — 건너뜀`);
    return [];
  }
  const data = await res.json();
  return (data.items || [])
    .map((it) => it.link)
    .filter((u) => /blog\.naver\.com/.test(u))
    .slice(0, topN);
}

// ── blog.naver.com/ID/LOGNO → iframe 없는 PostView URL ─────────────────────
function toPostViewUrl(link) {
  try {
    const u = new URL(link);
    if (!/blog\.naver\.com$/.test(u.hostname)) return link;
    // 형태 A: /ID/LOGNO
    const m = u.pathname.match(/^\/([^/]+)\/(\d+)/);
    if (m) {
      return `https://blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`;
    }
    // 형태 B: ?blogId=..&logNo=..
    const blogId = u.searchParams.get('blogId');
    const logNo = u.searchParams.get('logNo');
    if (blogId && logNo) {
      return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
    }
  } catch {
    /* noop */
  }
  return link;
}

// ── 한 글의 본문 구조 지표 추출 (페이지 컨텍스트에서 실행) ──────────────────
async function extractMetrics(page) {
  return page.evaluate(() => {
    const pick = (sels) => {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) return el;
      }
      return null;
    };
    // SmartEditor ONE(.se-main-container) 우선, 구버전(#postViewArea) 폴백
    const container = pick([
      '.se-main-container',
      '#postViewArea',
      '.post-view',
      '#viewTypeSelector',
    ]);
    if (!container) {
      return { ok: false, reason: '본문 컨테이너를 찾지 못함' };
    }

    const text = (container.innerText || '').trim();
    const noSpace = text.replace(/\s/g, '');

    // 이미지/동영상/표
    const images = container.querySelectorAll(
      'img.se-image-resource, .se-image img, img[src]',
    ).length;
    const videos = container.querySelectorAll(
      '.se-video, .se-oglink-video, video, iframe[src*="video"]',
    ).length;
    const tables = container.querySelectorAll('table, .se-table').length;
    const links = container.querySelectorAll('a[href]').length;

    // 소제목(목차) — SE ONE 섹션 타이틀 또는 큰 폰트/볼드 모듈을 근사
    const headingEls = container.querySelectorAll(
      '.se-section-quotation, .se-fs-fs24, .se-fs-fs28, .se-fs-fs30, ' +
        '.se-fs-fs32, strong.se-fs-fs19, h2, h3',
    );
    const headings = Array.from(headingEls)
      .map((e) => (e.innerText || '').trim())
      .filter((t) => t.length > 0 && t.length <= 60)
      .slice(0, 40);

    // 어투 — 문장 종결어미 집계
    const endings = {
      formal: (text.match(/(습니다|입니다|됩니다|합니다)[.!?\s]/g) || []).length, // 정중체
      friendly: (text.match(/(요|죠|네요|어요|예요)[.!?\s]/g) || []).length, // 친근체
    };

    // 문단
    const paragraphs = text
      .split(/\n{1,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const avgParaLen =
      paragraphs.length > 0
        ? Math.round(noSpace.length / paragraphs.length)
        : 0;

    // 태그
    const tags = Array.from(
      document.querySelectorAll('.post_tag a, .wrap_tag a, a.item.pcol2'),
    )
      .map((a) => (a.innerText || '').replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, 30);

    // 제목
    const titleEl = pick(['.se-title-text', '.pcol1 .se-fs-', '.htitle', 'title']);
    const title = titleEl ? (titleEl.innerText || document.title).trim() : document.title;

    return {
      ok: true,
      title,
      charCount: noSpace.length,
      charCountWithSpace: text.length,
      imageCount: images,
      videoCount: videos,
      tableCount: tables,
      linkCount: links,
      headingCount: headings.length,
      headings,
      paragraphCount: paragraphs.length,
      avgParagraphChars: avgParaLen,
      tone: endings,
      toneLabel:
        endings.formal === 0 && endings.friendly === 0
          ? '불명'
          : endings.formal >= endings.friendly
            ? '정중체 우세'
            : '친근체 우세',
      tagCount: tags.length,
      tags,
    };
  });
}

async function main() {
  const cfg = JSON.parse(
    await readFile(path.join(__dirname, 'keywords.json'), 'utf8'),
  );
  const topN = cfg.topN || 5;

  // 수동 URL 로드(있으면)
  let manual = {};
  const urlsPath = path.join(__dirname, 'urls.json');
  if (existsSync(urlsPath)) {
    manual = JSON.parse(await readFile(urlsPath, 'utf8'));
    delete manual.comment;
  }

  const usingApi = !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
  console.log(
    `상위글 수집 방식: ${usingApi ? '네이버 공식 검색 API' : 'urls.json 수동 입력'}`,
  );

  await mkdir(OUT_DIR, { recursive: true });

  // 로그인 세션 재사용(차단 회피) — 사용자 프로필 디렉터리 지정 시 persistent context
  const userDataDir = process.env.NAVER_USER_DATA_DIR;
  const launchOpts = {
    headless: false, // 헤드풀이 차단 위험 낮음
    args: ['--disable-blink-features=AutomationControlled'],
  };
  const context = userDataDir
    ? await chromium.launchPersistentContext(userDataDir, {
        ...launchOpts,
        locale: 'ko-KR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      })
    : await (await chromium.launch(launchOpts)).newContext({
        locale: 'ko-KR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      });

  const page = await context.newPage();

  for (const topic of cfg.topics) {
    console.log(`\n=== [${topic.id}] ${topic.title}`);

    // 1) URL 목록 확보
    let urls = [];
    if (usingApi) {
      for (const kw of topic.keywords) {
        const got = (await fetchTopUrlsViaApi(kw, topN)) || [];
        console.log(`  키워드 "${kw}" → ${got.length}건`);
        urls.push(...got);
        await sleep(rand(800, 1500));
      }
    } else if (manual[topic.id]?.length) {
      urls = manual[topic.id];
      console.log(`  urls.json → ${urls.length}건`);
    } else {
      console.log('  ⚠ URL 없음(API 미설정 & urls.json 비어있음) — 건너뜀');
      continue;
    }
    // 중복 제거 + topN 제한
    urls = [...new Set(urls)].slice(0, topN);

    // 2) 각 글 본문 분석
    const results = [];
    for (const link of urls) {
      const pv = toPostViewUrl(link);
      try {
        await page.goto(pv, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(rand(1500, 3000)); // 렌더 대기
        const m = await extractMetrics(page);
        results.push({ url: link, postViewUrl: pv, ...m });
        console.log(
          `  ✓ ${m.ok ? m.charCount + '자 / 이미지 ' + m.imageCount + ' / 소제목 ' + m.headingCount + ' / ' + m.toneLabel : '추출 실패: ' + m.reason}`,
        );
      } catch (e) {
        results.push({ url: link, postViewUrl: pv, ok: false, reason: String(e.message || e) });
        console.log(`  ✗ ${link} — ${e.message || e}`);
      }
      await humanPause();
    }

    const outFile = path.join(OUT_DIR, `collected-${topic.id}.json`);
    await writeFile(
      outFile,
      JSON.stringify({ topic, collectedAt: new Date().toISOString(), posts: results }, null, 2),
      'utf8',
    );
    console.log(`  → 저장: ${path.relative(process.cwd(), outFile)}`);
  }

  await context.close();
  console.log('\n수집 완료. 다음: npm run analyze');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
