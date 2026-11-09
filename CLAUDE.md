# GaleríaK — Claude Code 작업 인계서

이 파일은 Claude Code가 저장소를 열 때 자동으로 읽는 인계 문서다.

> **질문 응대 순서 (크레딧 절약):** 사용자의 질문은 먼저 `정리.md`(사용자용 요약·결정 사항·Q&A)에서 `grep`으로 찾아 답한다. 거기에 없을 때만 코드 탐색·웹 검색을 한다. 새 결정이나 변경 사항은 `정리.md`의 「변경 기록」과 해당 항목에 반영한다.

사용자(민석)는 한국어로 대화하고, 사이트·봇 문구는 멕시코 스페인어로 쓴다.
사용자는 초보 창업자이며 "Claude가 할 수 있는 일은 모두 Claude가 하고, 본인은 마지막 검수만" 하길 원한다.

## 1. 프로젝트 한 줄 요약
멕시코(스페인어) 대상 K-뷰티·K-팝 커뮤니티. 디시인사이드(갤러리)+뽐뿌(핫딜) 결합형. 광고(AdSense)와 Amazon México 제휴 수익 모델.

## 2. 현재 구성 (2026-11-08 기준)
| 항목 | 값 |
| --- | --- |
| 사이트 | https://galeriakmx.com (주 도메인, www는 자동 이동) · https://galeriak.netlify.app |
| 호스팅 | **GitHub Pages** (2026-11-08 이전 완료, DNS는 Netlify DNS에 A 185.199.108-111.153 + www CNAME showsong119.github.io) (`.github/workflows/pages.yml`, `site/CNAME`). Netlify 무료 크레딧(배포 1회 15, 월 300) 소진으로 2026-11-08 16시 이후 배포 Skipped. 도메인 등록·DNS는 Netlify에 그대로 둠. 커밋은 모아서 올릴 것 |
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

## 4. 기존 Supabase 스키마 — 절대 새로 만들거나 바꾸지 말 것 (추가 전용 마이그레이션은 `supabase/`에, 사용자가 SQL Editor에서 실행)
이전 세션이 만든 테이블을 그대로 쓴다(스키마 파일은 저장소에 없음).
- `posts(id, gallery_id, author_id, anon_name, title, body, source_url, deal_price[text], deal_store, deal_url, deal_sold, is_pinned, is_sponsored, is_hidden, is_deleted, needs_review, views, up_count, down_count, comment_count, created_at)`
- `profiles(id, nickname, role['admin'|...], age_confirmed_at, banned_until)` — 프로필은 클라이언트가 첫 로그인 때 insert
- `comments(id, post_id, author_id, body, is_hidden, is_deleted, created_at, anon_name)`
- `votes(post_id, voter, value)`, `reports(id, post_id, comment_id, reporter, reason, created_at)`
- `galleries` 표가 있고 **`posts.gallery_id` → galleries 외래키(`posts_gallery_id_fkey`)**가 걸려 있다(2026-11-08 SQL 실행 오류로 확인, 열 구성은 모름). **site의 GALS에 새 갤러리를 추가하면 반드시 galleries에도 등록해야 글쓰기가 된다** → `supabase/2026-11-08-galerias-faltantes.sql`(GALS 목록을 넣어 다시 생성; 기존 행을 복제해 키·이름만 바꿔 삽입, 재실행 안전).
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
- 필요 값: `SUPABASE_SERVICE_ROLE_KEY`(GitHub Secret, **2026-11-09 입력 확인 — moderar 실행에서 Supabase 인증 통과**), `AMAZON_TAG`(secret 또는 deals/config.json, **아직 미가입**)
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
4. 관리자 권한 확인(로그인 시 '관리자' 메뉴). 관리자 닉네임은 2026-11-09 `Administrador`로 변경(`supabase/2026-11-09-apodo-admin.sql`, 이전 showsong117). 권한 없으면 SQL: `update public.profiles set role='admin' where nickname='Administrador';`
5. ~~Netlify Make public~~ (완료 2026-11-08) → AdSense 가입·`ca-pub` 전달 → Claude가 `scripts/set-adsense.py` 실행.
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
- **사용자 요청(2026-11-09): Supabase 작업을 안내할 때는 항상 바로 가기 링크를 함께 준다.** SQL Editor 새 쿼리 https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/sql/new · 테이블 https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/editor · API 키 https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/settings/api-keys · 인증 URL https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/auth/url-configuration · 스토리지 https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/storage/buckets. GitHub SQL 파일은 blob 링크(「Copy raw file」 버튼)도 함께.

