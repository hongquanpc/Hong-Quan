// Render index.html frame-by-frame into an MP4.
// Usage: node render.js [out.mp4] [--fps 30] [--stills 1,5.5,20]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const out = args[0] && !args[0].startsWith('--') ? args[0] : 'video_noaudio.mp4';
const fps = +opt('--fps', 30);
const stills = opt('--stills', null);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);

  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(t => window.renderAt(t), t);
      await page.screenshot({ path: `still_${t}.png` });
    }
    await browser.close();
    return;
  }

  const duration = await page.evaluate(() => window.DURATION);
  const total = Math.round(duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done:', out);
})();
