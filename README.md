# 동원FC 회비관리시스템 V10 Cloud

관리자 수정 내용이 모든 PC와 휴대전화에 실시간 반영되는 Firebase/Cloud Firestore 버전입니다.

## 최초 설정
1. Firebase 콘솔에서 프로젝트 생성
2. 웹 앱 등록 후 `js/firebase-config.js`에 설정 객체 입력
3. Authentication > 로그인 방법에서 이메일/비밀번호 활성화
4. Cloud Firestore 생성
5. Firestore 규칙에 `firestore.bootstrap.rules` 내용을 임시 게시
6. GitHub Pages에 전체 파일 업로드 후 `/setup.html` 접속
7. 관리자 비밀번호 `admin2026`으로 관리자 계정 생성
8. 즉시 Firestore 규칙을 `firestore.rules` 내용으로 교체하여 게시
9. `/index.html`에서 `admin / admin2026` 로그인
10. 회원정보·회비·특별회비 파일 업로드 후 회원관리에서 `회원 로그인 계정 생성` 실행

## 로그인
- 관리자: `admin / admin2026`
- 회원: 본인이름 / 휴대전화 뒤 4자리

## 데이터 동기화
- 관리자 업로드와 설정 변경은 Firestore에 저장됩니다.
- 회원 페이지는 자신의 문서만 실시간 구독합니다.
- 회원번호 000은 제외됩니다.
- 회비 파일에서 면제/EXEMPT는 정기회비 면제로 처리됩니다.

## 중요
Firebase 설정값(apiKey)은 웹에서 노출되는 것이 정상이며, 실제 보안은 Firebase Authentication과 Firestore Security Rules가 담당합니다. 초기 설정 후 반드시 최종 규칙을 게시하세요.
