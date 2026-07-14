# 동원FC 회비관리시스템 V12

Google Sheets + Apps Script 공동 데이터 기반 정식 구조입니다.

## 적용 순서
1. `apps-script/Code.gs`를 스프레드시트에 연결된 Apps Script 프로젝트에 덮어씁니다.
2. Apps Script에서 배포 관리 → 새 버전 → 웹 앱으로 다시 배포합니다.
   - 실행 사용자: 나
   - 액세스 권한: 모든 사용자
3. 새 `/exec` URL이 달라졌다면 `js/config.js`의 `appsScriptUrl`을 수정합니다.
4. 이 폴더의 모든 파일과 폴더를 GitHub 저장소 루트에 업로드합니다.
5. `https://plain30.github.io/dongwonfc/setup.html?v=120`에서 초기설정을 확인합니다.
6. `admin / admin2026`으로 로그인합니다.
7. 파일 업로드 메뉴에서 회원정보 → 회비내역 → 특별회비 순으로 업로드합니다.

## V12 개선
- 관리자 화면 전체 레이아웃 재구성
- 모바일 사이드바
- 서버 연결 오류 상세 안내
- 빈 데이터 안내 및 업로드 바로가기
- 20초 요청 제한시간과 재시도 버튼
- 공동 데이터 자동 동기화