## 12. 무료 한국어 시험 페이지 (/examen-coreano/)
- `site/examen-coreano/index.html` 단일 파일. 30문항 CBT(어휘·문법 12 → 읽기 10 → 듣기 8), 30분, 영역마다 페이지 이동(`?p=V|pausa-V|R|pausa-R|L|resultado`), 상태는 localStorage `gk-examen-v1` (저장 불가 시 한 페이지 모드).
- 문제은행: `/* ===== CORE */` 구간의 `BANK`(**180문항** = 영역·급마다 시험 1회분의 6배, 2026-11-08 23시 +90 `v1x1` 형식 id). 응시 때 `pickExam()`이 `BLUEPRINT`대로 30문항을 뽑고, localStorage `gk-examen-vistas`(문항별 노출 횟수)로 덜 본 문제부터 출제 → 6회까지 중복 없음(테스트도 6회). 문항 추가는 BANK에 넣기만 하면 됨(정답은 항상 o[0], 화면에서 섞임). 테스트: `scripts/examen.test.mjs`.
- 수익화 설정은 파일 상단 `ADS={client, slots{top,infeed,bottom,side,examBottom,pause,result,review,resultBottom}}`. 아마존 링크는 사용자 요청으로 제거(넣지 말 것). `ADS.client`가 비어 있으면 메인 사이트처럼 'Publicidad' 자리 표시 상자가 보이고, 넣으면 실제 광고로 바뀜(`client`만 있고 slot이 빈 자리는 숨김). `?demo=ads`는 자리 이름까지 표시.
- AdSense 정책: 광고를 보기·버튼 바로 옆에 두지 않음, 라벨은 'Publicidad', 무관한 고단가 키워드 문단 금지. 전면광고는 Auto ads '비녜트'(페이지 이동 시)로.
- 메뉴 `nav()`에 '/examen-coreano/' 항목, 푸터 링크 있음.

## 13. 법적 페이지·검색 (AdSense 심사 대비)
- 정적 페이지 `site/privacidad/`(Política de Privacidad, AdSense 쿠키 고지 포함), `site/terminos/`(Términos y Condiciones). SPA의 `#privacidad`는 /privacidad/로 이동. 메인·시험 페이지 푸터에 링크.
- 연락처 이메일: galeriakmx@gmail.com (사이트 공개용, 두 법적 페이지에 기재).
- `site/robots.txt`, `site/sitemap.xml` (새 정적 페이지 생기면 sitemap에 추가).
- 시험 페이지에 TOPIK 구조·배점·등급 표, 영역별 팁, 스페인어권 학습자 흔한 실수 섹션(`#guia-topik`). 수치 출처: NIIED 시행계획(UAB TOPIK 페이지·seoulstart 2026 확인).

