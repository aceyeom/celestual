// collect.mjs — 네이버 "통합검색" 상위 블로그 글을 모아 본문 구조 지표를 추출한다.
//
// ⚠ 반드시 사용자 PC(정상 IP·실제 브라우저)에서 실행한다. 클라우드/서버에서
//    돌리면 네이버가 차단한다.
//
// ※ 네이버 공식 "검색 API"는 신규 애플리케이션 등록에서 제공되지 않으므로
//    사용하지 않는다. 대신 아래 두 방식으로 상위글 URL을 확보한다(자동 선택):
//
//   1) [기본] 통합검색 결과 스크래핑 — Playwright(헤드풀)로 네이버 블로그탭
//      검색결과 페이지를 직접 열어 상위 노출 글 URL을 순서대로 수집한다.
//      실제 통합검색 노출순위를 그대로 반영하므로 가장 정확하다.
//   2) [대체/보강] 수동 URL — tools/urls.json 이 있으면 그 URL을 우선 사용한다.
//      통합검색에서 눈으로 확인한 1~3위 글을 직접 지정하고 싶을 때.
//
// 실행:
//   cd food_portal/src/tools
//   npm install && npx playwright install chromium
//   npm run collect
//   (로그인 세션 재사용) NAVER_USER_DATA_DIR="/path/to/chrome-profile" npm run collect
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
const humanPause = () => sleep(rand(2500, 6000)); // 글/검색 사이 2.5~6초

// ── 통합검색 블로그탭에서 상위 글 URL 수집 ─────────────────────────────────
async function scrapeSearchTopUrls(page, keyword, topN) {
  const url =
    'https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' +
    encodeURIComponent(keyword);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(rand(1500, 3000));

  // 지연 로딩 결과를 끌어오기 위해 사람처럼 몇 번 스크롤
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 2200);
    await sleep(rand(700, 1500));
  }

  // 문서 순서대로 blog.naver.com/ID/LOGNO 형태 링크를 수집(= 노출순위 근사)
  const links = await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    document.querySelectorAll('a[href*="blog.naver.com"]').forEach((a) => {
      const href = a.href;
      const m = href.match(/(?:m\.)?blog\.naver\.com\/([^/?#]+)\/(\d+)/);
      if (m && !seen.has(href)) {
        seen.add(href);
        out.push(href);
      }
    });
    return out;
  });
  return links.slice(0, topN);
}

// ── blog.naver.com/ID/LOGNO → iframe 없는 PostView URL ─────────────────────
function toPostViewUrl(link) {
  try {
    const u = new URL(link);
    if (!/(?:^|\.)blog\.naver\.com$/.test(u.hostname)) return link;
    const m = u.pathname.match(/^\/([^/]+)\/(\d+)/);
    if (m) {
      return `https://blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`;
    }
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
      return { ok: false, reason: '본문 컨테이너를 찾지 못함(로그인/비공개/DOM변경 가능)' };
    }

    const text = (container.innerText || '').trim();
    const noSpace = text.replace(/\s/g, '');

    const images = container.querySelectorAll(
      'img.se-image-resource, .se-image img, img[src]',
    ).length;
    const videos = container.querySelectorAll(
      '.se-video, .se-oglink-video, video, iframe[src*="video"]',
    ).length;
    const tables = container.querySelectorAll('table, .se-table').length;
    const links = container.querySelectorAll('a[href]').length;

    // 소제목(목차) 근사 — SE ONE 큰 폰트/인용/볼드 모듈
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
      formal: (text.match(/(습니다|입니다|됩니다|합니다)[.!?\s]/g) || []).length,
      friendly: (text.match(/(요|죠|네요|어요|예요)[.!?\s]/g) || []).length,
    };

    const paragraphs = text
      .split(/\n{1,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const avgParaLen =
      paragraphs.length > 0 ? Math.round(noSpace.length / paragraphs.length) : 0;

    const tags = Array.from(
      document.querySelectorAll('.post_tag a, .wrap_tag a, a.item.pcol2'),
    )
      .map((a) => (a.innerText || '').replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, 30);

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

  // 수동 URL 로드(있으면 우선)
  let manual = {};
  const urlsPath = path.join(__dirname, 'urls.json');
  if (existsSync(urlsPath)) {
    manual = JSON.parse(await readFile(urlsPath, 'utf8'));
    delete manual.comment;
  }

  await mkdir(OUT_DIR, { recursive: true });

  // 로그인 세션 재사용(차단 회피) — 프로필 디렉터리 지정 시 persistent context
  const userDataDir = process.env.NAVER_USER_DATA_DIR;
  const launchOpts = {
    headless: false, // 헤드풀이 차단 위험 낮음
    args: ['--disable-blink-features=AutomationControlled'],
  };
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
  const context = userDataDir
    ? await chromium.launchPersistentContext(userDataDir, {
        ...launchOpts,
        locale: 'ko-KR',
        userAgent: ua,
      })
    : await (await chromium.launch(launchOpts)).newContext({
        locale: 'ko-KR',
        userAgent: ua,
      });

  const page = await context.newPage();

  for (const topic of cfg.topics) {
    console.log(`\n=== [${topic.id}] ${topic.title}`);

    // 1) URL 목록 확보 — 수동 우선, 없으면 통합검색 스크래핑
    let urls = [];
    if (manual[topic.id]?.length) {
      urls = manual[topic.id];
      console.log(`  urls.json(수동) → ${urls.length}건`);
    } else {
      for (const kw of topic.keywords) {
        try {
          const got = await scrapeSearchTopUrls(page, kw, topN);
          console.log(`  통합검색 "${kw}" → ${got.length}건`);
          urls.push(...got);
        } catch (e) {
          console.log(`  통합검색 "${kw}" 실패: ${e.message || e}`);
        }
        await humanPause();
      }
    }
    urls = [...new Set(urls)].slice(0, topN);
    if (urls.length === 0) {
      console.log('  ⚠ 수집된 URL이 없음 — 건너뜀 (검색결과 DOM 변경 또는 차단 가능)');
      continue;
    }

    // 2) 각 글 본문 분석
    const results = [];
    for (const link of urls) {
      const pv = toPostViewUrl(link);
      try {
        await page.goto(pv, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(rand(1500, 3000));
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
      JSON.stringify(
        { topic, collectedAt: new Date().toISOString(), posts: results },
        null,
        2,
      ),
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
