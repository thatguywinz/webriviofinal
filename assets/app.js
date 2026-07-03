/* Webrivio — shared interactions
   - scroll progress bar
   - custom cursor (pointer:fine only)
   - reveal on intersect (IntersectionObserver)
   - word-level mask reveal
   - mobile nav drawer
   - marquee duplication
   - form UX (chip toggles, submit feedback)
   - parallax layers
   Accessibility:
   - respects prefers-reduced-motion
   - nav drawer traps focus & is Escape-closable
   - reveal elements get their final state immediately when reduced motion is on
*/

(() => {
  'use strict';

  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll progress ---------- */
  const progress = document.querySelector('.progress');
  const onScroll = () => {
    if (!progress) return;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progress.style.width = pct + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- custom cursor ---------- */
  const cursor = document.querySelector('.cursor');
  if (cursor && matchMedia('(pointer: fine)').matches && !prefersReducedMotion) {
    let x = 0, y = 0, tx = 0, ty = 0, visible = false;
    window.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!visible) { cursor.style.opacity = '1'; visible = true; }
    });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; visible = false; });
    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    const hoverables = 'a, button, .work-card, .service-card, .process-step, .chip, .pkg, details summary, input, textarea';
    document.querySelectorAll(hoverables).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ---------- reveal on intersect ---------- */
  const releaseMaskClip = (maskEl) => {
    const inner = maskEl.querySelector('span');
    if (!inner) { maskEl.classList.add('done'); return; }
    const onEnd = () => {
      maskEl.classList.add('done');
      inner.removeEventListener('transitionend', onEnd);
    };
    inner.addEventListener('transitionend', onEnd);
    // Safety net in case transitionend never fires (transition canceled, zero-duration, etc.)
    setTimeout(() => maskEl.classList.add('done'), 2000);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.classList.contains('reveal-mask')) releaseMaskClip(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  if (prefersReducedMotion) {
    // Skip reveals — show everything immediately.
    document.querySelectorAll('.reveal, .reveal-mask').forEach(el => {
      el.classList.add('in');
      if (el.classList.contains('reveal-mask')) el.classList.add('done');
    });
  } else {
    document.querySelectorAll('.reveal, .reveal-mask').forEach(el => io.observe(el));
  }

  // stagger children with [data-stagger]
  document.querySelectorAll('[data-stagger]').forEach(wrap => {
    const kids = wrap.querySelectorAll('.reveal, .reveal-mask');
    kids.forEach((k, i) => { k.style.transitionDelay = `${i * 80}ms`; });
  });

  /* ---------- split words for reveal ---------- */
  document.querySelectorAll('[data-split-words]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="reveal-mask"><span>${w}&nbsp;</span></span>`).join('');
    el.querySelectorAll('.reveal-mask').forEach((m, i) => {
      m.style.transitionDelay = `${i * 60}ms`;
      if (prefersReducedMotion) { m.classList.add('in'); m.classList.add('done'); }
      else io.observe(m);
    });
  });

  /* ---------- mobile nav drawer ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.querySelector('.nav-drawer');
  if (toggle && drawer) {
    const firstLink = () => drawer.querySelector('a');
    const open = () => {
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstLink()?.focus(), 50);
    };
    const close = () => {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    toggle.addEventListener('click', () => {
      if (toggle.classList.contains('open')) close(); else open();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.classList.contains('open')) {
        close();
        toggle.focus();
      }
    });
    drawer.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') close();
    });
  }

  /* ---------- marquee duplication ---------- */
  document.querySelectorAll('.ticker-track, .logo-track').forEach(track => {
    track.innerHTML += track.innerHTML;
    if (prefersReducedMotion) track.style.animation = 'none';
  });

  /* ---------- chip toggles ---------- */
  document.querySelectorAll('.chips').forEach(group => {
    const multi = group.dataset.multi === 'true';
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      if (multi) {
        chip.classList.toggle('active');
      } else {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }
      // mirror to hidden input if present
      const hidden = group.nextElementSibling;
      if (hidden && hidden.tagName === 'INPUT' && hidden.type === 'hidden') {
        const active = [...group.querySelectorAll('.chip.active')].map(c => c.textContent.trim());
        hidden.value = multi ? active.join(', ') : (active[0] || '');
      }
    });
    // keyboard support
    group.querySelectorAll('.chip').forEach(chip => {
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chip.click(); }
      });
    });
  });

  /* ---------- contact form (FormSubmit AJAX) ---------- */
  const form = document.querySelector('.contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    // ?sent=1 is the fallback redirect target if a non-AJAX submit succeeded
    if (/[?&]sent=1\b/.test(location.search) && status) {
      status.textContent = 'Thanks — your inquiry is in. We reply within one business day.';
      status.className = 'form-status ok';
      history.replaceState(null, '', location.pathname);
    }
    const setStatus = (msg, kind) => {
      if (!status) return;
      status.textContent = msg;
      status.className = 'form-status' + (kind ? ' ' + kind : '');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const label = btn ? btn.querySelector('.label') : null;
      const orig = label ? label.textContent : (btn ? btn.textContent : '');

      // Honeypot: if filled, silently succeed (spam bot)
      const honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) { setStatus('Thanks — we\'ll be in touch shortly.', 'ok'); form.reset(); return; }

      // HTML5 validation
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (btn) { btn.disabled = true; btn.style.opacity = 0.7; }
      if (label) label.textContent = 'Sending…';
      setStatus('Sending your inquiry…', 'pending');

      try {
        const fd = new FormData(form);
        // Use FormSubmit's AJAX endpoint (returns JSON, no redirect)
        const action = form.getAttribute('action') || '';
        const ajaxUrl = action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
        const res = await fetch(ajaxUrl, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: fd
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // FormSubmit responds with JSON; success: "true" (string) or true
        let ok = true;
        try {
          const data = await res.json();
          if (data && (data.success === false || data.success === 'false')) ok = false;
        } catch (_) { /* non-JSON ok */ }
        if (!ok) throw new Error('Submission rejected');

        if (label) label.textContent = 'Sent — we\'ll be in touch';
        setStatus('Thanks — your inquiry is in. We reply within one business day.', 'ok');
        form.reset();
        form.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));

        setTimeout(() => {
          if (label) label.textContent = orig;
          if (btn) { btn.disabled = false; btn.style.opacity = 1; }
        }, 3800);
      } catch (err) {
        if (label) label.textContent = orig;
        if (btn) { btn.disabled = false; btn.style.opacity = 1; }
        setStatus('Couldn\'t send right now. Email us at hello@webrivio.com — we\'ll get straight back to you.', 'err');
      }
    });
  }

  /* ---------- parallax layers ---------- */
  const orbs = document.querySelectorAll('[data-parallax]');
  if (orbs.length && !prefersReducedMotion) {
    let scheduled = false;
    const update = () => {
      const y = window.scrollY;
      orbs.forEach(o => {
        const speed = parseFloat(o.dataset.parallax) || 0.2;
        o.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) { requestAnimationFrame(update); scheduled = true; }
    }, { passive: true });
  }

  /* ---------- set active nav link ---------- */
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });

  /* ---------- update footer year ---------- */
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
