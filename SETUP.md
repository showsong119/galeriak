# GaleríaK 설정 체크리스트 (본인이 직접 해야 하는 일)

사이트: https://galeriak.netlify.app (Netlify) · DB·로그인: Supabase (`pimuwxsazuzmgwhbrzbx`)
키 입력은 모두 **GaleríaK 운영실 › 더보기 › 키 설정**에서 합니다.

## 완료
- [x] Google 로그인 연결 (Google Cloud OAuth + Supabase Provider)
- [x] Supabase Site URL / Redirect URL (galeriak.netlify.app)

## 1. GitHub 저장소 만들기 — 1분
https://github.com/new → 이름 `galeriak`, **Public**, README 체크 안 함 → Create repository

## 2. Netlify를 GitHub와 연결 — 2분 (Claude가 코드를 올린 뒤)
app.netlify.com → galeriak → **Project configuration › Build & deploy › Continuous deployment › Link repository**
→ GitHub → `showsong119/galeriak` → Branch `main` → 배포 (설정은 저장소의 netlify.toml이 자동으로 채움)
이후로는 Claude가 GitHub에 올리는 대로 사이트가 자동 갱신됩니다.

## 3. Amazon 제휴 가입 — 15분
https://afiliados.amazon.com.mx 에서 가입 (사이트 주소: `https://galeriak.netlify.app`)
→ 추적 ID(예: `galeriak-20`)를 운영실 키 설정의 `AMAZON_TAG`에 입력

## 4. Supabase Secret key — 2분 (저장소 연결 후)
Supabase › Project Settings › API Keys › **Secret keys** (`sb_secret_…`) 복사
→ 운영실 키 설정의 `SUPABASE_SERVICE_ROLE_KEY`에 붙여넣기 (브라우저에서 GitHub 공개키로 암호화되어 저장)

## 5. 정식 오픈
준비가 끝나면 Netlify 화면 아래쪽의 **Make public**을 누릅니다.

## 관리자 권한 확인
사이트에 로그인했을 때 메뉴에 **관리자**가 보이면 됩니다. 안 보이면 Supabase › SQL Editor에서:
```sql
update public.profiles set role = 'admin' where nickname = 'showsong117';
```
