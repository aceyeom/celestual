# F. Starting small: what already exists, what it costs, and the rules that decide

Research memo, prepared 18 Oct 2026, for the question: since demand is untested, is there a product or maker we can already buy from in tens of pieces, customise in Seoul and ship, and does it fit the retro design better than a generic photo pocket watch?

It joins four desk studies run the same day (China marketplaces, Korea, overseas print-on-demand and small-batch suppliers, and compliance, import and personalisation tools), about 145 searches in all. The cost comparison is in [../model/routes.py](../model/routes.py).

## How to read this memo

- **LP** means a listing price seen in a search snippet, not a quote. **est.** is an estimate where nothing was found. **H / M / L** is high, medium or low confidence.
- **Limits.** WebFetch was blocked, so every fact comes from search-result titles and snippets, not from opened pages. Sizes, ratings, shipping to Korea and sample terms were rarely visible. The search tool indexes Korean wholesale sites (Domeggook, Domeme, Ownerclan) and Naver blogs poorly, and it could not search DHgate at all. "Not found" means "not visible in snippets", not "does not exist".
- Won amounts use ₩1,480 to the dollar and about ₩205 to the yuan.

## Key findings

1. **Nobody sells our locket.** No marketplace, wholesaler, maker or print-on-demand platform in China, Korea, the US or Europe surfaced a 34 to 38 mm brass hunter-case locket with no movement and a photo under glass. Only antique one-offs exist. (M, an absence across about 30 searches)
2. **Cheap bodies in the right family do exist, and price is not the problem.** Most list at $1.40 to $4, about ₩2,100 to ₩5,900, far under the ₩24,000 target. The problems are the look, the size and the metal. (M)
3. **The generic photo pocket watch is the cheapest thing to buy and the wrong thing to sell.** Quartz pocket watches list at $1.42 to $3.90 from 5 to 10 pieces. They are about 45 mm, made of alloy, with the photo on the outer lid, and are sold as groomsmen gifts at $20 to $90 on Etsy and ₩10,000 to ₩50,000 on 11st. (M)
4. **The closest existing part is one listing for an empty full-hunter case sold for laser engraving**, and dial printers take orders from 1 to 10 pieces. The listing showed no size, metal, price or minimum, and the China notes think it may be the 45 mm alloy kind. So the start is a test, not a plan: ask factories for a case of 40 mm or less, in low-lead brass or 316L, from 10 pieces. (M for the listing, L for size and metal)
5. **Wadiz will not take a stock product as the main reward.** Its review policy rules out a reward when "the same product" was already sold or pre-sold through another official channel in Korea or abroad. The page must state how the reward is made. A toothbrush found on Taobao at a tenth of the price was ended early in 2019. Whether a stock case body inside our own lid, dial, photo, engraving, box and letter passes is our reading of the clause, not Wadiz's answer, so ask Wadiz in writing first. (M-H for the rule; untested for a stock case)
6. **Korea's lead limit for metal jewellery is 0.009% (90 mg/kg)**, not the 0.05% used in the plan until now. The limit comes from the Ministry of Environment's restricted-substance notice under the chemicals law (화평법). It has applied to import since 1 July 2024 and to sale since 1 January 2025. Cadmium of 0.1% or more is banned, and nickel release is held to 0.5 µg/cm² a week. Importer and seller are both liable. (M-H)
7. **Cheap marketplace jewellery fails those limits often:** 24% of 404 AliExpress and Temu pieces at Incheon customs in 2024, 15% of 172 at Gunsan customs, and 45% of 250 counterfeit accessories in 2025, often by 100 times or more. (H)
8. **Goods for resale cannot come in through the quick customs lane for personal parcels (목록통관).** That counts as smuggling. They need a formal import declaration under the business number, 8% duty, 10% VAT, and a "Made in China" mark. The Korea–China FTA lists 0% only for chains (7117.19-6000) and needs a certificate of origin; an empty watch case may be classed under 9111, so ask a broker. (H for the personal-parcel lane, M for the rest)
9. **Personalisation, not the case, is most of the cost.** Outsourced engraving runs about ₩5,000 to ₩12,000 for a small unique job by a regional blog, and Soomgo's average is ₩11,000. A generic 20 to 30 W fiber marker lists at $765 to $2,014, about ₩1.5M to ₩3.5M including shipping, duty and VAT. (L-M)
10. **Wadiz pays 60 to 80% when the funding's payments complete, and the rest after delivery and refunds.** Special-bundle pre-orders and limited editions are paid entirely afterwards, so run the presale as reward funding (펀딩), not as a pre-order (프리오더). (M, from a Wadiz guide video summarised by search)
11. **On cost, the case barely matters.** Built to the same spec, the stock case costs about the same as the semi-custom case (₩23,800 against ₩24,200 a locket). As specified, with the handwriting printed and a stock box, it is about ₩22,700, under the ₩24,200 target only while outsourced engraving stays at or under about ₩7,400 a job. With an in-house fiber marker it is about ₩17,000. Its real gains are a 10-piece minimum, earlier shipping and less cash out at once. (est., from routes.py)

