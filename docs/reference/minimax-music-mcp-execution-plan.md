# MiniMax 음악 생성 MCP 서버 실행 계획

**작성일:** 2026-05-04
**기준 문서:**
- `docs/minimax-music-mcp-review.md` (검토 보고서)
- `docs/minimax-music-mcp-plan.md` (초안 계획서)
- `docs/minimax-music-mcp-official-plan.md` (공식 문서 기반 계획서)
**상태:** 실행 계획 — 사용자 승인 후 구현 시작

---

## 1. 목표

OpenCode 환경에서 MiniMax Music Generation API를 MCP 서버로 연동하여 에이전트가 다음 도구를 사용할 수 있게 한다.

| 도구 | 목적 | 모델 |
|------|------|------|
| `generate_music` | 텍스트 기반 보컬 음악 생성 | `music-2.6`, `music-2.6-free` |
| `generate_instrumental` | 보컬 없는 instrumental 음악 생성 | `music-2.6`, `music-2.6-free` |
| `generate_cover` | 참조 오디오 기반 커버 생성 | `music-cover`, `music-cover-free` |

1차 구현 범위는 위 3개 도구로 제한한다. `preprocess_cover`는 공식 문서 확인 후 별도 단계로 둔다.

---

## 2. 기술 결정

### 2.1 구현 방식

| 항목 | 결정 | 이유 |
|------|------|------|
| **언어** | Node.js + TypeScript | OpenCode MCP 등록 패턴과 잘 맞음, hex→바이너리 처리 용이 |
| **MCP 타입** | stdio (`type: "local"`) | 현재 OpenCode 등록 MCP(serena, markitdown)와 동일 패턴 |
| **API 호출** | MiniMax 공식 직접 API | `POST https://api.minimax.io/v1/music_generation` |
| **API 키** | 환경변수 `MINIMAX_API_KEY` | `opencode.json`에 키를 직접 저장하지 않음 |

### 2.2 프로젝트 위치

```text
C:\NEW PRG\Open Sync\mcp-servers\minimax-music\
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # MCP 서버 진입점
│   ├── minimax-client.ts     # MiniMax API 호출
│   ├── schemas.ts            # 입력/출력 스키마
│   ├── tools.ts              # MCP 도구 정의
│   ├── audio-output.ts       # hex→파일 변환
│   └── errors.ts             # 오류 코드 매핑
└── test/
    ├── validation.test.js
    ├── audio-output.test.js
    └── minimax-client.test.js
```

빌드 결과 `dist/index.js`를 OpenCode `opencode.json`에서 가리킨다.

---

## 3. 작업 순서 (Wave 기반)

### Wave 1: 프로젝트 스캐폴딩 (병렬 가능)

| 작업 | 내용 | 산출물 | 의존성 |
|------|------|--------|--------|
| 1-A | 프로젝트 초기화 | `package.json`, `tsconfig.json` | 없음 |
| 1-B | 의존성 설치 | `@modelcontextprotocol/sdk`, `node-fetch` | 1-A |
| 1-C | 입력 스키마 정의 | `src/schemas.ts` | 없음 |
| 1-D | 오류 코드 매핑 | `src/errors.ts` | 없음 |
| 1-E | 출력 파일 정책 정의 | `src/audio-output.ts` | 없음 |

### Wave 2: MCP 서버 골격 (Wave 1 완료 후)

| 작업 | 내용 | 산출물 | 의존성 |
|------|------|--------|--------|
| 2-A | stdio MCP 서버 기본 구조 | `src/index.ts` | 1-A, 1-B |
| 2-B | 도구 등록 스카폴드 | `src/tools.ts` | 2-A |
| 2-C | 단위 테스트 프레임워크 | `test/` 구조 | 1-A |

### Wave 3: MiniMax API 클라이언트 (Wave 2 완료 후)

| 작업 | 내용 | 산출물 | 의존성 |
|------|------|--------|--------|
| 3-A | 인증 헤더 구성 | `src/minimax-client.ts` | 1-C, 1-D |
| 3-B | POST 요청 구현 | `src/minimax-client.ts` | 3-A |
| 3-C | 응답 파싱 | `src/minimax-client.ts` | 3-B |
| 3-D | mock fetch 테스트 | `test/minimax-client.test.js` | 3-C |

### Wave 4: 도구별 구현 (Wave 3 완료 후)

