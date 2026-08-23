// Publish a post to NAVER Blog by reusing the local Chrome login (via decrypted
// cookies) in a clean Playwright browser. Naver.com is blocked by Claude-in-Chrome,
// so we drive our own Chromium instead. No password is ever typed — the cookies
// carry the existing session.
//
// Usage:
//   node publish_naver.mjs --cookies <naver_cookies.json> --content <content.json> [--blog-id <id>] [--dry-run]
//
// content.json shape:
//   { "title": "글 제목", "body": ["문단1", "", "문단2", ...], "blogId": "eddy5360" (optional) }
//   - body is an array of lines; an empty string "" inserts a blank line between paragraphs.
//   - blogId here or --blog-id overrides auto-detection.
//
// --dry-run fills the editor and screenshots but stops BEFORE the final 발행 click.

import { chromium } from 'playwright';
import fs from 'fs';

function arg(flag, def = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DRY = process.argv.includes('--dry-run');
const cookiesPath = arg('--cookies');
const contentPath = arg('--content');
if (!cookiesPath || !contentPath) {
  console.error('Required: --cookies <json> --content <json>');
  process.exit(1);
}
const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8')).map(c => ({ ...c, sameSite: 'Lax' }));
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const TITLE = content.title;
const BODY = content.body;
let blogId = arg('--blog-id', content.blogId || null);
const SHOT = process.env.SHOT_DIR || '.';

if (!TITLE || !Array.isArray(BODY)) {
  console.error('content.json must have "title" (string) and "body" (array of lines)');
  process.exit(1);
}

const browser = await chromium.launch({ headless: false, channel: 'chrome',
  args: ['--no-first-run', '--no-default-browser-check'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
await ctx.addCookies(cookies);
const page = await ctx.newPage();

// verify login + auto-detect blogId if needed
await page.goto('https://blog.naver.com/MyBlog.naver', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
if (page.url().includes('nidlogin.login')) {
  console.error('NOT LOGGED IN — the injected cookies did not carry a valid session. '
    + 'Re-run decrypt_naver_cookies.py after logging into naver.com in Chrome.');
  await browser.close(); process.exit(3);
}
if (!blogId) {
  const m = page.url().match(/blog\.naver\.com\/([A-Za-z0-9_-]+)/);
  if (m && m[1] && m[1] !== 'MyBlog.naver') blogId = m[1];
}
if (!blogId) { console.error('Could not determine blogId; pass --blog-id.'); await browser.close(); process.exit(4); }
console.error('[publish] blogId =', blogId);

// open the write editor
await page.goto(`https://blog.naver.com/${blogId}?Redirect=Write`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const frame = page.frame({ name: 'mainFrame' });
if (!frame) { console.error('editor mainFrame not found'); await browser.close(); process.exit(5); }

// dismiss "작성 중인 글이 있습니다" draft-restore popup -> 취소 (exact match; substring would hit 취소선)
try {
  const cancel = frame.getByRole('button', { name: '취소', exact: true });
  await cancel.waitFor({ state: 'visible', timeout: 4000 });
  await cancel.click();
  await page.waitForTimeout(800);
} catch { /* no popup */ }

// close 도움말(help) panel so it doesn't intercept the publish button
try {
  const help = frame.locator('.se-help-panel-close-button');
  if (await help.isVisible({ timeout: 2500 })) { await help.click(); await page.waitForTimeout(600); }
} catch { /* no help panel */ }

// title
await page.mouse.click(600, 248); await page.waitForTimeout(400);
await page.keyboard.insertText(TITLE); await page.waitForTimeout(400);

// body
await page.mouse.click(600, 362); await page.waitForTimeout(400);
for (let i = 0; i < BODY.length; i++) {
  if (BODY[i]) await page.keyboard.insertText(String(BODY[i]));
  if (i < BODY.length - 1) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); }
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOT}/naver-filled.png` });

if (DRY) {
  console.log(JSON.stringify({ dryRun: true, blogId, filled: true, screenshot: `${SHOT}/naver-filled.png` }));
  await browser.close(); process.exit(0);
}

// open publish layer (top button)
await frame.locator('[data-click-area="tpb.publish"]').click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SHOT}/naver-publish-layer.png` });

// find the layer's confirm 발행 button (distinct from the top one)
const cands = await frame.evaluate(() =>
  [...document.querySelectorAll('button')]
    .filter(b => /발행/.test(b.innerText || ''))
    .map(b => { const r = b.getBoundingClientRect();
      return { text: (b.innerText || '').replace(/\s+/g, ' ').trim(), cls: b.className,
        dca: b.getAttribute('data-click-area'), vis: r.width > 0 && r.height > 0,
        x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })
    .filter(b => b.vis));
const confirm = cands.find(b => b.dca === 'tpb*i.publish')
             || cands.find(b => /confirm_btn/.test(b.cls))
             || cands.find(b => b.text === '발행' && b.dca !== 'tpb.publish');
if (!confirm) { console.error('confirm 발행 button not found', JSON.stringify(cands)); await browser.close(); process.exit(6); }
await page.mouse.click(confirm.x, confirm.y);

// wait for redirect to the published post
await page.waitForTimeout(6000);
const url = page.url();
await page.screenshot({ path: `${SHOT}/naver-result.png` });
const ok = /blog\.naver\.com\/[^?]+\/\d+/.test(url);
console.log(JSON.stringify({ published: ok, url, title: await page.title() }));
await page.waitForTimeout(1200);
await browser.close();
process.exit(ok ? 0 : 7);