## 1. What exists, by form

### 1.1 The generic photo pocket watch

| Item | Price (LP) | Minimum | Notes | Conf | Source |
|---|---|---|---|---|---|
| Engravable quartz pocket-watch blanks | $2.99–3.90; $1.49–1.95 | 5; 10 | Laser engraving offered | M (range) | https://www.alibaba.com/showroom/engravable-pocket-watch.html |
| Groomsmen quartz pocket watches with chain | $1.42–1.78; $1.90–2.30; fob $2.28–2.43 | 5; 10; 50 | Engraving offered | M | https://www.alibaba.com/showroom/pocket-watch-for-groom.html |
| Sublimation pocket-watch blanks | $1.70–2 | 10 | Some sellers MOQ 500; one 40 mm dial | M | https://www.alibaba.com/showroom/sublimation-blank-watch.html |
| Generic vintage bronze-alloy pocket watch | n/a | n/a | 4.5 cm, Roman dial, quartz | M | https://www.aliexpress.com/w/wholesale-pocket-watch-pendant.html |
| Personalised engraved pocket watch (retail) | $10.82 | 1 | Listing also claims "no battery needed" | L | https://www.aliexpress.us/item/3256805479549999.html |
| Etsy photo pocket watches | about $20–90; sets of 3 at $89.99 | 1 | Groomsmen and dad positioning, photo on the outer lid | M | https://www.etsy.com/listing/4521211614 ; https://www.etsy.com/listing/941153799 |
| 11st vintage pocket-watch pendants | about ₩10,000–50,000+ | 1 | Antique bronze or gold tone; same mass goods (est.) | M | https://www.11st.co.kr/products/9092535024 |

What reads as generic (synthesis): a working quartz movement, the photo lasered on the outer lid, about 45 to 47 mm, sold in groomsmen multi-packs, often wooden or steampunk, and permanent "50% off" pricing.

### 1.2 Watch-shaped photo lockets with no movement

| Item | Price (LP) | Material | Notes | Conf | Source |
|---|---|---|---|---|---|
| 怀表圆形DIY照片吊坠复古翻盖怀表 (round DIY photo pendant, retro flip-lid "pocket watch") | about ¥13 | Not shown | Size, ratings and terms not shown; buy through an agent | L | https://s.1688.com/kq/-C0CFBBB3B1ED.html |
| 众兴 复古怀表盒子 … 纯铜 … 相盒挂饰 (pocket-watch photo-box charm) | n/a | "Pure copper", claimed | Character styling | L | same result page |
| Yiwu A3203 pocket-watch cabochon base, 20 mm | n/a, 20 a pack | Not shown | An open tray, not a hinged locket | L | https://page.1688.com/html/tao_sssp.html?__showtype__=withhead&__showtitle__=%E6%97%B6%E5%B0%9A%E9%A5%B0%E5%93%81 |
| Temu "Custom Photo Locket … Vintage Zinc Alloy Pocket Watch Necklace" | n/a | Zinc alloy | Father's Day positioning | M (exists) | https://www.temu.com/custom-photo-locket-pendant-personalized-vintage-zinc-alloy-pocket-watch-necklace-with-removable-chain-preppy-style-ideal-gift-for-family-and-friends-for-fathers-day-mothers-day-g-601099622575300.html |
| AliExpress "Pocket Watch Locket Vintage Style" category | photo lockets generally $1–11 | Mixed | Some have "a transparent face or a hinged lid for a photo" | L | https://www.aliexpress.us/w/wholesale-pocket-watch-locket.html |

### 1.3 Empty hunter cases, small pendant watches and dial printers

