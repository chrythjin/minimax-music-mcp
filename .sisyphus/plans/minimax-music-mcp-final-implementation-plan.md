# MiniMax Music MCP 최종 실행 계획서

**작성일:** 2026-05-04  
**상태:** 구현 전 최종 계획  
**위치:** `.sisyphus/plans/minimax-music-mcp-final-implementation-plan.md`  
**기준 문서:**

- `docs/reference/minimax-music-mcp-review.md`
- `docs/reference/minimax-music-mcp-plan.md`
- `docs/reference/minimax-music-mcp-official-plan.md`
- `docs/reference/minimax-music-mcp-execution-plan.md`

---

## 1. 결론

최종 구현 기준은 `docs/reference/minimax-music-mcp-official-plan.md`와 `docs/reference/minimax-music-mcp-execution-plan.md`로 둔다.

초기 문서인 `docs/reference/minimax-music-mcp-review.md`, `docs/reference/minimax-music-mcp-plan.md`는 MCP 서버 방식 선택이라는 큰 방향은 맞지만, 다음 항목은 오래되었거나 불완전하다.

| 항목 | 최종 판단 |
|------|----------|
| 구현 방식 | Node.js + TypeScript stdio MCP 서버 |
| API | MiniMax 공식 직접 API `POST https://api.minimax.io/v1/music_generation` |
| 1차 도구 범위 | `generate_music`, `generate_instrumental`, `generate_cover` |
| 후순위 | `preprocess_cover`, 스트리밍 완전 처리, URL 자동 다운로드 |
| API 키 | `MINIMAX_API_KEY` 환경변수. `opencode.json`에 실제 키 저장 금지 |
| 출력 기본값 | `output_format: hex` 후 로컬 파일 저장 |
| 소스 위치 | 현재 repo `C:\NEW PRG\minimax-music-mcp` |
| OpenCode 등록 대상 | 빌드 산출물 `dist/index.js` |

---

## 2. 문서별 역할

| 문서 | 최종 사용 방식 |
|------|----------------|
| `docs/reference/minimax-music-mcp-review.md` | MCP 서버가 필요한 이유를 설명하는 배경 자료 |
| `docs/reference/minimax-music-mcp-plan.md` | 초기 초안. 경로, 스트리밍, 도구 범위 일부는 폐기 |
| `docs/reference/minimax-music-mcp-official-plan.md` | 공식 API 기반 입력/응답/검증 규칙의 권위 문서 |
| `docs/reference/minimax-music-mcp-execution-plan.md` | Wave 기반 작업 순서의 기준 문서 |

폐기할 오래된 가정:

