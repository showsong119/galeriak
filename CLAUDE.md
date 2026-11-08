# GaleríaK — Claude Code 작업 인계서

이 파일은 Claude Code가 저장소를 열 때 자동으로 읽는 인계 문서다. 사용자(민석)는 한국어로 대화하고, 사이트·봇 문구는 멕시코 스페인어로 쓴다.
사용자는 초보 창업자이며 "Claude가 할 수 있는 일은 모두 Claude가 하고, 본인은 마지막 검수만" 하길 원한다.

## 1. 프로젝트 한 줄 요약
멕시코(스페인어) 대상 K-뷰티·K-팝 커뮤니티. 디시인사이드(갤러리)+뽐뿌(핫딜) 결합형. 광고(AdSense)와 Amazon México 제휴 수익 모델.

## 2. 현재 구성 (2026-11-08 기준)
| 항목 | 값 |
| --- | --- |
| 사이트 | https://galeriakmx.com (주 도메인, www는 자동 이동) · https://galeriak.netlify.app |
| 호스팅 | Netlify 프로젝트 `galeriak` (아직 **Private**, 정식 오픈 시 Make public) |
| 저장소 | https://github.com/showsong119/galeriak (Public, 브랜치 `main`) |
| DB·인증 | Supabase 프로젝트 `pimuwxsazuzmgwhbrzbx` (`https://pimuwxsazuzmgwhbrzbx.supabase.co`) |
| 공개키 | `sb_publishable_njWRhiyl0oZOeJh6m-Zdyw_5yPgHiNn` (site/index.html에 하드코딩, 공개값) |
| 로그인 | 이메일/비밀번호(기존) + Google OAuth(추가). Google Cloud 프로젝트 `GaleriaK`, 클라이언트 `GaleriaK web` |
| 운영실(관리 앱) | https://claude.ai/artifact/Qyi16cNk8L8B1LmgUdZEgo (Claude 아티팩트, 공유 DB 사용) |
| 전략 문서 | https://claude.ai/artifact/8G8kxC5NCt5T7sCfA6PK65 (유입 채널·스페인어 홍보 문구·4주 일정) |
| SNS 홍보물 | https://claude.ai/artifact/JaFEzkUZtQTGBHaa6ppskT (인스타 피드/캐러셀/스토리, 틱톡 커버, QR 전단) |
| 예약 작업 | "GaleríaK 매일 핫딜 큐레이션" (매일 07:41 America/Mexico_City, id `trig_016kt8RSPDArSZyT7p33sDkk`) |

## 3. 저장소 구조
```
site/index.html          사이트 전체(단일 파일). 이전 세션이 Netlify CLI로 올렸던 원본 + 이번 수정
site/manifest.webmanifest, site/sw.js, site/icons/   PWA(홈 화면 설치, 오프라인)
netlify.toml             publish = "site", 빌드 없음
scripts/publish-deals.mjs  핫딜 봇 (Node 20, 의존성 없음)
scripts/publish-deals.test.mjs  `npm test` (node:test, 6개 통과)
deals/inbox/*.json       큐레이션 후보 (예약 작업이 매일 넣음)
deals/processed/         처리된 후보
deals/config.json        { "amazon_tag": "" }  ← Amazon 추적 ID(공개값)
deals/last-run.json      봇 실행 결과 (status, missing, published, rejected)
drafts/sns/              SNS 초안 (게시는 하지 않음)
.github/workflows/deals.yml  봇: 매일 15:07 UTC + deals/inbox 푸시 시
CURATOR.md               핫딜 매뉴얼 (기준·툴박스·완료 기준·변경 기록)
OPS.md                   운영 연동 절차
SETUP.md                 사용자가 직접 해야 할 일 체크리스트
```

