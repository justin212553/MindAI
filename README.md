# MindAI

무엇이든 입력창에 던지면(아이디어, 할 일, 장보기 목록, 뭐든) 알아서 기존 마인드맵의
적절한 자리를 찾아 붙여주는 개인용 브레인스토밍 도구. 서버/데이터베이스 없이 정적
파일 + 서버리스 함수 하나로만 동작한다.

## 아키텍처 요약

- **프론트엔드**: 순수 HTML/CSS/JS (빌드 도구 없음). 마인드맵 렌더링은
  [markmap](https://markmap.js.org)를 사용하며, 라이브러리 파일은 `vendor/`에
  로컬로 번들되어 있어 배포 후에도 외부 CDN에 의존하지 않는다.
- **백엔드**: `api/classify.js` 서버리스 함수 하나. 새 아이템이 어느 노드에
  들어가야 할지를 Gemini의 function calling으로 강제 결정받아 반환한다. Gemini
  API 키는 이 함수 안에서만 쓰이고 브라우저로는 절대 내려가지 않는다.
- **저장**: 브라우저 localStorage + 수동 JSON 내보내기/불러오기. 별도 DB 없음.

## 로컬에서 켜보기

Vercel CLI가 있으면 정적 파일과 `/api` 서버리스 함수를 한 번에 로컬에서 띄울 수
있다 (그냥 `python -m http.server`로 열면 `/api/classify` 호출이 실패한다 — 정적
서버는 서버리스 함수를 실행하지 못하기 때문).

```bash
npm i -g vercel
vercel dev
```

## 배포 (Vercel)

1. 이 폴더를 GitHub 리포지토리로 올린다 (또는 `vercel` CLI로 폴더에서 바로 배포).
2. [vercel.com](https://vercel.com)에서 New Project → 이 리포지토리 선택.
   빌드 설정은 건드릴 필요 없음 (정적 파일 + `/api` 자동 인식).
3. 프로젝트 Settings → Environment Variables에서 다음 두 개를 등록:
   - `GEMINI_API_KEY` — [aistudio.google.com](https://aistudio.google.com/apikey)에서 무료로 발급.
   - `GEMINI_MODEL` — 현재 사용 가능한 Gemini 모델 id. 정확한 값은
     [ai.google.dev](https://ai.google.dev/gemini-api/docs/models)에서 최신 모델
     슬러그를 확인해서 넣을 것 (여기 하드코딩해두지 않았다 — 모델 id는 자주
     바뀐다). 비용을 아끼려면 "flash" 계열 모델을 고를 것.
4. Deploy. 끝나면 `https://<프로젝트명>.vercel.app` 형태의 링크가 생기고, 이게
   대회에 제출할 "서비스 접속 링크"다.

Netlify를 쓴다면 `api/classify.js`를 Netlify Functions 형식(`exports.handler`)으로
살짝 바꿔야 한다 — 지금은 Vercel Node 런타임 형식(`module.exports = async (req,res) => {}`)
으로 되어 있다.

## 파일 구성

```
index.html                  레이아웃 (좌측 마인드맵 목록 2 : 우측 캔버스 8)
style.css                   스타일
app.js                      조립 루트. 기능 모듈을 불러와 연결하고 초기 렌더링만 담당 (ES 모듈)
state/store.js              보드 상태 저장/불러오기 (localStorage), CRUD — DOM 없음
mindmap/                    markmap 래퍼: outline.js, core.js(렌더), overlay.js(수동 연결선), editor.js(더블클릭 편집)
sidebar/sidebar.js          마인드맵 목록 UI (전환/삭제/새로 만들기)
items/items.js              입력창 → /api/classify 호출 → 노드 배치
link-mode/link-mode.js      "연결" 모드 (노드 두 개 클릭해 수동 연결)
node-edit/node-edit.js      노드 더블클릭 인라인 편집 연동
import-export/import-export.js   JSON 내보내기/불러오기
markdown-import/             AI 대화 요약 프롬프트 복사 + .md 업로드 → 새 마인드맵 생성 (백엔드 호출 없음, 순수 파싱)
api/classify.js             새 아이템의 배치를 결정하는 서버리스 함수 (요청 처리만)
api/classify.constants.js   Gemini 함수 스키마 + 시스템 프롬프트 (바뀌지 않는 값들)
vendor/                     markmap-lib, markmap-view, d3 (로컬 번들, CDN 무의존)
```

프론트엔드는 빌드 도구 없이 브라우저 네이티브 ES 모듈(`<script type="module">`)로 나뉘어 있다. `app.js`만 모듈로 로드되고, 그 안에서 상대 경로로 나머지 폴더들을 `import`한다. `vendor/`의 라이브러리들은 예전처럼 일반 `<script>` 전역 로드 방식 그대로다.

## AI 대화 불러오기

사이드바의 "🤖 AI 대화 불러오기" 버튼을 누르면:

1. 대화를 마크다운 개요로 요약해달라는 프롬프트가 **클립보드에 자동으로 복사**된다.
2. 대화 중이던 AI 세션(ChatGPT, Claude, Gemini 등 어디든)에 가서 붙여넣는다.
3. 나온 결과를 `.md` 파일로 받아서(다운로드가 안 되면 텍스트를 복사해 `.md`로 저장),
   다시 이 앱으로 돌아와 "md 파일 업로드"로 올린다.

업로드된 마크다운의 헤딩(`#`/`##`/...)과 들여쓰기된 bullet 구조 그대로 새 마인드맵이
만들어진다. 백엔드 호출이 전혀 없는 순수 텍스트 파싱이라 Gemini API 키/쿼터와
무관하게 항상 동작한다.

클립보드에 복사되는 프롬프트:

```
지금까지 나눈 대화 내용을 마크다운 개요로 요약해줘. 아래 형식을 그대로 지켜줘:

# (전체 주제, 짧은 제목)
(한두 줄 설명)

## (하위 주제)
(설명, 선택)
- 세부 항목
- 세부 항목
  - 더 세부적인 항목

결과를 .md 파일로 만들어서 다운로드할 수 있게 해줘. (파일 다운로드가 안 되면 마크다운 텍스트만 줘도 괜찮아.)
```

- 맨 처음 나오는 헤딩이 새 마인드맵의 제목(과 루트 노드 요약)이 된다.
- `##`, `###`... 헤딩과 들여쓰기된 `-`/`*`/`+` bullet이 그대로 트리 깊이가 된다
  (bullet은 2칸 들여쓰기당 한 단계).
- 헤딩 바로 아래에 오는 설명 문장은 그 노드의 요약(summary)으로 들어간다.

## 지금 상태 (1차 스캐폴딩)

다음은 실제로 동작을 확인했다 (Playwright로 자동화 테스트 완료):

- 입력창에 텍스트 입력 → Enter 또는 버튼 클릭 → 서버리스 함수 호출 →
  기존 노드에 병합되거나 새 노드로 마인드맵에 추가됨
- 노드 더블클릭 → 인라인 편집 → 라벨 변경 반영
- "연결" 모드 켜고 노드 두 개 순서대로 클릭 → 수동 연결선 표시
- 마인드맵 여러 개 만들기/전환/삭제, JSON 내보내기/불러오기
- 새로고침해도 localStorage에서 상태 복원

아직 손대지 않은 것 (다음 작업 후보):

- **재분류/재정렬**: 지금은 아이템이 한 번 배치되면 고정된다. 트리가 지저분해지면
  주기적으로 통째로 재클러스터링하는 기능은 없음 (MVP 범위 밖으로 의도적으로 뺐음).
- **연결 모드 중 클릭이 markmap의 기본 접기/펼치기 동작과 동시에 발생**할 수 있음
  — 기능상 문제는 없지만 약간 어색할 수 있어 폴리시 대상.
- 실제 Gemini API 키 없이는 `/api/classify` 호출이 항상 500을 반환한다 (당연함,
  키를 넣기 전까지는 배포 후 반드시 환경변수부터 설정할 것).
- 여러 명이 실시간 동시 편집하는 시나리오는 다루지 않음 (개인용 도구로 설계됨).
