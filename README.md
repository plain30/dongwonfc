# 동원FC 회비관리시스템 V13

V13은 GitHub Pages에서 Google Apps Script를 `fetch()`로 호출할 때 발생하던 `Failed to fetch`와 리디렉션/CORS 문제를 피하기 위해 **JSONP 통신 방식**으로 다시 구성한 버전입니다.

## 핵심 변경

- 로그인, 관리자 조회, 회원 조회를 JSONP로 처리
- 관리자 비밀번호와 회원 휴대전화 뒤 4자리는 SHA-256 해시값으로만 전송
- 엑셀 전체자료 저장은 URL 길이 제한을 피하기 위해 여러 조각으로 나누어 업로드한 뒤 서버에서 합침
- 관리자/회원 권한 분리 유지
- 회원번호 000 및 탈퇴회원 제외
- 회비면제, 연 회비 240,000원, 특별회비 건당 10,000원 계산 유지
- Google Sheets 공동 데이터 및 15초 자동 동기화 유지

## 반드시 적용할 파일

### 1. Apps Script

`apps-script/Code.gs` 전체 내용을 현재 Apps Script 프로젝트의 `Code.gs`에 덮어씁니다.

그 후 Apps Script에서:

1. 배포 → 배포 관리
2. 기존 웹 앱의 연필 아이콘
3. 버전 → 새 버전
4. 실행 사용자 → 나
5. 액세스 권한 → 모든 사용자
6. 배포

기존 `/exec` 주소를 그대로 사용해도 되지만, 새 주소가 발급되면 `js/config.js`의 `appsScriptUrl`도 변경합니다.

### 2. GitHub Pages

이 폴더 안의 파일과 폴더를 저장소 루트에 모두 덮어씁니다.

- index.html
- admin.html
- member.html
- setup.html
- diagnostics.html
- css 폴더
- js 폴더
- assets 폴더

## 접속 및 확인

캐시를 피하기 위해 아래 주소로 확인합니다.

- 진단: `https://plain30.github.io/dongwonfc/diagnostics.html?v=131`
- 로그인: `https://plain30.github.io/dongwonfc/index.html?v=131`

진단 페이지에서 `공동 서버 연결 정상`이 표시된 후 로그인합니다.

관리자 로그인:

- 아이디: `admin`
- 비밀번호: 기존에 설정한 관리자 비밀번호 (`admin2026`)

초기 설정이 이미 완료되었으면 setup.html을 다시 실행할 필요가 없습니다.

## 주의

V13 프런트엔드만 올리고 Apps Script의 Code.gs를 V13으로 바꾸지 않으면 로그인할 수 없습니다. 반드시 두 부분을 함께 적용하고 Apps Script를 새 버전으로 재배포해야 합니다.


## V13.2 관리자 화면 개선
- 상단 요약카드: 총 회원, 회원회비 납부율, 특별회비 납부율, 미납회원 수
- 회원회비·특별회비 원형그래프 병렬 배치
- 최근 변경내역과 월별 누적 납부현황 병렬 배치
- 특별회비 화면에 발생건수·부과금액·납부금액·잔액 요약
- 경조사별 납부율, 상태/직책 필터, 정렬 기능 추가
