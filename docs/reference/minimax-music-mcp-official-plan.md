# MiniMax 음악 생성 MCP 공식 문서 기반 구현 계획서

**작성일:** 2026-05-04  
**기준 문서:** https://platform.minimax.io/docs/api-reference/music-generation  
**상태:** 공식 API 검토 후 재작성한 계획서. 아직 구현하지 않음.

---

## 1. 검토 결론

기존 `docs/minimax-music-mcp-review.md`와 `docs/minimax-music-mcp-plan.md`는 큰 방향, 즉 **MiniMax 직접 API를 MCP 서버로 감싸는 방식**은 맞습니다.

다만 공식 문서 기준으로 다음 부분은 보완이 필요합니다.

| 항목 | 기존 문서 상태 | 공식 문서 기준 보정 |
|------|----------------|---------------------|
| API 엔드포인트 | `POST https://api.minimax.io/v1/music_generation` | 맞음 |
| 인증 | Bearer API key | 맞음 |
| 모델 목록 | `music-2.6`, `music-2.6-free`, `music-cover`, `music-cover-free` | 맞음 |
| `prompt` 조건 | 항상 필수처럼 표현 | 모델/모드별 조건이 다름 |
| `lyrics` 조건 | 단순히 non-instrumental 필수 | `lyrics_optimizer: true`이면 비워도 자동 생성 가능 |
| cover 모델 | 거의 미반영 | `audio_url`, `audio_base64`, `cover_feature_id` 흐름 필요 |
| 응답 처리 | hex/url만 언급 | `data.status`, `data.audio`, `base_resp.status_code`, `extra_info` 처리 필요 |
| 스트리밍 | 지원한다고만 표현 | `stream: true`에서는 `output_format: hex`만 허용 |
| 파일 포맷 | mp3 중심 | `audio_setting.format`: `mp3`, `wav`, `pcm` 지원 |

따라서 새 구현 계획은 **MiniMax 공식 직접 API**를 기준으로 하고, falahgs 레포의 AIML 게이트웨이 방식은 참고만 합니다.

---

## 2. 목표

OpenCode에서 사용할 로컬 stdio MCP 서버를 만든다.

MCP 서버는 MiniMax 공식 Music Generation API를 호출하고, 에이전트가 다음 기능을 도구로 사용할 수 있게 한다.

| 도구 | 목적 |
|------|------|
| `generate_music` | `music-2.6` / `music-2.6-free` 텍스트 기반 음악 생성 |
| `generate_instrumental` | 보컬 없는 instrumental 음악 생성 |
| `generate_cover` | `music-cover` / `music-cover-free` 커버 생성 |
| `preprocess_cover` | 선택 사항. Music Cover Preprocess API를 쓰는 2단계 커버 워크플로용 |

1차 구현 범위는 `generate_music`, `generate_instrumental`, `generate_cover`까지로 잡고, `preprocess_cover`는 공식 문서 확인 후 별도 단계로 둔다.

---

## 3. 공식 API 사실 정리

### 3.1 엔드포인트

```text
POST https://api.minimax.io/v1/music_generation
Content-Type: application/json
Authorization: Bearer <MINIMAX_API_KEY>
```

### 3.2 모델

| 모델 | 용도 | 접근 조건 |
|------|------|----------|
| `music-2.6` | 텍스트 기반 음악 생성 | Token Plan / paid users |
| `music-2.6-free` | 텍스트 기반 음악 생성 무료 티어 | API Key 사용자 |
| `music-cover` | 참조 오디오 기반 커버 생성 | Token Plan / paid users |
| `music-cover-free` | 참조 오디오 기반 커버 생성 무료 티어 | API Key 사용자 |

### 3.3 입력 조건

#### `music-2.6` / `music-2.6-free`

| 모드 | `prompt` | `lyrics` |
|------|----------|----------|
| `is_instrumental: true` | 필수, 1-2000자 | 불필요 |
| 일반 보컬 생성 | 선택, 0-2000자 | 필수, 1-3500자 |
| `lyrics_optimizer: true` + lyrics empty | prompt 기반 가사 자동 생성 | 비워도 가능 |

지원 구조 태그:

```text
[Intro], [Verse], [Pre Chorus], [Chorus], [Interlude], [Bridge], [Outro],
[Post Chorus], [Transition], [Break], [Hook], [Build Up], [Inst], [Solo]
```

#### `music-cover` / `music-cover-free`

| 필드 | 조건 |
|------|------|
| `prompt` | 필수, 10-300자. 타깃 커버 스타일 설명 |
| `lyrics` | 선택. 생략 시 참조 오디오에서 ASR로 자동 추출. 제공 시 10-1000자 |
| `audio_url` | 참조 오디오 URL. `audio_base64`, `cover_feature_id`와 상호 배타 |
| `audio_base64` | 참조 오디오 base64. `audio_url`, `cover_feature_id`와 상호 배타 |
| `cover_feature_id` | Music Cover Preprocess API 결과. 제공 시 `lyrics` 필수 |

참조 오디오 제한:

```text
Duration: 6초-6분
Size: 최대 50 MB
Format: mp3, wav, flac 등 일반 오디오 포맷
```

