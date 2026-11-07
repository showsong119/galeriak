# 운영 연동 절차 (Claude용)

- 사이트: `site/index.html` (이전 Netlify 배포본 기반, 단일 파일). Netlify가 GitHub `main`에서 `site/`를 배포.
- DB: Supabase `pimuwxsazuzmgwhbrzbx`. 기존 테이블 사용 — `posts(gallery_id, author_id, anon_name, title, body, source_url,
  deal_price[text], deal_store, deal_url, deal_sold, is_pinned, is_sponsored, is_hidden, is_deleted, needs_review, views,
  up_count, down_count, comment_count, created_at)`, `profiles(id, nickname, role, age_confirmed_at, banned_until)`,
  `comments`, `votes(post_id, voter, value)`, `reports`, RPC `increment_view`, `admin_users`. **스키마를 새로 만들지 말 것.**
- 운영실: https://claude.ai/artifact/Qyi16cNk8L8B1LmgUdZEgo (컬렉션: tasks, content, deals, revenue, kpi, config, secrets)

## 저장소 연결 시 1회
1. `gh api repos/showsong119/galeriak/actions/secrets/public-key` → `{key_id, key}`
2. 운영실 `config/github`에 `{repo, key_id, key}` 저장 → 비밀 키 입력칸이 열림

## 키 반영
- `config/public.AMAZON_TAG` → `gh secret set AMAZON_TAG --repo showsong119/galeriak`
- `secrets/<NAME>`(SUPABASE_SERVICE_ROLE_KEY, PAAPI_*)의 `encrypted_value`, `key_id` →
  `gh api -X PUT repos/showsong119/galeriak/actions/secrets/<NAME> -f encrypted_value=… -f key_id=…`
- 성공: 문서에 `applied_at` 기록 / 실패: `error` 기록. 반영 후 `gh workflow run deals`

## 매일 (예약 작업)
- `CURATOR.md`대로 후보를 `deals/inbox/`에 올림 → 봇이 `needs_review=true`로 게시 (관리자 화면 '검토 필요'에 표시)
- 게시 결과(`deals/last-run.json`)를 운영실 `deals`에 `{date, title, asin, price, status:"게시됨", url}`로 기록
