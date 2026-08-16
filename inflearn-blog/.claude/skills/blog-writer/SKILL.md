---
description: 주제를 받아 블로그 글 한 편을 쓴다.
  정보를 모으고, 사실을 확인하고, 초안을 쓴다.
argument-hint: [주제와 조건]
disable-model-invocation: true
---

다음 주제로 블로그 글 한 편을 써라.

$ARGUMENTS

## 절차
1. researcher 서브에이전트로 조사를 맡긴다. 결과는 `research.md` 로 저장된다.
2. 조사가 끝나면 fact-checker 서브에이전트로 `research.md` 를 검증한다.
   fact-checker 는 researcher 의 결과물을 읽는다.
   **반드시 1번이 끝난 뒤에 띄운다.** 둘을 동시에 띄우면
   fact-checker 가 빈 파일을 보고 전부 탈락 처리한다.
3. 돌아온 요약만 읽는다. 원문을 다시 읽지 않는다.
4. 검증을 통과한 사실로만 초안을 쓴다.
5. `post.md` 로 저장한다.
6. post-critic 서브에이전트로 `post.md` 를 채점한다.
   지적받은 항목을 반영해 `post.md` 를 고친다.

## 진행 기록
- 시작할 때 `TODO.md` 를 만든다.
- 단계를 끝낼 때마다 `TODO.md` 를 갱신한다.
- 실패한 접근은 이유와 함께 남긴다.
- **검증까지 끝난 단계만** 완료로 표시한다.