## 4. 기존 Supabase 스키마 — 절대 새로 만들거나 바꾸지 말 것
이전 세션이 만든 테이블을 그대로 쓴다(스키마 파일은 저장소에 없음).
- `posts(id, gallery_id, author_id, anon_name, title, body, source_url, deal_price[text], deal_store, deal_url, deal_sold, is_pinned, is_sponsored, is_hidden, is_deleted, needs_review, views, up_count, down_count, comment_count, created_at)`
- `profiles(id, nickname, role['admin'|...], age_confirmed_at, banned_until)` — 프로필은 클라이언트가 첫 로그인 때 insert
- `comments(id, post_id, author_id, body, is_hidden, is_deleted, created_at, anon_name)`
- `votes(post_id, voter, value)`, `reports(id, post_id, comment_id, reporter, reason, created_at)`
- RPC: `increment_view(p_post_id)`, `admin_users(p_search)`
- 관리자: `profiles.role='admin'`이면 사이트에 '관리자' 메뉴(검토 필요 대기열, 신고, 숨김, 회원 차단)

## 5. 이번 세션에서 site/index.html에 추가한 것
- 로그인 화면 맨 위 **Continuar con Google** 버튼 (`#gLogin`, `signInWithOAuth`, redirectTo = 현재 origin+path)
  - 클릭 시 `localStorage.gk_age_ok='1'` → 첫 프로필 생성 때 `age_confirmed_at` 채움
  - Google 이름으로 닉네임 생성, 중복이면 ID 앞 4자리 붙여 재시도
- 봇 글(`anon_name === 'Bot de ofertas'`)은 **24시간 지나면 가격 숨김** → "Revisa el precio actual" (Amazon 가격 표시 규정)
- 푸터에 Amazon 제휴 고지 문구, PWA 메타·서비스워커 등록

## 6. 핫딜 봇 (scripts/publish-deals.mjs)
- 입력: `deals/inbox/*.json` → 검증(ASIN 10자, 제목 4–120자, 가격 범위) → 7일 내 같은 ASIN 중복 제거 → `posts`에 insert
- insert 형태: `{gallery_id:'ofertas', anon_name:'Bot de ofertas', title, body, deal_price:'$289 MXN'|'Ver precio en Amazon', deal_store:'Amazon México', deal_url:'https://www.amazon.com.mx/dp/<ASIN>?tag=<TAG>', needs_review:true}`
  - needs_review=true → 바로 보이고, 관리자 '검토 필요' 대기열에도 뜸 (자동 게시 + 사후 검수)
- 필요 값: `SUPABASE_SERVICE_ROLE_KEY`(GitHub Secret, **아직 미입력**), `AMAZON_TAG`(secret 또는 deals/config.json, **아직 미가입**)
- 선택: `PAAPI_ACCESS_KEY/SECRET_KEY` — Amazon PA-API 5 (판매 3건 이후 발급). 있으면 가격 검증 + 할인 상품 자동 탐색. **키가 없어 실호출 미검증**
- Supabase 새 키(`sb_secret_…`)는 `apikey` 헤더만, 옛 JWT 키는 Authorization도 함께 보냄
- 키가 없으면 `deals/last-run.json`에 `status:"sin-configurar", missing:[...]` 기록 후 종료
- **실제 Supabase insert는 아직 한 번도 성공 확인 안 됨** — 첫 실행 때 RLS/트리거/제약(author_id NOT NULL 등) 오류 여부 확인 필요

## 7. 운영실(아티팩트 DB) 컬렉션
`tasks`(할 일: title, area, owner '나'|'Claude', due, status '할 일'|'진행 중'|'완료', link, note), `content`(SNS 일정), `deals`(검수 기록), `revenue`(MXN 월별), `kpi`(주간), `config`(`public`: SUPABASE_URL·SUPABASE_ANON_KEY·AMAZON_TAG / `status`: 봇 확인 결과), `secrets`(사용자가 GitHub에 입력했다는 표시만, 값 없음)
- ArtifactData 도구로 읽고 쓴다. 기존 문서 수정 시 if_version 필수.

## 8. 사용자가 직접 해야 하는 남은 일 (우선순위)
1. **Netlify ↔ GitHub 연결**: Project configuration › Developer settings › Repository › Link repository → GitHub → `showsong119/galeriak`, branch `main`, publish dir `site`.
   - 2026-11-08 07:54 현재: 사용자가 GitHub 승인까지 했고 저장소 선택 화면(2단계)에 있었음. Claude 내장 브라우저로 이어서 하려 했으나 **내장 브라우저에 Netlify 로그인이 필요**해 대기 중.
   - 대안: `galeriak-site.zip`(site/ 폴더 압축)을 Netlify 'Already built it?'에 드래그&드롭하면 수동 배포됨.
