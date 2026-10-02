# tools — 네이버 상위글 수집·역설계 분석 (사용자 PC 실행용)

2단계(네이버 1위 글 역설계)를 위한 수집·분석 도구. 방법론은
`../docs/04-reverse-engineering-method.md` 참고.

> ⚠️ **반드시 본인 PC(정상 가정용 IP·실제 브라우저)에서 실행한다.**
> 클라우드/서버/데이터센터에서 돌리면 네이버가 차단한다. 이 도구는 저장소에
> **코드로만** 올라가며, 실행은 로컬에서 한다.

## 설치 (최초 1회)

```bash
cd food_portal/tools
npm install
npx playwright install chromium
```

## 상위글 URL 확보 — 두 방식 중 하나

### 방식 1) 네이버 공식 검색 API (권장, 차단 위험 최저)
1. https://developers.naver.com → 애플리케이션 등록 → **검색 API** 사용 설정
2. 발급받은 Client ID / Secret 를 환경변수로 넣고 실행:
```bash
NAVER_CLIENT_ID=발급ID NAVER_CLIENT_SECRET=발급시크릿 npm run collect
```
- `keywords.json` 의 주제별 키워드로 상위글을 모은다.
- ⚠ API 정렬(정확도순)은 통합검색 실제 노출순위와 **완전히 같지는 않다**(근사).
  정확한 1위 분석이 필요하면 방식 2를 병행한다.

### 방식 2) 실제 검색순위 URL 직접 입력 (정확)
1. 네이버 통합검색에서 각 키워드로 검색해 눈으로 1~3위 블로그 글을 확인
2. `urls.json.example` → `urls.json` 복사 후 주제별 URL 입력
3. 실행:
```bash
npm run collect
```

## 분석

```bash
npm run analyze
```
- `output/collected-*.json` → 주제별 `output/formula-*.json` 생성
- 콘솔에 "이기는 공식"(목표 글자수·이미지·소제목·어투) 요약 출력

## 차단 회피 옵션

- **헤드풀 실행**: 기본값(`headless:false`). 화면이 뜬 채로 동작한다.
- **로그인 세션 재사용**: 네이버에 로그인된 크롬 프로필을 쓰면 차단 위험이 더
  낮다. 프로필 디렉터리를 지정:
```bash
NAVER_USER_DATA_DIR="/Users/나/naver-profile" npm run collect
```
  (처음엔 그 창에서 수동 로그인 → 이후 세션 유지)
- **사람 속도**: 글 사이 2.5~6초, 렌더 대기 1.5~3초 랜덤 지연이 내장되어 있다.
  한 번에 많은 키워드를 돌리지 말고 나눠서 실행한다.

## 출력물 흐름

```
keywords.json ─┐
urls.json ─────┤→ collect.mjs → output/collected-<topic>.json
(or Naver API) ┘                      │
                                      ▼
                             analyze.mjs → output/formula-<topic>.json
                                      │
                                      ▼
                        3단계: formula + TAAMs 실데이터 → 본문 자동 생성
```

## 참고

- 본문 추출은 SmartEditor ONE(`.se-main-container`) 기준이며 구버전
  (`#postViewArea`)도 폴백 지원한다. 네이버가 DOM을 바꾸면 `collect.mjs` 의
  셀렉터를 조정한다.
- `output/` 와 `urls.json` 은 `.gitignore` 로 커밋되지 않는다(수집 결과는
  각자 로컬에 남는다).
