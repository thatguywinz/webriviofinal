/* Webrivio — "orbit" selected-work section.
   Desktop (>=900px), motion allowed, GSAP present: pin the section and drive a
   cloud of screenshot cards with scroll progress. Otherwise do nothing and the
   static reel in the HTML stays. Card art reuses the build's -scroll image at
   different offsets, so no extra downloads beyond one image per build. */
(() => {
  'use strict';
  const root = document.querySelector('.orbit');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || innerWidth < 900 || typeof gsap === 'undefined' || !window.ScrollTrigger) return;

  const stage = root.querySelector('.orbit-stage');
  const title = root.querySelector('.orbit-title');
  const list = root.querySelector('.orbit-list');
  const meta = root.querySelector('.orbit-meta');
  const foot = root.querySelector('.orbit-foot');
  const items = [...list.querySelectorAll('li')];
  const metas = [...meta.querySelectorAll('li')];
  const builds = items.map((li) => li.dataset.build);

  /* ---- cards: 4 per build (hero, two deeper crops, the phone) ---- */
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const cards = [];
  builds.forEach((b, bi) => {
    const kinds = [
      { cls: '', img: `/assets/work/${b}-scroll.webp`, pos: '0%' },
      { cls: '', img: `/assets/work/${b}-scroll.webp`, pos: '38%' },
      { cls: '', img: `/assets/work/${b}-scroll.webp`, pos: '72%' },
      { cls: 'ph', img: `/assets/work/${b}-phone.webp`, pos: '0%' }
    ];
    kinds.forEach((k) => {
      const el = document.createElement('div');
      el.className = 'orb-card ' + k.cls;
      el.style.backgroundImage = `url(${k.img})`;
      el.style.backgroundPosition = `center ${k.pos}`;
      if (k.cls === 'ph') el.style.backgroundSize = 'cover';
      stage.appendChild(el);
      cards.push({ el, build: bi, phone: !!k.cls, delay: rnd() * 0.14, sx: rnd() - 0.5, sy: rnd() - 0.5, sz: rnd(), jit: rnd() });
    });
  });

  /* fibonacci sphere targets, so the cloud is even, never clumped */
  const N = cards.length;
  cards.forEach((c, i) => {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963; // golden angle
    c.ty = y; c.tr = r; c.th = th;
  });

  root.classList.add('is-live');
  const sizes = () => {
    const vw = innerWidth, vh = innerHeight;
    const R = Math.min(vw * 0.165, vh * 0.3);
    const w = Math.max(140, Math.min(210, vw * 0.118));
    cards.forEach((c) => c.el.style.setProperty('--w', (c.phone ? w * 0.42 : w) + 'px'));
    return { vw, vh, R };
  };
  let dim = sizes();
  addEventListener('resize', () => { dim = sizes(); render(lastP); });

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  let active = -1, hoverIdx = -1, lastP = 0;

  const setActive = (i) => {
    if (i === active) return;
    active = i;
    items.forEach((li, j) => li.classList.toggle('on', j === i));
    metas.forEach((li, j) => li.classList.toggle('on', j === i));
  };
  items.forEach((li, i) => {
    li.addEventListener('mouseenter', () => { hoverIdx = i; render(lastP); });
    li.addEventListener('mouseleave', () => { hoverIdx = -1; render(lastP); });
    li.querySelector('a').addEventListener('focus', () => { hoverIdx = i; render(lastP); });
    li.querySelector('a').addEventListener('blur', () => { hoverIdx = -1; render(lastP); });
  });

  function render(p) {
    lastP = p;
    const { vw, vh, R } = dim;
    // phases: 0-.12 title holds · .05-.50 fly in · .36-.86 index · .84-1 scatter
    const spin = p * 3.1;
    const scatter = easeIn(clamp((p - 0.84) / 0.16));
    const auto = p > 0.4 && p < 0.86 ? Math.min(builds.length - 1, Math.floor(((p - 0.4) / 0.44) * builds.length)) : -1;
    const focus = hoverIdx >= 0 ? hoverIdx : auto;
    setActive(focus);

    for (const c of cards) {
      const t = ease(clamp((p - 0.04 - c.delay) / 0.42));
      // start: scattered far behind the screen, wider than the viewport
      const x0 = c.sx * vw * 1.7, y0 = c.sy * vh * 1.6, z0 = -2400 - c.sz * 2600;
      // cloud position, turning around the vertical axis; cards always face you
      const a = c.th + spin;
      const x1 = Math.cos(a) * c.tr * R * 1.3 + vw * 0.03;
      const y1 = c.ty * R;
      const z1 = Math.sin(a) * c.tr * R * 1.1;
      // end: blown outward and forward past the camera
      const x2 = x1 * 3.2, y2 = y1 * 3.2, z2 = 900 + c.jit * 500;
      let x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
      x += (x2 - x1) * scatter; y += (y2 - y1) * scatter; z += (z2 - z1) * scatter;

      const isFocus = focus >= 0 && c.build === focus;
      if (isFocus) z += 160;
      let veil = 1 - clamp((t - 0.55) / 0.4);
      let op = clamp(t * 3) * (1 - scatter);
      // the other builds sink back into navy silhouettes (never a grey haze)
      if (focus >= 0 && !isFocus) { veil = Math.max(veil, 0.9); op *= 0.6; }
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) translateY(-50%)`;
      c.el.style.opacity = op.toFixed(3);
      c.el.style.setProperty('--veil', veil.toFixed(3));
    }

    const tOut = clamp((p - 0.1) / 0.16);
    title.style.opacity = (1 - tOut).toFixed(3);
    title.style.transform = `scale(${(1 + tOut * 0.35).toFixed(3)})`;
    const ui = clamp((p - 0.34) / 0.08) * (1 - clamp((p - 0.88) / 0.08));
    list.style.opacity = meta.style.opacity = ui.toFixed(3);
    list.style.pointerEvents = ui > 0.5 ? 'auto' : 'none';
    foot.style.opacity = ui.toFixed(3);
    foot.style.pointerEvents = ui > 0.5 ? 'auto' : 'none';
  }

  render(0);
  const prog = { p: 0 };
  gsap.to(prog, {
    p: 1, ease: 'none',
    onUpdate: () => render(prog.p),
    scrollTrigger: {
      trigger: root,
      start: 'top top',
      end: () => '+=' + Math.round(innerHeight * 3.2),
      pin: root.querySelector('.orbit-pin'),
      scrub: 0.8,
      invalidateOnRefresh: true
    }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
