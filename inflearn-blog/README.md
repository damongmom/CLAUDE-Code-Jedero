# blog-writer

주제 한 줄을 던지면 조사, 사실 검증, 초안 작성, 채점까지 한 번에 도는 Claude Code 스킬이다.
새 도구를 설치하지 않는다. 텍스트 파일 여섯 개가 전부다.

## 쓰는 법

이 폴더에서 Claude Code를 띄운다.

```bash
cd inflearn-blog
claude
```

명령 하나로 부른다. 주제 뒤에 조건을 줄바꿈해서 붙여도 된다
(터미널에서 줄을 바꾸려면 백슬래시 다음 Enter, 또는 Option+Enter).

```
/blog-writer 오사카 2박 3일 여행 일정 추천
- 첫날은 도톤보리 주변만
- 아이 동반이라 이동 최소화
```

끝나면 이 세 파일이 생긴다.

| 파일 | 내용 |
| --- | --- |
| `research.md` | 조사한 원자료. 항목마다 출처 URL이 달린다 |
| `post.md` | 최종 글. 검증을 통과한 사실만 들어간다 |
| `TODO.md` | 진행 기록. 실패한 접근도 남는다 |

## 구성

```
.claude/
├── skills/blog-writer/SKILL.md   명령 하나로 전체 절차를 부른다
├── agents/researcher.md          조사 담당 (haiku)
├── agents/fact-checker.md        검증 담당 (sonnet)
├── agents/post-critic.md         채점 담당
├── hooks/style-check.sh          저장된 글의 문체 규칙 검사
└── settings.json                 훅 등록
CLAUDE.md                         문체 규칙
```

동작 순서는 이렇다.

1. `researcher` 가 웹을 뒤져 `research.md` 를 만든다. 검색 결과는 이 에이전트 안에만 쌓이고
   내 대화창으로는 요약만 돌아온다.
2. `fact-checker` 가 `research.md` 의 항목을 원문으로 다시 확인한다. 확신이 없으면 탈락시킨다.
3. 통과한 사실로만 `post.md` 를 쓴다.
4. 저장되는 순간 훅이 돌아 문체 규칙 위반을 잡아낸다. 걸리면 Claude가 고쳐서 다시 저장한다.
5. `post-critic` 이 사실 정확성, 문체 준수, 구조 세 차원으로 채점한다.

조사와 검증은 **반드시 순서대로** 돈다. 동시에 띄우면 검증 담당이 아직 없는 파일을 보고
전부 탈락시킨다. SKILL.md에 그렇게 적어 뒀다.

## 문체 규칙 바꾸기

두 군데를 같이 고쳐야 한다. `CLAUDE.md` 는 Claude에게 부탁하는 쪽이고,
`.claude/hooks/style-check.sh` 는 지켰는지 검사하는 쪽이다.

```bash
# CLAUDE.md 에 규칙을 적고
# style-check.sh 에 검사를 추가한다
grep -q '금지어' "$file" && problems+="금지어 사용. "
```

훅으로 강제할 수 있는 건 **눈으로 확인되는 규칙**뿐이다.
"글을 깔끔하게 써줘" 같은 건 검사할 방법이 없으니 훅에 넣지 못한다.

훅만 따로 테스트하려면 이렇게 한다. 종료 코드가 2로 나오면 제대로 만든 것이다.

```bash
printf '대시 — 하나\n' > /tmp/t.md
echo '{"tool_input":{"file_path":"/tmp/t.md"}}' | .claude/hooks/style-check.sh
echo $?
```

## 필요한 것

- Claude Code (2.1.232에서 확인함)
- `jq` (macOS 15부터 기본 탑재다. `jq --version` 으로 먼저 확인할 것)
- 훅에 실행 권한. 안 되면 `chmod +x .claude/hooks/style-check.sh`

`.claude/skills/` 를 이 세션에서 처음 만든 경우에는 Claude Code를 한 번 재시작해야 인식된다.
이미 있는 폴더에 스킬을 추가하는 건 재시작이 필요 없다.

## 알아 둘 것

- 훅은 저장을 **막지 못한다.** 훅이 돌 때 파일은 이미 쓰여 있다. 쓰인 걸 잡아서 고치게 시키는 것이다.
- 훅은 내 계정 권한으로 셸 명령을 실행한다. 남의 저장소를 받아 쓸 땐
  `.claude/settings.json` 을 먼저 열어 볼 것.
- 한 번에 안 끝날 수 있다. 그래서 `TODO.md` 에 상태를 남긴다.
  끝까지 돌리고 싶으면 `/goal TODO.md의 모든 항목이 완료 표시될 때까지 계속한다. 또는 20턴 후 멈춘다` 를 건다.
- 채점 결과를 그대로 믿지 말 것. 흠을 찾으라고 시키면 멀쩡한 글에서도 찾아낸다.
  몇 편은 직접 읽어 보고 사람 판단과 맞는지 확인하는 게 좋다.