## 14. 가이드 글 (/guias/)
- 원본: `content/guias/<slug>.html` (첫 줄 `<!-- {"title","short","desc","cat","order"} -->` + 본문 HTML). 생성: `python3 scripts/gen-guias.py` → `site/guias/<slug>/index.html`, `site/guias/index.html`, `site/index.html`의 `STATIC_GUIDES`(마커 사이), `site/sitemap.xml` 갱신. **생성 결과도 커밋**(Netlify 빌드 없음).
- 2026-11-08: 10편 (K-Beauty 6: 루틴·더블클렌징·선크림·성분·라벨 읽기·피부타입 / 코리안·K-pop 4: 한글·팬 표현 20·용어집·TOPIK I 12주 계획). 메인 '가이드' 화면과 홈 카드에 연결.
- 글 규칙: 의학적 단정 금지(피부 질환은 피부과 권유), 가격·매장 정보 지어내지 않기, 아이돌 실명·사진 사용 안 함, 글마다 내부 링크 2개 이상.

## 15. AdSense 코드 넣기 — 완료 2026-11-08: `ca-pub-2340316018998356`, 모든 페이지 head + `site/ads.txt`, 심사 대기
- 사용자가 `ca-pub-…`를 주면: `python3 scripts/set-adsense.py ca-pub-XXXX` → 모든 `site/**/*.html`의 `<head>`에 자동 광고 스크립트 삽입 + 시험 페이지 `ADS.client` 채움 + `site/ads.txt` 생성. 다시 실행해도 중복 없음. 그 뒤 커밋·푸시.
- 2026-11-08 링크 점검: 정적 페이지 16개, 404 없음, 해시 경로 모두 존재.

## 16. 갤러리 고정 공지 (📌 Aviso)
- DB가 아니라 `site/index.html` 코드에 있음: `AVISO_TIPO`·`AVISO_ESP`(갤러리 유형별 주의사항), `avisoHTML(g)`(공통: 글 등급 Destacado ≥BEST(10)♥ / 핫딜 Caliente ≥HOT_DEAL(5)♥·Agotado / Aviso / 신고 검토, 공통 규칙, 제재), 경로 `#aviso-<갤러리id>`. 모든 갤러리 목록 맨 위에 `avisoRow`로 고정 표시.
- 마지막 줄은 사용자 요청대로 한국어 "감사합니다". 새 갤러리 추가 시 K-pop은 자동으로 kpop 유형, 그 외는 AVISO_TIPO에 매핑 추가.

## 17. 쪽지(문의)·회원 등급·공지 권한 (2026-11-08)
- SQL: `supabase/2026-11-08-mensajes-niveles.sql` (추가 전용, 재실행 안전, 로컬 Postgres 16에서 RLS 테스트 통과). **사용자가 Supabase SQL Editor에서 실행해야 활성화.** 실행 전에는 사이트가 자동으로 기능을 숨김/안내(이메일)로 대체.
  - `gk_is_admin()`, posts에 restrictive 정책 2개(is_pinned=true는 관리자만 insert/update).
  - `mensajes(id,hilo,usuario,autor,de_admin,asunto,cuerpo,leido_usuario,leido_admin,created_at)` + RLS(본인/관리자만 읽기, 사용자는 본인 대화만·관리자 사칭 불가, 정지 계정 차단, 하루 20건), `gk_mensajes_leidos(hilo)`.
  - `gk_niveles(uuid[])` → (id, puntos, admin). 점수: 글 +10, 댓글 +3, 받은 ♥ +2, 가입일수 +1(최대 365). 숨김/삭제 제외.
- 사이트: `LEVELS`(Lv1 Nuevo 0 · Lv2 Fan 30 · Lv3 Fan activo 100 · Lv4 Fan dedicado 300 · Lv5 Experto 800 · Lv6 Veterano 2000 · Lv7 Leyenda 5000, 관리자=Admin, 봇=Bot), 닉네임 옆 배지(`.nk[data-uid]` → `decorateLevels()`), `#niveles` 설명 페이지, `#mensajes`·`#mensaje-<id>` 쪽지, 상단 ✉️ 안읽음 배지, 관리자 글쓰기에 '📌 aviso fijo' 체크박스, 관리자 화면에 쪽지 링크.
- 사용자 간 쪽지는 일부러 만들지 않음(13세 이상 커뮤니티 — 미성년자 보호). 문의는 운영팀과만.

