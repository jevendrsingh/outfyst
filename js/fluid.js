/* ═══════════════════════════════════════════════════════════
   OUTFYST — fluid.js
   ═══════════════════════════════════════════════════════════
   
   Lightweight WebGL fluid / liquid background effect.
   Renders interactive ink-like ripples on a canvas.
   Reacts to mouse and touch input.
   
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Skip if reduced motion or no WebGL
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('fluid-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // ── Config ──
  var config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 0.97,
    VELOCITY_DISSIPATION: 0.98,
    PRESSURE_ITERATIONS: 20,
    SPLAT_RADIUS: 0.3,
    SPLAT_FORCE: 6000,
    DARK_PALETTE: [
      [0.05, 0.02, 0.15],  // deep purple
      [0.0, 0.05, 0.2],    // deep blue
      [0.02, 0.08, 0.18],  // dark teal
      [0.1, 0.02, 0.12],   // wine
    ],
    LIGHT_PALETTE: [
      [0.7, 0.75, 0.9],    // soft lavender
      [0.65, 0.8, 0.85],   // light teal
      [0.8, 0.7, 0.85],    // soft mauve
      [0.7, 0.78, 0.82],   // soft sky
    ]
  };

  // ── Resize ──
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Shader helpers ──
  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(vertSrc, fragSrc) {
    var vert = compileShader(gl.VERTEX_SHADER, vertSrc);
    var frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  // ── Shaders ──
  var baseVert = [
    'attribute vec2 aPosition;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  var displayFrag = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTexture;',
    'uniform float uBrightness;',
    'void main() {',
    '  vec3 c = texture2D(uTexture, vUv).rgb;',
    '  float intensity = length(c);',
    '  c = c * uBrightness;',
    '  gl_FragColor = vec4(c, smoothstep(0.0, 0.15, intensity));',
    '}'
  ].join('\n');

  var splatFrag = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTarget;',
    'uniform vec3 uColor;',
    'uniform vec2 uPoint;',
    'uniform float uRadius;',
    'uniform float uAspect;',
    'void main() {',
    '  vec2 p = vUv - uPoint;',
    '  p.x *= uAspect;',
    '  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;',
    '  vec3 base = texture2D(uTarget, vUv).rgb;',
    '  gl_FragColor = vec4(base + splat, 1.0);',
    '}'
  ].join('\n');

  var advectFrag = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uSource;',
    'uniform vec2 uTexelSize;',
    'uniform float uDt;',
    'uniform float uDissipation;',
    'void main() {',
    '  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;',
    '  gl_FragColor = uDissipation * texture2D(uSource, coord);',
    '}'
  ].join('\n');

  // ── Create programs ──
  var displayProg = createProgram(baseVert, displayFrag);
  var splatProg = createProgram(baseVert, splatFrag);
  var advectProg = createProgram(baseVert, advectFrag);

  if (!displayProg || !splatProg || !advectProg) return;

  // ── Fullscreen quad ──
  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  var indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

  function bindQuad(prog) {
    gl.useProgram(prog);
    var aPos = gl.getAttribLocation(prog, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  }

  // ── Framebuffer helper ──
  function createFBO(w, h) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture: tex, fbo: fbo, width: w, height: h };
  }

  function createDoubleFBO(w, h) {
    return {
      read: createFBO(w, h),
      write: createFBO(w, h),
      swap: function () {
        var tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      }
    };
  }

  // ── Init framebuffers ──
  var simW = config.SIM_RESOLUTION;
  var simH = config.SIM_RESOLUTION;
  var dyeW = config.DYE_RESOLUTION;
  var dyeH = config.DYE_RESOLUTION;

  var velocity = createDoubleFBO(simW, simH);
  var dye = createDoubleFBO(dyeW, dyeH);

  // ── Splat function ──
  function splat(x, y, dx, dy, color) {
    bindQuad(splatProg);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'uPoint'), x, y);
    gl.uniform3f(gl.getUniformLocation(splatProg, 'uColor'), dx * config.SPLAT_FORCE, dy * config.SPLAT_FORCE, 0.0);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'uRadius'), config.SPLAT_RADIUS / 100.0);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'uAspect'), canvas.width / canvas.height);

    // Splat velocity
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(splatProg, 'uTarget'), 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    velocity.swap();

    // Splat dye
    gl.uniform3f(gl.getUniformLocation(splatProg, 'uColor'), color[0] * 0.8, color[1] * 0.8, color[2] * 0.8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform1i(gl.getUniformLocation(splatProg, 'uTarget'), 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.viewport(0, 0, dyeW, dyeH);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    dye.swap();
  }

  // ── Advect ──
  function advect(target, dissipation) {
    bindQuad(advectProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(gl.getUniformLocation(advectProg, 'uVelocity'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
    gl.uniform1i(gl.getUniformLocation(advectProg, 'uSource'), 1);
    gl.uniform2f(gl.getUniformLocation(advectProg, 'uTexelSize'), 1.0 / target.read.width, 1.0 / target.read.height);
    gl.uniform1f(gl.getUniformLocation(advectProg, 'uDt'), 0.016);
    gl.uniform1f(gl.getUniformLocation(advectProg, 'uDissipation'), dissipation);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fbo);
    gl.viewport(0, 0, target.read.width, target.read.height);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    target.swap();
  }

  // ── Input tracking ──
  var pointers = [];
  var lastPointer = { x: 0, y: 0, moved: false };

  function updatePointer(x, y) {
    var rect = canvas.getBoundingClientRect();
    var newX = (x - rect.left) / rect.width;
    var newY = 1.0 - (y - rect.top) / rect.height;
    var dx = newX - lastPointer.x;
    var dy = newY - lastPointer.y;
    lastPointer.x = newX;
    lastPointer.y = newY;
    lastPointer.dx = dx;
    lastPointer.dy = dy;
    lastPointer.moved = true;
  }

  canvas.addEventListener('mousemove', function (e) {
    updatePointer(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var touch = e.touches[0];
    updatePointer(touch.clientX, touch.clientY);
  }, { passive: false });

  // ── Random splats on load ──
  function randomColor() {
    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    var palette = isLight ? config.LIGHT_PALETTE : config.DARK_PALETTE;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function addRandomSplats(count) {
    for (var i = 0; i < count; i++) {
      var x = Math.random();
      var y = Math.random();
      var dx = (Math.random() - 0.5) * 0.003;
      var dy = (Math.random() - 0.5) * 0.003;
      splat(x, y, dx, dy, randomColor());
    }
  }

  // Initial ambient splats
  setTimeout(function () { addRandomSplats(3); }, 100);

  // Periodic ambient motion
  var ambientTimer = 0;

  // ── Render loop ──
  function render() {
    // Ambient splats every ~3 seconds
    ambientTimer++;
    if (ambientTimer > 180) {
      ambientTimer = 0;
      var x = Math.random();
      var y = Math.random();
      var dx = (Math.random() - 0.5) * 0.001;
      var dy = (Math.random() - 0.5) * 0.001;
      splat(x, y, dx, dy, randomColor());
    }

    // Process pointer input
    if (lastPointer.moved) {
      lastPointer.moved = false;
      splat(lastPointer.x, lastPointer.y, lastPointer.dx, lastPointer.dy, randomColor());
    }

    // Advect velocity and dye
    advect(velocity, config.VELOCITY_DISSIPATION);
    advect(dye, config.DENSITY_DISSIPATION);

    // Draw to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    bindQuad(displayProg);
    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    gl.uniform1f(gl.getUniformLocation(displayProg, 'uBrightness'), isLight ? 0.35 : 0.4);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform1i(gl.getUniformLocation(displayProg, 'uTexture'), 0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
