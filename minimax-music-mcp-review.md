# MiniMax 음악 생성 MCP 서버 검토 보고서

**작성일:** 2026-05-04
**검토 목적:** OpenCode 환경에서 MiniMax 음악 생성 API 연동 가능성 — 스킬만 vs MCP 서버
**결론:** MCP 서버 방식 권장

---

## 1. 서론

MiniMax Music Generation API (`POST /v1/music_generation`)를 OpenCode 환경에서 사용하기 위한 구현 방식을 검토함.
API 키는 이미 보유 중.

---

## 2. OpenCode 아키텍처 분석

### 2.1 스킬(Skill)의 본질

| 항목 | 내용 |
|------|------|
| **스킬이란** | `SKILL.md` 마크다운 파일 — 에이전트 컨텍스트에 주입되는 **지침 문서** |
| **실행 방식** | Node.js/브라우저에서 직접 실행되지 않음 |
| **HTTP 호출** | 스킬 자체가 HTTP를 보내지 않음. 에이전트가 **MCP 서버, Bash/터미널 도구** 등을 통해间接적으로 실행 |

OpenCode의 `instructions`는 실행 가능한 코드가 아니라 **프롬프트 주입용 텍스트**임.

### 2.2 MCP 서버의 역할

OpenCode에서 실제로 외부 API를 호출하는 것은 **MCP 서버**:

```
opencode.json → "mcp" 섹션 → 로컬 stdio 프로세스 실행
```

**현재 등록된 MCP:**
- `serena` — PowerShell 래퍼 (`serena-launcher.ps1`)
- `markitdown` — Python 모듈 (`python.exe -m markitdown_mcp`)

### 2.3 MCP 서버 등록 방식

`C:\Users\U-N-00658\.config\opencode\opencode.json`의 `mcp` 블록:

```json
"mcp": {
  "server-name": {
    "type": "local",
    "command": ["pwsh", "-NoLogo", "-File", "C:\\path\\to\\launcher.ps1", "start-mcp-server"],
    "enabled": true,
    "timeout": 120000
  }
}
```

**핵심 패턴:**
- `type: "local"` — stdio 기반 로컬 프로세스
- `command` — 실행 파일과 인수를 **배열**로 전달
- API 키는 환경변수 또는 래퍼 스크립트에서 주입

---

## 3. 스킬만 vs MCP 서버 비교

### 3.1 스킬만으로 가능한 것

| 가능 여부 | 내용 |
|-----------|------|
| ⚠️ 한계 | API 호출 코드를 스킬 문서에 예시로 작성 가능 |
| ❌ 불능 | 스킬 자체가 `fetch()`/`axios` 등을 직접 실행 |
| ❌ 불능 | 바이너리(hex 인코딩된 오디오) 처리 |
| ⚠️ 간접 | Bash에서 `curl` 명령어 실행하는 방법을 스킬에 기재 가능 |

**스킬의 실제 역할:** "이렇게 Bash로 호출하세요"라는 **사용자 가이드**일 뿐.

### 3.2 MCP 서버 방식

| 가능 여부 | 내용 |
|-----------|------|
| ✅ | `fetch()`로 MiniMax API 직접 호출 |
| ✅ | hex → 바이너리 오디오 변환 후 파일로 저장 |
| ✅ | 에이전트가 자연스럽게 `generate_music()` 도구로 호출 |
| ✅ | 스트리밍 응답(`stream: true`) 처리 |

### 3.3 결론

**단순 실험/프로토타입** → Bash + curl 조합으로 스킬 문서에 가이드 가능
**실용적 사용** → **MCP 서버 필수**

---

## 4. MiniMax 음악 생성 API 요약

```
Endpoint: POST https://api.minimax.io/v1/music_generation
Auth: Bearer Token (API Key)
모델: music-2.6, music-2.6-free, music-cover, music-cover-free

주요 파라미터:
- model: 음악 생성 모델
- prompt: 음악 스타일/분위지 설명 (1-2000자)
- lyrics: 가사 (\n으로 줄 구분, 1-3500자, 악기일 경우 불필요)
- is_instrumental: true = 보컬 없음
- output_format: "hex" (기본) 또는 "url"
- stream: true/false (기본 false)

응답: hex 인코딩된 오디오 데이터 (수십 MB级别)
```

---

## 5. 기존 음악 관련 MCP 참조

### 5.1 fal-ai (현재 `.mcp.json`에 등록)

```json
"fal-ai": {
  "command": "npx",
  "args": ["-y", "fal-ai-mcp-server"],
  "env": { "FAL_KEY": "YOUR_FAL_KEY_HERE" },
  "description": "AI image/video/audio generation via fal.ai models"
}
```

`coll.generate_music()` 메서드를 통해 음악 생성 가능.

### 5.2 videodb 스킬의 음악 생성

```javascript
music = coll.generate_music(prompt="upbeat corporate background music", duration=30)
```

### 5.3 elevenlabs-music

검색 결과, `opencode.json` 또는 `mcp-configs/mcp-servers.json`에 **elevenlabs-music 미등록**.
ElevenLabs Music API는 OpenCode와 직접 통합된 상태가 아님.

---

## 6. 구현 방식 권장: MCP 서버

### 6.1 구현 옵션

| 옵션 | 장점 | 단점 |
|------|------|------|
| **Node.js stdio MCP** | @modelcontextprotocol/sdk 사용, 표준 패턴 | 별도 패키지 설치 필요 |
| **Python stdio MCP** | Python 환경 활용 가능 | 별도 구현 필요 |
| **Bash 래퍼 스크립트** | 간단한 프로토타입 가능 | 바이너리 처리 어려움, 유지보수 불편 |

**권장: Node.js stdio MCP** (`@modelcontextprotocol/server-filesystem` 패턴 참고)

### 6.2 MCP 서버가 가져야 할 도구 (Tools)

```
generate_music(prompt, lyrics?, model?, is_instrumental?, duration?)
  → MiniMax API 호출
  → hex → 파일 변환
  → 파일 경로 반환

generate_instrumental(prompt, model?, duration?)
  → is_instrumental: true 세트
```

### 6.3 API 키 주입 방식

**옵션 A: 환경변수 (가장 깔끔)**
```json
"env": {
  "MINIMAX_API_KEY": "YOUR_KEY_HERE"
}
```
단, OpenCode `opencode.json`의 `mcp` 블록에 `env` 필드가 현재 명시적으로 확인되지 않음.

**옵션 B: 래퍼 스크립트**
PowerShell/Node.js 래퍼가 환경변수에서 키를 읽어 프로세스 시작.

---

## 7. 결론 및 권장사항

| 항목 | 권장 |
|------|------|
| **구현 방식** | MCP 서버 (스킬만으로는 불충분) |
| **언어** | Node.js 또는 Python |
| **패턴** | stdio MCP (`type: "local"`) |
| **도구 이름** | `generate_music`, `generate_instrumental` |
| **API 키** | 환경변수 또는 래퍼 스크립트 |
| **주의사항** | hex → 바이너리 변환 로직 필요, 24시간 내 URL 만료 |

---

## 8. 다음 단계 (계획서에서 상세화)

1. MCP 서버 프로젝트 초기화 (Node.js/Python)
2. MiniMax API 호출 구현
3. hex → 오디오 파일 변환
4. `opencode.json`에 MCP 등록
5. 테스트 및 검증

---

*보고서 작성: Sisyphus (OpenCode Agent)*