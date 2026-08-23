---
name: publish-naver-blog
description: Publish a post to the user's own NAVER Blog (blog.naver.com) by reusing their existing Chrome login through Playwright browser automation. Use this whenever the user wants to post, publish, upload, or 발행 an article to their 네이버 블로그 — phrases like "네이버 블로그에 글 올려줘", "네이버에 이 글 발행해줘", "publish this to my Naver blog", "naver blog 포스팅". This is the ONLY reliable way to post to Naver, because the Claude-in-Chrome extension blocks naver.com; do not attempt naver posting with claude-in-chrome tools. macOS only. Requires the user to already be logged into naver.com in Chrome with "로그인 상태 유지" so the session persists.
---

# Publish to NAVER Blog

Post an article to the user's NAVER Blog. Naver blocks the Claude-in-Chrome extension at the
domain level, so this skill drives a **separate Playwright Chromium** and reuses the user's
**already-logged-in** Chrome session by decrypting the local NAVER cookies. No password is ever
typed — the existing session cookies carry the login.

## Preconditions (check these first)

- **macOS only.** Cookie decryption reads the "Chrome Safe Storage" key from the macOS Keychain.
- The user must be **logged into naver.com in Chrome** with **로그인 상태 유지** (keep-signed-in)
  checked, so `NID_AUT`/`NID_SES` persist to disk. If they only logged in for this session without
  that checkbox, the cookies may not be on disk and login will fail — ask them to check it and re-login.
- `node` and `python3` (with the `cryptography` package) available. Playwright is installed on first run.

## Inputs you need from the user

1. **The content.** Either they give you the text, or you write it. Never fabricate facts in a
   post published under the user's real name — verify anything factual first.
2. **blogId** (the part in `blog.naver.com/<blogId>`). The script auto-detects it from the logged-in
   session, so you usually don't need to ask. Ask only if auto-detection fails.

## Workflow

Run everything from the skill's `scripts/` directory. Use an absolute path — `SKILL_DIR` below is
`~/.claude/skills/publish-naver-blog`.

### 1. Write the content JSON

Create a `content.json` (put it in a scratch/temp dir, not in the skill). `body` is an array of
lines; an empty string `""` makes a blank line between paragraphs. Keep the writing in the user's
voice; follow their style rules (no em dash, no 가운뎃점, mix `다`/`요` endings) when they have them.

```json
{
  "title": "글 제목",
  "body": [
    "첫 문단.",
    "",
    "1. 소제목",
    "소제목에 대한 설명 문단.",
    "",
    "마무리 문단."
  ]
}
```

### 2. Install deps once (idempotent)

```bash
cd "$SKILL_DIR/scripts" && [ -d node_modules/playwright ] || npm install
python3 -c "import cryptography" 2>/dev/null || pip3 install cryptography
```

### 3. Decrypt the live NAVER cookies

```bash
cd "$SKILL_DIR/scripts"
python3 decrypt_naver_cookies.py /tmp/naver_cookies.json
```

This picks the Chrome profile with the most naver cookies, decrypts them, and writes the JSON.
A macOS **Keychain "allow" prompt may appear** the first time — tell the user to click Allow.
If it prints a NID_AUT/NID_SES warning, the session isn't logged in; stop and fix that first.

### 4. Dry-run first (fills the editor, does NOT publish)

Publishing is public and hard to undo, so **always dry-run once** and look at the screenshot before
the real publish, unless the user explicitly says to skip it.

```bash
cd "$SKILL_DIR/scripts"
SHOT_DIR=/tmp node publish_naver.mjs --cookies /tmp/naver_cookies.json --content /tmp/content.json --dry-run
```

Open `/tmp/naver-filled.png` and confirm the title and body look right (correct text, no stray
strikethrough, paragraphs separated).

### 5. Publish for real

```bash
cd "$SKILL_DIR/scripts"
SHOT_DIR=/tmp node publish_naver.mjs --cookies /tmp/naver_cookies.json --content /tmp/content.json
```

On success it prints `{"published": true, "url": "https://blog.naver.com/<id>/<postno>", ...}`.
Give that URL to the user. `/tmp/naver-result.png` shows the live post.

### 6. Clean up

Delete the decrypted cookie file — it contains the real session tokens:

```bash
rm -f /tmp/naver_cookies.json
```

## How it works (so you can debug it)

- `decrypt_naver_cookies.py` — finds the logged-in profile, reads the Keychain key, PBKDF2-derives
  the AES-128 key, decrypts only `*.naver.com` cookies (stripping the 32-byte domain-hash prefix that
  newer Chrome prepends), writes Playwright-shaped cookie JSON.
- `publish_naver.mjs` — launches Chrome via Playwright, `addCookies`, verifies login at
  `MyBlog.naver` (auto-detects blogId), opens `?Redirect=Write`, then in the `mainFrame`:
  dismisses the "작성 중인 글이 있습니다" popup (matching **exactly** "취소" — a substring match would
  hit the "취소선"/strikethrough toolbar button), closes the 도움말 help panel (it overlaps the publish
  button), types title + body, clicks the top `[data-click-area="tpb.publish"]` to open the publish
  layer, then the layer's confirm button `[data-click-area="tpb*i.publish"]`.

## Common failures

- **Redirected to `nidlogin.login`** → not logged in on disk. Log into naver.com in Chrome with
  로그인 상태 유지, then re-run step 3.
- **Keychain read fails** → a prompt was dismissed; re-run and click Allow.
- **All body text has strikethrough** → an old bug from matching "취소" as a substring; the script
  already uses `exact: true`. If you edit the popup handling, keep it exact.
- **Confirm button not found** → Naver changed the publish layer; re-dump visible `발행` buttons in
  `mainFrame` and update the `data-click-area` selector.
