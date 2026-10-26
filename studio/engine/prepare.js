// Validate episode.json, resolve brand logos + host poses, merge the voice timeline -> build/data.js
// Usage: node engine/prepare.js episodes/<id>
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const STUDIO = path.resolve(__dirname, '..');
const epDir = path.resolve(process.argv[2] || '.');
const ep = JSON.parse(fs.readFileSync(path.join(epDir, 'episode.json'), 'utf8'));
const build = path.join(epDir, 'build');
fs.mkdirSync(build, { recursive: true });

// ---- validation: fail early with a readable message
const errors = [];
const TYPES = ['cover', 'headline', 'list', 'compare', 'stat', 'repo', 'code', 'chat', 'flow', 'cta', 'screen', 'article', 'tweet', 'photo'];
if (!ep.scenes?.length) errors.push('episode has no scenes');
if (ep.scenes?.[0]?.type !== 'cover') errors.push('scene 0 must be type "cover" (it is the thumbnail + hook)');
if (ep.scenes?.at(-1)?.type !== 'cta') errors.push('last scene must be type "cta"');
(ep.scenes || []).forEach((sc, i) => {
  if (!TYPES.includes(sc.type)) errors.push(`scene ${i}: unknown type "${sc.type}"`);
  if (!sc.lines?.length) errors.push(`scene ${i}: needs at least one voice line`);
  (sc.lines || []).forEach((l, j) => {
    if (!l.say) errors.push(`scene ${i} line ${j}: missing "say"`);
    const cap = l.cap ?? l.say ?? '';
    if ((cap.match(/\*/g) || []).length % 2) errors.push(`scene ${i} line ${j}: unbalanced *highlight* in "${cap}"`);
  });
});
if (!ep.sources?.length) errors.push('episode needs "sources" (title, url, date) — no source, no publish');
if (errors.length) { console.error('episode.json errors:\n - ' + errors.join('\n - ')); process.exit(1); }

// ---- logos: assets/logos/<slug>.(svg|png) > simple-icons > word badge
const slugs = new Set();
const walk = o => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'logo' && typeof v === 'string') slugs.add(v);
      else if (k === 'logos' && Array.isArray(v)) v.forEach(s => slugs.add(s));
      else walk(v);
    }
  }
};
walk(ep.scenes);
if (ep.scenes.some(s => s.type === 'repo')) slugs.add('github');

let si = {};
try { for (const v of Object.values(require(path.join(STUDIO, 'node_modules/simple-icons')))) if (v && v.slug) si[v.slug] = v; }
catch { console.warn('simple-icons not installed (run npm install in studio/) — using word badges'); }
// Brands simple-icons does not ship (trademark requests): word badge in brand colour.
const WORD = { openai: ['OpenAI', '000000'], microsoft: ['Microsoft', '0078d4'], xai: ['xAI', '000000'], slack: ['Slack', '4a154b'],
  canva: ['Canva', '00c4cc'], midjourney: ['Midjourney', '000000'], manus: ['Manus', '000000'], chatgpt: ['ChatGPT', '10a37f'] };

const logos = {}, missing = [];
for (const s of slugs) {
  const own = ['svg', 'png', 'webp'].map(e => path.join(STUDIO, 'assets/logos', `${s}.${e}`)).find(fs.existsSync);
  if (own) logos[s] = { kind: 'img', src: path.relative(path.join(STUDIO, 'engine'), own) };
  else if (si[s]) logos[s] = { kind: 'svg', path: si[s].path, hex: si[s].hex, title: si[s].title };
  else { logos[s] = { kind: 'word', title: (WORD[s] || [s])[0], hex: (WORD[s] || [, '15151f'])[1] }; missing.push(s); }
}
if (missing.length) console.warn(`logo dạng chữ (chưa có file logo): ${missing.join(', ')} — thêm studio/assets/logos/<slug>.svg để dùng logo thật`);

