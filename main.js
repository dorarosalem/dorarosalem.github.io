(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (!reduce && 'IntersectionObserver' in window) root.classList.add('js');

  const AREAS = {
    eating:  { v: '--terra', name: 'Eating behaviour and body image', kw: ['eating disorders', 'body image', 'bariatric care', 'self-criticism and shame'] },
    mindful: { v: '--green', name: 'Mindfulness and compassion-based care', kw: ['MBRP', 'Compassion-Focused Therapy', 'emotion regulation', 'CBT'] },
    family:  { v: '--blush', name: 'Children, families and education', kw: ['positive parenting', 'child protection', 'pediatric assessment', 'school psychology'] },
    neuro:   { v: '--sage',  name: 'Neuroscience and psychopharmacology', kw: ['traumatic brain injury', 'cannabidiol', 'behavioural testing', 'anxiety models'] }
  };
  const FLOWER = 'M5.2 5a4.8 4.8 0 1 0 9.6 0a4.8 4.8 0 1 0 -9.6 0M10.2 10a4.8 4.8 0 1 0 9.6 0a4.8 4.8 0 1 0 -9.6 0M5.2 15a4.8 4.8 0 1 0 9.6 0a4.8 4.8 0 1 0 -9.6 0M0.20000000000000018 10a4.8 4.8 0 1 0 9.6 0a4.8 4.8 0 1 0 -9.6 0';

  /* ---------- photo mosaic: columns that start and end together ---------- */
  function mosaic(el) {
    const figs = [...el.querySelectorAll('figure')];
    const dims = f => { const i = f.querySelector('img'); return i.dataset.w ? [+i.dataset.w, +i.dataset.h] : [i.naturalWidth, i.naturalHeight]; };
    const wait = figs.map(f => {
      const i = f.querySelector('img');
      if (i.dataset.w) return Promise.resolve();
      if (i.complete) { if (!i.naturalWidth) f.remove(); return Promise.resolve(); }
      return new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', () => { f.remove(); r(); }, { once: true }); });
    });
    const limit = +el.dataset.limit || 0, maxc = +el.dataset.maxcols || 3;
    let lastW = 0, all = [], open = !limit, btn = null;
    const layout = force => {
      const W = el.clientWidth; if (!W || (W === lastW && !force)) return; lastW = W;
      const live = open ? all : all.slice(0, limit);
      const colw = +el.dataset.colw || 0;
      const g = colw ? (+el.dataset.gap || 10) : (W < 560 ? 10 : 14);
      const n = colw ? Math.max(Math.min(+el.dataset.mincols || 2, live.length), Math.min(maxc, live.length, Math.floor((W + g) / (colw + g))))
        : live.length < 2 || W < 480 ? 1 : Math.min(maxc, live.length >= 5 ? Math.max(2, Math.floor((W + g) / 240)) : 2);
      const cw = (W - g * (n - 1)) / n;
      const cols = Array.from({ length: n }, () => ({ items: [], h: 0 }));
      live.forEach(f => {
        const [w, h] = dims(f);
        const a = Math.min(1.4, Math.max(0.66, h / w));
        const c = cols.reduce((m, x) => (x.h < m.h ? x : m));
        c.h += (c.items.length ? g : 0) + cw * a; c.items.push({ f, h: cw * a });
      });
      if (n > 1) {
        const T = cols.reduce((s, c) => s + c.h, 0) / n;
        cols.forEach(c => { const gaps = g * (c.items.length - 1), k = (T - gaps) / (c.h - gaps); c.items.forEach(it => { it.h *= k; }); });
      }
      el.style.setProperty('--g', g + 'px');
      el.replaceChildren(...cols.map(c => {
        const d = document.createElement('div'); d.className = 'm-col';
        c.items.forEach(it => { it.f.style.height = (n > 1 ? it.h : Math.min(it.h, 560)).toFixed(1) + 'px'; d.appendChild(it.f); });
        return d;
      }));
      el.classList.add('laid');
    };
    Promise.all(wait).then(() => {
      all = figs.filter(f => f.isConnected);
      if (!all.length) { const s = el.closest('.d-sec, .gal-sec'); s && s.remove(); return; }
      if (limit && all.length > limit) {
        btn = document.createElement('button'); btn.type = 'button'; btn.className = 'm-more';
        const label = () => { btn.innerHTML = open ? 'Show fewer <i aria-hidden="true">↑</i>' : `Show all ${all.length} photos <i aria-hidden="true">↓</i>`; };
        label(); el.after(btn);
        btn.addEventListener('click', () => { open = !open; label(); layout(true); if (!open) el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); });
      }
      layout();
      let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 120); });
    });
  }
  document.querySelectorAll('[data-mosaic]').forEach(el => { if (!el.closest('#detail')) mosaic(el); });

  /* ---------- map of areas (home): a rose window of petals around the symbol ---------- */
  const map = document.getElementById('map');
  if (map) {
    const keys = ['eating', 'mindful', 'family', 'neuro'];
    const pos = [[16, 16], [84, 16], [16, 84], [84, 84]];
    const NS = 'http://www.w3.org/2000/svg', svg = document.getElementById('spokes');
    svg.setAttribute('viewBox', '0 0 100 66'); svg.setAttribute('preserveAspectRatio', 'none');
    const nodes = [], spokes = [];
    let current = -1;

    // petals: 16 around the core, each belonging to one area (quadrant)
    const core = map.querySelector('.core'), ring = document.createElementNS(NS, 'svg');
    ring.setAttribute('viewBox', '-50 -50 100 100'); ring.setAttribute('class', 'ring'); ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<circle r="48.5"/><circle r="31"/>';
    const petals = [];
    const quad = a => { const deg = (a * 180 / Math.PI + 360) % 360; return deg >= 180 && deg < 270 ? 0 : deg >= 270 ? 1 : deg < 90 ? 3 : 2; };
    for (let k = 0; k < 16; k++) {
      const a = (k + 0.5) / 16 * Math.PI * 2;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M0,-32 C6,-36 7,-44 0,-48 C-7,-44 -6,-36 0,-32 Z');
      p.setAttribute('transform', `rotate(${(a * 180 / Math.PI + 90).toFixed(1)})`);
      p.style.transitionDelay = (k % 4) * 60 + 'ms';
      ring.appendChild(p); petals.push({ el: p, q: quad(a) });
    }
    core.prepend(ring);

    function select(i) {
      current = i;
      petals.forEach(p => { p.el.style.fill = p.q === i ? `var(${AREAS[keys[i]].v})` : ''; });
      nodes.forEach((n, k) => n.classList.toggle('on', k === i));
      spokes.forEach((sp, k) => sp.classList.toggle('on', k === i));
    }
    function clear() {
      current = -1;
      petals.forEach(p => { p.el.style.fill = ''; });
      nodes.forEach(n => n.classList.remove('on'));
      spokes.forEach(sp => sp.classList.remove('on'));
    }
    keys.forEach((key, i) => {
      const a = AREAS[key], [x, y] = pos[i];
      const sp = document.createElementNS(NS, 'line');
      sp.setAttribute('x1', 50); sp.setAttribute('y1', 33); sp.setAttribute('x2', x); sp.setAttribute('y2', y * 0.66);
      sp.setAttribute('class', 'spoke'); sp.setAttribute('vector-effect', 'non-scaling-stroke');
      sp.style.setProperty('--c', `var(${a.v})`); svg.appendChild(sp); spokes.push(sp);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'node'; b.style.left = x + '%'; b.style.top = y + '%';
      b.style.setProperty('--c', `var(${a.v})`);
      b.setAttribute('aria-label', `${a.name}: ${a.kw.join(', ')}`);
      b.innerHTML = `<i class="b flower" style="--c:var(${a.v})"></i><span class="name">${a.name}</span><span class="kw">${a.kw.map(k => `<span>${k}</span>`).join('')}</span>`;
      b.addEventListener('mouseenter', () => select(i));
      b.addEventListener('mouseleave', clear);
      b.addEventListener('focus', () => select(i));
      b.addEventListener('blur', clear);
      b.addEventListener('click', e => { e.stopPropagation(); current === i ? clear() : select(i); });
      map.appendChild(b); nodes.push(b);
    });
    document.addEventListener('click', clear);
    // gentle intro: light each area once
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); keys.forEach((_, i) => setTimeout(() => select(i), 500 + i * 650)); setTimeout(() => { if (!map.matches(':hover')) clear(); }, 500 + keys.length * 650); } }, { threshold: .4 });
      io.observe(map);
    }
  }

  /* ---------- lightbox: any image inside .fig or a mosaic opens larger ---------- */
  const lb = document.createElement('div');
  lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
  lb.innerHTML = '<span class="count"></span><button class="x" aria-label="Close">×</button><button class="pv" aria-label="Previous">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="nx" aria-label="Next">›</button>';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption'), lbCount = lb.querySelector('.count');
  let set = [], at = 0, lastFocus = null;
  const show = () => {
    const it = set[at]; lbImg.src = it.src; lbImg.alt = it.alt || ''; lbCap.innerHTML = it.cap || '';
    lbCount.textContent = set.length > 1 ? `${at + 1} / ${set.length}` : '';
    lb.querySelector('.pv').style.display = lb.querySelector('.nx').style.display = set.length > 1 ? '' : 'none';
  };
  const open = (items, i) => { set = items; at = i; lastFocus = document.activeElement; show(); lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.x').focus(); };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus && lastFocus.focus(); };
  lb.querySelector('.x').addEventListener('click', close);
  lb.querySelector('.pv').addEventListener('click', e => { e.stopPropagation(); at = (at - 1 + set.length) % set.length; show(); });
  lb.querySelector('.nx').addEventListener('click', e => { e.stopPropagation(); at = (at + 1) % set.length; show(); });
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') lb.querySelector('.pv').click();
    if (e.key === 'ArrowRight') lb.querySelector('.nx').click();
  });
  // group = nearest [data-group] container, so arrows move within one story or gallery
  document.addEventListener('click', e => {
    const img = e.target.closest('.fig img, .mosaic figure img');
    if (!img) return;
    const box = img.closest('[data-group]') || document.body;
    const imgs = [...box.querySelectorAll('.fig img, .mosaic figure img')];
    const items = imgs.map(i => { const f = i.closest('figure'); const c = f && f.querySelector('figcaption'); return { src: i.dataset.full || i.currentSrc || i.src, alt: i.alt, cap: c ? c.innerHTML : '' }; });
    open(items, imgs.indexOf(img));
  });

  /* ---------- booklet viewer ---------- */
  document.querySelectorAll('[data-booklet]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pages = JSON.parse(btn.dataset.booklet);
      open(pages.map(p => ({ src: p[0], alt: p[1], cap: p[1] })), 0);
    });
  });

  /* ---------- story contents: highlight the chapter in view ---------- */
  document.querySelectorAll('.toc').forEach(toc => {
    const links = [...toc.querySelectorAll('a')];
    const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window) || !secs.length) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach(s => io.observe(s));
  });

  /* ---------- scroll reveal ---------- */
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in'));
})();