## 18. 출석·레벨 v2·매니저 (2026-11-08)
- SQL: `supabase/2026-11-08-asistencia-niveles-managers.sql` (재실행 안전, 로컬 PG16 테스트 통과). **사용자 실행 필요.** `gk_niveles`를 drop 후 재생성(반환에 `asistencias` 추가, 점수: 출석 +5/일(고유 날짜, America/Mexico_City), 글 +10(asistencia 제외), 댓글 +3, ♥ +2, 가입일수 점수 제거). 새 표 `gk_managers(gallery_id,user_id,created_at,created_by)` RLS: 읽기 전체, insert/delete는 `gk_is_admin()`. `gk_es_manager(text)`, `gk_manager_ocultar(p_tipo 'post'|'comment', p_id bigint, p_oculto)` (관리자 또는 해당 갤러리 매니저, 관리자 콘텐츠 불가).
- 사이트: 갤러리 `asistencia`(attend:true, 전용 출석 박스·칩, 하루 1회), `libre`(Foro libre), 분류 `comunidad`. `LEVELS=[[n,pts,name,asis]]` Lv0~7, Lv2 이상은 출석 7일 필요(`LV2_ASIS`). 가입 직후 `sessionStorage.gk_new` → `#g-asistencia`. 매니저: `MGR`(gk_managers 캐시, `mgrReady`), `.nk[data-gal]`로 갤러리별 🛡️ 배지, 갤러리 헤더에 매니저 목록, 글/댓글에 매니저 도구, 관리자 탭 `managers`.

## 19. 게시글 사진 (2026-11-08)
- SQL: `supabase/2026-11-08-fotos.sql` (18번 SQL 다음에 실행, 재실행 안전, 로컬 PG16+모의 storage 테스트 통과). 버킷 `post-images`(public, 2MB, webp/jpeg/png), `gk_puede_fotos()`(admin 또는 gk_niveles 150점+출석 7일, 정지 아님, 하루 40장), storage.objects 정책: insert(본인 폴더+gk_puede_fotos), select(버킷), delete(본인/관리자).
- 사이트: `FOTO_LV=2`, `canPhoto()`, `photoBox()`(잠김 안내), `shrinkImage()`(canvas → webp ≤1600px, EXIF 제거), 업로드 후 본문 끝에 `[foto:<uid>/<name>.<ext>]` 줄 추가, `bodyHTML(p)`가 작성자 폴더 사진만 <img>로 렌더. 본문에 직접 `[foto:` 입력은 거부.

## 20. 방장(Líder)·경고 (2026-11-08)
- SQL: `supabase/2026-11-08-lideres-advertencias.sql` (18번 다음, 재실행 안전, 로컬 PG16 테스트 통과). `gk_managers.rol`('manager'|'lider', 갤러리당 lider 1명 부분 unique), update 정책(admin), `gk_es_lider(text)`. 새 표 `gk_advertencias(post_id,gallery_id,motivo,por,created_at,estado 'activa'|'levantada'|'eliminada',resuelto_por,resuelto_at)` 읽기 전체·쓰기 RPC만. `gk_advertir(p_post,p_motivo)`(lider/admin, 관리자 글 불가, needs_review=true), `gk_resolver_advertencia(p_post,'eliminar'|'levantar')`(admin; eliminar→is_deleted=true), comments restrictive insert 정책 `gk_cmt_no_advertidos`.
- 사이트: `LID`(갤러리→방장), `isLider`, `liderBadge`(👑), `ADV`(활성 경고 캐시, route마다 60초 캐시), `row()`/글 제목 회색(`.adv`)+`⚠️ En revisión`, 댓글폼 숨김, `lidPostPanel`/`advAdminPanel`, 관리자 탭 `avisos`, 매니저 탭에 역할 선택.

