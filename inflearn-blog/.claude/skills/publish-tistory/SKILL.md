---
name: publish-tistory
description: Publish a post to the user's own Tistory blog (tistory.com) using the Claude-in-Chrome browser extension, reusing their existing login. Use this whenever the user wants to post, publish, upload, or 발행 an article to their 티스토리 블로그 — phrases like "티스토리에 글 올려줘", "티스토리에 이 글 발행해줘", "publish this to my Tistory", "tistory 포스팅해줘". Unlike Naver, Tistory IS reachable through the claude-in-chrome tools, so this skill drives the extension directly. Requires the user to already be logged into tistory.com in the Chrome that the extension controls.
---

# Publish to Tistory

Post an article to the user's Tistory blog through the **Claude-in-Chrome extension**
(the `mcp__claude-in-chrome__*` tools). Tistory is reachable by the extension (naver is not),
so no separate automation is needed — you drive the user's actual logged-in Chrome.

## Preconditions

- The user is **logged into tistory.com** in the Chrome the extension controls.
- Before any browser action, invoke the `claude-in-chrome` skill (loads the tools + guidance),
  then call `tabs_context_mcp` first.
- If tools are deferred, load them in ONE `ToolSearch`:
  `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__get_page_text`

## Inputs you need

1. **The content** (title + body). Write it in the user's voice; verify any factual claims before
   publishing under their real name. Follow their style rules if they have them (no em dash, no
   가운뎃점, mix `다`/`요` endings).
2. **Which blog**, if the account has more than one. Usually the default blog is fine.

## Workflow

### 1. Open the editor

- `tabs_context_mcp` to see current tabs, then navigate to `https://www.tistory.com`.
- Take a `screenshot`. Confirm the user is logged in (you'll see their blog name and a **글쓰기**
  button on the right). If a login screen shows instead, stop and ask the user to log in — never
  type their password.
- Click **글쓰기**. This opens the editor in a **new tab** (e.g. `https://<blog>.tistory.com/manage/newpost`).
  Call `tabs_context_mcp` again to get the new tab's id and act on that tab from here on.

### 2. Watch for a blocking dialog

Tistory sometimes shows a native "이어서 작성하시겠습니까?" (restore draft) dialog. Native
`confirm()` dialogs **freeze all extension commands**. If the editor doesn't respond after opening,
tell the user a dialog is likely blocking and ask them to dismiss it manually. Do not try to click
through unknown native dialogs blindly.

### 3. Fill the post

The editor is TinyMCE-based:

- **Title**: click the "제목을 입력하세요" area (near the top, ~y=129) and `type` the title.
- **Body**: click the large area below the title (~y=300) and `type` the body. Newlines in the
  `type` text become new paragraphs; use a blank line (`\n\n`) between paragraphs.
- Take a `screenshot` and verify the title and body rendered correctly before publishing.

### 4. Publish

- Click **완료** (bottom-right, ~x=1441 y=790). A publish panel slides up.
- In the panel, **공개** (public) is selected by default. Leave it unless the user asked for
  비공개/보호. Optionally set 카테고리/태그 if the user specified them.
- Click **공개 발행** (the black button, ~x=789 y=770).
- After publishing, Tistory redirects to 글 관리 (`/manage/posts/`) with the new post at the top,
  or you can open `https://<blog>.tistory.com/entry/<slug>`. Take a `screenshot` to confirm, and
  give the live post URL to the user.

### 5. Clean up

Close any tabs you created with `tabs_close_mcp` (leave the published-post tab open only if the
user wants to see it).

## Notes & failure modes

- **Coordinates drift** with window size and Tistory updates. Treat the coordinates above as a
  starting point — always screenshot and adjust so the cursor tip lands on the target. If clicks
  miss, re-screenshot and recompute.
- **Do not click** anything that triggers a native alert/confirm/prompt; those freeze the session.
- **Irreversible action**: 공개 발행 makes the post public. The user asking to "publish" is your
  go-ahead, but if anything about the content is uncertain, show them the filled screenshot first.
- Deleting a post is destructive — never do it; direct the user to do it themselves.