| Item | Price (LP) | Minimum | Notes | Conf | Source |
|---|---|---|---|---|---|
| "Full Hunter Quartz Pocket Watch Empty Case with Antique Style and DIY Custom Laser Engraved … Logo" | n/a | n/a | An empty hunter case sold for customising; the strongest lead | M (exists), L (details) | https://www.made-in-china.com/products-search/hot-china-products/Custom_Pocket_Watch.html |
| Custom-logo pendant pocket watch | sample $65 | 10 | | L-M | https://www.made-in-china.com/Light-Industry-Daily-Use-Catalog/Pocket-Watch.html |
| Custom-logo dials; a "custom dial print + laser-engraved case" service | n/a | 2; 10; 1 | One dial is 28.5 mm | M | https://www.alibaba.com/showroom/watch-dial-logo.html ; https://www.alibaba.com/showroom/low-moq-watch.html |
| Bronze clamshell pendant watch | $7.96 | 1 | Working quartz hunter pendant | M | http://www.aliexpress.com/item/Bronze-Clamshell-Pocket-Watch-Oracle-Necklace-Pendant-Watch-With-Inscriptions-Unisex-sw227/32285175703.html |
| Idus vintage pocket-watch necklace | n/a | 1 | 2.7 cm working watch; the seller says it is not made as a photo locket | M | https://www.idus.com/w/product/6df3e607-d88c-4116-8152-683f43a5b9ba |
| Custom NH35-size dials from hobby sellers, 28.5–32 mm | $26–33 each | 1 | One dial costs more than the whole ₩24,000 target | M | https://www.etsy.com/listing/4485722455 ; https://www.ebay.de/itm/186402912927 |
| Brand OEM pocket watches (Shenzhen) | $17.88–29.68 | 500 | Above target and minimum | M | https://www.made-in-china.com/products-search/hot-china-products/Custom_Pocket_Watch.html |

### 1.4 Round double-glass lockets: a printed dial in one window, the photo in the other

| Item | Price (LP) | Minimum | Material | Notes | Conf | Source |
|---|---|---|---|---|---|---|
| Guangzhou IO Jewelry round glass lockets, 20 / 25 / 30 mm | MIC photo lockets $0.80–9 | about 100 | 316 stainless; 18K gold-plated version | Engraved logo; inner windows not shown | M | https://iojewelry.en.made-in-china.com/product/eCBmQoNyntVa/China-20mm-25mm-30mm-Different-Size-Round-Glass-Locket-Pendant.html |
| Stainless sublimation-blank round locket | $1.43 | 20 | Stainless | | L-M | https://www.made-in-china.com/manufacturers/photo-locket.html |
| Brass double-sided glass hinge lockets | n/a | n/a | Brass | Mostly 45–68 mm overall | L | https://www.alibaba.com/showroom/brass-double-sided-glass-frame-hinge-locket.html |
| 30 mm 316 stainless "living memory" glass locket (retail) | $7.69–13.95 | 1 | 316 stainless | Modern look | M | https://www.ebay.de/itm/142654255088 |

### 1.5 Compass lockets, for the needle face

| Item | Price (LP) | Minimum | Conf | Source |
|---|---|---|---|---|
| Vintage solid brass locket compass with pointer | about $3–6 | 100 | M | https://www.alibaba.com/showroom/locket-compass.html |
| 黄铜复古实心随身迷你小罗盘 (solid-brass mini compass) | n/a | n/a | L-M | https://www.1688.com/huo/B0CBD8D4C2DEC5CCD6B8C4CFD5EB.html |

A live needle cannot be fixed on a city, so the needle is better printed or engraved on the dial insert (est.).

### 1.6 Low-minimum makers in Guangzhou

| Maker | Minimum | What it offers | Claims | Conf | Source |
|---|---|---|---|---|---|
| Guangzhou Baoyan Jewelry | 3 (a locket listing) | Laser logo; OEM/ODM; brass made in Wuzhou | "Lead Free, Nickel Free … Passed the SGS reports", scope not stated | M | https://www.made-in-china.com/factory/logo-jewelry.html |
| Guangzhou Mimier Jewelry | 2 | Brass pendants with a custom logo | | M | https://www.made-in-china.com/factory/engravable-jewelry.html |
| Guangzhou Peishang Jewelry | 30 | Brass and 925 silver OEM/ODM, 160 staff | Boilerplate SGS/RoHS wording | M | https://gzpeishang.en.made-in-china.com/ |
| Guangzhou Levi's Jewelry | 50 | Slide-out photo locket with custom engraving | | M | https://www.made-in-china.com/manufacturers/photo-locket.html |
| Shenzhen die-cast mould maker | 1 set | A new zinc pendant mould at $2,000–10,000 | | M | https://79587bf00864ef0e.en.made-in-china.com/ |

