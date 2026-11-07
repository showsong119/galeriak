# GaleríaK 설정 체크리스트 (본인이 직접 해야 하는 일)

나머지 작업(코드 작성·배포·DB 적용·매일 핫딜 수집과 게시)은 모두 자동으로 돌아갑니다.
아래 항목은 본인 계정의 로그인이나 신원 정보가 필요해서 Claude가 대신할 수 없어요.

## 1. Amazon 제휴(Afiliados) 가입 — 약 15분
1. https://afiliados.amazon.com.mx 에서 가입합니다. 사이트 주소에는 `https://showsong119.github.io/galeriak/`를 적습니다.
2. 가입이 끝나면 **추적 ID**(예: `galeriak-20`)를 받습니다. → 3단계의 `AMAZON_TAG`
3. 가입 후 180일 안에 판매 3건이 있어야 승인이 유지됩니다. 판매가 생기면 PA-API 키를 발급받을 수 있고,
   그때 키를 넣으면 가격 확인과 할인 상품 찾기가 완전 자동으로 바뀝니다. (`PAAPI_ACCESS_KEY`, `PAAPI_SECRET_KEY`)

## 2. Google 로그인 연결 — 약 10분
1. Google Cloud Console → API 및 서비스 → OAuth 동의 화면에서 앱 이름을 `GaleríaK`로 정하고 '외부'를 선택합니다.
2. 사용자 인증 정보 → OAuth 클라이언트 ID → '웹 애플리케이션'을 만듭니다.
   - 승인된 리디렉션 URI: `https://<Supabase 프로젝트 ID>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google을 켜고 클라이언트 ID와 비밀번호를 붙여 넣습니다.
4. Supabase → Authentication → URL Configuration
   - Site URL: `https://showsong119.github.io/galeriak/`
   - Redirect URLs: `https://showsong119.github.io/galeriak/**`

## 3. GitHub 저장소 Secrets 입력 — 약 5분
저장소 → Settings → Secrets and variables → Actions → New repository secret

| 이름 | 어디서 찾나요 |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | 같은 화면의 `anon` `public` 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 화면의 `service_role` 키 (절대 외부에 공개 금지) |
| `SUPABASE_DB_URL` | Project Settings → Database → Connection string → URI (비밀번호 포함, Session pooler 권장) |
| `ADMIN_EMAIL` | 관리자로 쓸 본인 Google 계정 이메일 |
| `AMAZON_TAG` | 1단계에서 받은 추적 ID |

## 4. GitHub Pages 켜기 — 1분
저장소 → Settings → Pages → Source에서 **GitHub Actions**를 선택합니다.

## 5. 마지막 검수
- 사이트에 Google로 로그인하면 상단에 **Revisión** 버튼이 생깁니다(관리자 계정만).
- 그 화면에서 매일 봇이 올린 핫딜과 신고된 글을 확인하고, 문제가 있으면 **Ocultar**(숨기기) 또는 **Borrar**(삭제)를 누르면 됩니다.

> 참고: 예전에 Supabase에 만들어 둔 테이블 중 이름이 `posts`, `comments`, `profiles`, `votes`, `reports`, `admins`와 겹치는 것이 있다면,
> 컬럼 구성이 달라 DB 적용이 실패할 수 있어요. 그런 경우 Claude에게 알려 주세요.