## 21. 개선 4종 (2026-11-08 17시)
- **2026-11-08 21:46 실제 DB에 실행 완료(verificar 12/12 ✅)** — 17~21번 SQL 기능 모두 활성. `supabase/2026-11-08-TODO-en-orden.sql`(갤러리 등록 + 18·19·20번 SQL + 첫 글 26개를 이어 붙인 것, 재생성: 원본 수정 후 같은 순서로 cat), `supabase/verificar.sql`(읽기 전용 ✅/❌), 관리자 탭 `salud`.
- 정적 페이지: `scripts/build-static.mjs`(GALS·CATS·키를 site/index.html에서 읽음, posts 최근 1500·comments·활성 경고 제외, 얇은 글 noindex+sitemap 제외, sitemap의 기존 항목 유지), 테스트 `scripts/build-static.test.mjs`. `pages.yml`이 배포 전에 실행 + 3시간 cron. `site/g/`, `site/p/`는 .gitignore. `site/404.html`이 /p/·/g/를 해시 경로로 넘김.
- K-Pop: `vKpop()`(kTag·kTab·kPage, `.chips2`), 갤러리 `kpop-general`. 첫 글 SQL `2026-11-08-primeras-publicaciones.sql`(관리자 작성, 제목 중복 시 건너뜀).
- 법·안전: 약관 `#derechos`·`#moderacion`, 개인정보 신법(2025-03-20) 반영. `REP_MOTIVOS`/`repPicker`(reports.reason), honeypot `#aweb`, `TURNSTILE_SITEKEY`(비면 꺼짐; 켤 때 사이트 먼저 → Supabase CAPTCHA 나중).
- Supabase SQL Editor 사용 시 **브라우저 자동 번역을 끄게** 안내할 것(번역된 SQL이 붙여넣어져 42601 오류, 대시보드도 removeChild 오류로 멈춤). 복사는 GitHub blob 페이지의 「Copy raw file」 버튼이 안전.
- Actions 수동 실행: `gh workflow run`은 GraphQL이라 막힘 → `gh api -X POST repos/showsong119/galeriak/actions/workflows/pages.yml/dispatches -f ref=main`.

## 22. 가이드 확장·일러스트·시험 강조 (2026-11-08 23시)
- 가이드 16편(새 6편: skincare-clima-calido, glass-skin, apoyar-kpop-oficial, particulas-coreanas, numeros-coreanos, formal-informal-coreano).
- 일러스트: `scripts/gen-illustrations.py`(슬러그별 모티프, 사진·아이돌 이미지 미사용) → `site/img/guias/<slug>.svg`, `site/img/examen.svg`. 공유 이미지: `PLAYWRIGHT=/opt/npm-tools/node_modules/playwright CHROME=/usr/bin/google-chrome node scripts/render-og.cjs` → `site/img/og/*.jpg`. 새 가이드 추가 시 ART에 항목 추가 → 두 스크립트 → `gen-guias.py` → **`set-adsense.py ca-pub-2340316018998356` 다시 실행(gen-guias가 AdSense 태그를 지움)**.
- gen-guias: 표지(figure.hero), 목록 썸네일, og:image, 시험 배너(EXAM_BANNER), 헤더 시험 버튼. STATIC_GUIDES에 `i`(썸네일).
- 사이트: 메뉴 맨 끝(2026-11-09 사용자 요청) `📝 Examen de coreano GRATIS`(.nav-exam 파란 배경·흰 글씨·노란 배지), 홈은 오늘의 베스트 다음(2번째) `.exambar`, 가이드 카드 썸네일(.guide img, .gmini).

## 23. AdSense 대비 (2026-11-09)
- `/acerca/`, `/contacto/`는 `gen-guias.py`의 PAGES에서 생성(사이트맵 포함). 빈 광고 상자 제거: SPA `ad()`는 `?demo=ads`일 때만 상자 표시, 가이드엔 상자 없음(자동 광고 사용). `site/index.html`의 `<main id="main">`에 기본 소개 HTML(라우터가 덮어씀).

