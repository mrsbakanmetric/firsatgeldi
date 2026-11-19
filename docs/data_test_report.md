# Data test report — round 1: pasted store links (paths 1 and 2)

> **Status:** step 23 in progress (🛠) · **Round:** 1 of the data test, plus the matching method on its saved answers (section 7) · **Date:** 2026-11-19 · **Owner:** implementation side (Claude Code)
> Scope and method: `docs/implementation_plan.md` Appendix A; link reading order: `docs/architecture.md` §10.1.

## 1. What this round measured

For 19 real product links the user pasted (Trendyol 6, Hepsiburada 4, Teknosa 3, Amazon TR 3, MediaMarkt 3):

- **Path 1, the link text** (`packages/sources` `readLinkText`): what the URL alone says. No request to the store, no provider cost.
- **Path 2, Google Shopping through SerpApi** (`engine=google_shopping`, `gl=tr`, `hl=tr`, `google_domain=google.com.tr`): one search per link. The search text is brand + model code when the link has a model code, otherwise brand + every name word (`pathTwoQuery`).

Not measured in this round: path 3 (the store's official API, no access yet), store product pages and site search, seller and price fields.

Every answer is saved under `packages/sources/recordings/serpapi/` (file name = hash of the search parameters, never the key) and can be read again at no cost.

## 2. Results per link

"First result" is the first Google Shopping offer. "Correct product in the first 12" gives the position of the first offer that is the linked product (same model and generation; colour, storage and pack noted). Store names and seller names are left out of this table.

| # | Store | Read from the link (brand · model code · name) | Search text | First result | First result correct? | Correct product in the first 12 |
|---|---|---|---|---|---|---|
| 1 | Trendyol | asics · 1042A237-101 · gel dedicate 8 kadin tenis ayakkabisi | `asics 1042A237-101` | ASICS GEL-DEDICATE 8 - BLUE - 40 | Not checked (earlier search, 2026-11-19, outside this round's count) | — |
| 2 | Trendyol | tcl · 75T8C · 75 190 ekran uydu alicili 4k ultra hd smart qled google tv | `tcl 75T8C` | Tcl 75q6c 75 Google Uhd 4k Smart Mini Led Tv | Wrong product (75Q6C) | Not found (a 75T8D at 9; a "75T8C" remote control at 4) |
| 3 | Trendyol | apple · — · iphone 18 pro 256gb glacier | `apple iphone 18 pro 256gb glacier` | Apple iPhone 18 Pro | Correct (model; storage and colour not in the title) | 1 |
| 4 | Trendyol | apple · MXP63TU · airpods 4 nesil a | `apple MXP63TU` | Apple EarPods (Mmtn2fe/A) | Wrong product (EarPods) | Not found (AirPods 4 with noise cancellation, another variant, at 6) |
| 5 | Trendyol | apple · — · watch se 3 gps 40mm yildiz isigi aluminyum kasa ve kum beji spor kordon s m | `apple watch se 3 gps 40mm yildiz isigi …` | Apple Watch SE 2022 (foreign price-comparison listing) | Wrong product (older generation) | 7 (SE 3, 40 mm, starlight) |
| 6 | Trendyol | apple · — · 13 inc ipad air m3 icin magic keyboard turkce q klavye | `apple 13 inc ipad air m3 icin magic keyboard …` | — | Failed: two timeouts (30 s each), nothing saved | — |
| 7 | Hepsiburada | roborock · — · roborock s8 pro akilli robot supurge beyaz | `roborock s8 pro akilli robot supurge beyaz` | Roborock 22.000 Pa robot vacuum with dock (unnamed model) | Wrong product | Not found (S8 Pro accessories at 5) |
| 8 | Hepsiburada | onvo · 40VQ80F3FA · onvo 40 102 ekran uydu alicili full hd whaleos qled tv | `onvo 40VQ80F3FA` | Onvo 32VL50F3HA 32" | Wrong product (32") | Not found (the earlier 40VQ80F2FA at 5) |
| 9 | Hepsiburada | apple · — · apple iphone 15 128 gb siyah | `apple iphone 15 128 gb siyah` | Apple iPhone 15 | Correct (model; storage and colour not in the title) | 1 (exact variant, new, at 5; refurbished and display units in between) |
| 10 | Hepsiburada | apple · — · apple watch se 3 gps 44 mm gece yarisi aluminyum kasa ve gece yarisi spor kordon m l | `apple watch se 3 gps 44 mm gece yarisi …` | Apple Watch SE 2 2023 Cellular 40mm | Wrong product (older generation) | Not found (SE 3 44 mm in another colour at 6) |
| 11 | Teknosa | roborock · — · roborock saros 20 akilli robot supurge siyah | `roborock saros 20 akilli robot supurge siyah` | Roborock Q8 Max Pro | Wrong product | Not found (Saros 20 Sonic and Saros 20 Flow, other models, at 2, 3, 10, 11) |
| 12 | Teknosa | apple · — · apple iphone 17 pro 1tb abis akilli telefon | `apple iphone 17 pro 1tb abis akilli telefon` | Apple iPhone 17 Pro | Correct (model; storage and colour not in the title) | 1 |
| 13 | Teknosa | qromax · D136B-114-02 · qromax 2 kamerali set … guvenlik kamerasi seti | `qromax D136B-114-02` | — | No result ("Google hasn't returned any results for this query") | — |
| 14 | Amazon TR | — · — · (no name: mobile link `/gp/aw/d/{ASIN}`) | — | — | Skipped: the link has no name words, the search text would be empty | — |
| 15 | Amazon TR | coverzone · — · coverzone hx 22 kablosuz görünümlü dayanıklı | `coverzone hx 22 kablosuz görünümlü dayanıklı` | Coverzone foldable wireless keyboard | Wrong product | Not found (4 results, none HX-22) |
| 16 | Amazon TR | tp · — · tp link tapo c211 güvenliği kamerası | `tp link tapo c211 güvenliği kamerası` | Tp-link Tapo C211 2-pack | Correct model, wrong pack (2-pack) | 2 (single camera) |
| 17 | MediaMarkt | apple · MJRR4TUA · apple iphone 18 pro 256 gb akilli telefon bordo | `apple MJRR4TUA` | Apple iMac (MD3H4TU/A) | Wrong product (iMac) | Not found |
| 18 | MediaMarkt | apple · — · apple 35 w cift usb c baglanti noktali guc adaptoru | `apple 35 w cift usb c baglanti noktali guc adaptoru` | Lucatech 35W Type-C adapter | Wrong product (other brand) | 7 (Apple 35 W dual USB-C, MW2K3TU/A) |
| 19 | MediaMarkt | lenovo · 226V16GB (wrong: the store slug glues words) · lenovo yoga slim 7 aura … laptop | `lenovo 226V16GB` | Lenovo E16 Gen 3 | Wrong product | Not found |

### Totals for the 16 searches of this round

| Outcome | Count | Links |
|---|---|---|
| First result correct | **4** | 3, 9, 12, 16 (16 is the right model as a 2-pack; strictly exact: 3) |
| First result a wrong product | 11 | 2, 4, 5, 7, 8, 10, 11, 15, 17, 18, 19 |
| No result | 1 | 13 |
| Correct product somewhere in the first 12 | 6 | 3, 9, 12, 16 (first or second) · 5, 18 (seventh) |

By search text: **model-code searches** (2, 4, 8, 13, 17, 19 — six searches): 0 correct first results. **Name searches** (ten searches): 4 correct first results.

## 3. Skipped and failed

- **Link 6, iPad keyboard (Trendyol):** two live attempts, each stopped after 30 s (`REQUEST_TIMEOUT_MS`); no answer saved. Not retried a third time.
- **Link 14, Amazon mobile link** (`amazon.com.tr/gp/aw/d/B0GPD3SJQW?…`, pasted without `https://`): path 1 reads the store and the ASIN, but the mobile URL has no name words, so path 2 has nothing to search. Not sent. Paths that could read it: path 3 (store API by ASIN) or the product page.

## 4. SerpApi usage

- **This month: at most 19 of 250 searches** — 1 earlier (link 1, 2026-11-19) + 16 answered in this round + 2 timed-out attempts for link 6 (SerpApi may or may not have charged them). Earlier this day the count was given as "at most 20" in chat; the recount is 19.
- Re-reading the 17 saved answers costs nothing. Tests and CI never call SerpApi.
- The saved answers contain no API key (checked against the key in the local `.env`), no e-mail address and no personal-data fields.

## 5. Main finding

**The first Google Shopping result alone is not reliable: 4 correct out of 16 searches.** Typical failures seen in the first 12 results:

- **Neighbouring model or generation:** 75Q6C / 75T8D for 75T8C; SE 2 for SE 3; 40VQ80F2FA for 40VQ80F3FA; Saros 20 Sonic for Saros 20.
- **Model codes are not in the titles:** Apple part numbers (MXP63TU, MJRR4TUA) and most manufacturer codes are missing from offer titles, so a model-code search returns loosely related products (EarPods, iMac).
- **Accessories and compatible parts:** remote controls, chargers "uyumlu", accessory sets, "kamera dahil değildir".
- **Condition:** refurbished ("yenilenmiş"), display units ("teşhir", "vitrin"), open box ("açık kutu"), used.
- **Pack size:** 2-pack ("2'li") for a single item.
- **Foreign listings:** Italian and Russian titles, prices in euro inside the title.
- **Variant details missing:** titles often carry the model only ("Apple iPhone 18 Pro"), without storage or colour.

## 6. Matching method [DECIDED 2026-11-19] (user)

The product match after path 2, as proposed after round 1 and decided by the user on 2026-11-19 (`architecture.md` §10.1).

1. **Normalise** every offer title and the link reading: lower case, Turkish letter folding, punctuation removed, part-number suffixes ignored ("MXP63TU/A" = "MXP63TU").
2. **Hard filters** (an offer that fails one is dropped):
   - brand matches;
   - model code matches exactly when both the link and the title carry one;
   - generation and series numbers match ("SE 3" ≠ "SE 2", "iPhone 18" ≠ "iPhone 17", "75T8C" ≠ "75T8D", "F3FA" ≠ "F2FA");
   - pack size matches ("2'li", "2-pack", "set" only when the link says so);
   - not an accessory or compatible part ("uyumlu", "için", "kılıf", "kumanda", "dahil değildir");
   - new condition unless the link says otherwise ("yenilenmiş", "teşhir", "vitrin", "açık kutu", "used" dropped);
   - a Turkish listing in TL.
3. **Score** the remaining offers on the link's name words and variant details (storage, size in mm/inch, colour).
4. **Confidence:**
   - **High** (one clear best offer, all hard filters passed, variant details agree): the product is proposed, and the user still confirms it (product rule 1, "verify first").
   - **Low** (no offer left, or several close scores): the user sees the **3 closest results** to choose from (the existing "Hangisi seninki?" closest-three pattern), plus "Adıyla ara".
5. **Search text:** when the link has a model code, search brand + model + the key name words instead of brand + model code alone (model-code-only searches gave 0 of 6). Generic words ("akilli", "telefon", "ekran uydu alicili") may be dropped. One search per link; no second search (budget).

## 7. Matching method on the saved answers

The method of section 6, built in `packages/sources` (`matchProduct`, #152), run on the saved answers of this round. No new SerpApi search. The test `packages/sources/src/matching.test.ts` holds the same table and fails if a result changes.

**How "right" was decided:** every offer of every answer was checked by hand on its title. An offer counts as the linked product when it has the same model and generation, is new and is a single item. Where the title states storage, size or colour, they must match too. A title that leaves them out still counts, as in section 2. This time every offer of an answer was checked (up to 40), not only the first 12. So links 4 and 17 now have the right product in the answer (positions 30 and 13), although section 2 says "Not found" for them.

### Results per link

"Kept" = offers left after the hard filters / offers in the answer. "Proposed" is the position of the offer the method proposes (HIGH). For LOW, the user would see the closest three.

| # | Store | Confidence | Proposed (position · title) | Right? | Kept | Offers that are the linked product |
|---|---|---|---|---|---|---|
| 1 | Trendyol | HIGH | 1 · ASICS GEL-DEDICATE 8 - BLUE - 40 | Yes | 8 / 12 | 1 |
| 2 | Trendyol | LOW | — | — | 6 / 12 | 0 |
| 3 | Trendyol | HIGH | 1 · Apple iPhone 18 Pro | Yes | 1 / 2 | 1 |
| 4 | Trendyol | HIGH | 30 · Apple AirPods 4 | Yes | 7 / 40 | 2 |
| 5 | Trendyol | HIGH | 12 · Apple Watch SE 3 GPS Alüminyum Kasa ve Spor Kordon | Yes | 18 / 40 | 6 |
| 7 | Hepsiburada | HIGH | 36 · Roborock … Robot Vacuum S8 Pro … | Yes (see limits) | 18 / 40 | 3 |
| 8 | Hepsiburada | LOW | — | — | 3 / 26 | 0 |
| 9 | Hepsiburada | HIGH | 7 · Apple İphone 15 128 Gb Siyah … | Yes | 5 / 22 | 5 |
| 10 | Hepsiburada | HIGH | 28 · Apple Watch SE 3 | Yes | 15 / 40 | 2 |
| 11 | Teknosa | HIGH | 32 · ROBOROCK Saros 20 Robot Süpürge Siyah | Yes | 13 / 34 | 3 |
| 12 | Teknosa | HIGH | 1 · Apple iPhone 17 Pro | Yes | 3 / 11 | 3 |
| 13 | Teknosa | LOW | — (no result) | — | 0 / 0 | 0 |
| 15 | Amazon TR | LOW | — | — | 1 / 4 | 0 |
| 16 | Amazon TR | HIGH | 2 · Tapo Tp-Link C211 2k 3mp … Kamerası | Yes | 12 / 40 | 12 |
| 17 | MediaMarkt | HIGH | 13 · Apple iPhone 18 Pro | Yes | 17 / 40 | 5 |
| 18 | MediaMarkt | HIGH | 18 · Apple 35 W Çift Usb-c Bağlantı Noktalı Güç Adaptörü | Yes | 6 / 40 | 3 |
| 19 | MediaMarkt | LOW | — (nothing kept) | — | 0 / 40 | 0 |

### Totals for the 16 searches of this round (link 1 not counted)

| Outcome | Count | Links |
|---|---|---|
| HIGH, the right product proposed | **11** | 3, 4, 5, 7, 9, 10, 11, 12, 16, 17, 18 |
| HIGH, a wrong product proposed | **0** | — |
| LOW, the right product among the closest three | 0 | — |
| LOW, the right product in the answer but not in the closest three | 0 | — |
| LOW, the answer does not have the right product | 5 | 2, 8, 13, 15, 19 |

Compared with section 2: the first result was right in **4 of 16**; the method proposes the right product in **11 of 16** and never proposes a wrong one. In the 5 LOW cases the answer itself does not contain the linked product, so no match method could find it there.

### Known limits

- **Old search text.** These answers were saved with the round 1 search text: brand + model code alone for the 6 model-code links (2, 4, 8, 13, 17, 19). This measures the **matching method**, not the **new search text** of section 6 item 5. Measuring the new text needs up to **6 new searches** (one per model-code link). They are not run yet: they need the user's go-ahead (SerpApi budget, at most 19 of 250 used this month).
- **Brand missing from the title.** The brand filter drops offers whose title leaves out the brand, even when they are the right product (e.g. "Watch Se 3 Gps 40 mm Yıldız Işığı …" for link 5, "S8 Pro Akıllı Robot Süpürge" for link 7). The right product was still found in those links.
- **Link 7.** The proposed title names "Roborock … S8 Pro" but its spec line (10000 Pa) looks unusual. By the title rule above it counts as right; a store page or the store API (path 3) would confirm it.
- **A wrong model code from path 1.** For link 19, path 1 read a wrong model code from a glued store slug (section 2). The model-code filter then dropped every offer that carries a code (39 of 40), so the answer is LOW with nothing to choose. The user sees "Ürünü bulamadık" + "Adıyla ara".
- **Same title several times.** The closest three can show the same title twice (offers from different stores with identical titles, e.g. link 8). Grouping identical titles is not built.
- **Titles only.** The method reads titles only. Seller, price, stock and the product page are not used (section 9).
- **Small sample.** 16 searches, electronics only; no clothing link yet.

## 8. Hidden-seller rule

The saved answers contain store and seller names (`source`) and prices. They stay in `packages/sources/recordings/` and in this report's raw data: `packages/mocks` and the app do not read them, and no seller name, store name or price from a search reaches a screen, a response, a notification or an e-mail (product rule 3). Seller and price of the user's own purchase still come only from the user (product rule 7).

## 9. Open after this round

- Measuring the new search text (section 6 item 5) on the 6 model-code links: up to 6 new SerpApi searches, waiting for the user's go-ahead (section 7, known limits).
- Path 3: the stores' official APIs (the user applies for access).
- Store product pages and site search per store (Appendix A sources), with the politeness rules; Trendyol answered 403 to an identifiable User-Agent and disallows `?q=` in robots.txt.
- Fields not measured yet: seller, ratings, stock, delivery, installments, warranty, old price (Appendix A › Fields measured).
- Clothing links (the sample has none yet).