None showed unit prices. None was confirmed to have a pocket-watch-shaped locket mould, so ask each.

### 1.7 Overseas small-batch suppliers and print-on-demand

- **Print-on-demand** (Printify, Printful, ShineOn, Teelaunch, GearBubble, Zazzle, CJ): flat photo pendants, engraved bars, discs and name necklaces in zinc alloy or 316L, at $9 to $27 base before shipping. ShineOn's message card inside a gift box is the one feature worth copying. South Korea is not on Printify's restricted list; other platforms' Korea shipping is unconfirmed. (M) https://printify.com/custom-necklace/ ; https://help.printify.com/hc/en-us/articles/4483638004369 ; https://ecommerce-platforms.com/articles/shineon-print-on-demand-review
- **Western brass:** Vintaj (made in the USA, lead- and nickel-free raw brass, no lockets), Nunn Design (US-made bezels), Townsends (US-made silver-plated brass locket KL-960), Continental Bead's 39 mm raw-brass oval locket at $14.09 (sold out). None is watch-shaped. (M) https://beadaholique.com/products/vintaj-vogue-pendants-patterned-leaf-35x22mm-raw-brass ; https://www.townsends.us/products/new-keepsake-locket-kl-960 ; https://glassgardenbeadkits.com/products/oval-brass-photo-locket-pendant-39mm
- **Watch parts:** Esslinger sells domed mineral crystals from 18 to 33.5 mm, some with Roman-numeral trims; Ofrei and Cousins UK sell blued pocket-watch hands by size. Prices were not in the snippets. (H that they exist) https://www.esslinger.com/watch-crystal-domed-and-round-mineral-glass-crystal-gold-trim-with-black-roman-numerals/ ; https://www.cousinsuk.com/product/hands-pocket-pairs-by-size
- **Antique hunter cases:** about $50 each on eBay, every one different. (M) https://www.ebay.de/itm/177426836835

### 1.8 Korea

| Source | What surfaced | Conf | Link |
|---|---|---|---|
| Domeggook, Domeme, Ownerclan | A pocket-watch sub-category, no priced locket listing; Domeggook sells mainly by minimum quantity, Ownerclan by consignment | M (structure) | https://www.domeggook.com/main/item/itemList.php?ca=01_02_02_00_00 ; https://www.windly.cc/blog/consignment-sales-platform-ownerclan |
| Namdaemun accessory arcades | 연세상가, 영창, 장안, 남문, 렝땅, 유성, 실로암; many shops re-wholesale the same stock | M (names), L (prices) | https://www.koreatriptips.com/shopping/132211.html ; https://byline.network/2022/03/3-112/ |
| Dongdaemun Jonghap Market, 5th floor, buildings A to C | Findings sold singly, ₩300–2,000 a piece (about 2018) | M (place), L (prices) | https://www.ktriptips.com/kor/shopping/1013559 |
| Yeji-dong watch alley | Moved within about 600 m for the Sewoon redevelopment; parts sales not confirmed | H (move) | https://mediahub.seoul.go.kr/archives/2004054 |
| Idus photo lockets | ₩28,000, made in 4–6 business days; engraving +₩5,000 | M | https://www.idus.com/v2/product/bac31000-21a7-45a2-aec7-526cfad42076 ; https://www.idus.com/w/product/4bebf9b6-9c7c-49a2-a544-adfb58fe2858 |
| Korean small-batch casting | Quote only; a goods agent's factory minimum is 1,000 | M | https://kmong.com/gig/775715 ; https://kmong.com/gig/724526 |
| Photo-gift services (Snaps, Photomon, Redprinting, Marpple, Ohprintme) | No photo locket or pocket watch; Redprinting sells shaped photo prints | M | https://redprinting.co.kr/ko/product/item/PH/PHPTSHP |
| Plain necklace boxes | ₩640–1,000 each; no drawer box priced | M | https://www.11st.co.kr/products/5837630006 |