| 작업 | 내용 | 산출물 | 의존성 |
|------|------|--------|--------|
| 4-A | `generate_music` 구현 | `src/tools.ts` | 1-C, 1-E, 3-C |
| 4-B | `generate_instrumental` 구현 | `src/tools.ts` | 4-A |
| 4-C | `generate_cover` 구현 | `src/tools.ts` | 4-A |
| 4-D | 검증 테스트 | `test/validation.test.js` | 4-A, 4-B, 4-C |

### Wave 5: 빌드 및 OpenCode 등록 (Wave 4 완료 후)

| 작업 | 내용 | 산출물 | 의존성 |
|------|------|--------|--------|
| 5-A | 빌드 스크립트 작성 | `package.json` scripts | 1-A |
| 5-B | 로컬 빌드 | `dist/index.js` | 5-A |
| 5-C | OpenCode MCP 등록 블록 작성 | `opencode.json` 변경안 | 5-B |
| 5-D | 실제 API smoke test | 오디오 파일 생성 확인 | 5-B |

---

## 4. 핵심 구현 요소

### 4.1 API 엔드포인트

```text
POST https://api.minimax.io/v1/music_generation
Content-Type: application/json
Authorization: Bearer <MINIMAX_API_KEY>
```

### 4.2 모델

| 모델 | 용도 | 접근 조건 |
|------|------|----------|
| `music-2.6` | 텍스트 기반 음악 생성 | Token Plan / paid users |
| `music-2.6-free` | 텍스트 기반 음악 생성 무료 티어 | API Key 사용자 |
| `music-cover` | 참조 오디오 기반 커버 생성 | Token Plan / paid users |
| `music-cover-free` | 참조 오디오 기반 커버 생성 무료 티어 | API Key 사용자 |

### 4.3 입력 조건

#### `music-2.6` / `music-2.6-free`

| 모드 | `prompt` | `lyrics` |
|------|----------|----------|
| `is_instrumental: true` | 필수, 1-2000자 | 불필요 |
| 일반 보컬 생성 | 선택, 0-2000자 | 필수, 1-3500자 |
| `lyrics_optimizer: true` + lyrics empty | prompt 기반 가사 자동 생성 | 비워도 가능 |

#### `music-cover` / `music-cover-free`

| 필드 | 조건 |
|------|------|
| `prompt` | 필수, 10-300자. 타깃 커버 스타일 설명 |
| `lyrics` | 선택. 생략 시 참조 오디오에서 ASR로 자동 추출. 제공 시 10-1000자 |
| `audio_url` | 참조 오디오 URL. `audio_base64`, `cover_feature_id`와 상호 배타 |
| `audio_base64` | 참조 오디오 base64. `audio_url`, `cover_feature_id`와 상호 배타 |
| `cover_feature_id` | Music Cover Preprocess API 결과. 제공 시 `lyrics` 필수 |

### 4.4 출력 설정

```json
"audio_setting": {
  "sample_rate": 44100,
  "bitrate": 256000,
  "format": "mp3"
}
```

허용값:

| 필드 | 허용값 |
|------|--------|
| `sample_rate` | `16000`, `24000`, `32000`, `44100` |
| `bitrate` | `32000`, `64000`, `128000`, `256000` |
| `format` | `mp3`, `wav`, `pcm` |

### 4.5 응답 처리

성공 응답 예시 구조:

