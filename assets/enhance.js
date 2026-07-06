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
    // Honor an initial URL hash (e.g. arriving at /work#aviva from the homepage).
    // Lenis resets scroll on init and drops the browser's native jump; fonts,
    // reveals, the injected signal SVG and lazy images then keep shifting the
    // target for ~1s. Re-apply the scroll across that settle window, but stop
    // the moment the visitor takes over so we never yank them back.
    if (location.hash.length > 1) {
      let target = null;
      try { target = document.querySelector(location.hash); } catch (_) { /* invalid selector */ }
      if (target) {
        let cancelled = false;
        const cancel = () => { cancelled = true; };
        ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) =>
          window.addEventListener(ev, cancel, { once: true, passive: true }));
        const goHash = () => { if (!cancelled) lenis.scrollTo(target, { offset: -96, immediate: true }); };
        [60, 300, 650, 1100].forEach((ms) => setTimeout(goHash, ms));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(goHash, 80));
      }
    }
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

  /* ---------------- money-leak drips (funnel exit stream) ---------------- */
  const funnel = document.querySelector('.funnel');
  const dripHost = funnel && (funnel.querySelector('.funnel-drips') || funnel);
  if (dripHost && !reduce) {
    const host = funnel.closest('.leak-meter') || funnel;
    let active = false;
    inView(host, () => { active = true; }, { threshold: 0.3 });
    const spawnDrip = () => {
      if (active) {
        const d = document.createElement('span');
        d.className = 'drip';
        d.style.left = (47 + Math.random() * 6) + '%';
        dripHost.appendChild(d);
        const fall = d.animate(
          [{ transform: 'translate(-50%,0)', opacity: 0.9 }, { transform: 'translate(-50%,62px)', opacity: 0 }],
          { duration: 950 + Math.random() * 500, easing: 'cubic-bezier(.4,0,.7,1)' }
        );
        fall.onfinish = () => d.remove();
      }
      // ~160ms cadence over ~1s fall keeps roughly 6 drips concurrent
      setTimeout(spawnDrip, 140 + Math.random() * 90);
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

  /* ---------------- proof device 3D tilt (subtle, fine-pointer only) ---------------- */
  if (fine && !reduce) {
    document.querySelectorAll('.proof-devices').forEach((stage) => {
      const mock = stage.querySelector('.proof-browser');
      if (!mock) return;
      mock.style.transition = 'transform .5s var(--ease-out), border-color .3s';
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        mock.style.transform = `perspective(1400px) rotateY(${(px * 5).toFixed(2)}deg) rotateX(${(-py * 5).toFixed(2)}deg)`;
      });
      stage.addEventListener('pointerleave', () => { mock.style.transform = ''; });
    });
  }

  /* ---------------- proof previews: auto-scroll only while on screen ----------------
     Each build's screenshot glides top-to-bottom behind the browser glass. Start
     that from the top when the frame actually enters view — not on page load, or
     it would have already scrolled to the bottom by the time the visitor gets
     here. Two thresholds so the reset never flickers: begin once the frame is
     ~35% visible, and only clear it (which snaps back to the top) once the frame
     has fully left, so it replays from the top on the way back. */
  if (!reduce && 'IntersectionObserver' in window) {
    const proofIO = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.intersectionRatio >= 0.35) e.target.classList.add('is-playing');
        else if (!e.isIntersecting) e.target.classList.remove('is-playing');
      });
    }, { threshold: [0, 0.35] });
    document.querySelectorAll('.proof-screen').forEach((s) => proofIO.observe(s));
  }

  /* ---------------- GSAP scroll choreography (cinematic polish) ---------------- */
  if (hasGSAP && window.ScrollTrigger && !reduce) {
    // gentle parallax lift on each proof block's devices
    gsap.utils.toArray('.proof-devices').forEach((stage) => {
      gsap.fromTo(stage, { y: 46 }, {
        y: -46, ease: 'none',
        scrollTrigger: { trigger: stage.closest('.proof') || stage, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    // the floating phone drifts a touch faster than its browser frame for depth
    gsap.utils.toArray('.proof-phone').forEach((ph) => {
      gsap.fromTo(ph, { y: 30 }, {
        y: -30, ease: 'none',
        scrollTrigger: { trigger: ph.closest('.proof') || ph, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    // hero preview drifts up subtly as you leave the hero (parallax depth)
    const heroPrev = document.querySelector('.hero-preview');
    if (heroPrev) {
      gsap.fromTo(heroPrev, { y: 0 }, {
        y: -40, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }

    /* ---- PROCESS: cinematic 2D storytelling ---- */
    // each giant phase number drifts across the screen as its phase scrolls
    // through — alternating left/right for a filmic, moving-set-piece feel.
    gsap.utils.toArray('.phase').forEach((phase, i) => {
      const num = phase.querySelector('.phase-num');
      if (num) {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.fromTo(num,
          { xPercent: 16 * dir, opacity: 0.55 },
          { xPercent: -16 * dir, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: phase, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      }
      // the phase title lifts a touch as the phase settles into view
      const title = phase.querySelector('.phase-title');
      if (title) {
        gsap.fromTo(title, { y: 26 }, {
          y: -18, ease: 'none',
          scrollTrigger: { trigger: phase, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    });
    // the timeline spine draws downward as you move through the whole story
    const timeline = document.querySelector('.proc-timeline');
    if (timeline) {
      gsap.to(timeline, {
        ease: 'none',
        scrollTrigger: {
          trigger: timeline, start: 'top 70%', end: 'bottom 80%', scrub: 0.5,
          onUpdate: (self) => timeline.style.setProperty('--proc-progress', self.progress.toFixed(3))
        }
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