### 1.9 Competitors and price points in Korea

- Musinsa: an OST character-collaboration pocket-watch necklace at ₩69,900, and a LLOYD silver locket at ₩79,900. (M) https://www.musinsa.com/products/1581327 ; https://www.musinsa.com/products/1582580
- Idus custom photo lockets at about ₩28,000, or ₩33,000 with engraving. (M)
- No couple-positioned retro watch locket surfaced. ₩79,000 sits at branded-collaboration prices, about 2.4 to 2.8 times an Idus photo locket. (M)
- Overseas premium: Astley Clarke's compass locket at £215 and Lily Blanche's at £185, both with photo and engraving. (H) https://www.astleyclarke.com/products/celestial-compass-locket-necklace-in-sterling-silver ; https://www.lilyblanche.com/products/engravable-compass-locket-for-men-sterling-silver-photo-locket

## 2. The rules that decide the route

### 2.1 Wadiz

- **The identical-product clause.** The reward review policy rules out "프로젝트 제출 이전에 … 국내외 타 공식 유통 채널을 통해 리워드와 동일한 제품이 판매 또는 구매 예약이 이루어진 리워드": a reward whose same product was sold or pre-ordered through another official channel, in Korea or abroad, before submission. One summary mentions an exception for items that are not the main reward. (M-H) https://www.wadiz.kr/web/wterms/reward_screening_policy
- **The page must say how it is made** ("리워드의 제조∙생산 방식"), and review checks for anything "different from the story". (M) same source
- **Self-planned and self-developed:** review was tightened in 2021 to check whether the maker planned and developed the item and to check its appearance. OEM rewards used to need proof of the maker's own design and the contract-manufacturing agreement; the documents now depend on the maker's history and reward type. (M) https://www.ktnews.com/news/articleView.html?idxno=116087 ; https://www.wadiz.io/web/wboard/newsBoardDetail/8145
- **Precedents:** 다모칫솔 (2019) was found on Alibaba and Taobao at about a tenth of the price and its funding was ended early; earbuds, a rice cooker and a projector drew a consumer complaint for changing only the logo and box. An analyst wrote that the same item on Naver or Coupang makes reward funding impossible. (H for the cases) https://www.etnews.com/20191118000330 ; https://www.ntoday.co.kr/news/articleView.html?idxno=72677 ; https://byline.network/2021/01/19-136/
- **So:** do not sell or pre-sell the presale product anywhere before the Wadiz submission, and make it clearly new: our lid, our dial, the stopped time, the photo, the engraving, the box and the letter, with the making method stated honestly. (est., from the clause)
- **Payout:** domestic funding and pre-orders get 60 to 80% of completed payments first; "프리오더 특별구성 또는 한정판 프로젝트라면 100% 후정산" (special-bundle pre-orders and limited editions are paid entirely afterwards). The final settlement follows the last delivery and the refund process, paid within 5 business days of the final statement. (M) https://www.wadiz.io/web/wterms/funding_plan_policy ; https://m.youtube.com/shorts/5MYL5ShWUwk

### 2.2 Tumblbug and Idus

- **Tumblbug:** "물품을 구입하여 전달하기 위한 프로젝트는 진행하실 수 없습니다" (projects that buy goods to pass on are not allowed). Its tech checklist bars first launches of products already sold abroad. (M) https://docs.channel.io/tumblbug/ko/articles/e03eedaa ; https://help.tumblbug.com/hc/article_attachments/19571629440665
- **Idus:** bought-in (사입) and ODM goods cannot be sold, "즉시 퇴점 될 수 있습니다". Since 2023 Idus inspects workshops, and a violation means a sales stop, full refunds and removal. (M-H) https://artist-mate.idus.com/e902e67d-24f7-486d-a6c4-6a561aba7b05 ; https://www.asiae.co.kr/article/2023082209511972925

### 2.3 Metal limits for jewellery in Korea

| Substance | Limit as reported | Conf | Source |
|---|---|---|---|
| Lead | More than 0.009% (90 mg/kg) may not be used for metal jewellery; the old limit was 0.06%. Import and manufacture from 1 Jul 2024, sale from 1 Jan 2025 | M-H | https://chemical.chemlinked.com/news/chemical-news/korea-delays-the-adoption-of-new-limit-for-lead-in-metal-ornaments ; https://www.taxtimes.co.kr/mobile/article.html?no=266157 |
| Cadmium | 0.1% or more banned | M-H | https://www.fnnews.com/news/202404071202293329 |
| Nickel release | 0.5 µg/cm² a week, reported as the domestic limit | M | https://www.khan.co.kr/article/202203031226001 |