## 24. 방문자 통계·조회수 (2026-11-09)
- SQL: `supabase/2026-11-09-visitas.sql` (추가 전용, 재실행 안전, 로컬 PG16 테스트 통과). **사용자 실행 필요.** 표 `gk_visitas(dia,visitante,vistas,primera)` 직접 접근 불가, `gk_registrar_visita(uuid)`(anon 가능, 하루·방문자당 1행, 조회 최대 500), `gk_estadisticas_visitas()`(관리자만: 오늘/어제/7일/30일/누적 방문자·조회, 최근 30일 `dias`). 날짜는 America/Mexico_City.
- 방문자 ID = 브라우저 localStorage `gk_vid` 무작위 UUID(개인정보 아님, 개인정보처리방침에 고지). SPA는 `countVisit()`(route마다, 4초 간격 제한), 정적 페이지(가이드·acerca·contacto·/g/·/p/·시험·약관·개인정보)는 인라인 스크립트(gen-guias `VISIT_JS`, build-static `VISIT_JS`).
- 관리자 탭 `visitas`(📊 방문자), 점검 탭·verificar.sql 13번. 홈 맨 위 `admVisitBar()`(MYROLE=admin일 때만, 오늘·어제·총 방문자).
- 조회수: 목록 `row()`와 글 화면, 정적 /p/·/g/에 👁 표시(모두에게 보임). `SEL`에 views 포함.

## 25. 관리자 대시보드·회원 관리 (2026-11-09)
- SQL: `supabase/2026-11-09-miembros.sql` (추가 전용, 재실행 안전, 로컬 PG16 테스트 통과). **사용자 실행 필요.** 표 `gk_sanciones(usuario,tipo 'nota'|'precaucion'|'advertencia'|'suspension',motivo,dias,por,created_at,activa,retirada_*)` RLS: 관리자 전체, 회원은 본인 것(메모 제외)만 읽기, 쓰기는 RPC만. `gk_sancionar(p_usuario,p_tipo,p_motivo,p_dias,p_avisar)`(관리자만, 관리자 계정 불가, 정지는 profiles.banned_until 갱신(36500일=영구), p_avisar면 `mensajes`에 스페인어 쪽지), `gk_retirar_sancion(p_id)`(정지 취소 시 banned_until=null), `gk_admin_miembros()`(가입일=auth.users.created_at, 최근 접속, 글·댓글·♥·출석·점수, 받은 신고, 방장 경고 글, 주의·경고·정지·메모 수), `gk_admin_resumen()`(검토 대기·7일 신고·방장 경고·안 읽은 문의·회원·오늘/7일 가입·정지·주의경고 회원).
- 사이트: 홈 맨 위 `admDash()`(관리자만: 방문자 4칸·할 일 4칸·회원 5칸, 각 칸 클릭 시 해당 화면), 메뉴 `🛠️ 관리자`·`👥 회원`, 경로 `#miembros` `vMiembros()`: 필터 칩(전체·신규7일·주의·경고·정지중·신고받음·메모·30일 미접속), 정렬(가입일 최신/오래된·주의 필요순(mRisk)·점수·글·최근 접속·닉네임), 가입일 정렬 시 기간별 묶음(오늘/어제/7일/30일/1~3개월/이전), 50명씩 더 보기, CSV, 줄 클릭 → 기록·최근 글·조치(메모/주의/경고/정지 1·3·7·30일·영구, 스페인어 사유 칩, 쪽지 알림)·정지 해제. 관리자 탭 '👥 회원 관리'는 `#miembros`로 이동(SQL 없으면 옛 admin_users 목록). 점검 탭·verificar 14번.

