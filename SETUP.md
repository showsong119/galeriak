# GaleríaK 설정 체크리스트 (본인이 직접 해야 하는 일)

사이트: https://galeriak.netlify.app (Netlify) · DB·로그인: Supabase (`pimuwxsazuzmgwhbrzbx`)
키 입력은 모두 **GaleríaK 운영실 › 더보기 › 키 설정**에서 합니다.

## 완료
- [x] Google 로그인 연결 (Google Cloud OAuth + Supabase Provider)
- [x] Supabase Site URL / Redirect URL (galeriak.netlify.app)

## 1. GitHub 저장소 — 완료
https://github.com/showsong119/galeriak

## 2. Netlify를 GitHub와 연결 — 2분
app.netlify.com → galeriak → **Project configuration › Build & deploy › Continuous deployment › Link repository**
→ GitHub → `showsong119/galeriak` → Branch `main` → 배포 (설정은 저장소의 netlify.toml이 자동으로 채움)

## 3. Amazon 제휴 가입 — 15분
https://afiliados.amazon.com.mx 에서 가입 (사이트 주소: `https://galeriak.netlify.app`)
→ 추적 ID(예: `galeriak-20`)를 운영실 키 설정의 `AMAZON_TAG`에 입력 → Claude가 `deals/config.json`에 반영

## 4. Supabase Secret key — 2분 (GitHub에 직접 입력)
1. Supabase › Project Settings › API Keys › **Secret keys**에서 키(`sb_secret_…`) 복사
2. https://github.com/showsong119/galeriak/settings/secrets/actions/new 열기
3. Name: `SUPABASE_SERVICE_ROLE_KEY`, Secret: 복사한 키 → **Add secret**
(이 키는 채팅이나 운영실에 넣지 마세요. GitHub에만 넣습니다.)

## 5. 정식 오픈
준비가 끝나면 Netlify 화면 아래쪽의 **Make public**을 누릅니다.

## 관리자 권한 확인
사이트에 로그인했을 때 메뉴에 **관리자**가 보이면 됩니다. 안 보이면 Supabase › SQL Editor에서:
```sql
update public.profiles set role = 'admin' where nickname = 'showsong117';
```

## 6. AI 자동 검수 켜기 (무료) — 10분
1. Supabase → SQL Editor → `supabase/2026-11-09-moderacion-ia.sql` 붙여넣기 → Run (브라우저 자동 번역 끄기)
2. https://platform.openai.com/api-keys → **Create new secret key** → 복사 (Moderation은 무료)
3. https://github.com/showsong119/galeriak/settings/secrets/actions/new → Name `OPENAI_API_KEY`, Secret에 붙여넣기 → Add secret (4번 `SUPABASE_SERVICE_ROLE_KEY`도 있어야 작동)
4. 사이트 관리자 › 🩺 점검에서 'AI 자동 검수' ✅ → 10분 안에 관리자 › 🤖 AI 검수 탭에 결과가 쌓이기 시작

## 7. (선택) 구글 자동 사이트맵 제출·색인 상태 점검 — 15분
구글은 「색인 생성 요청」 자동화를 허용하지 않아요. 대신 아래를 하면 새 글이 생길 때 사이트맵을 자동으로 다시 제출하고, 매주 어떤 페이지가 구글에 등록됐는지 자동으로 확인해요.
1. https://console.cloud.google.com/ → 상단 프로젝트 `GaleriaK` 선택
2. https://console.cloud.google.com/apis/library/searchconsole.googleapis.com → **사용(Enable)**
3. https://console.cloud.google.com/iam-admin/serviceaccounts → **서비스 계정 만들기** → 이름 `galeriak-seo` → 완료
4. 만든 계정 클릭 → **키** 탭 → **키 추가 → 새 키 만들기 → JSON** → 파일이 내려받아짐
5. 서치 콘솔 https://search.google.com/search-console/users?resource_id=https://galeriakmx.com/ → **사용자 추가** → 3번 계정의 이메일(…@…iam.gserviceaccount.com) → 권한 **소유자**
6. https://github.com/showsong119/galeriak/settings/secrets/actions/new → Name `GSC_SERVICE_ACCOUNT`, Secret에 4번 JSON 파일 내용 전체 붙여넣기

## 8. 밀린 SQL 한 번에 실행 — 2분
1. https://github.com/showsong119/galeriak/blob/main/supabase/2026-11-09-TODO-en-orden.sql → 「Copy raw file」
2. https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/sql/new → 붙여넣기 → Run (자동 번역 끄기)
3. 확인: https://github.com/showsong119/galeriak/blob/main/supabase/verificar.sql 복사 → 새 쿼리 → Run → 15개 모두 ✅

## 9. 주간 암호화 백업 켜기 — 2분
1. 길고 기억할 수 있는 비밀번호를 하나 정해서 **종이나 비밀번호 관리 앱에 따로 적어 두기**(잃어버리면 백업을 못 엶)
2. https://github.com/showsong119/galeriak/settings/secrets/actions/new → Name `BACKUP_PASSWORD`, Secret에 그 비밀번호
3. 매주 일요일 자동 백업. 필요할 때 Claude에게 "백업 복원/열어줘"라고 하면 됨

## 10. 가입 스팸 방지(캡차) 켜기 — 10분 (선택, 방문자가 늘기 전에 권장)
1. https://dash.cloudflare.com/ → 무료 가입 → Turnstile → Add widget → 도메인 `galeriakmx.com`
2. 나오는 **Site Key**(공개값)를 Claude에게 전달 → 사이트에 넣음
3. **Secret Key**는 Supabase https://supabase.com/dashboard/project/pimuwxsazuzmgwhbrzbx/auth/protection 의 CAPTCHA(Turnstile)에 붙여넣기 — 2번 반영 후에 켜기

