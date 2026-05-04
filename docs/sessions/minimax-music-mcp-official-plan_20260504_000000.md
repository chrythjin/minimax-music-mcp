# minimax-music-mcp-official-plan - 2026-05-04 00:00

## 사용자 요청

`docs\minimax-music-mcp-review.md`와 `docs\minimax-music-mcp-plan.md`가 MiniMax 공식 Music Generation API 문서를 제대로 보고 작성된 것인지 확인하고, 정확한 계획서를 새로 저장.

## 변경 내용

- MiniMax 공식 문서 `https://platform.minimax.io/docs/api-reference/music-generation` 기준으로 기존 보고서/계획서의 정확성을 재검토.
- 기존 문서의 큰 방향은 맞지만, 모델별 `prompt`/`lyrics` 조건, cover 모델 입력, `base_resp` 오류 처리, `data.status`, `audio_setting`, 스트리밍 제약이 부족하다고 판단.
- 공식 문서 기반 새 계획서 `docs/minimax-music-mcp-official-plan.md` 추가.
- `docs/README.md`에 MCP Servers 섹션과 새 계획서 링크 추가.

## 이전 값 (Before)

- MiniMax MCP 관련 문서는 다음 두 개만 존재:
  - `docs/minimax-music-mcp-review.md`
  - `docs/minimax-music-mcp-plan.md`
- `docs/README.md`에는 MiniMax MCP 계획서 링크가 없음.
- 기존 계획서는 다음 세부사항이 부족:
  - `music-2.6` 보컬/악기 모드별 입력 조건
  - `lyrics_optimizer` 동작
  - `music-cover` / `music-cover-free` 입력 조건
  - `audio_url`, `audio_base64`, `cover_feature_id` 상호 배타 규칙
  - `base_resp.status_code` 오류 매핑
  - `data.status` 처리
  - `stream: true`일 때 `output_format: hex` 제약

## 이후 값 (After)

- `docs/minimax-music-mcp-official-plan.md` 추가.
- 새 계획서는 MiniMax 공식 직접 API `POST https://api.minimax.io/v1/music_generation` 기준.
- AIML 게이트웨이 방식은 제외하고 참고 대상으로만 분류.
- MCP 도구 설계:
  - `generate_music`
  - `generate_instrumental`
  - `generate_cover`
  - `preprocess_cover`는 후순위/선택 사항
- 공식 스펙 기반 검증 규칙, 응답 처리, 오류 코드 매핑, 테스트 계획, 보류 사항을 포함.
- `docs/README.md`에 새 계획서 링크 추가.
