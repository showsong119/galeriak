# 운영실(GaleríaK 운영실) ↔ 저장소 연동 절차 (Claude용)

운영실 아티팩트: https://claude.ai/artifact/Qyi16cNk8L8B1LmgUdZEgo (공유 DB 컬렉션: tasks, content, deals, revenue, kpi, config, secrets)

## 1. 저장소 연결 시 1회
1. `gh api repos/showsong119/galeriak/actions/secrets/public-key` → `{key_id, key}`
2. ArtifactData로 `config/github` 문서에 `{repo:"showsong119/galeriak", key_id, key}` 저장 → 운영실의 비밀 키 입력칸이 열림

## 2. 키 반영 (키 설정 화면에 '반영 대기'가 있을 때)
- 공개 설정: `config/public`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AMAZON_TAG`를 `gh secret set <NAME> --repo showsong119/galeriak`로 등록
- 비밀 키: `secrets/<NAME>` 문서의 `encrypted_value`, `key_id`를 그대로
  `gh api -X PUT repos/showsong119/galeriak/actions/secrets/<NAME> -f encrypted_value=… -f key_id=…`
  (평문은 운영실에도 Claude에게도 없음. GitHub만 복호화 가능)
- 성공하면 해당 문서에 `applied_at: <ms>` 기록, 실패하면 `error: "<사유>"` 기록
- 반영 후 `db` 워크플로(스키마)와 `deploy` 워크플로를 `gh workflow run`으로 실행

## 3. 매일 (예약 작업)
- 핫딜 봇 결과(`deals/last-run.json`)의 게시 항목을 운영실 `deals` 컬렉션에 `{date, title, asin, price, status:"게시됨", url}`로 기록
- `drafts/sns/<날짜>.md` 초안을 만들었다면 운영실 `content`에 `{date, channel, title, status:"초안"}`으로 추가