// ---- host poses
const hostDir = path.join(STUDIO, 'assets/host');
const poses = {};
if (fs.existsSync(hostDir)) for (const f of fs.readdirSync(hostDir)) if (/\.png$/.test(f)) poses[f.replace(/\.png$/, '')] = path.relative(path.join(STUDIO, 'engine'), path.join(hostDir, f));
ep.scenes.forEach((sc, i) => { if (sc.host && !poses[sc.host.pose]) console.warn(`scene ${i}: host pose "${sc.host.pose}" not found in assets/host`); });

// ---- timeline (from tts.py); without it, estimate from word count so layouts can be previewed
let tl;
const tlFile = path.join(build, 'timeline.json');
if (fs.existsSync(tlFile)) tl = JSON.parse(fs.readFileSync(tlFile, 'utf8'));
else {
  let t = 0.3; const lines = [];
  ep.scenes.forEach(sc => { t += 0.4; sc.lines.forEach(l => { const d = l.say.split(/\s+/).length * 0.32; lines.push([+t.toFixed(3), +(t + d).toFixed(3)]); t += d + 0.25; }); });
  tl = { lines, total: +(t + 1.5).toFixed(3), estimated: true };
  console.warn('no build/timeline.json yet — using estimated timing');
}
const nLines = ep.scenes.reduce((n, s) => n + s.lines.length, 0);
if (tl.lines.length !== nLines) { console.error(`timeline has ${tl.lines.length} lines but episode has ${nLines} — re-run tts.py`); process.exit(1); }

// ---- media: screen recordings -> 30 fps JPEG frames; images -> paths relative to the player
const ENGINE = path.join(STUDIO, 'engine');
const probe = f => { const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number); return { w, h }; };
const mediaErr = [];
ep.scenes.forEach((sc, i) => {
  const srcs = sc.type === 'photo' ? (sc.images || [sc.src]) : (sc.src ? [sc.src] : []);
  if (['screen', 'photo'].includes(sc.type) && !srcs.length) mediaErr.push(`scene ${i} (${sc.type}): needs "src"`);
  const files = srcs.map(s => path.resolve(epDir, s));
  files.forEach(f => { if (!fs.existsSync(f)) mediaErr.push(`scene ${i}: file not found ${f}`); });
  if (mediaErr.length || !files.length) return;
  const isVideo = f => /\.(mp4|mov|webm|m4v)$/i.test(f);
  if (sc.type === 'screen' && isVideo(files[0])) {
    const dir = path.join(build, 'media', `s${i}`);
    const stamp = JSON.stringify([files[0], fs.statSync(files[0]).mtimeMs, sc.from, sc.to, sc.speed]);
    if (!fs.existsSync(path.join(dir, '.stamp')) || fs.readFileSync(path.join(dir, '.stamp'), 'utf8') !== stamp) {
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      const a = [...(sc.from ? ['-ss', String(sc.from)] : []), ...(sc.to ? ['-to', String(sc.to)] : []), '-i', files[0],
        '-vf', `setpts=PTS/${sc.speed || 1},fps=30,scale='min(1080,iw)':-2`, '-q:v', '3', path.join(dir, '%05d.jpg')];
      execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
      fs.writeFileSync(path.join(dir, '.stamp'), stamp);
    }
    const frames = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length;
    sc._media = { dir: path.relative(ENGINE, dir), frames, ...probe(path.join(dir, '00001.jpg')) };
  } else {
    const m = files.map(f => ({ src: path.relative(ENGINE, f), ...probe(f) }));
    sc._media = sc.type === 'photo' ? m : m[0];
  }
});
if (mediaErr.length) { console.error('media errors:\n - ' + mediaErr.join('\n - ')); process.exit(1); }

const data = { ...ep, logos, host: { poses } };
fs.writeFileSync(path.join(build, 'data.js'), `window.EP = ${JSON.stringify(data)};\nwindow.TL = ${JSON.stringify(tl)};\n`);
console.log(`build/data.js: ${ep.scenes.length} scenes, ${nLines} lines, ${tl.total}s${tl.estimated ? ' (estimated)' : ''}`);
