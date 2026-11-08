# 핫딜 매뉴얼 — 매일 큐레이션 (Claude용)

이 파일이 GaleríaK 매일 핫딜 업무의 **매뉴얼**이다. 예약 작업과 채팅의 `galeriak-hotdeal` 스킬이 모두 이 규칙을 따른다.
결과가 틀렸으면 채팅에서 결과만 고치지 말고 **이 파일을 고친 뒤** 다시 실행한다(맨 아래 변경 기록에 한 줄 추가).

## 목적
멕시코 사용자에게 진짜 할인 중인 K-뷰티 제품을 매일 소개해 Amazon México 제휴 수익을 만든다.
민석은 게시 후 관리자 화면 '검토 필요'에서 검수만 한다.

## 언제 / 무엇을
- 매일 07:41(멕시코시티) 예약 작업이 후보 파일을 푸시 → GitHub Actions 봇이 바로 게시 → **오전 8시 전후 게시**.
- 하루 **최대 5개**. 기준을 통과한 것이 5개 미만이면 그 수만큼만. 0개면 파일을 올리지 않고 요약에 그렇게 쓴다.

## 상품 기준 (모두 통과해야 함)
1. 한국 브랜드의 K-뷰티 제품, amazon.com.mx에서 판매 (정품 아닌 듯한 판매처·복제품 제외).
2. **할인율 20% 이상** — 지금 열어 본 출처에서 현재가와 정가를 둘 다 확인한 경우만. `price`, `list_price`, `source`에 기록.
3. **평점 4.3 이상, 리뷰 100개 이상** — 지금 확인한 출처(검색 결과의 amazon.com.mx 요약 포함)에서 본 경우만. `rating`, `reviews`에 기록.
4. 최근 7일 안에 올린 ASIN이 아님 (`deals/last-run.json`, `deals/processed/` 확인).
- 확인할 수 없는 항목이 하나라도 있으면 **그 상품은 뺀다.** 가격·할인·평점은 절대 지어내지 않는다.
- PA-API 키가 생기면 봇이 가격을 직접 검증하므로 이 확인이 쉬워진다.

## 순서
1. `deals/last-run.json`과 `deals/processed/`를 읽어 어제 결과와 7일 내 ASIN을 확인.
2. WebSearch로 찾기: 브랜드별(COSRX, Beauty of Joseon, ANUA, Round Lab, SKIN1004, Torriden, Medicube, Laneige,
   Some By Mi, Isntree, Klairs, Missha, TONYMOLY, Numbuzin, Mixsoon), 시즌별(Buen Fin, Hot Sale, Navidad, Olive Young 세일),
   그리고 Amazon 가격을 언급한 멕시코 할인 뉴스.
3. URL의 `/dp/ASIN`에서 ASIN을 뽑는다.
4. 기준표로 걸러서 좋은 순으로 최대 5개.
5. 후보마다 작성:
   - `title`: 브랜드 + 제품명 + 용량, 4–120자, 링크·이모지 없음.
   - `note`: 멕시코 스페인어(tú), 친근한 커뮤니티 말투, 1–2문장. 어떤 피부에 좋은지·용량 등 사실만. 의학적 효능, 출처 없는 "아이돌 사용" 주장, 이모지 금지.
   - `ko`: 민석 검수용 한국어 한 줄 요약 (게시되지 않음).
6. `deals/inbox/YYYY-MM-DD.json`으로 저장 → 커밋·푸시.
7. `drafts/sns/YYYY-MM-DD.md`에 오늘 딜로 틱톡 15–20초 대본 + 인스타 캡션(멕시코 스페인어) 초안. SNS에 직접 게시하지 않는다.

## 툴박스 (새로 만들기 전에 여기부터 확인)
- 후보 파일 형식:
```json
{"deals":[
  {"asin":"B00PBX3L7K","title":"COSRX Advanced Snail 96 Mucin Power Essence 100 ml",
   "price":289,"list_price":399,"rating":4.6,"reviews":12000,
   "note":"Esencia hidratante con mucina de caracol, ideal si tu piel se siente deshidratada.",
   "ko":"COSRX 달팽이 에센스 100ml, 28% 할인, 건성 피부용",
   "source":"https://…"}
]}
```
- 봇: `scripts/publish-deals.mjs` (검증·중복 제거·게시, 제목 앞에 `[-28%]` 자동). 테스트 `npm test`, 드라이런 `npm run deals:dry`.
- 제휴 태그: `deals/config.json`의 `amazon_tag` (운영실 `config/public.AMAZON_TAG`에서 동기화).
- 기록: 운영실(https://claude.ai/artifact/Qyi16cNk8L8B1LmgUdZEgo) `deals` 컬렉션.

## 완료 기준 (내보내기 전에 하나씩 확인하고, 요약에 "완료 기준 n/8 통과"로 보고)
1. 후보 5개 이하, 모두 한국 K-뷰티 제품.
2. 모든 후보에 `source`가 있고, 할인율 20% 이상이 `price`/`list_price`로 계산된다.
3. 모든 후보가 평점 4.3 이상, 리뷰 100개 이상 (`rating`/`reviews` 기록).
4. 7일 안에 올린 ASIN과 겹치지 않는다.
5. ASIN 10자, 제목 4–120자, 링크·이모지 없음 (`npm run deals:dry` 통과).
6. `note`는 멕시코 스페인어 1–2문장, 의학적 효능·이모지·출처 없는 주장 없음.
7. 모든 후보에 한국어 `ko` 요약이 있다.
8. 비밀값이 커밋에 없다.

## 변경 기록
- 2026-11-08: 매뉴얼 형식으로 개편 — 하루 최대 5개, 할인 20%·평점 4.3·리뷰 100 기준, 한국어 요약, 완료 기준 추가.
