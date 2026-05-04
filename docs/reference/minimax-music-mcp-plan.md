# MiniMax 음악 생성 MCP 구현 계획서

**작성일:** 2026-05-04
**관련 문서:** `docs\minimax-music-mcp-review.md`
**상태:** 계획서 — 작업 실행 전 사용자 승인 필요

---

## 1. 개요

OpenCode 환경에서 MiniMax Music Generation API를 MCP 서버로 연동하여 에이전트가 자연스럽게 `generate_music()` 도구를 호출할 수 있도록 함.

---

## 2. 구현 언어 및 패턴 결정

### 2.1 선택: Node.js stdio MCP

| 기준 | Node.js | Python | Bash 래퍼 |
|------|---------|--------|-----------|
| **fal-ai 패턴** | npx/-y 사용 | python -m 사용 | 복잡 |
| **hex→바이너리 처리** | Buffer 쉽게 처리 | struct로 가능 | awk/xxd 필요 |
| **바이너리 분산** | npm publish 가능 | pip install 가능 | 불필요 |
| **에이전트 친숙도** | 높음 | 보통 | 낮음 |

**권장:** Node.js (`@modelcontextprotocol/server-filesystem` 패턴 따름)

### 2.2 프로젝트 위치

```
C:\Users\U-N-00658\.config\opencode\mcp-servers\minimax-music\
├── package.json
├── src/
│   ├── index.ts          # MCP 서버 진입점
│   ├── client.ts         # MiniMax API 호출
│   ├── tools.ts          # MCP 도구 정의 (generate_music, generate_instrumental)
│   └── utils.ts          # hex→바이너리 변환, 파일 저장
└── README.md
```

---

## 3. 작업 분해 및 Parallel Task Graph

### Wave 1 (병렬 가능 — 선행 작업)
| # | 작업 | 내용 | 의존성 |
|---|------|------|--------|
| 1-A | 프로젝트 스캐폴딩 | `package.json`, `tsconfig.json` 작성 | 없음 |
| 1-B | 의존성 분석 | @modelcontextprotocol/sdk, node-fetch 설치 확인 | 없음 |
| 1-C | MiniMax API 연구 | API 응답 구조, 에러 코드, rate limit 확인 | 없음 |

### Wave 2 (Wave 1 완료 후)
| # | 작업 | 내용 | 의존성 |
|---|------|------|--------|
| 2-A | MCP 서버 기본 구조 | stdio 프로토콜, 도구 등록 스카폴드 | 1-A |
| 2-B | MiniMax API 클라이언트 | fetch 기반 API 호출, 인증, 에러 처리 | 1-A, 1-C |
| 2-C | hex→파일 변환 유틸 | hex 문자열 → Buffer → WAV/MP3 파일 저장 | 2-B |
| 2-D | opencode.json 등록 블록 | `"minimax-music"` MCP 서버 JSON 준비 | 1-A |

### Wave 3 (Wave 2 완료 후)
| # | 작업 | 내용 | 의존성 |
|---|------|------|--------|
| 3-A | generate_music 도구 구현 | prompt, lyrics, model, is_instrumental 파라미터 | 2-A, 2-B, 2-C |
| 3-B | generate_instrumental 도구 구현 | is_instrumental=true 래퍼 | 3-A |
| 3-C | 스트리밍 응답 처리 | `stream: true` 모드 지원 | 2-B |
| 3-D | 테스트 스크립트 작성 | 로컬 테스트용 CLI 스크립트 | 2-B, 2-C |

### Wave 4 (최종)
| # | 작업 | 내용 | 의존성 |
|---|------|------|--------|
| 4-A | opencode.json에 MCP 등록 | `opencode.json`의 `mcp` 블록에 추가 | 3-A, 3-B |
| 4-B | 동작 검증 | `opencode mcp list` → `generate_music()` 호출 테스트 | 4-A |

---

## 4. 핵심 구현 요소 상세

### 4.1 MCP 도구 시그니처

```typescript
// generate_music — 일반 음악 생성
interface GenerateMusicInput {
  prompt: string;           // 1-2000자, 필수
  lyrics?: string;         // \n으로 줄 구분, 1-3500자, 악기 아닐 경우 필수
  model?: "music-2.6" | "music-2.6-free";  // 기본: music-2.6
  duration?: number;       // 초 단위 (API文档에 직접 없음, audio_setting으로)
  output_format?: "hex" | "url";  // 기본: hex
  is_instrumental?: boolean;      // 기본: false
}

// generate_instrumental — 악기 음악 생성
interface GenerateInstrumentalInput {
  prompt: string;           // 1-2000자, 필수
  model?: "music-2.6" | "music-2.6-free";
  duration?: number;
  output_format?: "hex" | "url";
}
```

