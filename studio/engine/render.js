// Render an episode with Playwright + ffmpeg.
//   node engine/render.js episodes/<id>                 -> build/video.mp4 (silent)
//   node engine/render.js episodes/<id> --thumb         -> build/thumbnail.png
//   node engine/render.js episodes/<id> --stills 1,5,9  -> build/still_<t>.png
//   node engine/render.js episodes/<id> --qa            -> build/layout.json + build/qa_frames/*.png
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const epDir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const fps = +opt('--fps', 30);
const build = path.join(epDir, 'build');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`file://${path.join(__dirname, 'player.html')}?data=${encodeURIComponent('file://' + path.join(build, 'data.js'))}`);
  await page.waitForFunction(() => window.STUDIO_READY || false, null, { timeout: 15000 }).catch(() => {});
  if (errors.length) { console.error('player error:', errors.join('\n')); process.exit(1); }
  await page.evaluate(() => document.fonts.ready);
  // let every logo / pose image finish loading
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  const duration = await page.evaluate(() => window.DURATION);

  if (args.includes('--thumb')) {
    await page.evaluate(() => window.renderAt(0));
    await page.screenshot({ path: path.join(build, 'thumbnail.png') });
  } else if (opt('--stills')) {
    for (const t of opt('--stills').split(',').map(Number)) {
      await page.evaluate(t => { window.renderAt(t); return Promise.all([...document.images].map(i => i.complete ? 0 : i.decode().catch(() => 0))); }, t);
      await page.screenshot({ path: path.join(build, `still_${t}.png`) });
    }
  } else if (args.includes('--qa')) {
    // check the middle and the end of every voice line (when most elements are on screen)
    const tl = await page.evaluate(() => window.TL);
    const times = tl.lines.flatMap(([s, e]) => [(s + e) / 2, Math.max(s, e - 0.05)]);
    const issues = [];
    const dir = path.join(build, 'qa_frames');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    for (const [i, [s, e]] of tl.lines.entries()) {
      await page.evaluate(t => { window.renderAt(t); return Promise.all([...document.images].map(i => i.complete ? 0 : i.decode().catch(() => 0))); }, Math.max(s, e - 0.05));
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(2, '0')}.png`) });
    }
    for (const t of times) issues.push(...await page.evaluate(t => window.layoutIssues(t), t));
    const uniq = [...new Set(issues)];
    fs.writeFileSync(path.join(build, 'layout.json'), JSON.stringify(uniq, null, 1));
    console.log(`layout: ${uniq.length} issue(s)`);
  } else {
    const total = Math.round(duration * fps);
    const out = path.join(build, 'video.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < total; f++) {
      await page.evaluate(t => { window.renderAt(t); return Promise.all([...document.images].map(i => i.complete ? 0 : i.decode().catch(() => 0))); }, f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 300 === 0) console.log(`frame ${f}/${total}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