## 26. AI 자동 검수 (2026-11-09)
- SQL: `supabase/2026-11-09-moderacion-ia.sql` (추가 전용, 재실행 안전, 로컬 PG16 테스트 통과). **사용자 실행 필요.** 표 `gk_moderacion(tipo 'post'|'comment', item_id, post_id, autor, nivel 'ok'|'revisar'|'ocultar', motivos text[], puntajes jsonb(≥0.1만), extracto(≤200자, ok는 null), estado 'pendiente'|'auto'|'restaurado'|'confirmado'|'eliminado', resuelto_*, unique(tipo,item_id))` RLS: 관리자만 select/update, insert는 service role(봇)만. 트리거 `gk_moderacion_avisar`: nivel='ocultar'면 작성자에게 `mensajes` 스페인어 쪽지(autor=첫 admin, 실패해도 무시).
- 봇: `scripts/moderar.mjs` + `.github/workflows/moderar.yml`(cron `*/10`, workflow_dispatch). Secrets `SUPABASE_SERVICE_ROLE_KEY`·`OPENAI_API_KEY`(없으면 ::warning 후 exit 0). 최근 `LOOKBACK_H`(48)시간, 실행당 `MAX_ITEMS`(150). 제외: 봇(anon_name 'Bot de ofertas'), 관리자 글. 사진은 `[foto:<author_id>/…]`만 public URL로 전송(사진 오류 400 → 텍스트만 재시도 후 'fotos-sin-revisar'로 revisar). `decidir()`: OCULTAR(sexual/minors·sexual·violence/graphic·self-harm/instructions·illicit/violent·hate/threatening·harassment/threatening, sexual/minors 점수 ≥0.2) → posts is_hidden+needs_review / comments is_hidden; REVISAR(harassment·hate·violence·self-harm·self-harm/intent·illicit 또는 flagged) → posts needs_review. 테스트 `scripts/moderar.test.mjs`, 로컬 목업 시 `OPENAI_BASE_URL`.
- 사이트: 관리자 탭 `ia`(🤖 AI 검수, `IA_CAT` 한국어 라벨, 필터 `window.iaF` 대기 중/전체, `data-iares="<id>|restaurar|confirmar|eliminar"` → `iaResClick`), 대시보드 `admDash(v,r,ia)` 'AI 검수 대기' 칸, 점검 탭 항목, verificar 15번. 제재(경고·정지)는 자동으로 하지 않음.
- 약관 `#moderacion`·개인정보처리방침 '4. Con quién compartimos datos'에 OpenAI 고지.
- 2026-11-09 17:30: 사용자가 OpenAI 키를 Secret 이름 `OPENAI`로 입력 → 워크플로가 `OPENAI_API_KEY || OPENAI` 둘 다 읽게 수정. 첫 수동 실행: 키 2개 OK, Supabase 접속 OK, `gk_moderacion` 표 없음(PGRST205) → SQL 실행 대기.

## 27. 밈 게시판 (2026-11-09)
- GALS에 `memes`(Comunidad, 😂, #f39c12), `AVISO_TIPO.memes`, `AVISO_ESP.memes`(오리지널 우선·타 플랫폼은 원본 링크+출처만·재업로드 금지·실존 인물 성적/모욕 합성·딥페이크 금지·팬워 금지·AI 검수 고지).
- SQL `supabase/2026-11-09-memes.sql`(galleries 등록 + 운영팀 오리지널 첫 글 6개, 재실행 안전, 로컬 PG16 확인). `galerias-faltantes.sql` 목록에도 memes 추가. **사용자 실행 필요.**
- 사용자 요청이었던 "레딧 등 인기 글 긁어와 게시"는 저작권·레딧 약관·AdSense 문제로 하지 않기로 함 → 다른 플랫폼 글을 복사 게시하지 말 것. 첫 글·주간 [Reto]는 Claude가 직접 쓴 내용으로.
- 사진 업로드는 기존대로 Lv.2(DB 정책 `gk_puede_fotos`).

