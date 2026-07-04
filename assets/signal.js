/* Webrivio — signal line (the Living Blueprint signature)
   One scroll-drawn SVG line travels each page from the hero/page-header CTA to
   the final CTA, threading the section instruments. Anchors are declared in
   markup as [data-signal-anchor] (document order = path order), with optional:
     data-signal-note  — 9px mono annotation shown when the line passes
     data-signal-side  — "left" puts the annotation left of the node
     data-signal-align — "top" hooks the element's top edge instead of center
   The final CTA button carries [data-signal-cta]: last anchor + arrival pulse.

   Requires GSAP + ScrollTrigger (loads only on pages that load them).
   Reduced motion: line renders fully drawn at 0.35 opacity, no scrub, notes on.
   Mobile <861px: straight spine at x=24px, annotations hidden (CSS).
   No-JS: nothing is injected; layout is untouched.
   Glow is a duplicated wide low-alpha stroke, not an SVG filter — filters
   re-rasterize every dashoffset frame and are the known Safari perf hazard. */
(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cta = document.querySelector('[data-signal-cta]');
  const anchorEls = [...document.querySelectorAll('[data-signal-anchor]')];
  if (cta && !cta.hasAttribute('data-signal-anchor')) anchorEls.push(cta);
  if (anchorEls.length < 2) return;
  const hasST = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasST && !reduce) return;

  const NS = 'http://www.w3.org/2000/svg';
  let svg = null, core = null, glow = null, st = null;
  let nodes = [], notes = [], anchorLens = [], total = 0, arrived = false;

  const isMobile = () => innerWidth < 861;

  const measure = () => anchorEls.map((el) => {
    const r = el.getBoundingClientRect();
    const alignTop = el.dataset.signalAlign === 'top';
    return {
      x: r.left + scrollX + r.width / 2,
      y: r.top + scrollY + (alignTop ? 0 : r.height / 2),
      note: el.dataset.signalNote || '',
      side: el.dataset.signalSide || 'right'
    };
  }).filter((p) => p.y > 0);

  const segment = (a, b) => {
    const dy = b.y - a.y;
    return `C ${a.x} ${a.y + dy * 0.42}, ${b.x} ${b.y - dy * 0.42}, ${b.x} ${b.y}`;
  };

  const destroy = () => {
    if (st) { st.kill(); st = null; }
    if (svg) { svg.remove(); svg = null; }
    nodes = []; notes = []; anchorLens = [];
  };

  const build = () => {
    destroy();
    const pts = measure();
    if (pts.length < 2) return;
    const mob = isMobile();
    if (mob) pts.forEach((p, i) => { if (i < pts.length - 1) p.x = 24; });
    /* on mobile the last point still meets the CTA button */

    const docH = Math.ceil(document.documentElement.scrollHeight);
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'signal');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', String(innerWidth));
    svg.setAttribute('height', String(docH));
    svg.style.height = docH + 'px';

    /* path — measure cumulative length at each anchor while building */
    let d = `M ${pts[0].x} ${pts[0].y}`;
    const probe = document.createElementNS(NS, 'path');
    anchorLens = [0];
    for (let i = 1; i < pts.length; i++) {
      d += ' ' + segment(pts[i - 1], pts[i]);
      probe.setAttribute('d', d);
      anchorLens.push(probe.getTotalLength());
    }
    total = anchorLens[anchorLens.length - 1];

    glow = document.createElementNS(NS, 'path');
    glow.setAttribute('class', 'sig-glow');
    glow.setAttribute('d', d);
    core = document.createElementNS(NS, 'path');
    core.setAttribute('class', 'sig-path');
    core.setAttribute('d', d);
    svg.appendChild(glow);
    svg.appendChild(core);

    pts.forEach((p, i) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'sig-node');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', '3');
      svg.appendChild(c);
      nodes.push(c);
      if (p.note) {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('class', 'sig-note');
        const left = p.side === 'left';
        t.setAttribute('x', p.x + (left ? -14 : 14));
        t.setAttribute('y', p.y + 3);
        t.setAttribute('text-anchor', left ? 'end' : 'start');
        t.textContent = p.note;
        svg.appendChild(t);
        notes.push({ el: t, i });
      } else {
        notes.push(null);
      }
    });

    document.body.appendChild(svg);

    if (reduce || !hasST) {
      svg.classList.add('static');
      nodes.forEach((n) => n.classList.add('on'));
      notes.forEach((n) => n && n.el.classList.add('on'));
      return;
    }

    [core, glow].forEach((p) => {
      p.style.strokeDasharray = String(total);
      p.style.strokeDashoffset = String(total);
    });

    st = ScrollTrigger.create({
      start: 0,
      end: () => Math.max(600, pts[pts.length - 1].y - innerHeight * 0.72),
      scrub: 0.8,
      onUpdate(self) {
        const drawn = total * self.progress;
        const off = String(total - drawn);
        core.style.strokeDashoffset = off;
        glow.style.strokeDashoffset = off;
        for (let i = 0; i < nodes.length; i++) {
          const hit = drawn >= anchorLens[i] - 2;
          nodes[i].classList.toggle('on', hit);
          if (notes[i]) notes[i].el.classList.toggle('on', hit);
        }
        if (self.progress > 0.995 && !arrived) arrive();
      }
    });
  };

  const arrive = () => {
    arrived = true;
    if (!cta) return;
    cta.classList.add('sig-arrive');
    setTimeout(() => {
      cta.classList.remove('sig-arrive');
      cta.classList.add('sig-breathe');
      /* pause the breathing loop while offscreen */
      new IntersectionObserver((ents) => {
        cta.classList.toggle('paused', !ents[0].isIntersecting);
      }, { threshold: 0 }).observe(cta);
    }, 650);
  };

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(build, 200);
  }, { passive: true });

  const start = () => setTimeout(() => {
    build();
    if (hasST) ScrollTrigger.refresh();
  }, 100);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else start();
})();
