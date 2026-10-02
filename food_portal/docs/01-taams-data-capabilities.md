# 1단계 — TAAMs가 실제로 제공하는 데이터 (검증 완료)

블로그 주제는 반드시 TAAMs에서 조회 가능한 **사실 데이터**에 근거해야 하므로,
TAAMs MCP 도구를 실제로 호출해 어떤 데이터가 나오는지 확인했다.

> 출처: TAAMs (식품의약품안전처 수입식품 통관실적 기반)

## TAAMs 제공 데이터 (조회 도구별)

| 분류 | 도구 | 얻을 수 있는 것 |
|---|---|---|
| 일자별 통관현황 | `get_import_report` | 특정일 통관 건수, 수입품목 TOP10, 수입사 TOP10, 수출사 TOP10, 수출국 TOP10 |
| 품목 검색 | `search_products` | 정확한 품목명·영문명·기간 내 통관 건수 |
| 품목 수입추이 | `get_product_trend` | 월별 건수·중량·금액 시계열 (계절성·증감) |
| 품목 수입단가 | `get_product_price` / `get_daily_price` | 월별/일별 수입단가 (일별은 Pro+ 권한) |
| 품목 수입사 | `get_product_importers` | 해당 품목 상위 수입사 |
| 품목 상위 수출사 | `get_product_top_exporters` | 해당 품목 상위 해외 수출사 |
| HS코드 교역 | `get_product_hs_trade` | HS코드 기준 교역 실적 |
| 품목 관세 | `get_product_tariff` | 품목별 관세율 |
| 국가별 현황 | `get_country_overview` | 국가 단위 월별추이/상위품목/수출사/수입사 |
| 수출사 리포트 | `get_korea_exporter_report` / `get_exporter_profile` | 해외 수출사 기업정보·대한국 수출현황·한국 거래처 |
| 수출사 지도 | `render_exporter_map` | 수출사 산지 위치 인터랙티브 지도 |
| 수입사 프로필·재무 | `get_importer_profile` / `get_importer_financials` | 수입사 정보·재무 |
| 환율 | `get_exchange_rate` | 환율 |
| 산지 날씨 | `get_origin_weather` | 원산지 기상 |
| 국내 도매경매 | `search_auction_items` / `search_auction_markets` / `search_auction_origins` / `get_auction_price` | 부류·품목·품종 코드, 경매시장, 산지, 경매 낙찰가 |

## 조회로 검증된 실제 사실 (예시 — 2025~2026)

### 통관현황 (2026-09-28 기준, `get_import_report`)
- 통관 **4,883건**, 수입사 1,758개사, 수출사 2,403개사, 수출국 65개국, 품목 3,535종
- 수입품목 TOP: ① 김치 349건(7.1%) ② 폴리프로필렌 289건 ③ 금속제 186건
  ④ 과자 152건 ⑤ 돼지고기(냉동) 118건
- 수출국 TOP: ① **중국 45.2%**(2,207건) ② 베트남 6.6% ③ 미국 6.0%
  ④ 일본 5.1% ⑤ 이탈리아 3.9% ⑥ 노르웨이 3.2% ⑦ 호주 3.0%
- 단일 수출사 1위: **JBS AUSTRALIA PTY LTD(호주) 83건** — 국가 1위(중국)와 괴리
- 노르웨이 연어 수출사 다수 상위: MOWI MARKETS NORWAY(32건), SALMAR(26건),
  LEROY SEAFOOD(24건)

### 올리브유 (`search_products` "올리브유")
- 브랜드·용량별 20종+ 통관 건수: 유기농 EVOO 156건, 압착올리브유 72건,
  커클랜드 시그니춰 라인 다수, 올리타리아·디벨라·폰타나 등
- 집계 기간: 2025-10-01 ~ 2026-10-02

### 국내 경매 (`search_auction_items` "사과")
- 과실류(06) > 사과(01), 품종 135종 → `get_auction_price`로 낙찰가 조회 가능

## 결론

- **"시사성 리포트"** = 통관현황·단가추이·국가별현황으로 사실 기반 작성 가능.
- **"TAAMs 기능 설명"** = 위 조회 과정 자체를 콘텐츠화 가능.
- 본문 작성 시 수치는 **TAAMs 재조회로 검증**한 뒤 쓴다 (추측 수치 금지).
