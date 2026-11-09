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

