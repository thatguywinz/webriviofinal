/* Webrivio — hero "living field"
   A dependency-free WebGL aurora/nebula rendered behind the hero headline.
   - Built only from the brand palette (bg → accent-deep → accent → cyan).
   - Progressive enhancement: a CSS mesh-gradient fallback is always painted
     underneath; this canvas layers on top only when it's safe & worthwhile.
   - Skipped entirely on prefers-reduced-motion, save-data, low-power devices,
     no-WebGL, and when the hero scrolls out of view or the tab is hidden.
*/
(() => {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const lowMem = (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const lowCpu = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  // Low-power heuristic: don't gate purely on cores (many fine laptops have 4),
  // but bail on the obvious "save battery / save data / reduced motion" signals.
  if (reduce || saveData) return;

  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' })
      || canvas.getContext('experimental-webgl');
  } catch (e) { /* noop */ }
  if (!gl) return;

  /* ---- shaders ---- */
  const vert = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;

  // Aurora: layered domain-warped fbm, tinted across the brand palette,
  // biased toward the top-right and faded out toward the bottom so the
  // headline stays legible. Cursor gently pushes the flow.
  const frag = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;

    // hash / value noise
    float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i+vec2(1.0,0.0));
      float c = hash(i+vec2(0.0,1.0));
      float d = hash(i+vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      float agp = u_res.x / u_res.y;
      vec2 st = uv; st.x *= agp;

      float t = u_time * 0.035;
      vec2 m = (u_mouse - 0.5);

      // domain warp
      vec2 q = vec2(fbm(st*1.4 + vec2(0.0, t)), fbm(st*1.4 + vec2(5.2, -t)));
      vec2 r = vec2(fbm(st*1.4 + 2.4*q + vec2(1.7,9.2) + m*0.6 + t*0.8),
                    fbm(st*1.4 + 2.4*q + vec2(8.3,2.8) - m*0.6));
      float f = fbm(st*1.6 + 3.0*r);

      // palette (brand only)
      vec3 bg     = vec3(0.020,0.043,0.094); // #050B18
      vec3 deep   = vec3(0.118,0.247,0.600); // #1E3F99
      vec3 accent = vec3(0.302,0.494,1.000); // #4D7EFF
      vec3 cyan   = vec3(0.498,0.890,1.000); // #7FE3FF

      vec3 col = bg;
      col = mix(col, deep,   smoothstep(0.25, 0.95, f));
      col = mix(col, accent, smoothstep(0.55, 1.05, f*f + 0.15*r.x));
      col = mix(col, cyan,   smoothstep(0.86, 1.18, f + 0.30*q.y));

      // bias glow toward top-right, fade toward bottom for legibility
      float corner = smoothstep(1.5, 0.1, distance(uv, vec2(0.82,0.86)));
      float vfade  = smoothstep(0.0, 0.62, uv.y);
      float intensity = corner * (0.35 + 0.65*vfade);

      col = mix(bg, col, clamp(intensity*1.15, 0.0, 1.0));

      // subtle grain to avoid banding
      float g = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.025;
      col += g;

      // alpha so the CSS fallback shows through where the field is dark
      float a = clamp(intensity*1.25, 0.0, 1.0);
      gl_FragColor = vec4(col, a);
    }
  `;

  function compile(type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes   = gl.getUniformLocation(prog, 'u_res');
  const uTime  = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  // Render at a capped, slightly-reduced resolution for performance.
  const dprCap = (lowMem || lowCpu) ? 1.0 : 1.5;
  let w = 0, h = 0;
  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const scale = 0.85; // internal render scale; CSS upscales — cheap & soft
    const cw = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
    const ch = canvas.clientHeight || canvas.offsetHeight || Math.round(window.innerHeight * 0.9);
    w = Math.max(1, Math.floor(cw * dpr * scale));
    h = Math.max(1, Math.floor(ch * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // pointer (smoothed)
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1.0 - (e.clientY / window.innerHeight);
  }, { passive: true });

  // run only while the hero is on-screen and the tab is visible
  let visible = true, onScreen = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  const hero = canvas.closest('.hero') || canvas.parentElement;
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver((ents) => { onScreen = ents[0].isIntersecting; }, { threshold: 0 })
      .observe(hero);
  }

  canvas.classList.add('on'); // fade the canvas in via CSS

  let raf, start = performance.now(), last = 0;
  function loop(now){
    raf = requestAnimationFrame(loop);
    if (!visible || !onScreen) return;
    // ~40fps cap — plenty for a slow field, saves battery
    if (now - last < 24) return;
    last = now;
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(loop);
})();
