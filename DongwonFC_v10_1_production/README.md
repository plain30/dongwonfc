# 동원FC 회비관리시스템 V10.1 Cloud

관리자가 수정한 회원·회비·특별회비 자료를 Firebase Cloud Firestore에 저장하고, 회원 PC와 휴대전화에 실시간으로 반영하는 GitHub Pages용 프로젝트입니다.

## 이 배포본에 연결된 Firebase 프로젝트

- Project ID: `project-782e9`
- GitHub Pages 예상 주소: `https://plain30.github.io/dongwonfc/`
- 관리자 로그인 ID: `admin`
- 관리자 Firebase 이메일: `admin@dongwonfc.app`
- 관리자 표시 이름: 한재식

## 반드시 먼저 확인할 Firebase 설정

### 1. Authentication 활성화

Firebase Console → Authentication → 로그인 방법에서 **이메일/비밀번호**를 활성화합니다.

Authentication → Settings → 승인된 도메인에 다음을 추가합니다.

- `plain30.github.io`
- 로컬 테스트가 필요하면 `localhost`

### 2. Firestore 최초 관리자 생성

1. Firestore 규칙에 `firestore.bootstrap.rules` 내용을 게시합니다.
2. GitHub 저장소에 이 폴더의 파일을 모두 업로드합니다.
3. `https://plain30.github.io/dongwonfc/setup.html?v=101` 접속
4. 관리자 비밀번호 `admin2026`을 입력하고 관리자 계정을 생성합니다.
5. 관리자 생성 직후 Firestore 규칙을 `firestore.rules` 내용으로 교체해 게시합니다.
6. `setup.html`은 저장소에서 삭제하거나 주소를 외부에 공유하지 않는 것을 권장합니다.

> 관리자 계정이 이미 생성되어 있다면 관리자 생성은 다시 하지 말고 최종 보안 규칙만 게시합니다.

## 최초 데이터 입력

1. `admin / admin2026`으로 로그인합니다.
2. 파일 업로드 메뉴에서 다음 순서로 업로드합니다.
   - 회원정보.xlsx
   - 2026년회비내역.xlsx
   - 2026년특별회비내역.xlsx
3. 회원관리에서 **회원 로그인 계정 생성**을 실행합니다.

회원 로그인 방식:

- 아이디: 본인 이름
- 비밀번호: 회원정보 파일에 저장된 휴대전화번호 뒤 4자리

## 회비 계산 기준

- 정기회비: 월 20,000원 × 12개월 = 연 240,000원
- 특별회비: 경조사 1건당 10,000원
- 회비내역 파일에서 `면제`, `면 제`, `면제자`, `EXEMPT`가 확인되면 정기회비 면제
- 특별회비의 `본인경조사`는 해당 회원의 납부 대상 금액에서 제외
- 회원번호 `000` 및 탈퇴 회원은 목록과 통계에서 제외

관리자 환경설정에서 금액 기준을 변경할 수 있습니다.

## 실시간 동기화

관리자가 다음 작업을 수행하면 Firestore에 즉시 저장되고 다른 사용자의 화면도 자동 갱신됩니다.

- 회원정보 업로드
- 회비내역 업로드
- 특별회비 업로드
- 월 회비·연간 납부 개월·특별회비 단가 변경
- 회원 로그인 계정 생성 및 연결

관리자 메뉴의 **변경 이력**에서 최근 100건을 확인할 수 있습니다.

## GitHub 업로드

`index.html`만 올리면 동작하지 않습니다. 아래 전체 파일과 폴더를 저장소 루트에 업로드합니다.

- index.html
- admin.html
- member.html
- setup.html
- css/
- js/
- assets/
- .nojekyll

업로드 후 캐시가 남아 있으면 아래 주소로 확인합니다.

`https://plain30.github.io/dongwonfc/?v=101`

## 보안 관련 중요사항

- Firebase 웹 설정값은 브라우저 앱에 포함되는 공개 연결 정보입니다. 실제 데이터 접근 통제는 `firestore.rules`가 담당합니다.
- 최종 보안 규칙에서는 회원이 본인의 `members/{회원번호}` 문서만 읽을 수 있습니다.
- 일반회원은 관리자 페이지에 접근할 수 없고, 관리자만 전체 회원 데이터와 변경 이력을 읽고 수정할 수 있습니다.
- 관리자 초기 생성이 끝난 뒤 bootstrap 규칙을 계속 사용하면 안 됩니다.
- 이 버전의 회원 계정 생성은 브라우저 Firebase SDK를 사용합니다. 생성된 Auth 계정은 사용자 프로필 문서가 없으면 Firestore 데이터를 읽을 수 없습니다.

## 백업

관리자 → 파일 업로드 → JSON 백업 다운로드에서 현재 설정과 회원 데이터를 내려받을 수 있습니다.