### 3.4 출력 설정

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

### 3.5 응답 처리

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

## 4. 구현 방식

### 4.1 권장 언어

**Node.js + TypeScript stdio MCP 서버**로 구현한다.

이유:

| 기준 | 판단 |
|------|------|
| OpenCode MCP 등록 | `type: local`, `command: [...]`와 잘 맞음 |
| 바이너리 처리 | `Buffer.from(hex, "hex")`로 단순 처리 |
| MCP SDK | `@modelcontextprotocol/sdk` 사용 가능 |
| Windows 운용 | PowerShell 래퍼로 환경변수/경로 처리 가능 |

### 4.2 설치 위치

Open Sync 저장소 내부에 소스 오브 트루스를 두고, 필요 시 OpenCode config 쪽으로 등록한다.

```text
mcp-servers/minimax-music/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── minimax-client.ts
│   ├── schemas.ts
│   ├── tools.ts
│   ├── audio-output.ts
│   └── errors.ts
└── test/
    ├── validation.test.js
    ├── audio-output.test.js
    └── minimax-client.test.js
```

실제 OpenCode 등록은 빌드 결과를 가리키게 한다.

```json
"minimax-music": {
  "type": "local",
  "command": [
    "node",
    "C:\\NEW PRG\\Open Sync\\mcp-servers\\minimax-music\\dist\\index.js"
  ],
  "enabled": true,
  "timeout": 300000
}
```

API 키는 `MINIMAX_API_KEY` 환경변수에서 읽는다. `opencode.json`에 실제 키를 직접 저장하지 않는다.

---

## 5. MCP 도구 설계

### 5.1 `generate_music`

텍스트 기반 보컬 음악 생성용.

입력:

```ts
type GenerateMusicInput = {
  model?: "music-2.6" | "music-2.6-free";
  prompt?: string;
  lyrics?: string;
  lyrics_optimizer?: boolean;
  output_format?: "hex" | "url";
  stream?: boolean;
  audio_setting?: {
    sample_rate?: 16000 | 24000 | 32000 | 44100;
    bitrate?: 32000 | 64000 | 128000 | 256000;
    format?: "mp3" | "wav" | "pcm";
  };
};
```

검증 규칙:

| 조건 | 검증 |
|------|------|
| `model` 없음 | 기본값 `music-2.6-free` 권장 |
| `lyrics_optimizer !== true` | `lyrics` 필수, 1-3500자 |
| `lyrics_optimizer === true` + lyrics empty | `prompt` 필요 |
| `prompt` 있음 | 0-2000자 범위 확인 |
| `stream === true` | `output_format`은 `hex`로 강제 또는 오류 |

### 5.2 `generate_instrumental`

보컬 없는 음악 생성용. 내부적으로 `is_instrumental: true`를 세팅한다.

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

검증 규칙:

| 조건 | 검증 |
|------|------|
| `prompt` | 필수, 1-2000자 |
| `lyrics` | 받지 않음 |
| `model` | `music-2.6` 또는 `music-2.6-free`만 허용 |

### 5.3 `generate_cover`

참조 오디오 기반 커버 생성용.

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

검증 규칙:

| 조건 | 검증 |
|------|------|
| `prompt` | 필수, 10-300자 |
| `audio_url`, `audio_base64`, `cover_feature_id` | 정확히 하나만 허용 |
| `cover_feature_id` 있음 | `lyrics` 필수, 10-1000자 |
| `audio_url` 또는 `audio_base64` 있음 | `lyrics` 선택, 제공 시 10-1000자 |
| `stream === true` | `output_format`은 `hex`만 허용 |

---

## 6. 출력 파일 처리

### 6.1 hex 출력

`output_format: "hex"`일 때:

```ts
const buffer = Buffer.from(audioHex, "hex");
await fs.writeFile(outputPath, buffer);
```

파일 확장자는 `audio_setting.format` 기준으로 정한다.

```text
%TEMP%/minimax-music/YYYYMMDD_HHMMSS_<tool>.<format>
```

MCP 반환:

```json
{
  "status": "completed",
  "file_path": "...",
  "format": "mp3",
  "duration_ms": 25364,
  "sample_rate": 44100,
  "bitrate": 256000,
  "size_bytes": 813651,
  "trace_id": "..."
}
```

### 6.2 URL 출력

공식 문서는 `url` 링크가 24시간 후 만료된다고 명시한다.

구현 선택:

| 선택지 | 권장 |
|--------|------|
| URL만 반환 | 최소 구현 가능 |
| URL을 즉시 다운로드 후 파일 경로 반환 | 더 안전. 권장 |

1차 구현은 `download_url_output: boolean` 옵션을 둔다. 기본값은 `true`로 한다.

---

## 7. 스트리밍 처리 방침

공식 문서상 `stream: true`일 때는 `output_format: hex`만 지원한다.

1차 구현에서는 스트리밍을 선택 기능으로 둔다.

| 단계 | 처리 |
|------|------|
| 1차 | `stream: false` 기본 구현 완료 |
| 2차 | `stream: true` 응답 형식을 실제 API로 확인한 뒤 추가 |