- The limits come from the Ministry of Environment's notice on restricted and prohibited substances under 화평법, cited as 제2022-248 and 2021-295. Whether adult jewellery is also a 안전기준준수대상 생활용품 under 전안법 could not be confirmed. The ministry was reorganised in October 2025, so check which one now publishes the notice. (M)
- The ban covers manufacture, import, sale, storage and transport, so a sole proprietor who imports and sells is liable twice. No per-model test filing was found. Lab-test the first lot of each material and finish from each supplier, keep the supplier's report for every lot, and lab-test one lot in three and any lot after a change of supplier, alloy or plating (est.).
- Korea's lead limit is stricter than the EU's 0.05%, and its cadmium limit looser than the EU's 0.01%. Free-machining brass holds about 1.8 to 3.7% lead, so "brass" is not safe by default; order it with a stated lead content below 0.009%, and test it. (M)
- **Failure rates:** Incheon customs, 2024: 96 of 404 AliExpress and Temu pieces at 10 to 700 times the limits. Gunsan customs, 2024: 26 of 172, lead up to 3,812 times, all held. Korea Customs Service, 2025: 112 of 250 counterfeit accessories. Korea Consumer Agency, 2022: 11 of 30 open-market necklaces and earrings. (H) https://www.ajunews.com/view/20240407105331266 ; https://www.taxtimes.co.kr/mobile/article.html?no=266157 ; https://fashionbiz.co.kr/article/221160 ; https://www.khan.co.kr/article/202203031226001
- **Test prices:** none found. Budget about ₩150,000 to ₩400,000 per material set (est.) and ask KTR, KCL or FITI for "금속 장신구 납·카드뮴 함량 + 니켈 용출 (EN 1811)".

### 2.4 Importing for resale

- List clearance is for personal use only; declaring goods for sale as personal use is treated as smuggling. Use a formal import declaration (일반수입신고) under the business registration number. (H) https://www.taxwatch.co.kr/article/tax/2016/11/03/0029
- HS 7117.19: 8% duty; the Korea–China FTA lists 0% for 7117.19-6000 (chains) with origin proof, and one blog says a certificate is waived at or below $700. VAT 10% on value plus duty. The case's own line was not checked; an empty pocket-watch case may be classed as a watch case (9111) rather than jewellery, so ask a broker for the line and its FTA rate. (M) https://treayo.com/en/hs/korea/71171960 ; https://www.tradlinx.com/blog/?p=351
- Goods for sale must carry their origin. Finishing in Seoul does not change it, so mark "Made in China" on the tag or box. (M) https://www.customs.go.kr/call/ad/crmcc/selectFaqViewPage.do%3Fmi%3D6822%26cnslKnwlSrno%3D912
- 1688 buying agents: 5–10% commission plus 4–6% on exchange, ₩700–2,000 per item code, about ₩15,000 a kg with a 2 kg minimum, ₩3,000 inspection per order. AliExpress Choice reaches Korea in about 5–7 days. A customs broker's fee per entry was not found; est. ₩30,000–60,000. (M) https://sellernow.co.kr/post/499583 ; https://tilnote.io/pages/6ace591a1bc5b55a94f2f41e

## 3. Personalisation in Seoul

| Step | Option | Price | Conf | Source |
|---|---|---|---|---|
| Engraving, outsourced | Soomgo average | ₩11,000 a piece, range ₩2,000–200,000 | M | https://soomgo.com/prices/%EA%B0%81%EC%9D%B8 |
| Engraving, outsourced | Regional laser shops | ₩5,000–12,000 for a short line; ₩2,000–6,000 each for 100+ repeats | L-M | https://miso.kr/blog/김제-각인-레이저-마킹-비용 |
| Engraving, outsourced | A Jongno 3-ga jewellery-street workshop with fiber and diode lasers | Quote; bulk work needs a sample first | M | https://kmong.com/gig/718848 |
| Engraving, in-house | Generic 20–30 W fiber galvo marker | $765–2,014 ex works; est. ₩1.5–3.5M including shipping, duty and VAT | M | https://ko.accio.com/plp/lasermarking |
| Engraving, in-house | LaserPecker 4 (diode + 2 W infrared) | $1,199–1,399 | M | https://clevercreations.org/laserpecker-4-review/ |
| Printing | Photo printer, paper, punches, glass domes, UV glue | est. ₩0.3–0.5M for the kit; ₩30–150 a printed insert | est. | |
| Printing | A4 UV flatbed | $1,099–1,299 | M | https://ko.accio.com/plp/uv평판프린터 |
| UV printing, outsourced | A local shop | from ₩5,000 an item | L-M | https://www.daangn.com/kr/local-profile/rico-factory-vfo26os45vsa/ |

