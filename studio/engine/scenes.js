// aitoday.vn studio: scene library + timeline player.
// Every scene type turns an episode.json scene into DOM. Elements are timed to voice lines:
// L(j) = absolute start time of the scene's j-th voice line (from build/data.js -> TL).
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = s => esc(s).replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');
  const el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  let LOGOS = {};

  function icon(name, size = 64, color = 'currentColor', sw = 2) {
    return `<svg viewBox="0 0 24 24" class="ico" width="${size}" height="${size}" style="color:${color};stroke-width:${sw}">${ICONS[name] || ICONS.sparkles}</svg>`;
  }
  function brand(slug, size = 120) {
    const L = LOGOS[slug] || { kind: 'word', title: slug, hex: '15151f' };
    if (L.kind === 'svg') return `<div class="brand" data-box style="width:${size}px;height:${size}px"><svg viewBox="0 0 24 24"><path fill="#${L.hex}" d="${L.path}"/></svg></div>`;
    if (L.kind === 'img') return `<div class="brand" data-box style="width:${size}px;height:${size}px"><img src="${L.src}"></div>`;
    return `<div class="brand word" data-box style="height:${size}px;font-size:${Math.round(size * 0.3)}px;background:#${L.hex || '15151f'}">${esc(L.title)}</div>`;
  }
  // an item's visual: a brand logo ({logo}) or an icon tile ({icon,color})
  function badge(item, size, color) {
    if (item.logo) return brand(item.logo, size);
    return `<div class="icbox" style="width:${size}px;height:${size}px;background:${item.color || color || 'var(--purple)'}">${icon(item.icon || 'sparkles', Math.round(size * 0.55), '#fff')}</div>`;
  }
  function beat(node, anim, at, dur) {
    node.classList.add('a', anim);
    node.style.animationDelay = at + 's';
    if (dur) node.style.animationDuration = dur + 's';
    return node;
  }
  function header(sc, root, L) {
    if (!sc.title) return;
    const h = el(`<div class="header">${sc.num !== undefined ? `<div class="num">${esc(sc.num)}</div>` : ''}<div>${rich(sc.title)}</div></div>`);
    root.appendChild(beat(h, 'down', L(0) - 0.15));
  }
  const COLORS = ['var(--purple)', 'var(--orange)', 'var(--green)', 'var(--blue)', 'var(--red)'];

  // ------------------------------------------------------------------ scene types
  const SCENES = {
    // First scene. Frame 0 is the thumbnail; while the hook is spoken it zooms, flashes and shakes.
    cover(sc, root) {
      const lines = sc.headline.map((x, i, a) => typeof x === 'string' ? { text: x } : x);
      const sizes = lines.map((x, i) => x.size || (i === lines.length - 1 && lines.length > 2 ? 104 : 140));
      root.innerHTML = `
        <div class="cvflash abs" style="inset:-60px;opacity:0;background:radial-gradient(circle at 50% 50%,transparent 45%,rgba(229,72,77,.9) 100%)"></div>
        <div class="cx" style="top:170px"><div class="pill" data-box style="background:var(--red);color:#fff;font-size:38px;padding:16px 36px">${esc(sc.tag || '🔥 HOT')}</div></div>
        <div class="abs" style="left:70px;top:300px;width:940px">
          ${lines.map((x, i) => `<div class="cv-line ${i === lines.length - 1 ? 'cvlast' : ''}" style="font-size:${sizes[i]}px;margin-top:${i ? 14 : 0}px;color:${x.color || (i === lines.length - 1 && lines.length > 2 ? 'var(--red)' : 'var(--ink)')}">${rich(x.text)}</div>`).join('')}
        </div>
        ${(sc.logos || []).length ? `<div class="abs row" style="left:80px;top:${sc.logosTop || 960}px;gap:26px">${sc.logos.map((s, i) => `<div style="rotate:${i % 2 ? 5 : -5}deg">${brand(s, 150)}</div>`).join('')}</div>` : ''}
        ${sc.note ? `<div class="abs" style="left:80px;top:1250px;rotate:-3deg"><span class="pill" data-box style="background:var(--dark);color:#fff;font-size:34px">${esc(sc.note)}</span></div>` : ''}
        ${sc.sticker ? `<div class="cvstop abs" style="left:500px;top:830px;opacity:0;z-index:3"><span class="pill" style="background:var(--yellow);color:var(--ink);font-size:46px;font-weight:900;padding:18px 34px;box-shadow:0 14px 34px rgba(0,0,0,.25)">${esc(sc.sticker)}</span></div>` : ''}`;
      const flash = root.querySelector('.cvflash'), stop = root.querySelector('.cvstop'), last = root.querySelector('.cvlast');
      return (t, start, end) => {
        const lt = t - start, p = lt / (end - start);
        root.style.transform = `scale(${1 + 0.06 * Math.max(0, p)})`;
        flash.style.opacity = 0.35 * Math.max(0, Math.sin(lt * Math.PI * 2.2)) * Math.min(1, lt * 4);
        if (last) last.style.transform = p > 0.5 ? `translateX(${8 * Math.sin(lt * 60)}px)` : 'none';
        if (stop) { const sp = Math.min(1, Math.max(0, (lt - 0.12) / 0.25)); stop.style.opacity = sp; stop.style.transform = `rotate(8deg) scale(${sp ? 1 + 1.4 * (1 - sp) : 0})`; }
      };
    },

    // Big statement with brand logos: "OpenAI vừa ra mắt …"
    headline(sc, root, L) {
      if (sc.kicker) root.appendChild(beat(el(`<div class="cx" style="top:160px"><div class="pill" data-box style="color:${sc.kickerColor || 'var(--red)'}">${esc(sc.kicker)}</div></div>`), 'down', L(0) - 0.1));
      const logos = sc.logos || [];
      if (logos.length) {
        const row = el(`<div class="cx" style="top:300px"><div class="row" style="gap:40px">${logos.map(s => `<div>${brand(s, logos.length > 2 ? 150 : 190)}</div>`).join('')}</div></div>`);
        [...row.firstElementChild.children].forEach((c, i) => beat(c, 'pop', L(0) + i * 0.15));
        root.appendChild(row);
      }
      const top = logos.length ? 560 : 360;
      root.appendChild(beat(el(`<div class="abs" style="left:70px;right:70px;top:${top}px;text-align:center;font-size:${sc.size || 76}px;font-weight:900;letter-spacing:-1.5px;line-height:1.15">${rich(sc.text)}</div>`), 'up', L(0) + 0.25));
      if (sc.sub) root.appendChild(beat(el(`<div class="card abs" data-box style="left:110px;width:860px;top:${sc.subTop || top + 300}px;padding:34px 44px;font-size:38px;font-weight:600;line-height:1.35;text-align:center">${rich(sc.sub)}</div>`), 'up', L(sc.subLine ?? 1)));
    },

    // 2-4 numbered/iconed cards appearing one per line
    list(sc, root, L) {
      header(sc, root, L);
      const items = sc.items, top = sc.top || 300, gap = Math.min(250, (1090 - top) / items.length);
      items.forEach((it, i) => {
        const card = el(`<div class="li card" data-box style="top:${top + i * gap}px;min-height:${gap - 26}px">
          ${badge(it, 110, COLORS[i % COLORS.length])}
          <div><div class="t">${rich(it.title)}</div>${it.sub ? `<div class="s">${rich(it.sub)}</div>` : ''}</div></div>`);
        root.appendChild(beat(card, 'right', L(it.line ?? i + 1)));
      });
    },

    // A vs B with rows; winner gets a check
    compare(sc, root, L) {
      header(sc, root, L);
      const side = (s, x) => `<div class="abs" style="left:${x}px;top:290px;width:400px;text-align:center">
          <div style="display:flex;justify-content:center">${s.logo ? brand(s.logo, 150) : badge(s, 150)}</div>
          <div style="font-size:42px;font-weight:900;margin-top:18px">${esc(s.name)}</div></div>`;
      root.appendChild(beat(el(side(sc.left, 60)), 'left', L(0)));
      root.appendChild(beat(el(side(sc.right, 620)), 'right', L(0) + 0.2));
      root.appendChild(beat(el(`<div class="abs" style="left:480px;top:340px;width:120px;height:120px;border-radius:50%;background:var(--yellow);display:grid;place-items:center;font-size:44px;font-weight:900;box-shadow:0 10px 24px rgba(255,180,0,.4)">VS</div>`), 'pop', L(0) + 0.4));
      sc.rows.forEach((r, i) => {
        const y = 590 + i * 125, at = L(r.line ?? i + 1);
        const cell = (txt, x, win) => `<div class="card abs" data-box style="left:${x}px;top:${y + 34}px;width:430px;height:76px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:32px;font-weight:700;${win ? 'outline:5px solid var(--green)' : ''}">${win ? icon('check', 34, 'var(--green)', 3) : ''}${rich(txt)}</div>`;
        const g = el(`<div class="abs" style="left:0;top:0;width:1080px;height:1920px;pointer-events:none">
          <div class="cx" style="top:${y - 4}px"><span style="font-size:26px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px">${esc(r.label)}</span></div>
          ${cell(r.left, 70, r.win === 'left')}${cell(r.right, 580, r.win === 'right')}</div>`);
        root.appendChild(beat(g, 'up', at));
      });
    },

    // 1-2 big numbers that count up ("10 phút" vs "2 ngày")
    stat(sc, root, L) {
      header(sc, root, L);
      const counters = [];
      sc.items.forEach((it, i) => {
        const y = (sc.items.length === 1 ? 380 : 300) + i * 380, at = L(it.line ?? i);
        const card = el(`<div class="card abs" data-box style="left:110px;width:860px;top:${y}px;height:320px;display:flex;align-items:center;gap:40px;padding:0 56px">
          ${badge(it, 150, it.color || COLORS[i])}
          <div><div class="val" style="font-size:118px;font-weight:900;letter-spacing:-3px;line-height:1;color:${it.color || 'var(--ink)'}">${esc(it.value)}</div>
          <div style="font-size:36px;font-weight:700;color:var(--muted);margin-top:12px">${rich(it.label)}</div></div></div>`);
        root.appendChild(beat(card, i ? 'right' : 'left', at));
        const m = String(it.value).match(/^([\d.,]+)(.*)$/);
        if (m) counters.push({ node: card.querySelector('.val'), at, target: parseFloat(m[1].replace(/\./g, '').replace(',', '.')), raw: m[1], tail: m[2] });
      });
      if (sc.items.length === 2 && sc.arrow !== false)
        root.appendChild(beat(el(`<div class="abs" style="left:490px;top:640px;width:100px;height:100px;border-radius:50%;background:var(--dark);color:#fff;display:grid;place-items:center;z-index:2">${icon('bolt', 54, 'var(--yellow)')}</div>`), 'pop', L(sc.items[1].line ?? 1) - 0.2));
      if (sc.note) root.appendChild(beat(el(`<div class="cx" style="top:1040px"><span class="pill" data-box style="font-size:32px;color:var(--purple)">${rich(sc.note)}</span></div>`), 'up', L(sc.noteLine ?? sc.items.length)));
      return t => counters.forEach(c => {
        const p = Math.min(1, Math.max(0, (t - c.at) / 0.9)), e = 1 - Math.pow(1 - p, 3);
        if (p >= 1) { c.node.textContent = c.raw + c.tail; return; }
        const v = c.target * e, dec = c.raw.includes(',') ? 1 : 0;
        c.node.textContent = (dec ? v.toFixed(1).replace('.', ',') : Math.round(v).toLocaleString('vi-VN')) + c.tail;
      });
    },

    // GitHub repo card: owner/name, description, stars counter, then what it solves
    repo(sc, root, L) {
      header(sc, root, L);
      const [owner, name] = sc.repo.split('/');
      const card = el(`<div class="card abs" data-box style="left:70px;width:940px;top:280px;padding:40px 46px">
        <div class="row" style="gap:28px">${brand('github', 110)}
          <div style="min-width:0"><div style="font-size:32px;color:var(--muted);font-weight:600">${esc(owner)} /</div>
          <div style="font-size:${name.length > 16 ? 50 : 60}px;font-weight:900;letter-spacing:-1px;line-height:1.05">${esc(name)}</div></div></div>
        <div style="font-size:33px;line-height:1.35;margin-top:26px;font-weight:500">${rich(sc.desc)}</div>
        <div class="row" style="gap:18px;margin-top:28px;flex-wrap:wrap">
          <span class="pill" style="background:#fff7e0;box-shadow:none;font-size:32px;padding:10px 24px">${icon('star', 34, '#e0a100')}<b class="stars">${esc(sc.stars)}</b></span>
          ${sc.lang ? `<span class="pill" style="background:#f2f1f6;box-shadow:none;font-size:30px;padding:10px 24px"><span style="width:20px;height:20px;border-radius:50%;background:${sc.langColor || '#3178c6'}"></span>${esc(sc.lang)}</span>` : ''}
          ${sc.license ? `<span class="pill" style="background:#f2f1f6;box-shadow:none;font-size:30px;padding:10px 24px">${esc(sc.license)}</span>` : ''}
        </div></div>`);
      root.appendChild(beat(card, 'up', L(0)));
      if (sc.rank) root.appendChild(beat(el(`<div class="abs" style="left:40px;top:250px;width:96px;height:96px;border-radius:50%;background:var(--yellow);display:grid;place-items:center;font-size:48px;font-weight:900;box-shadow:0 10px 24px rgba(255,180,0,.45);z-index:2">#${esc(sc.rank)}</div>`), 'pop', L(0) + 0.3));
      (sc.points || []).forEach((p, i) => {
        const row = el(`<div class="card abs row" data-box style="left:70px;width:940px;top:${(sc.pointsTop || 740) + i * 150}px;gap:26px;padding:20px 30px;border-radius:30px">
          ${badge(p, 92, COLORS[i % COLORS.length])}<div style="font-size:39px;font-weight:700;line-height:1.25">${rich(p.text)}</div></div>`);
        root.appendChild(beat(row, 'left', L(p.line ?? i + 1)));
      });
      // stars count up from 0 to the shown value (keeps the "K+" suffix)
      const node = card.querySelector('.stars'), m = String(sc.stars).match(/^([\d.,]+)(.*)$/);
      if (!m) return;
      const target = parseFloat(m[1].replace(',', '.')), at = L(0) + 0.4;
      return t => {
        const p = Math.min(1, Math.max(0, (t - at) / 1.2));
        node.textContent = p >= 1 ? sc.stars : Math.round(target * (1 - Math.pow(1 - p, 3))) + m[2];
      };
    },

    // Code window; `bad` lines get flagged and struck, `good` lines get a check
    code(sc, root, L) {
      header(sc, root, L);
      const win = el(`<div class="codewin" data-box style="top:${sc.top || 290}px">
        <div class="codebar"><div class="dot" style="background:#ff5f57"></div><div class="dot" style="background:#febc2e"></div><div class="dot" style="background:#28c840"></div>
        <div style="margin-left:22px;font-size:26px;color:var(--muted);font-weight:600">${esc(sc.file || '')}</div></div>
        <div class="code">${sc.code.map((c, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="txt">${esc(c)}</span></div>`).join('')}</div></div>`);
      root.appendChild(beat(win, 'up', L(0)));
      [...win.querySelectorAll('.ln')].forEach((ln, i) => {
        beat(ln.querySelector('.txt'), 'fade', L(0) + 0.3 + i * 0.12, 0.2);
        if ((sc.bad || []).includes(i)) {
          ln.appendChild(beat(el(`<div class="abs" style="inset:4px 18px;border-radius:12px;background:rgba(229,72,77,.14)"></div>`), 'fade', L(sc.badLine ?? 1), 0.3));
          ln.appendChild(beat(el(`<div class="abs" style="left:86px;right:110px;top:27px;height:5px;background:var(--red)"></div>`), 'grow', L(sc.badLine ?? 1) + 0.3, 0.4));
          ln.appendChild(beat(el(`<div class="abs" style="right:34px;width:50px;height:50px;border-radius:50%;background:var(--red);display:grid;place-items:center">${icon('x', 30, '#fff', 3)}</div>`), 'pop', L(sc.badLine ?? 1) + 0.2));
        }
        if ((sc.good || []).includes(i))
          ln.appendChild(beat(el(`<div class="abs" style="right:34px;width:50px;height:50px;border-radius:50%;background:var(--green);display:grid;place-items:center">${icon('check', 30, '#fff', 3)}</div>`), 'pop', L(sc.goodLine ?? 1) + 0.2));
      });
      if (sc.result) root.appendChild(beat(el(`<div class="cx" style="top:${(sc.top || 290) + 120 + sc.code.length * 58 + 60}px"><span class="pill" data-box style="font-size:36px;background:${sc.resultColor || 'var(--green)'};color:#fff">${rich(sc.result)}</span></div>`), 'pop', L(sc.resultLine ?? 2)));
    },

    // Chat bubbles + optional rubber stamp
    chat(sc, root, L) {
      header(sc, root, L);
      let y = sc.top || 290;
      sc.messages.forEach((m, i) => {
        const b = el(`<div class="bubble ${m.from === 'user' ? 'user' : 'ai'}" data-box style="top:${y}px">${m.name ? `<div class="who">${esc(m.name)}</div>` : ''}${rich(m.text)}</div>`);
        root.appendChild(beat(b, m.from === 'user' ? 'right' : 'left', L(m.line ?? i)));
        y += 110 + Math.ceil(m.text.length / 30) * 48;
      });
      if (sc.stamp) root.appendChild(beat(el(`<div class="rubber" style="left:${sc.stamp.x || 380}px;top:${sc.stamp.y || y - 200}px">${esc(sc.stamp.text)}</div>`), 'stamp', L(sc.stamp.line ?? sc.messages.length)));
    },

    // Vertical pipeline: node -> node -> node
    flow(sc, root, L) {
      header(sc, root, L);
      const n = sc.nodes.length, top = sc.top || 290, step = Math.min(210, (1090 - top) / n);
      sc.nodes.forEach((nd, i) => {
        const y = top + i * step, at = L(nd.line ?? i);
        if (i) root.appendChild(beat(el(`<div class="abs" style="left:535px;top:${y - step + 150}px;width:10px;height:${step - 150}px;border-radius:5px;background:var(--ink)"></div>`), 'growy', at - 0.25, 0.3));
        root.appendChild(beat(el(`<div class="card abs" data-box style="left:170px;width:740px;top:${y}px;height:150px;display:flex;align-items:center;gap:28px;padding:0 34px">
          ${badge(nd, 96, COLORS[i % COLORS.length])}<div><div style="font-size:38px;font-weight:800">${rich(nd.label)}</div>${nd.sub ? `<div style="font-size:28px;color:var(--muted);margin-top:4px">${rich(nd.sub)}</div>` : ''}</div></div>`), 'pop', at));
      });
    },

    // Screen recording / screenshot inside a phone or browser frame, with zooms and callouts.
    // media frames come from prepare.js (build/media/<scene>/NNNNN.jpg at 30 fps).
    screen(sc, root, L) {
      header(sc, root, L);
      const m = sc._media, phone = (sc.frame || 'phone') === 'phone';
      const top = sc.title ? 290 : 240;
      const box = phone ? { x: 270, y: sc.title ? 250 : 200, w: 540, h: 1130 } : { x: 60, y: top, w: 960, h: Math.min(1340 - top, Math.round(960 * (m.h / m.w)) + 64) };
      const bar = phone ? '' : `<div style="height:64px;background:#f2f1f6;display:flex;align-items:center;gap:12px;padding:0 24px">
          <div class="dot" style="background:#ff5f57"></div><div class="dot" style="background:#febc2e"></div><div class="dot" style="background:#28c840"></div>
          <div style="flex:1;margin-left:16px;height:38px;border-radius:19px;background:#fff;font-size:22px;color:var(--muted);display:flex;align-items:center;padding:0 20px">🔒 ${esc(sc.url || '')}</div></div>`;
      const dev = el(`<div class="abs" data-box style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;border-radius:${phone ? 64 : 26}px;
          background:${phone ? '#111' : '#fff'};padding:${phone ? 14 : 0}px;box-shadow:0 40px 90px rgba(20,20,40,.35);overflow:hidden">${bar}
          <div class="vp" style="position:relative;width:100%;height:${phone ? '100%' : `calc(100% - 64px)`};overflow:hidden;border-radius:${phone ? 50 : 0}px;background:#fff">
            <img data-seq class="frame" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;transform-origin:50% 50%">
          </div>${phone ? '<div class="abs" style="left:50%;top:26px;width:150px;height:40px;margin-left:-75px;border-radius:20px;background:#111"></div>' : ''}</div>`);
      root.appendChild(beat(dev, 'up', L(0) - 0.1, 0.7));
      const img = dev.querySelector('.frame');
      const zooms = (sc.zooms || []).map(z => ({ ...z, at: L(z.line ?? 0) + (z.delay || 0) }));
      (sc.callouts || []).forEach((c, i) => root.appendChild(beat(el(`<div class="abs" style="left:${c.x ?? 600}px;top:${c.y ?? 300 + i * 120}px;z-index:3">
          <span class="pill" data-box style="background:${c.color || 'var(--yellow)'};font-size:34px;font-weight:900;box-shadow:0 14px 30px rgba(0,0,0,.25)">${rich(c.text)}</span></div>`), 'pop', L(c.line ?? i))));
      const t0 = L(sc.startLine ?? 0);
      let cur = -1;
      return t => {
        const n = m.frames ? Math.min(m.frames, Math.max(1, Math.floor((t - t0) * 30) + 1)) : 0;
        if (m.frames && n !== cur) { cur = n; img.src = `${m.dir}/${String(n).padStart(5, '0')}.jpg`; }
        if (!m.frames && cur !== 0) { cur = 0; img.src = m.src; }
        let sc_ = 1, ox = 50, oy = 50;
        for (const z of zooms) {
          if (t < z.at) continue;
          const p = Math.min(1, (t - z.at) / 0.6), e = p < 1 ? 1 - Math.pow(1 - p, 3) : 1;
          const out = z.hold ? Math.min(1, Math.max(0, (t - z.at - z.hold) / 0.5)) : 0;
          sc_ = 1 + ((z.scale || 1.8) - 1) * e * (1 - out); ox = (z.x ?? 0.5) * 100; oy = (z.y ?? 0.4) * 100;
        }
        img.style.transformOrigin = `${ox}% ${oy}%`;
        img.style.transform = `scale(${sc_})`;
      };
    },

    // Article / press quote: real screenshot (src) panned slowly, or a clean quote card with yellow marker sweep
    article(sc, root, L) {
      header(sc, root, L);
      const top = sc.title ? 290 : 220;
      if (sc._media) {
        const card = el(`<div class="card abs" data-box style="left:70px;top:${top}px;width:940px;height:${sc.height || 900}px;overflow:hidden">
          <div style="height:64px;background:#f2f1f6;display:flex;align-items:center;gap:12px;padding:0 24px"><div class="dot" style="background:#ff5f57"></div><div class="dot" style="background:#febc2e"></div><div class="dot" style="background:#28c840"></div>
          <div style="margin-left:16px;font-size:24px;color:var(--muted)">🔒 ${esc(sc.site || '')}</div></div>
          <img src="${sc._media.src}" style="width:100%;display:block;transform-origin:top center"></div>`);
        root.appendChild(beat(card, 'up', L(0)));
        const img = card.querySelector('img'), a = L(0), b = L(sc.lines.length - 1) + 2;
        return t => { const p = Math.min(1, Math.max(0, (t - a) / (b - a))); img.style.transform = `scale(${1 + 0.08 * p}) translateY(${-(sc.pan || 120) * p}px)`; };
      }
      const marks = [];
      const quote = esc(sc.quote).replace(/\*([^*]+)\*/g, (_, x) => `<span class="mk" style="background:linear-gradient(transparent 55%,#ffe066 55%) no-repeat;background-size:0% 100%">${x}</span>`);
      const card = el(`<div class="card abs" data-box style="left:70px;top:${top}px;width:940px;padding:44px 50px">
        <div class="row" style="gap:18px;margin-bottom:22px">${sc.logo ? brand(sc.logo, 64) : ''}<div style="font-size:28px;font-weight:700;color:var(--muted)">${esc(sc.site || '')}</div>
          ${sc.date ? `<div style="margin-left:auto;font-size:26px;color:var(--muted)">${esc(sc.date)}</div>` : ''}</div>
        ${sc.headline ? `<div style="font-family:Georgia,serif;font-size:50px;font-weight:700;line-height:1.2;letter-spacing:-.5px">${esc(sc.headline)}</div>` : ''}
        <div style="font-family:Georgia,serif;font-size:38px;line-height:1.55;margin-top:24px;color:#2a2a3a">${quote}</div></div>`);
      root.appendChild(beat(card, 'up', L(0)));
      card.querySelectorAll('.mk').forEach((mk, i) => marks.push({ mk, at: L((sc.markLines || [])[i] ?? i + 1) }));
      return t => marks.forEach(({ mk, at }) => { mk.style.backgroundSize = `${Math.min(100, Math.max(0, (t - at) / 0.6 * 100))}% 100%`; });
    },

    // Social post card (quote a real post; keep name/handle/numbers exactly as on the source)
    tweet(sc, root, L) {
      header(sc, root, L);
      const top = sc.title ? 300 : 260;
      const card = el(`<div class="card abs" data-box style="left:70px;top:${top}px;width:940px;padding:44px 48px">
        <div class="row" style="gap:22px">${sc.logo ? brand(sc.logo, 96) : `<div style="width:96px;height:96px;border-radius:50%;background:var(--purple);color:#fff;display:grid;place-items:center;font-size:44px;font-weight:900">${esc((sc.name || '?')[0])}</div>`}
          <div><div style="font-size:36px;font-weight:800">${esc(sc.name)} ${sc.verified ? '<span style="color:#1d9bf0">✔</span>' : ''}</div><div style="font-size:28px;color:var(--muted)">${esc(sc.handle || '')}</div></div>
          ${sc.platform ? `<div style="margin-left:auto">${brand(sc.platform, 64)}</div>` : ''}</div>
        <div style="font-size:40px;line-height:1.4;margin-top:26px;font-weight:500">${rich(sc.text)}</div>
        <div style="font-size:26px;color:var(--muted);margin-top:22px">${esc(sc.date || '')}</div>
        <div class="row" style="gap:36px;margin-top:22px;padding-top:22px;border-top:2px solid #eee;font-size:30px;font-weight:700;color:var(--muted)">
          ${sc.views ? `<span class="views" style="background:#ffe066;color:var(--ink);padding:2px 12px;border-radius:8px">👁 ${esc(sc.views)}</span>` : ''}
          ${sc.reposts ? `<span>🔁 ${esc(sc.reposts)}</span>` : ''}${sc.likes ? `<span>♥ ${esc(sc.likes)}</span>` : ''}</div></div>`);
      root.appendChild(beat(card, 'up', L(0)));
      const v = card.querySelector('.views');
      if (v) beat(v, 'pop', L(sc.viewsLine ?? 1));
    },

    // Real photos: slow Ken Burns, or before/after wipe
    photo(sc, root, L) {
      header(sc, root, L);
      const imgs = sc._media, top = sc.title ? 290 : 230, h = sc.height || 820;
      if (sc.mode === 'compare' && imgs.length >= 2) {
        const card = el(`<div class="card abs" data-box style="left:70px;top:${top}px;width:940px;height:${h}px;overflow:hidden;padding:0">
          <img src="${imgs[0].src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
          <div class="after" style="position:absolute;inset:0;overflow:hidden;width:0%"><img src="${imgs[1].src}" style="position:absolute;left:0;top:0;width:940px;height:${h}px;object-fit:cover"></div>
          <div class="bar" style="position:absolute;top:0;bottom:0;width:8px;background:#fff;box-shadow:0 0 20px rgba(0,0,0,.4);left:0"></div>
          ${(sc.labels || []).map((lb, i) => `<span class="pill" style="position:absolute;top:24px;${i ? 'right' : 'left'}:24px;font-size:28px;background:${i ? 'var(--purple)' : 'var(--dark)'};color:#fff">${esc(lb)}</span>`).join('')}</div>`);
        root.appendChild(beat(card, 'up', L(0)));
        const after = card.querySelector('.after'), bar = card.querySelector('.bar'), at = L(sc.wipeLine ?? 1);
        return t => { const p = Math.min(1, Math.max(0, (t - at) / 1.4)), e = p * p * (3 - 2 * p); after.style.width = `${e * 100}%`; bar.style.left = `calc(${e * 100}% - 4px)`; };
      }
      const card = el(`<div class="card abs" data-box style="left:70px;top:${top}px;width:940px;height:${h}px;overflow:hidden"><img src="${imgs[0].src}" style="width:100%;height:100%;object-fit:cover"></div>`);
      if (sc.caption) card.appendChild(el(`<span class="pill" style="position:absolute;left:24px;bottom:24px;font-size:28px">${rich(sc.caption)}</span>`));
      root.appendChild(beat(card, 'up', L(0)));
      const img = card.querySelector('img'), a = L(0), b = a + 8;
      return t => { const p = Math.min(1, Math.max(0, (t - a) / (b - a))); img.style.transform = `scale(${1.04 + 0.1 * p})`; };
    },

    // Outro: brand + like/save/share/follow + comment prompt + sources
    cta(sc, root, L, ep) {
      const acts = [['heart', 'Thả tim', 'var(--red)', 0], ['bookmark', 'Lưu lại', '#f5a524', 0.5], ['share', 'Chia sẻ', 'var(--green)', 1.2], ['plus', 'Theo dõi', 'var(--purple)', null]];
      root.appendChild(beat(el(`<div class="cx" style="top:590px;font-size:96px;font-weight:900;letter-spacing:-3px;white-space:nowrap"><div>${esc(ep.brand.name.replace(/\.[a-z]+$/, ''))}<span style="color:var(--purple)">${esc((ep.brand.name.match(/\.[a-z]+$/) || [''])[0])}</span></div></div>`), 'up', L(0)));
      root.appendChild(beat(el(`<div class="cx" style="top:720px;font-size:36px;font-weight:600;color:var(--muted);white-space:nowrap">${esc(ep.brand.tagline || '')}</div>`), 'up', L(0) + 0.3));
      const row = el(`<div class="cx row" style="top:830px;flex-direction:row;justify-content:center;gap:30px"></div>`);
      acts.forEach(([ic, lab, c, d]) => {
        const it = el(`<div style="text-align:center;width:190px"><div style="position:relative;width:132px;height:132px;margin:0 auto">
          ${ic === 'plus' ? '<div class="abs loop" style="inset:0;border-radius:50%;background:var(--purple);animation:pulse 1.1s infinite"></div>' : ''}
          <div class="abs" style="inset:0;border-radius:50%;background:${c};display:grid;place-items:center;box-shadow:0 14px 30px rgba(20,20,40,.22)">
          <svg viewBox="0 0 24 24" class="ico" width="64" height="64" style="stroke:#fff;stroke-width:2.2;fill:${['heart', 'bookmark'].includes(ic) ? '#fff' : 'none'}">${ICONS[ic]}</svg></div></div>
          <div style="font-size:32px;font-weight:800;margin-top:14px">${lab}</div></div>`);
        row.appendChild(beat(it, 'pop', d === null ? L(1) : L(0) + d));
      });
      root.appendChild(row);
      if (sc.question) root.appendChild(beat(el(`<div class="card abs" data-box style="left:110px;top:1100px;width:860px;padding:30px 40px;display:flex;align-items:center;gap:26px;border:5px solid var(--purple)">
        <div style="font-size:64px">💬</div><div><div style="font-size:40px;font-weight:800;line-height:1.25">${rich(sc.question)}</div>
        <div style="font-size:28px;color:var(--purple);font-weight:800;margin-top:6px">COMMENT NGAY 👇</div></div></div>`), 'up', L(2)));
      if (ep.sources?.length) root.appendChild(beat(el(`<div class="cx" style="top:1330px;font-size:24px;color:var(--muted);white-space:nowrap">Nguồn: ${esc(ep.sources.map(s => s.name || s.title).slice(0, 4).join(', '))}</div>`), 'fade', L(0) + 1));
    },
  };

  // ------------------------------------------------------------------ host character
  const SLOTS = { bl: { x: 20, y: 1100, h: 290 }, br: { x: 790, y: 1100, h: 290 }, top: { x: 300, y: 130, h: 450 }, cover: { x: 500, y: 1000, h: 700 }, right: { x: 700, y: 1000, h: 400 } };
  function hostTransform(spec, t, start, end, hit) {
    const lt = t - start, out = end - t;
    const pin = Math.min(1, lt / 0.45), pout = Math.min(1, Math.max(0, out / 0.25));
    const enter = pin < 1 ? 1 + Math.sin(pin * Math.PI) * 0.18 : 1;
    let sc = pin * enter * pout, dx = 0, dy = (1 - pin) * 120, rot = 0, sx = 1, sy = 1;
    const breathe = Math.sin(lt * 2 * Math.PI * 0.7);
    sy += 0.015 * breathe; sx -= 0.008 * breathe;
    const act = spec.act || 'talk';
    if (act === 'talk') { const q = Math.abs(Math.sin(lt * 2 * Math.PI * 2.2)); sy += 0.03 * q; sx -= 0.015 * q; rot = 2.5 * Math.sin(lt * 2 * Math.PI * 0.5); }
    if (act === 'hop') { const ph = (lt * 1.6) % 1; dy -= 60 * Math.sin(ph * Math.PI); const land = ph < 0.12 ? (0.12 - ph) / 0.12 : 0; sy -= 0.08 * land; sx += 0.06 * land; }
    if (act === 'wave') { rot = 8 * Math.sin(lt * 2 * Math.PI * 1.1); dy -= 18 * Math.abs(Math.sin(lt * 2 * Math.PI * 1.1)); }
    if (hit !== undefined && t >= hit && t < hit + 0.7) { const p = (t - hit) / 0.7; dx = 26 * Math.sin(p * Math.PI * 8) * (1 - p); dy -= 50 * Math.sin(Math.min(1, p * 2) * Math.PI); }
    return `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${sc * sx * (spec.flip ? -1 : 1)},${sc * sy})`;
  }

  // ------------------------------------------------------------------ player
  const Studio = {
    init(ep, tl) {
      LOGOS = ep.logos || {};
      document.getElementById('brandName').textContent = ep.brand.name;
      const stage = document.getElementById('scenes'), host = document.getElementById('host'), hostImg = host.querySelector('img');
      const lines = [], scenes = [];
      let k = 0;
      ep.scenes.forEach((sc, si) => {
        const idx = sc.lines.map(() => k++);
        idx.forEach((g, j) => lines.push({ s: tl.lines[g][0], e: tl.lines[g][1], text: sc.lines[j].cap ?? sc.lines[j].say, scene: si, show: sc.type !== 'cover' && sc.captions !== false }));
        scenes.push({ sc, idx });
      });
      scenes.forEach((S, i) => {
        S.start = i ? Math.max(scenes[i - 1].lastEnd ?? 0, tl.lines[S.idx[0]][0] - 0.25) : 0;
        S.lastEnd = tl.lines[S.idx[S.idx.length - 1]][1];
      });
      scenes.forEach((S, i) => { S.end = i + 1 < scenes.length ? scenes[i + 1].start : tl.total; });
      scenes.forEach(S => {
        const root = document.createElement('section');
        root.className = 'scene';
        if (S.sc.type === 'cover') root.id = 'cover';
        stage.appendChild(root);
        const L = (j, d = 0) => tl.lines[S.idx[Math.min(j, S.idx.length - 1)]][0] + d;
        if (!SCENES[S.sc.type]) throw new Error('unknown scene type ' + S.sc.type);
        S.root = root;
        S.update = SCENES[S.sc.type](S.sc, root, L, ep) || null;
        S.hit = S.sc.host?.hitLine !== undefined ? L(S.sc.host.hitLine) : undefined;
      });

      const cap = document.getElementById('cap');
      let lastCap = -1;
      function renderCaption(t) {
        const i = lines.findIndex(l => l.show && t >= l.s && t < (lines[lines.indexOf(l) + 1]?.s ?? tl.total));
        if (i !== lastCap) {
          lastCap = i;
          let html = '', open = false;
          for (const w of (i < 0 ? [] : lines[i].text.split(' '))) {
            const clean = esc(w.replace(/\*/g, ''));
            if (w.startsWith('*')) { html += '<span class="w hl">' + clean; open = true; }
            else if (open) html += ' ' + clean;
            else html += `<span class="w">${clean}</span>`;
            if (open && w.endsWith('*')) { html += '</span>'; open = false; }
          }
          cap.innerHTML = html + (open ? '</span>' : '');
        }
        if (i < 0) return;
        cap.querySelectorAll(':scope > .w').forEach((w, n) => {
          const p = Math.min(1, Math.max(0, (t - lines[i].s - n * 0.06) / 0.16));
          w.style.opacity = p;
          w.style.transform = `translateY(${(1 - p) * 24}px) scale(${w.classList.contains('hl') ? 1 + 0.25 * Math.sin(p * Math.PI) : 1})`;
        });
      }
      let curPose = null;
      function renderHost(t, S) {
        const spec = S?.sc.host;
        if (!spec || !ep.host?.poses?.[spec.pose]) { host.style.visibility = 'hidden'; return; }
        if (curPose !== spec.pose) { curPose = spec.pose; hostImg.src = ep.host.poses[spec.pose]; }
        const slot = typeof spec.slot === 'object' ? spec.slot : SLOTS[spec.slot || (S.sc.type === 'cover' ? 'cover' : 'br')];
        const isCover = S.sc.type === 'cover';
        Object.assign(host.style, { visibility: 'visible', left: slot.x + 'px', top: slot.y + 'px', height: slot.h + 'px' });
        if (isCover) {   // frame 0 must already show the host (thumbnail)
          const hop = Math.abs(Math.sin(t * Math.PI * 2.2));
          host.style.transform = `translateY(${-40 * hop * Math.min(1, t * 4)}px) rotate(${4 + 3 * Math.sin(t * 9) * Math.min(1, t * 4)}deg) scaleX(${spec.flip ? -1 : 1})`;
        } else host.style.transform = hostTransform(spec, t, S.start + 0.1, S.end, S.hit);
      }

      window.DURATION = tl.total;
      window.renderAt = function (t) {
        let cur = null;
        for (const S of scenes) {
          const on = t >= S.start - 0.001 && t < S.end;
          S.root.style.visibility = on ? 'visible' : 'hidden';
          S.root.style.opacity = on && S.sc.type !== 'cover' ? Math.min(1, Math.max(0, (S.end - t) / 0.3)) : 1;
          if (on) { cur = S; if (S.update) S.update(t, S.start, S.end); }
        }
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
        document.getElementById('progress').style.width = (t / tl.total * 100) + '%';
        renderCaption(t);
        renderHost(t, cur);
        return cur ? scenes.indexOf(cur) : -1;
      };
      // QA: geometry problems in the current frame (off-screen, host covering content, caption collisions, text overflow)
      window.layoutIssues = function (t) {
        const si = window.renderAt(t), S = scenes[si], out = [];
        if (!S) return out;
        const box = n => n.getBoundingClientRect();
        const visible = n => { for (let p = n; p && p !== S.root.parentNode; p = p.parentElement) { const cs = getComputedStyle(p); if (+cs.opacity < 0.05 || cs.visibility === 'hidden') return false; } return true; };
        const items = [...S.root.querySelectorAll('[data-box],.card,.bubble,.pill,.rubber')].filter(visible);
        const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const name = n => (n.textContent || n.className).trim().replace(/\s+/g, ' ').slice(0, 40);
        for (const n of S.root.querySelectorAll('.cv-line')) {
          const fs = parseFloat(getComputedStyle(n).fontSize);
          if (n.getBoundingClientRect().height > fs * 1.6) out.push(`tiêu đề thumbnail bị xuống dòng: "${name(n)}"`);
        }
        for (const n of items) {
          const b = box(n);
          if (b.left < 10 || b.right > 1070 || b.top < 80 || b.bottom > 1880) out.push(`ngoài khung: "${name(n)}"`);
          if (n.scrollWidth > n.clientWidth + 4 && getComputedStyle(n).overflow !== 'visible') out.push(`tràn chữ: "${name(n)}"`);
        }
        const capB = box(cap);
        if (cap.textContent.trim()) {
          if (capB.bottom > 1700) out.push(`phụ đề quá dài (${Math.round(capB.height)}px)`);
          for (const n of items) if (inter(box(n), capB) > 400) out.push(`phụ đề đè lên: "${name(n)}"`);
        }
        if (host.style.visibility === 'visible' && S.sc.type !== 'cover') {
          const hb = box(hostImg), core = { left: hb.left + hb.width * 0.2, right: hb.right - hb.width * 0.2, top: hb.top + hb.height * 0.1, bottom: hb.bottom - hb.height * 0.1 };
          for (const n of items) if (inter(box(n), core) > 2500) out.push(`nhân vật che: "${name(n)}"`);
        }
        return [...new Set(out)].map(m => `cảnh ${si} (${S.sc.type}) @${t.toFixed(1)}s: ${m}`);
      };
      window.STUDIO_READY = true;
      if (!navigator.webdriver) { const t0 = performance.now(); (function loop() { window.renderAt(((performance.now() - t0) / 1000) % tl.total); requestAnimationFrame(loop); })(); }
    },
  };
  window.Studio = Studio;
})();
