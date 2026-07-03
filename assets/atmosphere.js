/* Webrivio — atmosphere engine (layers 2+3 of the Living Blueprint background)
   - Grid drift: the .atm-grid overlay parallaxes at 0.15x scroll (fine pointers only).
   - Aurora wisps: a fullscreen low-alpha WebGL field whose intensity (uAmp) follows
     the section currently crossing the viewport center, via [data-atm="0..1"].
   - Dependency-free; same self-skip discipline as hero.js. The CSS depth gradient
     (body::after) and the static grid are always painted underneath, so every skip
     path still leaves a designed background.
   Self-skips: prefers-reduced-motion, saveData, no WebGL,
               coarse pointer with deviceMemory<6 or DPR>2.
*/
(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ---- layer 2: grid parallax drift (static on coarse pointers) ---- */
  const grid = document.querySelector('.atm-grid');
  if (grid && !reduce && !coarse) {
    let scheduled = false;
    const drift = () => {
      const y = (window.scrollY * 0.15) % 360;
      grid.style.transform = `translate3d(0, ${(-y).toFixed(2)}px, 0)`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(drift); }
    }, { passive: true });
  }

  /* ---- layer 3: aurora wisps ---- */
  const canvas = document.getElementById('atm-canvas');
  if (!canvas || reduce) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const mem = navigator.deviceMemory || 8;
  const dpr0 = window.devicePixelRatio || 1;
  if (coarse && (mem < 6 || dpr0 > 2)) return;

  const init = () => {
    let gl;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' });
    } catch (e) { /* noop */ }
    if (!gl) return;

    const vert = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }';
    /* Deep-weighted palette with a hard alpha ceiling (~0.15) so body text
       keeps WCAG AA contrast over the brightest wisp state. */
    const frag = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_amp;
      float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
        vec2 u = f*f*(3.-2.*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0., a = .5;
        for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= .5; }
        return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        vec2 st = uv; st.x *= u_res.x / u_res.y;
        float t = u_time * 0.03;
        vec2 q = vec2(fbm(st*1.2 + vec2(0., t)), fbm(st*1.2 + vec2(4.7, -t)));
        float f = fbm(st*1.5 + 2.2*q + vec2(t*0.6, 0.));
        vec3 deep   = vec3(0.118,0.247,0.600);
        vec3 accent = vec3(0.302,0.494,1.000);
        vec3 cyan   = vec3(0.498,0.890,1.000);
        vec3 col = mix(deep, accent, 0.35*smoothstep(.45,.95,f));
        col = mix(col, cyan, 0.10*smoothstep(.85,1.15,f + .25*q.y));
        float band = smoothstep(0., .22, uv.y) * smoothstep(1., .78, uv.y);
        float a = smoothstep(.42,.95,f) * band * u_amp * 0.12;
        gl_FragColor = vec4(col, a);
      }
    `;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uAmp = gl.getUniformLocation(prog, 'u_amp');

    const lowPower = mem <= 4 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    const dprCap = lowPower ? 1.0 : 1.25;
    const scale = 0.55;
    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = Math.max(1, Math.floor(window.innerWidth * dpr * scale));
      h = Math.max(1, Math.floor(window.innerHeight * dpr * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* uAmp follows the section crossing the viewport-center band */
    let amp = 0, target = 0.2;
    document.querySelectorAll('[data-atm]').forEach(() => {});
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) target = Math.max(0, Math.min(1, parseFloat(en.target.dataset.atm) || 0));
      });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    document.querySelectorAll('[data-atm]').forEach((s) => io.observe(s));

    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

    canvas.classList.add('on');

    let start = performance.now(), last = 0, lastLerp = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible) return;
      if (now - last < 33) return; /* ~30fps cap */
      last = now;
      const dt = Math.min(100, now - lastLerp); lastLerp = now;
      amp += (target - amp) * Math.min(1, dt / 200); /* ~600ms settle */
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uAmp, amp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    requestAnimationFrame(loop);
  };

  /* init after first paint so hero LCP is never contested */
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(init, { timeout: 1200 }) : setTimeout(init, 250));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
})();
