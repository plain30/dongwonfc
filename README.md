# 동원FC 회비관리 시스템 v9

## 핵심 변경사항
- 로그인 페이지(index.html), 관리자 페이지(admin.html), 회원 페이지(member.html)를 분리했습니다.
- 일반회원은 member.html로만 이동하며 본인 데이터만 렌더링합니다.
- 관리자(admin / admin2026)만 admin.html 접근이 가능합니다.
- 회원번호 000은 자동 제외됩니다.
- 기존 저장 데이터와 충돌하지 않도록 저장소 키를 v9로 변경했습니다.

## GitHub Pages 업로드
압축 해제 후 아래 파일/폴더 전체를 dongwonfc 저장소에 업로드하세요.
- index.html
- admin.html
- member.html
- css/
- js/
- assets/

업로드 후 Ctrl+F5 또는 `?v=9`를 붙여 새로고침하세요.

## 로그인
- 관리자: admin / admin2026
- 회원: 본인이름 / 휴대전화번호 뒤 4자리
- 한재식 이름 로그인은 차단되며 admin 계정만 관리자 접속이 가능합니다.
