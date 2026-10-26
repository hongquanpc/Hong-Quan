// Record a browser demo from a shot script, with a visible cursor and click ripples.
//   node engine/record.js episodes/<id>/shots/<name>.json      -> episodes/<id>/media/<name>.mp4 (+ screenshots)
//   node engine/record.js --login [url ...]                     -> open the recording profile to sign in by hand
//
// The recording profile (~/.aitoday-rec-profile) is a separate Chrome profile: sign in once with the
// accounts used for demos (ChatGPT, Gemini, Claude…). It never touches your everyday Chrome profile.
//
// Frames come from the Chrome DevTools screencast at device-pixel resolution (sharp on a 1080p video),
// not Playwright's recordVideo (which is capped at 800x800).
async function startScreencast(ctx, page, dir) {
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    const file = path.join(dir, `f${String(frames.length).padStart(6, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 2000, maxHeight: 2000, everyNthFrame: 1 });
  return async () => { await cdp.send('Page.stopScreencast').catch(() => {}); return frames; };
}

// Shot script:
// { "url": "https://…", "device": "phone" | "desktop", "steps": [
//     {"wait": 1000}, {"click": "text=Sign in" | "css selector"}, {"type": "prompt text", "into": "selector", "delay": 45},
//     {"press": "Enter"}, {"waitFor": "selector", "timeout": 60000}, {"scroll": 600}, {"hover": "selector"},
//     {"highlight": "exact phrase on the page"}, {"screenshot": "name"}, {"goto": "https://…"} ] }
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROFILE = process.env.REC_PROFILE || path.join(os.homedir(), '.aitoday-rec-profile');
const DEVICES = {
  phone: { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: false,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
};

// Fake cursor + click ripple, injected into every page so it shows in the recording.
const CURSOR = () => {
  if (window.__cursor) return;
  window.__cursor = true;
  const add = () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -4px;pointer-events:none;transition:transform .05s linear';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
    addEventListener('mousedown', e => {
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;z-index:2147483646;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(108,75,244,.35);border:3px solid #6c4bf4;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out`;
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(2)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', add) : add();
};

async function launch(device) {
  const d = DEVICES[device || 'desktop'];
  const opts = { headless: !!process.env.HEADLESS, ...d, ignoreDefaultArgs: ['--enable-automation'], args: [`--force-device-scale-factor=${d.deviceScaleFactor}`] };
  // Real Chrome signs in to Google/OpenAI more reliably than the bundled Chromium; fall back when it is missing.
  try { return await chromium.launchPersistentContext(PROFILE, { ...opts, channel: 'chrome' }); }
  catch { return await chromium.launchPersistentContext(PROFILE, opts); }
}

async function moveTo(page, locator) {
  const b = await locator.boundingBox();
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 18 });
  return b;
}

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--login') {
    const ctx = await launch('desktop');
    for (const u of args.slice(1).length ? args.slice(1) : ['https://chatgpt.com', 'https://gemini.google.com', 'https://claude.ai'])
      await (await ctx.newPage()).goto(u).catch(() => {});
    console.log(`Profile: ${PROFILE}\nĐăng nhập các tài khoản dùng để quay, rồi đóng cửa sổ Chrome.`);
    await new Promise(r => ctx.on('close', r));
    return;
  }

  const shotFile = path.resolve(args[0]);
  const shot = JSON.parse(fs.readFileSync(shotFile, 'utf8'));
  const name = path.basename(shotFile, '.json');
  const epDir = path.dirname(path.dirname(shotFile));
  const mediaDir = path.join(epDir, 'media');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  fs.mkdirSync(mediaDir, { recursive: true });

  const ctx = await launch(shot.device);
  await ctx.addInitScript(CURSOR);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(shot.url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(CURSOR);
  const stop = await startScreencast(ctx, page, tmp);
  await page.mouse.move(DEVICES[shot.device || 'desktop'].viewport.width / 2, 200);
  await page.waitForTimeout(800);

  for (const s of shot.steps || []) {
    const loc = sel => page.locator(sel).first();
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.goto) { await page.goto(s.goto, { waitUntil: 'domcontentloaded' }); await page.evaluate(CURSOR); }
    if (s.hover) await moveTo(page, loc(s.hover));
    if (s.click) { await moveTo(page, loc(s.click)); await page.waitForTimeout(250); await loc(s.click).click(); }
    if (s.type) {
      if (s.into) { await moveTo(page, loc(s.into)); await loc(s.into).click(); }
      await page.keyboard.type(s.type, { delay: s.delay ?? 45 });
    }
    if (s.press) await page.keyboard.press(s.press);
    if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: s.timeout ?? 60000 });
    if (s.scroll) await page.mouse.wheel(0, s.scroll);
    if (s.highlight) await page.evaluate(phrase => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        const i = n.data.indexOf(phrase);
        if (i < 0) continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + phrase.length);
        const m = document.createElement('mark'); m.style.cssText = 'background:#ffe066;color:inherit;padding:0 2px;border-radius:3px';
        r.surroundContents(m); m.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
    }, s.highlight);
    if (s.screenshot) await page.screenshot({ path: path.join(mediaDir, `${name}-${s.screenshot}.png`) });
    await page.waitForTimeout(s.after ?? 400);
  }
  await page.waitForTimeout(800);
  const frames = await stop();
  await ctx.close();
  // the screencast only sends a frame when the page changes: hold each frame until the next one
  const end = frames.at(-1).t + 0.8;
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
  fs.writeFileSync(path.join(tmp, 'list.txt'), list);
  const out = path.join(mediaDir, `${name}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'),
    '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('recorded', path.relative(process.cwd(), out));
})();
