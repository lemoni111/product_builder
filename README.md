# ToolNest

ToolNest는 Cloudflare Pages에 그대로 배포할 수 있는 정적 웹 도구 사이트입니다.
현재 첫 버전은 타임코드 계산기, 비트레이트 계산기, 브라우저 기반 영상 클립 편집기, 썸네일 추출 기능을 제공합니다.

## 구조

- `index.html`: 메인 페이지, SEO 메타 태그, 구조화 데이터
- `assets/css/styles.css`: 반응형 스타일
- `assets/js/app.js`: 도구 탭, 콘텐츠 렌더링, 초기화
- `assets/js/tools/`: 개별 도구 스크립트
- `assets/js/data/content.js`: 기능 소개, FAQ 콘텐츠
- `assets/vendor/ffmpeg/`: MP4 저장을 위한 ffmpeg.wasm 브라우저 래퍼 파일
- `about.html`, `privacy.html`, `contact.html`: 사이트 소개, 개인정보처리방침, 문의 안내 페이지
- `robots.txt`, `sitemap.xml`: 검색엔진 색인 보조 파일

## 현재 도구

- 타임코드 / 프레임 계산기
- 영상 용량 / 비트레이트 계산기
- 영상 클립 편집기: 로컬 영상을 불러와 구간 미리보기, 반복 재생, 0.1초 단위 미세 조정, 오디오 포함/제거, 회전/뒤집기, MP4 저장과 WebM 대체 저장을 지원합니다.
- 썸네일 추출: 현재 프레임을 PNG 또는 JPG 이미지로 저장합니다.
- SRT 자막 싱크 조정기: SRT 파일의 전체 시간을 앞/뒤로 이동하고 수정된 파일을 다운로드합니다.

## Cloudflare Pages 배포

빌드 과정이 필요 없습니다.

- Framework preset: `None`
- Build command: 비워두기
- Build output directory: `/` 또는 프로젝트 루트

GitHub 저장소에 이 폴더 내용을 올린 뒤 Cloudflare Pages에서 연결하면 됩니다.

## SEO / AdSense 준비

- `sitemap.xml`과 `robots.txt`는 현재 `https://toolnest.pages.dev/` 기준으로 작성되어 있습니다.
- 커스텀 도메인을 연결하면 `index.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`의 URL을 실제 도메인으로 교체하세요.
- Google Search Console에 사이트를 등록한 뒤 `https://toolnest.pages.dev/sitemap.xml`을 제출하세요.
- AdSense 승인 후 발급되는 게시자 ID가 생기면 그때 `ads.txt`를 정확한 값으로 추가하세요. 임의의 `pub-` ID를 넣으면 안 됩니다.
- `contact.html`의 운영자 연락처 예시는 실제로 사용하는 문의 이메일이나 문의 채널로 교체하세요.

## 새 도구 추가 방식

1. `assets/js/tools/new-tool.js` 파일을 추가합니다.
2. `window.ToolNestTools.newTool = { init: init }` 형태로 초기화 함수를 등록합니다.
3. `index.html`에 새 탭과 패널을 추가합니다.
4. `assets/js/app.js`의 `initTools()` 목록에 새 도구 이름을 추가합니다.