### 4.2 API 호출 흐름

```
1. 입력 검증 (파라미터 길이, 필수값)
2. API 요청 본문 구성
3. fetch("https://api.minimax.io/v1/music_generation", {
     method: "POST",
     headers: { "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
                "Content-Type": "application/json" },
     body: JSON.stringify({...})
   })
4. 응답 처리:
   - output_format=hex: hex 문자열 → Buffer → 파일 저장 → 파일 경로 반환
   - output_format=url: URL 직접 반환 (24시간 만료 경고)
5. 스트리밍 모드: 청크 단위 수신 후 hex 누적
```

### 4.3 API 키 주입 방식

**옵션 A (권장): PowerShell 래퍼**
```json
"minimax-music": {
  "type": "local",
  "command": [
    "pwsh", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", "C:\\Users\\U-N-00658\\.config\\opencode\\mcp-servers\\minimax-music\\launch.ps1",
    "start"
  ],
  "enabled": true
}
```
래퍼 스크립트가 `$env:MINIMAX_API_KEY`를 읽어 Node.js 프로세스에 전달.

**옵션 B: 환경변수 직접 전달**
현재 OpenCode `opencode.json`의 `mcp` 블록에 `env` 필드 지원 여부 미확인.

### 4.4 파일 저장 위치

```
%TEMP%\minimax-music\
├── {uuid}.mp3    # hex→파일 변환 결과
└── manifest.json # 메타데이터 (생성일, 모델, duration)
```

---

## 5. opencode.json 등록 블록 (예시)

```json
"mcp": {
  "minimax-music": {
    "type": "local",
    "command": [
      "pwsh",
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "C:\\Users\\U-N-00658\\.config\\opencode\\mcp-servers\\minimax-music\\launch.ps1",
      "start"
    ],
    "enabled": true,
    "timeout": 300000
  },
  "serena": { ... },
  "markitdown": { ... }
}
```

---

## 6. QA/테스트 계획

### 6.1 단위 테스트
| 테스트 | 입력 | 예상 결과 |
|--------|------|-----------|
| hex→Buffer 변환 | 유효 hex 문자열 | 올바른 크기의 Buffer |
| invalid API key | 잘못된 키 | 401 에러 반환 |
| prompt 길이 초과 | 2001자 | validation error |

### 6.2 통합 테스트
| 테스트 | 방법 |
|--------|------|
| 음악 생성 | `generate_music({prompt: "upbeat pop", lyrics: "[verse]\nhello"})` 호출 → 파일 경로 반환 |
| 악기 생성 | `generate_instrumental({prompt: "lo-fi hip hop"})` 호출 → 파일 경로 반환 |
| URL 모드 | `output_format: "url"` → URL 문자열 반환 |

### 6.3 성공 기준
- [ ] `opencode mcp list`에 `minimax-music` 표시
- [ ] `generate_music()` 도구 호출 시 유효한 오디오 파일 생성
- [ ] API 인증 오류 시 적절한 에러 메시지 반환

---

## 7. 파일 목록

```
C:\Users\U-N-00658\.config\opencode\mcp-servers\minimax-music\
├── package.json                    # npm 패키지 정의
├── tsconfig.json                   # TypeScript 설정
├── launch.ps1                      # PowerShell 래퍼 (API 키 주입)
├── src/
│   ├── index.ts                    # MCP 서버 메인
│   ├── client.ts                   # MiniMax API 클라이언트
│   ├── tools.ts                    # 도구 스키마 정의
│   └── utils.ts                    # hex 변환, 파일 유틸
└── README.md                       # 사용 문서
```

---

## 8. 의존성

| 패키지 | 용도 |
|--------|------|
| `@modelcontextprotocol/sdk` | stdio MCP 서버 구현 |
| `node-fetch` 또는 내장 fetch | HTTP 요청 (Node 18+ 내장) |
| `uuid` | 파일명 생성 |
| `typescript` | 개발 의존성 |
| `@types/node` | TypeScript 타입 |

---

*계획서 작성: Sisyphus (OpenCode Agent)*
*검토 후 작업 지시 시 `--ulw`로 실행*