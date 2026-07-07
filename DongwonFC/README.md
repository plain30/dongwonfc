# 동원FC 2026 회비납부현황 대시보드

## 실행
압축 해제 후 `index.html`을 열면 됩니다.

## GitHub Pages 업로드 방법
`DongwonFC` 폴더 안의 모든 파일과 폴더를 `plain30/dongwonfc` 저장소 루트에 업로드하세요.

반드시 함께 업로드해야 하는 항목:
- `index.html`
- `admin.html`
- `dashboard.html`
- `member.html`
- `css/style.css`
- `js/app.js`
- `js/data.js`

`index.html`만 올리면 데이터가 보이지 않습니다.

## 로그인
- 관리자: `admin / admin2026`
- 회원: `본인이름 / 휴대전화 뒤 4자리`

## 데이터가 안 보일 때
기존 브라우저에 빈 데이터가 저장되어 있을 수 있습니다.
관리자로 로그인 후 우측 상단 `초기화`를 누르거나, 브라우저 개발자도구 > Application > Local Storage에서 `dongwonfc_state_*` 항목을 삭제하세요.

이번 버전은 저장키를 `dongwonfc_state_v4`로 변경하여 기존 오류 데이터와 충돌하지 않도록 수정했습니다.
