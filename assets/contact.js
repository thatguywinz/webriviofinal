/* Webrivio — Contact / get-a-quote flow
   Progressive enhancement: turns the plain .q-form (which works on its
   own with no JS) into a bold, full-screen, one-question-at-a-time flow.

   Owns everything contact-specific (nav between steps, per-step
   validation, chips, review, FormSubmit AJAX submit, success takeover)
   so it never collides with app.js — which keys off .contact-form / .chips
   classes this file deliberately does not use.
*/
(() => {
  'use strict';

  const quote = document.querySelector('.quote');
  const form  = quote && quote.querySelector('.q-form');
  if (!quote || !form) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps  = Array.from(form.querySelectorAll('.q-step'));
  if (!steps.length) return;
  const total  = steps.length;

  const bar      = quote.querySelector('.q-progress-bar span');
  const countCur = quote.querySelector('.q-count .cur');
  const countTot = quote.querySelector('.q-count .tot');
  const backBtn  = quote.querySelector('.q-back');
  const status   = form.querySelector('.form-status');

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const setLabel = (btn, txt) => {
    if (!btn) return;
    const l = btn.querySelector('.label');
    if (l) l.textContent = txt; else btn.textContent = txt;
  };
  const setStatus = (msg, kind) => {
    if (!status) return;
    status.textContent = msg || '';
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  };

  /* ---------- success takeover ---------- */
  const done = () => {
    quote.classList.add('is-done');
    const d = quote.querySelector('.q-done');
    const h = d && (d.querySelector('h2') || d);
    if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (_) { h.focus(); } }
  };

  /* ---------- ?sent=1 fallback (non-AJAX submit succeeded) ---------- */
  if (/[?&]sent=1\b/.test(location.search)) {
    quote.classList.add('is-enhanced');
    done();
    try { history.replaceState(null, '', location.pathname); } catch (_) {}
    return; // nothing else to wire — they're already through
  }

  /* flip the progressive-enhancement switch */
  quote.classList.add('is-enhanced');
  if (countTot) countTot.textContent = String(total).padStart(2, '0');

  let idx = 0;

  const fieldOf = (step) => step.querySelector('.q-input, .q-textarea');
  const focusOf = (step) => step.querySelector('.q-input, .q-textarea, .q-opt, .q-submit');

  const showErr = (step, msg) => {
    const e = step.querySelector('.q-error');
    if (e) { e.textContent = msg; e.classList.add('show'); }
  };
  const clearErr = (step) => {
    const e = step.querySelector('.q-error');
    if (e) { e.textContent = ''; e.classList.remove('show'); }
  };

  const validate = (step) => {
    const f = fieldOf(step);
    if (!f || !f.hasAttribute('required')) { clearErr(step); return true; }
    const v = f.value.trim();
    if (!v) { showErr(step, f.dataset.err || 'This one’s required.'); f.focus(); return false; }
    if (f.type === 'email' && !f.checkValidity()) {
      showErr(step, 'That email looks off — mind checking it?'); f.focus(); return false;
    }
    clearErr(step);
    return true;
  };

  const updateChrome = () => {
    if (bar) bar.style.width = ((idx + 1) / total * 100) + '%';
    if (countCur) countCur.textContent = String(idx + 1).padStart(2, '0');
    if (backBtn) backBtn.hidden = idx === 0;
  };

  const go = (n) => {
    if (n < 0 || n >= total || n === idx) { if (n === idx) return; return; }
    if (n > idx && !validate(steps[idx])) return; // gate forward moves
    steps[idx].classList.remove('is-active');
    idx = n;
    const step = steps[idx];
    step.classList.add('is-active');
    updateChrome();
    if (step.classList.contains('q-step--send')) buildReview();
    const fe = focusOf(step);
    if (fe) setTimeout(() => { try { fe.focus({ preventScroll: true }); } catch (_) { fe.focus(); } }, reduce ? 0 : 90);
  };

  const advance = () => {
    if (steps[idx].classList.contains('q-step--send')) {
      if (form.requestSubmit) form.requestSubmit();
      else form.querySelector('.q-submit')?.click();
    } else {
      go(idx + 1);
    }
  };

  /* ---------- init ---------- */
  steps.forEach((s, i) => s.classList.toggle('is-active', i === 0));
  updateChrome();
  // gentle autofocus so the first question is ready to type into
  setTimeout(() => { const fe = focusOf(steps[0]); if (fe) try { fe.focus({ preventScroll: true }); } catch (_) {} }, reduce ? 0 : 380);

  /* ---------- keyboard: Enter advances (textarea = newline) ---------- */
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (t.classList && t.classList.contains('q-textarea')) {
      if (e.metaKey || e.ctrlKey) { e.preventDefault(); advance(); }
      return; // plain Enter writes a newline
    }
    if (t.tagName === 'BUTTON') return; // buttons fire their own click
    if (t.classList && (t.classList.contains('q-input'))) { e.preventDefault(); advance(); }
  });

  /* ---------- click delegation (next / skip / back / edit) ---------- */
  quote.addEventListener('click', (e) => {
    const next = e.target.closest('.q-next');
    if (next) { e.preventDefault(); advance(); return; }
    const skip = e.target.closest('.q-skip');
    if (skip) {
      e.preventDefault();
      const step = skip.closest('.q-step');
      const f = step && fieldOf(step);
      if (f) f.value = '';
      clearErr(step);
      go(idx + 1);
      return;
    }
    const back = e.target.closest('.q-back');
    if (back) { e.preventDefault(); go(idx - 1); return; }
    const edit = e.target.closest('.edit[data-goto]');
    if (edit) { e.preventDefault(); go(parseInt(edit.dataset.goto, 10) || 0); return; }
  });

  /* ---------- chips (single-select, auto-advance) ---------- */
  form.querySelectorAll('.q-chips').forEach((group) => {
    const hidden = group.parentElement.querySelector('input[type="hidden"]');
    group.addEventListener('click', (e) => {
      const opt = e.target.closest('.q-opt');
      if (!opt) return;
      group.querySelectorAll('.q-opt').forEach((o) => { o.classList.remove('is-on'); o.setAttribute('aria-checked', 'false'); });
      opt.classList.add('is-on');
      opt.setAttribute('aria-checked', 'true');
      if (hidden) hidden.value = opt.textContent.trim();
      setTimeout(() => go(idx + 1), reduce ? 0 : 240);
    });
  });

  /* ---------- textarea auto-grow ---------- */
  form.querySelectorAll('.q-textarea').forEach((ta) => {
    const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', grow);
    grow();
  });

  /* ---------- review builder ---------- */
  const REVIEW = [
    ['email', 'Email'],
    ['name', 'Name'],
    ['phone', 'Phone'],
    ['business', 'Business'],
    ['industry', 'Type'],
  ];
  function buildReview() {
    const box = quote.querySelector('.q-review');
    if (!box) return;
    box.innerHTML = REVIEW.map(([name, label]) => {
      const el = form.querySelector('[name="' + name + '"]');
      const val = el ? el.value.trim() : '';
      const stepEl = form.querySelector('.q-step[data-name="' + name + '"]');
      const gi = stepEl ? steps.indexOf(stepEl) : -1;
      return '<div class="q-review-row">' +
        '<span class="k">' + label + '</span>' +
        '<span class="v' + (val ? '' : ' empty') + '">' + (val ? escapeHtml(val) : '—') + '</span>' +
        (gi >= 0 ? '<button type="button" class="edit" data-goto="' + gi + '">Edit</button>' : '') +
        '</div>';
    }).join('');
  }

  /* ---------- submit (FormSubmit AJAX) ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // final guard — if a required field is empty, jump back to it
    for (let i = 0; i < steps.length; i++) {
      const f = fieldOf(steps[i]);
      if (f && f.hasAttribute('required') && !validate(steps[i])) { go(i); return; }
    }

    // honeypot: pretend success for bots
    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) { done(); return; }

    const btn = form.querySelector('.q-submit');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; setLabel(btn, 'Sending…'); }
    setStatus('Sending your inquiry…', 'pending');

    try {
      const fd = new FormData(form);
      const action = form.getAttribute('action') || '';
      const ajaxUrl = action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
      const res = await fetch(ajaxUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: fd,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      let ok = true;
      try { const d = await res.json(); if (d && (d.success === false || d.success === 'false')) ok = false; } catch (_) {}
      if (!ok) throw new Error('rejected');
      done();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; setLabel(btn, 'Send inquiry'); }
      setStatus('Couldn’t send right now. Email hello@webrivio.com — we’ll get straight back to you.', 'err');
    }
  });
})();