| 오래된 가정 | 폐기 이유 |
|-------------|-----------|
| 소스를 `C:\Users\...\.config\opencode\mcp-servers\...`에 둔다 | 현재 repo가 이미 프로젝트 루트로 정리됨 |
| 소스를 `C:\NEW PRG\Open Sync\mcp-servers\minimax-music\`에 둔다 | 이번 작업은 `C:\NEW PRG\minimax-music-mcp` 기준으로 진행 |
| `generate_music`, `generate_instrumental`만 1차 구현 | 공식 계획에서 `generate_cover`까지 1차 범위로 확정 |
| `stream: true` 완전 지원을 바로 구현 | 공식 문서에 청크 포맷이 부족하므로 2차로 보류 |
| `duration` 입력을 MCP 도구 인자로 둔다 | 공식 API 직접 필드로 확인되지 않음. `extra_info.music_duration`은 응답 메타데이터로만 처리 |
| `node-fetch` 필수 | Node 20 기준 내장 `fetch` 사용 가능 |
| `uuid` 파일명 필수 | 최종 파일명은 `YYYYMMDD_HHMMSS_<tool>.<format>`로 통일 |

---

## 3. 최종 폴더 구조

현재 repo를 구현 소스 오브 트루스로 사용한다.

```text
minimax-music-mcp/
├── .sisyphus/
│   └── plans/
│       └── minimax-music-mcp-final-implementation-plan.md
├── docs/
│   ├── reference/                              ← 레퍼런스 문서
│   │   ├── minimax-music-mcp-review.md
│   │   ├── minimax-music-mcp-plan.md
│   │   ├── minimax-music-mcp-official-plan.md
│   │   └── minimax-music-mcp-execution-plan.md
│   └── sessions/                               ← 세션 기록
├── src/
│   ├── index.ts
│   ├── minimax-client.ts
│   ├── schemas.ts
│   ├── tools.ts
│   ├── audio-output.ts
│   └── errors.ts
├── test/
│   ├── validation.test.ts
│   ├── audio-output.test.ts
│   └── minimax-client.test.ts
├── AGENTS.md
├── README.md
├── package.json
└── tsconfig.json
```

---

## 4. 구현 범위

### 4.1 포함

| 기능 | 설명 |
|------|------|
| `generate_music` | `music-2.6` / `music-2.6-free` 텍스트 기반 보컬 음악 생성 |
| `generate_instrumental` | 내부적으로 `is_instrumental: true`를 설정하는 instrumental 생성 |
| `generate_cover` | `music-cover` / `music-cover-free` 참조 오디오 기반 커버 생성 |
| 입력 검증 | 모델별 `prompt`, `lyrics`, 참조 오디오 조건 분리 |
| 오류 매핑 | MiniMax `base_resp.status_code`를 사용자 친화적 MCP 오류로 변환 |
| hex 저장 | `data.audio` hex를 `Buffer`로 변환해 `%TEMP%\minimax-music\`에 저장 |
| OpenCode 등록안 | 최종 빌드 후 `dist/index.js`를 등록하는 JSON 블록 제공 |

### 4.2 제외 또는 후순위

| 기능 | 이유 |
|------|------|
| `preprocess_cover` 도구 | Music Cover Preprocess API 스펙 추가 확인 필요 |
| 스트리밍 완전 처리 | `stream: true` 청크 포맷이 공식 문서에 충분히 드러나지 않음 |
| URL 자동 다운로드 | `output_format: url` 응답 필드 샘플 확인 필요 |
| AIML 게이트웨이 호환 | 목표는 MiniMax 공식 직접 API |
| 실제 API smoke test 자동 실행 | `MINIMAX_API_KEY`와 비용/쿼터 확인 후 사용자 승인 필요 |

---

## 5. 공식 API 기준

### 5.1 요청

```text
POST https://api.minimax.io/v1/music_generation
Content-Type: application/json
Authorization: Bearer <MINIMAX_API_KEY>
```

### 5.2 모델

| 모델 | 용도 | 기본 사용 |
|------|------|----------|
| `music-2.6-free` | 텍스트 기반 음악 생성 무료 티어 | `generate_music`, `generate_instrumental` 기본값 |
| `music-2.6` | 텍스트 기반 음악 생성 유료/토큰 플랜 | 명시 선택 시 사용 |
| `music-cover-free` | 커버 생성 무료 티어 | `generate_cover` 기본값 |
| `music-cover` | 커버 생성 유료/토큰 플랜 | 명시 선택 시 사용 |

### 5.3 응답 처리

응답 파싱은 다음 순서로 처리한다.

1. HTTP 상태 코드 확인
2. JSON 파싱 실패 시 MCP 오류 반환
3. `base_resp.status_code !== 0`이면 MiniMax 오류 매핑
4. `data.status === 1`이면 진행 중 상태로 안내
5. `data.status === 2`이고 `output_format: hex`이면 `data.audio` 저장
6. `extra_info`, `trace_id`를 결과 메타데이터에 포함

주요 오류 코드:

| 코드 | 의미 | 반환 메시지 방향 |
|------|------|----------------|
| `1002` | Rate limit | 잠시 후 재시도 |
| `1004` | Authentication failed | API key 확인 |
| `1008` | Insufficient balance | 잔액 확인 |
| `1026` | Sensitive material | 프롬프트/가사 수정 |
| `2013` | Invalid parameters | 입력값 확인 |
| `2049` | Invalid API key | API key 유효성 확인 |

---

## 6. 도구별 입력 검증

### 6.1 `generate_music`

입력:

```ts
type GenerateMusicInput = {
  model?: "music-2.6" | "music-2.6-free";
  prompt?: string;
  lyrics?: string;
  lyrics_optimizer?: boolean;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
};
```

검증:

| 조건 | 처리 |
|------|------|
| `model` 없음 | `music-2.6-free` 기본값 |
| `lyrics_optimizer !== true` | `lyrics` 필수, 1-3500자 |
| `lyrics_optimizer === true` + `lyrics` 비어 있음 | `prompt` 필요 |
| `prompt` 있음 | 최대 2000자 |
| `stream === true` + `output_format === "url"` | 검증 오류 또는 `hex` 강제. 1차는 검증 오류 권장 |

### 6.2 `generate_instrumental`

입력:

```ts
type GenerateInstrumentalInput = {
  model?: "music-2.6" | "music-2.6-free";
  prompt: string;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
};
```

검증:

| 조건 | 처리 |
|------|------|
| `model` 없음 | `music-2.6-free` 기본값 |
| `prompt` | 필수, 1-2000자 |
| API 요청 | `is_instrumental: true` 설정 |
| `lyrics` | 입력으로 받지 않음 |

### 6.3 `generate_cover`

입력:

```ts
type GenerateCoverInput = {
  model?: "music-cover" | "music-cover-free";
  prompt: string;
  lyrics?: string;
  audio_url?: string;
  audio_base64?: string;
  cover_feature_id?: string;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: AudioSetting;
};
```

검증:

| 조건 | 처리 |
|------|------|
| `model` 없음 | `music-cover-free` 기본값 |
| `prompt` | 필수, 10-300자 |
| `audio_url`, `audio_base64`, `cover_feature_id` | 정확히 하나만 허용 |
| `cover_feature_id` 있음 | `lyrics` 필수, 10-1000자 |
| `audio_url` 또는 `audio_base64` 있음 | `lyrics` 선택. 제공 시 10-1000자 |
| `stream === true` + `output_format === "url"` | 검증 오류 |

---

## 7. 출력 파일 정책

hex 응답은 다음 위치에 저장한다.

```text
%TEMP%\minimax-music\YYYYMMDD_HHMMSS_<tool>.<format>
```

`format`은 `audio_setting.format` 기준으로 정한다.

허용값:

| 필드 | 값 |
|------|----|
| `sample_rate` | `16000`, `24000`, `32000`, `44100` |
| `bitrate` | `32000`, `64000`, `128000`, `256000` |
| `format` | `mp3`, `wav`, `pcm` |

MCP 반환 예시:

```json
{
  "status": "completed",
  "file_path": "C:\\Users\\...\\AppData\\Local\\Temp\\minimax-music\\20260504_150000_generate_music.mp3",
  "format": "mp3",
  "duration_ms": 25364,
  "sample_rate": 44100,
  "bitrate": 256000,
  "size_bytes": 813651,
  "trace_id": "..."
}
```

---

## 8. 작업 순서

### Wave 1: 스펙 고정 및 기반 모듈

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 오류 코드 매핑 | `src/errors.ts` | 알려진 MiniMax 코드별 메시지 테스트 가능 |
| 입력 스키마 | `src/schemas.ts` | 세 도구 입력 검증 함수 작성 |
| 파일 저장 유틸 | `src/audio-output.ts` | hex fixture를 파일로 저장 가능 |

### Wave 2: 프로젝트 빌드 골격

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| package 정리 | `package.json` | 필요한 의존성과 스크립트만 유지 |
| TypeScript 설정 | `tsconfig.json` | `npm run build` 구조 준비 |
| MCP entrypoint | `src/index.ts` | stdio 서버 시작 구조 작성 |

### Wave 3: MiniMax 클라이언트

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| API key 검사 | `src/minimax-client.ts` | `MINIMAX_API_KEY` 누락 시 명확한 오류 |
| POST 요청 | `src/minimax-client.ts` | 내장 `fetch`로 공식 endpoint 호출 |
| 응답 파싱 | `src/minimax-client.ts` | `base_resp`, `data.status`, `extra_info` 처리 |

### Wave 4: MCP 도구 구현

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| `generate_music` | `src/tools.ts` | 보컬/lyrics optimizer 검증 통과 |
| `generate_instrumental` | `src/tools.ts` | `is_instrumental: true` 요청 구성 |
| `generate_cover` | `src/tools.ts` | 참조 오디오 상호 배타 검증 통과 |
| 도구 등록 | `src/index.ts`, `src/tools.ts` | MCP ListTools에 3개 도구 노출 |

### Wave 5: 테스트 및 등록 준비

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 검증 테스트 | `test/validation.test.ts` | 모델별 입력 조건 테스트 |
| 파일 테스트 | `test/audio-output.test.ts` | 0바이트 초과 파일 생성 확인 |
| 클라이언트 테스트 | `test/minimax-client.test.ts` | mock fetch로 응답/오류 처리 검증 |
| 빌드 | `dist/index.js` | `npm run build` 통과 |
| OpenCode 등록안 | 문서 또는 설정 변경안 | 실제 키 없이 등록 블록만 준비 |

### Wave 6: 실제 API smoke test

이 단계는 사용자 승인 후 진행한다.

조건:

| 조건 | 이유 |
|------|------|
| `MINIMAX_API_KEY`가 현재 shell 또는 wrapper에 설정됨 | 실제 API 호출 필요 |
| 무료 모델 우선 사용 | 비용/쿼터 리스크 최소화 |
| 짧은 prompt 사용 | 실패/쿼터 비용 최소화 |

성공 기준:

| 기준 | 확인 방법 |
|------|----------|
| API 성공 | `base_resp.status_code === 0` |
| 생성 완료 | `data.status === 2` |
| 오디오 데이터 | `data.audio` non-empty |
| 파일 생성 | `%TEMP%\minimax-music\*.mp3` 존재 |
| 파일 유효성 | 파일 크기 0 byte 초과 |

---

## 9. OpenCode 등록안

빌드 후 다음 형태로 등록한다.

```json
"mcp": {
  "minimax-music": {
    "type": "local",
    "command": ["node", "C:\\NEW PRG\\minimax-music-mcp\\dist\\index.js"],
    "enabled": true,
    "timeout": 300000
  }
}
```

API 키 처리 원칙:

| 방식 | 판단 |
|------|------|
| 사용자 shell 환경변수 | 1차 권장 |
| PowerShell wrapper | OpenCode 실행 환경에 env 전달이 안 되면 사용 |
| `opencode.json`에 직접 키 저장 | 금지 |

---

## 10. 검증 체크리스트

구현 완료 선언 전 반드시 확인한다.

| 체크 | 명령 또는 확인 |
|------|---------------|
| 타입스크립트 빌드 | `npm run build` |
| 단위 테스트 | `npm run test` |
| 출력 파일 저장 | hex fixture 기반 테스트 |
| MCP 도구 노출 | MCP inspector 또는 OpenCode MCP list/call 확인 |
| 실제 API 호출 | 사용자 승인 후 무료 모델 smoke test |
| 세션 기록 | `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md` 작성 |

---

## 11. 남은 확인 사항

| 항목 | 처리 |
|------|------|
| `stream: true` 청크 포맷 | 실제 응답 샘플 확보 후 2차 구현 |
| `output_format: url` 응답 필드 | 실제 응답 샘플 확보 후 처리 방식 확정 |
| `preprocess_cover` API | 공식 스펙 추가 확인 후 별도 도구 여부 결정 |
| OpenCode `mcp.env` 지원 | 직접 검증 전까지 실제 키 저장 금지 |

---

## 12. 다음 액션

사용자가 구현을 승인하면 Wave 1부터 시작한다.

첫 구현 단위:

1. `src/errors.ts`
2. `src/schemas.ts`
3. `src/audio-output.ts`
4. 해당 단위 테스트

이후 빌드와 테스트가 통과할 때만 다음 Wave로 진행한다.
