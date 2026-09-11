---
name: handoff
description: 현재 세션의 작업 상태를 HANDOFF.md에 기록해 /clear 후 새 세션이 이어받게 한다. 작업이 끝났으면 HANDOFF.md를 지운다.
disable-model-invocation: true
---

# /handoff

세션을 짧게 끊어 쓰기 위한 인수인계 스킬이다. 이 세션이 알고 있고 git이 말해주지 못하는 것만 `HANDOFF.md`에 남긴다. 새 세션은 SessionStart 훅으로 이 파일을 자동으로 받는다.

## 규칙 (압축 시 앞부분만 남으므로 여기에 둔다)

1. git이 보여주는 것(브랜치, 변경 파일 목록, 최근 커밋)은 쓰지 않는다. 다음 세션이 시작할 때 자동으로 본다.
2. 다른 문서를 복사하지 않는다. 스펙, 계획, diff는 경로로 가리킨다.
3. 확인하지 않은 것은 "미확인"이라고 표시한다. 다음 세션은 이 문서를 재확인하지 않고 믿는다.
4. 150줄을 넘기지 않는다.
5. 이후 모든 세션에 적용될 결정은 HANDOFF.md에 두지 않는다. CLAUDE.md(규칙) 또는 DECISIONS.md(이유)로 올린다.
6. 비밀값은 쓰지 않는다.
7. 작업이 끝났으면 HANDOFF.md를 남기지 않는다. 남은 일이 없을 때 사용자에게 삭제 여부를 묻는다.
8. 애매한 것이 있으면 추측하지 말고 `AskUserQuestion`으로 묻는다. 승격 확인도 이 도구로 한다.
9. Always write Korean (and other non-ASCII) strings in tool-call parameters as literal UTF-8; never as `\uXXXX` unicode escapes. `AskUserQuestion`의 질문과 선택지에도 그대로 적용한다.

## 절차

1. 프로젝트 루트의 `HANDOFF.md`를 확인한다. 있으면 읽는다. 갱신일 때 "시도했다 실패한 것"은 지우지 않고 누적한다.
2. 승격 확인. 이번 세션에서 내린 결정 중 다음 작업에도 계속 적용될 것이 있으면 후보를 `AskUserQuestion`(multiSelect)으로 묻는다. 후보가 없으면 묻지 않고 넘어간다.
   - 규칙으로 표현되는 것("X는 항상 Y") → 프로젝트 `CLAUDE.md`에 한 줄 append
   - 이유를 남겨야 하는 것 → `DECISIONS.md`에 append. 파일이 없으면 만든다. 형식:
     ```
     ## YYYY-MM-DD - 제목
     - 결정:
     - 이유:
     - 버린 대안:
     ```
3. 완료 여부. "다음 할 일"에 쓸 항목이 없으면 `AskUserQuestion`으로 "이 작업이 끝났나요? HANDOFF.md를 삭제할까요?"를 묻는다. 삭제를 택하면 `HANDOFF.md`를 지우고 "HANDOFF.md를 삭제했습니다." 한 줄만 출력하고 끝낸다. 남은 일이 있으면 묻지 않는다.
4. `.claude/skills/handoff/template.md` 골격대로 작성한다. 괄호 안 안내문은 지우고 내용만 남긴다. `updated`에는 작성 시각을 `date "+%Y-%m-%d %H:%M:%S"` 결과 그대로 초 단위까지 쓴다.
5. 자체 검증. 규칙 1~6과 9를 하나씩 확인하고 어긋난 부분을 고친다.
6. 출력은 두 줄로 끝낸다. 파일 경로 한 줄, 그리고 "이제 `/clear` 하세요. 새 세션에 자동으로 주입됩니다."