이유: 공식 OpenAPI에는 `stream: true`의 청크 포맷이 상세히 드러나지 않으므로, 구현 전 실제 응답 샘플 확인이 필요하다.

---

## 8. 작업 순서

### Wave 1: 공식 스펙 기반 설계 고정

| 작업 | 산출물 | QA |
|------|--------|----|
| 입력 스키마 정의 | `schemas.ts` | 단위 테스트로 모델별 필수값 검증 |
| 오류 코드 매핑 | `errors.ts` | status_code별 메시지 테스트 |
| 출력 파일 정책 정의 | `audio-output.ts` | hex fixture로 파일 생성 테스트 |

### Wave 2: MCP 서버 골격

| 작업 | 산출물 | QA |
|------|--------|----|
| `package.json`, `tsconfig.json` | 빌드 가능 프로젝트 | `npm run build` 통과 |
| stdio MCP 서버 | `index.ts` | MCP inspector 또는 직접 stdio 호출 확인 |
| 도구 등록 | `tools.ts` | `ListTools` 결과에 3개 도구 표시 |

### Wave 3: MiniMax API 클라이언트

| 작업 | 산출물 | QA |
|------|--------|----|
| 인증 헤더 구성 | `minimax-client.ts` | API key 누락 시 오류 |
| POST 요청 구현 | `minimax-client.ts` | mock fetch 테스트 |
| 응답 파싱 | `minimax-client.ts` | `base_resp`, `data.status`, `extra_info` 테스트 |

### Wave 4: 도구별 구현

| 작업 | 산출물 | QA |
|------|--------|----|
| `generate_music` | 보컬 음악 생성 | lyrics/prompt 조건 테스트 |
| `generate_instrumental` | instrumental 생성 | prompt 필수 테스트 |
| `generate_cover` | cover 생성 | 참조 오디오 입력 상호 배타 테스트 |

### Wave 5: OpenCode 등록 및 실제 검증

| 작업 | 산출물 | QA |
|------|--------|----|
| OpenCode MCP 등록 블록 작성 | `opencode.json` 변경안 | JSON 파싱 확인 |
| 로컬 빌드 | `dist/index.js` | `npm run build` 성공 |
| 실제 API smoke test | 짧은 무료 모델 호출 | 오디오 파일 생성 확인 |

---

## 9. 테스트 계획

### 9.1 단위 테스트

| 테스트 | 기대 결과 |
|--------|----------|
| `generate_music` lyrics 없음 + optimizer false | validation error |
| `generate_music` lyrics 없음 + optimizer true + prompt 있음 | 통과 |
| `generate_instrumental` prompt 없음 | validation error |
| `generate_cover` audio_url + audio_base64 동시 입력 | validation error |
| `generate_cover` cover_feature_id 있음 + lyrics 없음 | validation error |
| `stream: true` + `output_format: url` | validation error 또는 hex 강제 |
| hex fixture 저장 | 올바른 확장자 파일 생성 |
| `base_resp.status_code: 1004` | 인증 오류 메시지 반환 |

### 9.2 실제 API smoke test

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

## 10. 보류/확인 필요 사항

구현 전 확인이 필요한 항목:

| 항목 | 이유 |
|------|------|
| OpenCode `mcp` 블록의 `env` 지원 여부 | 키를 config에 넣지 않고 안전하게 넘길 방법 결정 |
| `stream: true` 실제 청크 포맷 | 공식 OpenAPI에 상세 청크 구조가 없음 |
| `output_format: url` 응답 필드 위치 | 공식 예시는 hex 중심. URL 응답 샘플 필요 |
| Music Cover Preprocess API 스펙 | `cover_feature_id` 도구 구현 여부 결정 |

---

## 11. 최종 권장안

1차 구현은 다음으로 제한한다.

| 포함 | 제외/후순위 |
|------|-------------|
| MiniMax 직접 API `POST /v1/music_generation` | AIML 게이트웨이 방식 |
| `generate_music` | 별도 게이트웨이 호환 레이어 |
| `generate_instrumental` | 스트리밍 완전 지원 |
| `generate_cover` 기본형 | Cover preprocess 2단계 워크플로 |
| hex 파일 저장 | URL 응답 자동 다운로드는 API 샘플 확인 후 확정 |

이 계획이 기존 계획보다 정확한 이유:

| 개선점 | 내용 |
|--------|------|
| 공식 입력 조건 반영 | 모델별 `prompt`, `lyrics`, cover 입력 조건을 분리 |
| 공식 응답 구조 반영 | `base_resp`, `data.status`, `extra_info` 처리 포함 |
| 오류 코드 반영 | MiniMax status code별 MCP 오류 매핑 |
| cover 모델 반영 | `audio_url`, `audio_base64`, `cover_feature_id` 상호 배타 조건 포함 |
| 스트리밍 리스크 명시 | 청크 포맷 확인 전 완전 구현으로 단정하지 않음 |

---

*이 문서는 구현 계획서이며, 아직 파일 생성/코드 구현/OpenCode 설정 변경을 수행하지 않았다.*
