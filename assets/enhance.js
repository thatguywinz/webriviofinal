/* Webrivio — enhancement layer (motion + interactive components)
   Loads after Lenis + GSAP (vendored). Everything here is progressive:
   if a library is missing or motion is reduced, the page still works and
   every value/CTA is already present in the static HTML.
*/
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  /* ---------------- Lenis smooth scroll + ScrollTrigger ---------------- */
  let lenis = null;
  if (hasLenis && !reduce) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    window.lenis = lenis; // exposed for debugging / programmatic scroll
    if (hasGSAP && gsap.ticker) {
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // keep anchor links working through Lenis
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90 }); }
    });
  }

  if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) lenis.on('scroll', ScrollTrigger.update);
  }

  /* ---------------- helpers ---------------- */
  const inView = (el, cb, opts) => {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { cb(e.target); io.unobserve(e.target); } });
    }, opts || { threshold: 0.35 });
    io.observe(el);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------------- count-up numbers ---------------- */
  function animateCount(el) {
    const to = parseFloat(el.dataset.countTo);
    const dec = parseInt(el.dataset.countDec || '0', 10);
    const dur = parseInt(el.dataset.countDur || '1500', 10);
    const prefix = el.dataset.countPrefix || '';
    const suffix = el.dataset.countSuffix || '';
    const fmt = (n) => prefix + (el.dataset.countComma
      ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : n.toFixed(dec)) + suffix;
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(to * easeOutCubic(p));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  }
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    el.textContent = (el.dataset.countPrefix || '') + '0' + (el.dataset.countSuffix || '');
    inView(el, () => animateCount(el));
  });

  /* ---------------- radial gauges ---------------- */
  document.querySelectorAll('.gauge[data-gauge]').forEach((g) => {
    const val = g.querySelector('.val');
    if (!val) return;
    const r = parseFloat(val.getAttribute('r')) || 54;
    const circ = 2 * Math.PI * r;
    val.style.setProperty('--circ', circ.toFixed(2));
    val.style.strokeDasharray = circ.toFixed(2);
    val.style.strokeDashoffset = circ.toFixed(2);
    const pct = Math.max(0, Math.min(100, parseFloat(g.dataset.gauge)));
    inView(g, () => {
      const off = reduce ? circ * (1 - pct / 100) : null;
      if (reduce) { val.style.strokeDashoffset = (circ * (1 - pct / 100)).toFixed(2); }
      else { requestAnimationFrame(() => { val.style.strokeDashoffset = (circ * (1 - pct / 100)).toFixed(2); }); }
    });
  });

  /* ---------------- before / after sliders ---------------- */
  document.querySelectorAll('.ba').forEach((ba) => {
    const range = ba.querySelector('.ba-range');
    const set = (v) => {
      v = Math.max(0, Math.min(100, v));
      ba.style.setProperty('--pos', v + '%');
      if (range) range.value = v;
    };
    if (range) range.addEventListener('input', () => set(parseFloat(range.value)));
    let dragging = false;
    const fromEvent = (e) => {
      const rect = ba.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      set((x / rect.width) * 100);
    };
    ba.addEventListener('pointerdown', (e) => {
      if (e.target === range) return; // let native range handle keyboard/drag
      dragging = true; fromEvent(e); ba.setPointerCapture && ba.setPointerCapture(e.pointerId);
    });
    ba.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    ba.addEventListener('pointerup', () => { dragging = false; });
    ba.addEventListener('pointercancel', () => { dragging = false; });
    set(parseFloat(ba.dataset.start || range && range.value || 50));
  });

  /* ---------------- money-leak drips ---------------- */
  const funnel = document.querySelector('.funnel');
  if (funnel && !reduce) {
    const host = funnel.closest('.leak-meter') || funnel;
    let active = false;
    inView(host, () => { active = true; }, { threshold: 0.3 });
    const spawnDrip = () => {
      if (active) {
        const d = document.createElement('span');
        d.className = 'drip';
        d.style.left = (44 + Math.random() * 12) + '%';
        funnel.appendChild(d);
        const fall = d.animate(
          [{ transform: 'translateY(0)', opacity: 0.9 }, { transform: 'translateY(48px)', opacity: 0 }],
          { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.4,0,.7,1)' }
        );
        fall.onfinish = () => d.remove();
      }
      setTimeout(spawnDrip, 320 + Math.random() * 260);
    };
    setTimeout(spawnDrip, 600);
  }

  /* ---------------- magnetic buttons ---------------- */
  if (fine && !reduce) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      const strength = parseFloat(btn.dataset.magnetic) || 0.3;
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------------- mockup 3D tilt ---------------- */
  if (fine && !reduce) {
    document.querySelectorAll('.work-stage').forEach((stage) => {
      const mock = stage.querySelector('.mockup');
      if (!mock) return;
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        mock.style.setProperty('--ry', (-9 - px * 8).toFixed(2) + 'deg');
        mock.style.setProperty('--rx', (7 - py * 8).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', () => {
        mock.style.removeProperty('--ry'); mock.style.removeProperty('--rx');
      });
    });
  }

  /* ---------------- GSAP scroll choreography (extra polish) ---------------- */
  if (hasGSAP && window.ScrollTrigger && !reduce) {
    // gentle parallax on work stages
    gsap.utils.toArray('.work-stage').forEach((stage) => {
      gsap.fromTo(stage, { y: 40 }, {
        y: -40, ease: 'none',
        scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    // phone floats a touch faster than the browser frame
    gsap.utils.toArray('.mockup-phone').forEach((ph) => {
      gsap.fromTo(ph, { y: 26 }, {
        y: -26, ease: 'none',
        scrollTrigger: { trigger: ph.closest('.work-stage') || ph, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    // process timeline line draws as you scroll the phases
    const tline = document.querySelector('.proc-timeline .timeline-line span');
    if (tline) {
      gsap.fromTo(tline, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.proc-timeline', start: 'top 55%', end: 'bottom 85%', scrub: true }
      });
    }
  }

  /* ---------------- sticky mobile CTA reveal ---------------- */
  const mcta = document.querySelector('.mobile-cta');
  if (mcta) {
    const hero = document.querySelector('.hero') || document.querySelector('.page-head');
    const threshold = () => (hero ? hero.offsetHeight * 0.7 : 600);
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 220;
      if (window.scrollY > threshold() && !nearBottom) mcta.classList.add('show');
      else mcta.classList.remove('show');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // recalc ScrollTrigger after fonts load (serif metrics shift layout)
  if (document.fonts && document.fonts.ready && hasGSAP && window.ScrollTrigger) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
