// analyze.mjs — collect.mjs 결과(output/collected-*.json)를 모아
// 주제별 "이기는 공식"(목표 글자수·이미지·소제목·어투)을 산출한다.
//
// 산출 규칙은 docs/04-reverse-engineering-method.md 를 따른다.
//
// 실행: cd food_portal/src/tools && npm run analyze
// 결과: tools/output/formula-<topicId>.json  +  콘솔 요약표

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output');

const median = (arr) => {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
};
const avg = (arr) => {
  const a = arr.filter((x) => Number.isFinite(x));
  return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
};

function deriveFormula(posts) {
  const ok = posts.filter((p) => p.ok);
  if (ok.length === 0) return { error: '분석 가능한 글이 없음' };

  const charMed = median(ok.map((p) => p.charCount));
  const imgMed = median(ok.map((p) => p.imageCount));
  const headMed = median(ok.map((p) => p.headingCount));
  const paraMed = median(ok.map((p) => p.paragraphCount));
  const avgParaMed = median(ok.map((p) => p.avgParagraphChars));

  // 어투 다수결
  const formalWins = ok.filter((p) => p.tone?.formal >= p.tone?.friendly).length;
  const toneTarget = formalWins >= ok.length / 2 ? '정중체 중심(+친근체 보조)' : '친근체 중심(+정중체 보조)';

  // 글자수 목표: 중앙값 1.2배, 최소 2,500자 (docs/04 규칙)
  const targetChars = Math.max(2500, Math.round(charMed * 1.2));

  return {
    sample: ok.length,
    observed: {
      charCountMedian: charMed,
      imageCountMedian: imgMed,
      headingCountMedian: headMed,
      paragraphCountMedian: paraMed,
      avgParagraphCharsMedian: avgParaMed,
      charCountAvg: avg(ok.map((p) => p.charCount)),
    },
    target: {
      charCount: targetChars,
      imageCount: Math.max(imgMed, 5), // 최소 5 + 직접제작 이미지 포함 권장
      headingCount: Math.max(headMed, 4),
      paragraphCount: Math.max(paraMed, 8),
      tone: toneTarget,
      mustInclude: [
        '첫 문단에 타깃 키워드 + 핵심 수치(결론) 선제시',
        '각 소제목마다 TAAMs 1차 데이터 수치 1개 이상',
        '경쟁글에 없는 독창적 자료: TAAMs 조회 결과를 차트/지도 이미지로 1개 이상',
        '표 1개 이상(단가·건수 비교 등 — 체류시간↑)',
      ],
    },
  };
}

async function main() {
  let files;
  try {
    files = (await readdir(OUT_DIR)).filter(
      (f) => f.startsWith('collected-') && f.endsWith('.json'),
    );
  } catch {
    console.error('output/ 디렉터리가 없습니다. 먼저 npm run collect 를 실행하세요.');
    process.exit(1);
  }
  if (files.length === 0) {
    console.error('collected-*.json 이 없습니다. 먼저 npm run collect 를 실행하세요.');
    process.exit(1);
  }

  const rows = [];
  for (const f of files) {
    const data = JSON.parse(await readFile(path.join(OUT_DIR, f), 'utf8'));
    const formula = deriveFormula(data.posts || []);
    const outFile = path.join(OUT_DIR, `formula-${data.topic.id}.json`);
    await writeFile(
      outFile,
      JSON.stringify({ topic: data.topic, formula }, null, 2),
      'utf8',
    );
    rows.push({ id: data.topic.id, formula });
  }

  // 콘솔 요약
  console.log('\n=== 주제별 "이기는 공식" ===\n');
  for (const r of rows) {
    console.log(`▶ ${r.id}`);
    if (r.formula.error) {
      console.log(`   ${r.formula.error}\n`);
      continue;
    }
    const o = r.formula.observed;
    const t = r.formula.target;
    console.log(`   표본 ${r.formula.sample}개 글`);
    console.log(
      `   관측(중앙값): 글자 ${o.charCountMedian} / 이미지 ${o.imageCountMedian} / 소제목 ${o.headingCountMedian} / 문단 ${o.paragraphCountMedian}`,
    );
    console.log(
      `   목표: 글자 ${t.charCount} / 이미지 ${t.imageCount}+ / 소제목 ${t.headingCount}+ / 어투 ${t.tone}`,
    );
    console.log('');
  }
  console.log('상세: output/formula-<topicId>.json');
  console.log('다음 단계(3단계): 이 공식 + TAAMs 실데이터로 본문 자동 생성');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