2. **Supabase Secret key → GitHub Secret** `SUPABASE_SERVICE_ROLE_KEY` (https://github.com/showsong119/galeriak/settings/secrets/actions/new). 채팅·운영실에 값 넣지 않기.
3. **Amazon Afiliados México 가입** (사이트 주소 `https://galeriakmx.com`) → 추적 ID를 운영실 키 설정 `AMAZON_TAG`에 저장 → Claude가 `deals/config.json`에 반영.
4. 관리자 권한 확인(로그인 시 '관리자' 메뉴). 없으면 SQL: `update public.profiles set role='admin' where nickname='showsong117';`
5. 정식 오픈 시 Netlify **Make public**, 이후 AdSense 신청.
6. 앱 출시(나중): Apple Developer($99/년), Google Play($25), Sign in with Apple, Amazon 제휴에 앱 등록.

## 9. 완료된 설정
- Google OAuth: 승인된 JS 원본 `https://galeriakmx.com`, `https://www.galeriakmx.com` / 리디렉션 URI `https://pimuwxsazuzmgwhbrzbx.supabase.co/auth/v1/callback`
- Supabase URL Configuration: Site URL `https://www.galeriakmx.com` (→ `https://galeriakmx.com`로 바꾸길 권장), Redirect URLs: `https://galeriak.netlify.app/`, `https://galeriakmx.com/**`, `https://www.galeriakmx.com/**`
- 도메인 `galeriakmx.com` Netlify에서 구매(첫해 $14.82, 갱신 $18.03/년). galeriak.com은 이미 타인 소유. Netlify Pro($20/월) 업그레이드 팝업은 취소함 — 필요 없음.

## 10. 환경 제약 (이전 세션에서 확인)
- 클라우드 세션 셸은 GitHub만 접속 가능. Supabase·Amazon·Netlify API에 직접 접속 불가 → DB 작업은 GitHub Actions에서.
- GitHub 프록시가 **Actions secrets API를 막음** → Claude가 GitHub Secret을 설정할 수 없음. 새 저장소 생성도 불가(사용자가 만듦).
- Claude는 amazon.com.mx 페이지를 읽을 수 없음(robots). 가격은 확인 가능한 출처가 있을 때만 쓰고, 지어내지 않는다.
- 내장 브라우저(Claude 데스크톱 앱)는 사용자 컴퓨터가 연결돼 있을 때만 사용 가능. 로그인은 사용자가 직접.

## 11. 작업 규칙
- 커밋 메시지 끝: `Co-Authored-By: Claude <noreply@anthropic.com>`; 푸시 전 `git fetch origin main && git rebase origin/main`.
- 비밀값을 커밋·운영실·채팅에 남기지 않는다.
- 아이돌 사진을 홍보물에 쓰지 않는다(저작권·초상권). 공식 사이트처럼 보이게 하지 않는다("comunidad no oficial").
- 봇·홍보 문구는 멕시코 스페인어. 제휴 링크에는 고지 문구 포함.
- 테스트: `npm test` / 드라이런: `npm run deals:dry`

## 12. 무료 한국어 시험 페이지 (/examen-coreano/)
- `site/examen-coreano/index.html` 단일 파일. 30문항 CBT(어휘·문법 12 → 읽기 10 → 듣기 8), 30분, 영역마다 페이지 이동(`?p=V|pausa-V|R|pausa-R|L|resultado`), 상태는 localStorage `gk-examen-v1` (저장 불가 시 한 페이지 모드).
- 문항 은행·채점은 `/* ===== CORE */` 구간 (koreano-cbt 저장소와 동일). 테스트: `scripts/examen.test.mjs`.
- 수익화 설정은 파일 상단 `ADS={client, slots{top,infeed,bottom,side,examBottom,pause,result,review,resultBottom}}`, `AMAZON_TAG`. 비어 있으면 광고 안 보임. `?demo=ads`로 위치 확인.
- AdSense 정책: 광고를 보기·버튼 바로 옆에 두지 않음, 라벨은 'Publicidad', 무관한 고단가 키워드 문단 금지. 전면광고는 Auto ads '비녜트'(페이지 이동 시)로.
- 메뉴 `nav()`에 '/examen-coreano/' 항목, 푸터 링크 있음.