- **Engraving through plating on zinc alloy looks bad:** the laser burns through to a grey, blurry line that can corrode. Solid brass or 316L engraves cleanly. Engrave fixed marks before plating. (M) https://sourcify.com/blog/how-to-manufacture-engraved-jewelry/ ; https://www.finishing.com/191/83.shtml
- **Printed inserts:** inkjet prints bleed under resin unless sealed first, and resin can yellow over years, so use glass over the print. (M) https://community.etsy.com/t5/Techniques-Materials/Best-way-to-prevent-my-images-bleeding-when-making-pendants/td-p/31110274
- **Printed hands:** no locket on the market prints its hands. "Time" necklaces such as Kay's at $199.99 use engraved or stamped faces. Print the dial, and fit real hands glued at the time or engrave them (est.). https://www.kay.com:443/customized-time-clock-necklace-sterling-silver-18/p/V-781148515
- **Labour:** no minute-level data surfaced; Etsy locket shops quote 2 to 5 days an order. Estimate 35 to 60 minutes a locket, and 60 to 100 a pair. (est.)

## 4. What each route costs

From [../model/routes.py](../model/routes.py), at the planned prices and the model's fees, shipping, defects and content, rerun on 18 Oct 2026 after the outside review. VAT excluded; the locket includes every part, the personalisation, spares, import and checks. The small-lot routes carry ₩3,000 a locket for checks and lab re-tests, and ₩1M for the first round of lab tests (two cases, a chain and a clasp).

| Route | One locket | Single, boxed | Left per presale order: single, pair | Launch | Break-even, presale orders | Minimum | Weeks to pieces | Can be the Wadiz reward |
|---|---|---|---|---|---|---|---|---|
| Generic photo pocket watch, at ₩45,000 / ₩79,000 | ₩16,785 | ₩19,485 | ₩6,945 / ₩15,277 | ₩2.55M | 138 | 10 | 2 | No |
| Stock watch-shaped locket from 1688 | ₩19,721 | ₩25,421 | ₩30,348 / ₩57,274 | ₩3.01M | 58 | 10 | 3 | No |
| Round 316L double-glass locket | ₩16,441 | ₩22,141 | ₩34,137 / ₩64,851 | ₩3.68M | 63 | 20 | 3 | Only with your own mark and dial |
| **A factory's stock hunter case, empty, your lid lasered on** | **₩22,672** | **₩28,372** | **₩26,940 / ₩50,458** | **₩4.00M** | **85** | **10, assumed** | **3** | **Probably, if stated honestly; ask Wadiz** |
| Semi-custom brass case | ₩24,221 | ₩34,421 | ₩19,954 / ₩40,527 | ₩3.96M | 104 | 100 | 8 | Yes |
| Your own case, cast in Jongno | ₩34,028 | ₩44,228 | ₩8,627 / ₩17,873 | ₩3.64M | 176 | about 30 in the model | 14 | Yes |

