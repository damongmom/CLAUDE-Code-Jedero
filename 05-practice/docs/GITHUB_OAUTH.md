# GitHub 로그인 설정 가이드

이 앱은 GitHub OAuth로 로그인합니다. 로그인한 사용자는 자신의 1년 목표, 주간 계획, 할 일만 보고 수정할 수 있습니다.

## 1. GitHub OAuth App 준비

### 이미 OAuth App이 있다면 콜백 URL부터 확인

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps**에서 사용할 앱을 엽니다.
2. **Authorization callback URL**을 확인합니다. GitHub는 로그인 후 돌아올 주소가 이 값과 같거나 그 하위 경로일 때만 허용합니다.

| 등록된 콜백 URL | 이 앱에서 사용 |
|---|---|
| `http://localhost:3000` | 그대로 사용 가능 |
| `http://localhost:3000/auth/github/callback` | 그대로 사용 가능 |
| 그 외 (예: `http://localhost:3000/api/auth/github/callback`) | 콜백 URL을 `http://localhost:3000/auth/github/callback`으로 바꾸거나 새 앱을 만드세요 |

### 새로 만든다면

1. **New OAuth App**을 누릅니다.
2. 다음처럼 입력합니다.
   - Application name: 자유 (예: `Plan & Do (local)`)
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
3. 생성 후 **Client ID**를 복사하고, **Generate a new client secret**으로 Client Secret을 만들어 복사합니다. Secret은 이때 한 번만 보입니다.

## 2. 환경 변수 (`.env.local`)

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```
MONGODB_URI=<MongoDB 접속 주소>
GITHUB_CLIENT_ID=<Client ID>
GITHUB_CLIENT_SECRET=<Client Secret>
APP_BASE_URL=http://localhost:3000
```

- `APP_BASE_URL`은 콜백 URL의 기준 주소입니다. 끝에 `/`를 붙이지 않습니다.
- **브라우저에서도 `APP_BASE_URL`과 같은 주소로 접속하세요.** `127.0.0.1:3000`으로 접속하면 앱이 자동으로 `localhost:3000`으로 옮겨 주지만, 처음부터 같은 주소를 쓰는 편이 안전합니다.
- 다른 프로젝트에서 복사해 온 `NEXT_PUBLIC_BASE_URL`, `SESSION_SECRET`은 이 앱에서 쓰지 않습니다. 남겨 둬도 문제는 없습니다.
- `GITHUB_CLIENT_SECRET`은 코드나 다른 파일에 적지 마세요. `.env.local`은 git에 올라가지 않습니다.
- 값을 바꾼 뒤에는 개발 서버를 다시 시작해야 반영됩니다.

## 3. 로그인 확인

1. `npm run dev`로 개발 서버를 켜고 `http://localhost:3000`에 접속합니다.
2. 로그인 화면에서 **GitHub로 로그인**을 누르고 GitHub에서 승인합니다.
3. 대시보드로 돌아오고, 오른쪽 위에 GitHub 아바타와 사용자명이 보이면 성공입니다.

로그인 화면에 오류가 보이면 다음을 확인하세요.

| 화면 메시지 원인 | 확인할 것 |
|---|---|
| 로그인 요청이 만료되었거나 올바르지 않음 (`error=state`) | `APP_BASE_URL`과 같은 주소로 접속했는지, 10분 안에 승인했는지 |
| GitHub 인증을 완료하지 못함 (`error=token`) | OAuth App의 콜백 URL, Client Secret이 맞는지 |
| 로그인 설정이 없음 (`error=config`) | `.env.local`의 세 변수와 서버 재시작 |
| GitHub에서 취소 (`error=denied`) | 다시 시도 |

GitHub 화면에 `redirect_uri is not associated with this application`이 보이면 1번의 콜백 URL 설정이 맞지 않는 것입니다.

## 4. 기존 데이터 옮기기 (마이그레이션)

로그인 기능 이전에 만든 목표·주간 계획·할 일에는 소유자가 없어서, 로그인 후에는 아무에게도 보이지 않습니다. 아래 순서로 본인 계정에 옮기세요.

1. **백업**: Atlas라면 클러스터의 Backup에서 스냅샷을 만들거나, `mongodump --uri "<MONGODB_URI>"`로 덤프를 받습니다.
2. **최신 코드로 개발 서버를 켜고 GitHub로 한 번 로그인**합니다. 마이그레이션은 로그인으로 만들어진 사용자에게 데이터를 붙입니다.
3. **로그인 직후 아무것도 만들지 마세요.** 이번 주 계획을 먼저 만들면 기존 데이터의 같은 주 계획과 충돌합니다.
4. 미리보기(dry-run, 변경 없음):
   ```
   npm run migrate:user-id -- --username <GitHub 사용자명>
   ```
   옮길 문서 수와, 삭제·생성될 인덱스 목록을 확인합니다.
5. 실제 적용:
   ```
   npm run migrate:user-id -- --username <GitHub 사용자명> --apply
   ```
6. 앱을 새로고침해 기존 데이터가 보이는지 확인합니다.

알아 둘 점:
- **재실행해도 안전합니다.** 소유자가 없는 문서만 처리하므로 중간에 실패해도 다시 실행하면 남은 것만 옮깁니다.
- **충돌하면 아무것도 바꾸지 않고 멈춥니다.** 본인 계정에 이미 같은 주의 주간 계획이 있으면 그 주 목록을 보여 주고 종료합니다(종료 코드 2). 해당 계획을 정리한 뒤 다시 실행하세요.
- **인덱스 정리:** `--apply`는 주간 계획의 옛 유일 인덱스(`weekStart_1`)를 지우고 사용자별 인덱스(`userId_1_weekStart_1`)를 만듭니다. 이때 스키마에 없는 인덱스도 함께 지우므로, Atlas에서 직접 만든 인덱스가 있다면 dry-run의 삭제 목록을 먼저 확인하세요.
- **마이그레이션 전 증상:** 기존 데이터가 보이지 않고, 기존 데이터와 같은 주의 계획을 새로 만들면 "이미 존재하는 항목입니다"(409)가 날 수 있습니다. 마이그레이션 후 해결됩니다.

## 5. 동작 방식 요약

- `/auth/github`: 로그인 위조 방지용 `state`를 쿠키에 저장하고 GitHub 승인 화면으로 보냅니다.
- `/auth/github/callback`: `state`를 확인하고 GitHub에서 사용자 정보(id, 사용자명, 아바타)를 받아 저장한 뒤 세션을 만듭니다. GitHub access token은 저장하지 않습니다.
- 세션: 무작위 토큰을 httpOnly 쿠키로 주고, DB에는 토큰의 해시만 저장합니다. 유효기간은 30일입니다.
- `/auth/logout`: DB의 세션 문서를 지우고 쿠키를 만료시킵니다. 같은 쿠키는 다시 쓸 수 없습니다.
- 로그인하지 않은 요청: 페이지는 `/login`으로, API는 401로 거부합니다.
