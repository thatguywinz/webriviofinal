/* Webrivio — work-led components (wall, transformations, process strip).
   Progressive: with JS off every screenshot, caption and before/after is already
   in the HTML and visible. This file only adds motion and the tab switcher.
   Loads after enhance.js (which wires the .ba drag/keyboard behaviour). */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  const wide = () => innerWidth >= 768;
  const hasST = typeof window.gsap !== 'undefined' && window.ScrollTrigger;

  /* ---- wall: scroll each build exactly to its last screen, not a guess ---- */
  const shots = [...document.querySelectorAll('.tile-shot')];
  const measure = (shot) => {
    const img = shot.querySelector('img');
    if (!img || !img.naturalHeight) return;
    const imgH = shot.clientWidth * (img.naturalHeight / img.naturalWidth);
    const travel = Math.max(0, imgH - shot.clientHeight);
    shot.parentElement.style.setProperty('--travel', (-(travel / imgH) * 100).toFixed(2) + '%');
    shot.style.setProperty('--travel', (-(travel / imgH) * 100).toFixed(2) + '%');
  };
  shots.forEach((s) => {
    const img = s.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', () => measure(s), { once: true });
    else measure(s);
  });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => shots.forEach(measure), 150); });

  /* touch screens: no hover, so a build plays itself while it's well on screen */
  if (!canHover && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.intersectionRatio >= 0.6) e.target.classList.add('is-playing');
        else if (!e.isIntersecting) e.target.classList.remove('is-playing');
      });
    }, { threshold: [0, 0.6] });
    shots.forEach((s) => io.observe(s));
  }

  /* ---- transformations: tabs ---- */
  document.querySelectorAll('.xf').forEach((xf) => {
    const tabs = [...xf.querySelectorAll('.xf-tab')];
    const panes = [...xf.querySelectorAll('.xf-pane')];
    if (!tabs.length) return;
    xf.querySelector('.xf-tabs').hidden = false;
    const show = (i, focus) => {
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', String(i === j));
        t.tabIndex = i === j ? 0 : -1;
      });
      panes.forEach((p, j) => p.classList.toggle('on', i === j));
      if (focus) tabs[i].focus();
      if (hasST) ScrollTrigger.refresh();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); show((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show((i - 1 + tabs.length) % tabs.length, true); }
      });
    });
    show(0);
  });

  /* ---- scroll-driven moments (GSAP) ---- */
  if (!hasST || reduce) return;

  // 1. each before/after wipes from "before" to "after" as you scroll past it,
  //    until the visitor grabs the handle; from then on it's theirs.
  document.querySelectorAll('[data-wipe] .ba').forEach((ba) => {
    const range = ba.querySelector('.ba-range');
    let owned = false;
    const own = () => { owned = true; };
    ba.addEventListener('pointerdown', own);
    if (range) { range.addEventListener('input', own); range.addEventListener('keydown', own); }
    const set = (v) => {
      ba.style.setProperty('--pos', v.toFixed(1) + '%');
      if (range) range.value = Math.round(v);
    };
    set(94);
    ScrollTrigger.create({
      trigger: ba, start: 'top 82%', end: 'bottom 38%', scrub: 0.6,
      onUpdate: (st) => { if (!owned) set(94 - st.progress * 76); }
    });
  });

  // 2. the process line draws itself across the four steps
  const steps = document.querySelector('.steps');
  if (steps && wide()) {
    steps.style.setProperty('--steps-p', '0');
    ScrollTrigger.create({
      trigger: steps, start: 'top 85%', end: 'bottom 55%', scrub: 0.5,
      onUpdate: (st) => steps.style.setProperty('--steps-p', st.progress.toFixed(3))
    });
  }

  // 3. the wall drifts in three depths: columns move at different speeds,
  //    so the grid feels like a set of objects, not a table. Desktop only.
  if (wide()) {
    gsap.utils.toArray('.wall .tile').forEach((tile) => {
      const s = parseFloat(tile.dataset.depth || '0');
      if (!s) return;
      gsap.fromTo(tile, { y: 34 * s }, {
        y: -34 * s, ease: 'none',
        scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    // the anatomy screenshot settles from a slight tilt as it arrives
    const anat = document.querySelector('.anat-shot');
    if (anat) {
      gsap.fromTo(anat, { rotateX: 9, y: 40, transformPerspective: 1600, transformOrigin: '50% 100%' },
        { rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: anat, start: 'top 95%', end: 'top 45%', scrub: 0.6 } });
    }
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