- **The box:** the stock routes use a stock drawer box with a printed sleeve (₩5,700 a single with card, chip, seal and pouch); the semi-custom and cast routes keep the custom box (₩10,200). That ₩4,500 is an estimate.
- **Like for like:** built to the semi-custom spec (the handwriting engraved at ₩4,000, the back at ₩3,000, the custom box), the stock case is ₩23,772 a locket and ₩33,972 a boxed single, and break-even is 102. The case itself saves little; the headline gap comes from printing the handwriting and the stock box.
- **Engraving decides the cost target.** At $4 a case, the stock case passes the semi-custom ₩24,221 only while outsourced engraving is about ₩7,408 a job or less. At ₩6,000 a job it passes only while the case is about $4.95 or less. At Soomgo's ₩11,000 a job it is ₩28,172 a locket and break-even 108.
- **With an in-house fiber marker** (about ₩300 to ₩500 a job, the handwriting engraved again) the stock case is ₩16,952 a locket and leaves ₩10,240 more per order; a ₩2.5M marker pays back after about 244 orders.
- **The semi-custom route at outsourced prices** (₩6,000 for each of its two jobs) is ₩29,571 a locket and break-even 138, with a cash low of about ₩9.0M. So that route comes with the fiber marker: with in-house engraving and the marker bought in August, its low is about ₩7.6M, or ₩8.6M at a 60% payout.
- **Cash, middle case, Wadiz paying 70% about two weeks after the close:** the stock case's month-end low is ₩3.34M in June, but its presale cases (about ₩1.57M with VAT) are paid on the close, before the first payout, so the most out at once is about ₩4.92M in mid-July. It is back above zero in October, or November with the marker bought in August (whose month-end low is then ₩4.23M, or ₩5.23M at a 60% payout). The semi-custom route orders its batch when the payout lands, so it has no mid-July dip; it is ₩7.23M out at the end of September (₩8.23M at a 60% payout) and back above zero in December.
- **Reserve:** about ₩9M within reach until the stock case passes its gates (it covers the semi-custom fallback with its marker at a 60% payout); after that about ₩5.5M until December.
- **If the presale misses its goal:** about ₩3.39M lost on the stock-case route and ₩3.36M on the semi-custom route. If Wadiz charged 25 backers anyway: about ₩2.21M on the stock case, against ₩3.11M on the semi-custom route, which must still buy 100 cases; the custom box's minimum would add more and is not in the model.

## 5. What to ask, after discharge

**To pocket-watch case factories (English, through Alibaba or Made-in-China):**
- Empty full-hunter case, no movement: the smallest you make between 30 and 40 mm, 38 mm or less preferred. Crown and bow, hinged front lid with a snap, crystal fitted, back blank for engraving.
- Inside the case, a seat or spacer ring for a printed dial with no movement and a centre post for fixed hands; inside the front lid, a flat recess for a 25 to 30 mm photo under flat glass, with its depth and the gap to the crystal.
- Brass with lead below 0.009% and cadmium below 0.01% by weight in the base metal, plating and solder, or 316L stainless; a test report for this item covering lead and cadmium content and nickel release (EN 1811).
- Our pattern lasered on the front lid from our vector file; our mark inside the back cover, not the lid.
- Measurements and photos with a ruler: diameter, thickness, lid recess, crystal and weight.
- Prices at 10, 50 and 100; sample price and time; production time; individual bags; commercial invoice with origin, and a Korea–China FTA certificate of origin if they can issue one.
- The lid pattern stays ours: not sold to others, in a short supply agreement.

**To Guangzhou brass makers (Baoyan, Mimier, Peishang):** do you already have a pocket-watch-shaped photo locket mould? Can you make it in low-lead brass at 30 to 50 pieces with our lid pattern?

**To Wadiz, in writing:** whether a stock case body carrying our lid, dial, photo, engraving, box and letter can be the main reward, with the lid file and a supply agreement ready.

**In Seoul:** a fixed per-job engraving price from a Jongno 3-ga shop for a 30 to 40 mm brass back, with vector files supplied and a different line on each piece; quotes from two customs brokers for a small formal import, with the HS line and FTA rate for an empty watch case; a lab quote for lead, cadmium and nickel release.

## 6. What could not be found

- A stock 30 to 40 mm hunter case in brass, 316L or silver, with size, metal, price and minimum; the one empty-case listing showed none of them.
- Whether Wadiz accepts a stock case body inside our own design as the main reward.
- Item-level prices, ratings, Korea shipping and sample terms for nearly every China listing.
- Korean wholesale listings with price and minimum, Namdaemun prices, and which Jongno shops now sell dials, hands and domes.
- Unit prices and mould fees for semi-custom brass lockets at 50 to 300 pieces.
- A Korean lab price for jewellery lead, cadmium and nickel tests, and a customs broker's fee.
- Whether adult jewellery is a 안전기준준수대상 생활용품, and its labelling rules.
- The full text of Wadiz's exception to the identical-product clause, and whether a third-party AliExpress listing counts as an "official channel".