```json
{
  "data": {
    "audio": "hex-encoded audio data",
    "status": 2
  },
  "trace_id": "...",
  "extra_info": {
    "music_duration": 25364,
    "music_sample_rate": 44100,
    "music_channel": 2,
    "bitrate": 256000,
    "music_size": 813651
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

중요 처리 기준:

| 필드 | 처리 |
|------|------|
| `base_resp.status_code === 0` | 성공 |
| `base_resp.status_code !== 0` | MCP 오류로 반환 |
| `data.status === 1` | 생성 진행 중. 재시도 안내 또는 내부 폴링 필요 |
| `data.status === 2` | 완료 |
| `data.audio` | `output_format: hex`일 때 오디오 hex |

오류 코드:

| 코드 | 의미 | MCP 반환 메시지 |
|------|------|----------------|
| `1002` | Rate limit | 잠시 후 재시도 |
| `1004` | Authentication failed | API key 확인 |
| `1008` | Insufficient balance | 잔액 확인 |
| `1026` | Sensitive material | 프롬프트/가사 수정 |
| `2013` | Invalid parameters | 입력값 검증 실패 |
| `2049` | Invalid API key | API key 유효성 확인 |

---

## 5. OpenCode 등록

### 5.1 opencode.json 블록

```json
"mcp": {
  "minimax-music": {
    "type": "local",
    "command": [
      "node",
      "C:\\NEW PRG\\Open Sync\\mcp-servers\\minimax-music\\dist\\index.js"
    ],
    "enabled": true,
    "timeout": 300000
  },
  "serena": { ... },
  "markitdown": { ... }
}
```

### 5.2 API 키 주입

`MINIMAX_API_KEY` 환경변수에서 읽는다. `opencode.json`에 실제 키를 직접 저장하지 않는다.

---

## 6. 파일 저장 위치

```text
%TEMP%\minimax-music\
├── {uuid}.mp3    # hex→파일 변환 결과
└── manifest.json # 메타데이터 (생성일, 모델, duration)
```

파일명 형식: `YYYYMMDD_HHMMSS_<tool>.<format>`

---

## 7. 테스트 계획

### 7.1 단위 테스트

| 테스트 | 입력 | 예상 결과 |
|--------|------|-----------|
| hex→Buffer 변환 | 유효 hex 문자열 | 올바른 크기의 Buffer |
| invalid API key | 잘못된 키 | 401 에러 반환 |
| prompt 길이 초과 | 2001자 | validation error |
| `generate_music` lyrics 없음 + optimizer false | lyrics 없음 | validation error |
| `generate_music` lyrics 없음 + optimizer true + prompt 있음 | prompt 있음 | 통과 |
| `generate_instrumental` prompt 없음 | prompt 없음 | validation error |
| `generate_cover` audio_url + audio_base64 동시 입력 | 둘 다 있음 | validation error |
| `generate_cover` cover_feature_id 있음 + lyrics 없음 | lyrics 없음 | validation error |
| `stream: true` + `output_format: url` | url 모드 | validation error 또는 hex 강제 |
| `base_resp.status_code: 1004` | 잘못된 키 | 인증 오류 메시지 반환 |

### 7.2 실제 API smoke test

무료 모델 우선 사용:

```json
{
  "model": "music-2.6-free",
  "prompt": "lo-fi, warm, calm, night city",
  "lyrics_optimizer": true,
  "output_format": "hex",
  "audio_setting": {
    "sample_rate": 44100,
    "bitrate": 128000,
    "format": "mp3"
  }
}
```

성공 기준:

| 기준 | 확인 |
|------|------|
| HTTP 요청 성공 | `base_resp.status_code === 0` |
| 생성 완료 | `data.status === 2` |
| 오디오 데이터 존재 | `data.audio` non-empty |
| 파일 생성 | `%TEMP%/minimax-music/*.mp3` 존재 |
| 파일 크기 | 0 byte 초과 |

---

## 8. 보류/확인 필요 사항

구현 전 확인이 필요한 항목:

| 항목 | 이유 |
|------|------|
| OpenCode `mcp` 블록의 `env` 지원 여부 | 키를 config에 넣지 않고 안전하게 넘길 방법 결정 |
| `stream: true` 실제 청크 포맷 | 공식 OpenAPI에 상세 청크 구조가 없음 |
| `output_format: url` 응답 필드 위치 | 공식 예시는 hex 중심. URL 응답 샘플 필요 |
| Music Cover Preprocess API 스펙 | `cover_feature_id` 도구 구현 여부 결정 |

---

## 9. 최종 권장안

1차 구현은 다음으로 제한한다.

| 포함 | 제외/후순위 |
|------|-------------|
| MiniMax 직접 API `POST /v1/music_generation` | AIML 게이트웨이 방식 |
| `generate_music` | 별도 게이트웨이 호환 레이어 |
| `generate_instrumental` | 스트리밍 완전 지원 |
| `generate_cover` 기본형 | Cover preprocess 2단계 워크플로 |
| hex 파일 저장 | URL 응답 자동 다운로드는 API 샘플 확인 후 확정 |

---

## 10. 다음 단계

사용자 승인 후 다음 순서로 구현을 시작한다:

1. Wave 1: 프로젝트 스캐폴딩
2. Wave 2: MCP 서버 골격
3. Wave 3: MiniMax API 클라이언트
4. Wave 4: 도구별 구현
5. Wave 5: 빌드 및 OpenCode 등록

각 Wave 완료 시 사용자에게 진행 상황을 보고하고 다음 Wave로 진행할지 확인한다.
