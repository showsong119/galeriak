# 운영 연동 절차 (Claude용)

- 사이트: `site/index.html` (이전 Netlify 배포본 기반, 단일 파일). Netlify가 GitHub `main`에서 `site/`를 배포.
- DB: Supabase `pimuwxsazuzmgwhbrzbx`. 기존 테이블 사용 — `posts(gallery_id, author_id, anon_name, title, body, source_url,
  deal_price[text], deal_store, deal_url, deal_sold, is_pinned, is_sponsored, is_hidden, is_deleted, needs_review, views,
  up_count, down_count, comment_count, created_at)`, `profiles(id, nickname, role, age_confirmed_at, banned_until)`,
  `comments`, `votes(post_id, voter, value)`, `reports`, RPC `increment_view`, `admin_users`. **스키마를 새로 만들지 말 것.**
- 운영실: https://claude.ai/artifact/Qyi16cNk8L8B1LmgUdZEgo (컬렉션: tasks, content, deals, revenue, kpi, config, secrets)

## 키
- 이 세션의 GitHub 프록시는 Actions secrets API를 막음 → 비밀 키는 사용자가 GitHub 화면에서 직접 입력 (`SUPABASE_SERVICE_ROLE_KEY` 하나)
- `AMAZON_TAG`는 공개값: 운영실 `config/public.AMAZON_TAG`를 읽어 `deals/config.json`의 `amazon_tag`에 커밋
- 키 상태 확인: 봇이 매 실행마다 `deals/last-run.json`에 `status`(`sin-configurar`면 `missing` 목록)를 커밋

## 매일 (예약 작업)
- `CURATOR.md`대로 후보를 `deals/inbox/`에 올림 → 봇이 `needs_review=true`로 게시 (관리자 화면 '검토 필요'에 표시)
- 게시 결과(`deals/last-run.json`)를 운영실 `deals`에 `{date, title, asin, price, status:"게시됨", url}`로 기록
