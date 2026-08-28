/**
 * LiquidEther — WebGL Fluid Background Effect (Vanilla JS)
 * Inspired by the React LiquidEther component.
 * Creates a fixed fullscreen canvas behind all content with viscous fluid dynamics.
 *
 * Colors: #f3c60e, #bd9717, #d5d215 (base fluid)
 * Additional accents: #5227FF, #FF9FFC, #B497CF
 */
(function () {
  'use strict';

  // Skip on reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- Configuration ----
  var CONFIG = {
    resolution: 0.35,          // Lower = faster but less detailed
    mouseForce: 5,
    cursorSize: 80,
    viscous: 28,
    iterationsViscous: 28,
    iterationsPoisson: 48,
    isBounce: false,
    autoDemo: true,
    autoSpeed: 0.35,
    autoIntensity: 1.6,
    takeoverDuration: 0.25,
    autoResumeDelay: 3500,
    autoRampDuration: 0.6,
    colors: [
      [0.953, 0.776, 0.055],  // #f3c60e
      [0.741, 0.592, 0.090],  // #bd9717
      [0.835, 0.824, 0.082],  // #d5d215
      [0.322, 0.153, 1.000],  // #5227FF
      [1.000, 0.624, 0.988],  // #FF9FFC
      [0.706, 0.592, 0.812],  // #B497CF
    ],
    opacity: 0.18              // Canvas opacity for subtlety
  };

  // ---- Canvas Setup ----
  var canvas = document.createElement('canvas');
  canvas.id = 'liquid-ether-bg';
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:' +
    CONFIG.opacity + ';';
  document.body.insertBefore(canvas, document.body.firstChild);

  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
  if (!gl) return;

  var W, H, texW, texH;
  var mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0;
  var mouseActive = false;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    texW = Math.round(W * CONFIG.resolution);
    texH = Math.round(H * CONFIG.resolution);
    canvas.width = texW;
    canvas.height = texH;
    gl.viewport(0, 0, texW, texH);
    initFramebuffers();
  }

  // ---- Shader Helpers ----
  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function createProgram(vSrc, fSrc) {
    var p = gl.createProgram();
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vSrc));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(p));
    }
    return p;
  }

  // ---- Shaders ----
  var VERT = 'attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos*0.5+0.5;gl_Position=vec4(a_pos,0,1);}';

  // Fluid advection + color mapping
  var FRAG_RENDER = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_velocity;',
    'uniform sampler2D u_pressure;',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    '',
    'vec3 palette(float t){',
    '  vec3 a=vec3(0.953,0.776,0.055);',   // #f3c60e
    '  vec3 b=vec3(0.741,0.592,0.090);',   // #bd9717
    '  vec3 c=vec3(0.835,0.824,0.082);',   // #d5d215
    '  vec3 d=vec3(0.322,0.153,1.000);',   // #5227FF
    '  return a+b*cos(6.28318*(c*t+d));',
    '}',
    '',
    'void main(){',
    '  vec2 vel=texture2D(u_velocity,v_uv).xy;',
    '  float pres=texture2D(u_pressure,v_uv).x;',
    '  float speed=length(vel);',
    '  float t=speed*3.0+pres*0.5+u_time*0.02;',
    '  vec3 col=palette(t);',
    '  float alpha=smoothstep(0.0,0.08,speed+abs(pres)*0.3)*0.85+0.15;',
    '  gl_FragColor=vec4(col*alpha,alpha);',
    '}',
  ].join('\n');

  // Velocity advection
  var FRAG_ADVECT = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_source;',
    'uniform sampler2D u_velocity;',
    'uniform vec2 u_texelSize;',
    'uniform float u_dt;',
    'uniform float u_dissipation;',
    'void main(){',
    '  vec2 vel=texture2D(u_velocity,v_uv).xy;',
    '  vec2 coord=v_uv-vel*u_texelSize*u_dt;',
    '  gl_FragColor=u_dissipation*texture2D(u_source,coord);',
    '}',
  ].join('\n');

  // Divergence
  var FRAG_DIVERGENCE = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_velocity;',
    'uniform vec2 u_texelSize;',
    'void main(){',
    '  float L=texture2D(u_velocity,v_uv-vec2(u_texelSize.x,0)).x;',
    '  float R=texture2D(u_velocity,v_uv+vec2(u_texelSize.x,0)).x;',
    '  float B=texture2D(u_velocity,v_uv-vec2(0,u_texelSize.y)).y;',
    '  float T=texture2D(u_velocity,v_uv+vec2(0,u_texelSize.y)).y;',
    '  float div=0.5*(R-L+T-B);',
    '  gl_FragColor=vec4(div,0,0,1);',
    '}',
  ].join('\n');

  // Jacobi iteration for pressure solve
  var FRAG_PRESSURE = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_pressure;',
    'uniform sampler2D u_divergence;',
    'uniform vec2 u_texelSize;',
    'void main(){',
    '  float L=texture2D(u_pressure,v_uv-vec2(u_texelSize.x,0)).x;',
    '  float R=texture2D(u_pressure,v_uv+vec2(u_texelSize.x,0)).x;',
    '  float B=texture2D(u_pressure,v_uv-vec2(0,u_texelSize.y)).x;',
    '  float T=texture2D(u_pressure,v_uv+vec2(0,u_texelSize.y)).x;',
    '  float div=texture2D(u_divergence,v_uv).x;',
    '  float p=(L+R+B+T-div)*0.25;',
    '  gl_FragColor=vec4(p,0,0,1);',
    '}',
  ].join('\n');

  // Gradient subtraction
  var FRAG_GRADIENT = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_pressure;',
    'uniform sampler2D u_velocity;',
    'uniform vec2 u_texelSize;',
    'void main(){',
    '  float L=texture2D(u_pressure,v_uv-vec2(u_texelSize.x,0)).x;',
    '  float R=texture2D(u_pressure,v_uv+vec2(u_texelSize.x,0)).x;',
    '  float B=texture2D(u_pressure,v_uv-vec2(0,u_texelSize.y)).x;',
    '  float T=texture2D(u_pressure,v_uv+vec2(0,u_texelSize.y)).x;',
    '  vec2 vel=texture2D(u_velocity,v_uv).xy;',
    '  vel-=0.5*vec2(R-L,T-B);',
    '  gl_FragColor=vec4(vel,0,1);',
    '}',
  ].join('\n');

  // Splat (add force)
  var FRAG_SPLAT = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_source;',
    'uniform vec2 u_point;',
    'uniform vec3 u_color;',
    'uniform float u_radius;',
    'uniform float u_aspectRatio;',
    'void main(){',
    '  vec2 p=v_uv-u_point;',
    '  p.x*=u_aspectRatio;',
    '  float d=exp(-dot(p,p)/(u_radius*u_radius));',
    '  vec4 base=texture2D(u_source,v_uv);',
    '  gl_FragColor=base+d*vec4(u_color,1.0);',
    '}',
  ].join('\n');

  // Viscosity diffusion (Jacobi)
  var FRAG_VISCOUS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_velocity;',
    'uniform vec2 u_texelSize;',
    'uniform float u_alpha;',
    'uniform float u_rBeta;',
    'void main(){',
    '  vec4 L=texture2D(u_velocity,v_uv-vec2(u_texelSize.x,0));',
    '  vec4 R=texture2D(u_velocity,v_uv+vec2(u_texelSize.x,0));',
    '  vec4 B=texture2D(u_velocity,v_uv-vec2(0,u_texelSize.y));',
    '  vec4 T=texture2D(u_velocity,v_uv+vec2(0,u_texelSize.y));',
    '  vec4 C=texture2D(u_velocity,v_uv);',
    '  gl_FragColor=(L+R+B+T+u_alpha*C)*u_rBeta;',
    '}',
  ].join('\n');

  // ---- Create programs ----
  var progRender = createProgram(VERT, FRAG_RENDER);
  var progAdvect = createProgram(VERT, FRAG_ADVECT);
  var progDivergence = createProgram(VERT, FRAG_DIVERGENCE);
  var progPressure = createProgram(VERT, FRAG_PRESSURE);
  var progGradient = createProgram(VERT, FRAG_GRADIENT);
  var progSplat = createProgram(VERT, FRAG_SPLAT);
  var progViscous = createProgram(VERT, FRAG_VISCOUS);

  // ---- Quad ----
  var quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function drawQuad(prog) {
    gl.useProgram(prog);
    var loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ---- Framebuffer helpers ----
  var ext = gl.getExtension('OES_texture_half_float');
  var halfFloat = ext ? ext.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;

  // Check if rendering to half float works
  function supportsRenderToFloat() {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, halfFloat, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fb);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  if (!supportsRenderToFloat()) {
    halfFloat = gl.UNSIGNED_BYTE;
  }

  gl.getExtension('OES_texture_half_float_linear');

  function createFBO(w, h) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, halfFloat, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture: tex, fbo: fb, width: w, height: h };
  }

  function createDoubleFBO(w, h) {
    return {
      read: createFBO(w, h),
      write: createFBO(w, h),
      swap: function () { var t = this.read; this.read = this.write; this.write = t; }
    };
  }

  var velocity, pressure, divergenceFBO;

  function initFramebuffers() {
    velocity = createDoubleFBO(texW, texH);
    pressure = createDoubleFBO(texW, texH);
    divergenceFBO = createFBO(texW, texH);
  }

  // ---- Uniform helpers ----
  function setUniform1i(prog, name, v) { gl.uniform1i(gl.getUniformLocation(prog, name), v); }
  function setUniform1f(prog, name, v) { gl.uniform1f(gl.getUniformLocation(prog, name), v); }
  function setUniform2f(prog, name, x, y) { gl.uniform2f(gl.getUniformLocation(prog, name), x, y); }
  function setUniform3f(prog, name, x, y, z) { gl.uniform3f(gl.getUniformLocation(prog, name), x, y, z); }

  // ---- Bind texture to unit ----
  function bindTex(unit, tex) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }

  // ---- Splat ----
  function splat(x, y, dx, dy) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.useProgram(progSplat);
    bindTex(0, velocity.read.texture);
    setUniform1i(progSplat, 'u_source', 0);
    setUniform2f(progSplat, 'u_point', x / texW, 1.0 - y / texH);
    var radius = CONFIG.cursorSize / 800;
    setUniform1f(progSplat, 'u_radius', radius);
    setUniform1f(progSplat, 'u_aspectRatio', texW / texH);
    setUniform3f(progSplat, 'u_color', dx * CONFIG.mouseForce, -dy * CONFIG.mouseForce, 0);
    drawQuad(progSplat);
    velocity.swap();
  }

  // ---- Simulation step ----
  var dt = 1 / 60;
  var time = 0;

  function step() {
    var txS = 1.0 / texW;
    var tyS = 1.0 / texH;

    // Viscosity diffusion
    if (CONFIG.viscous > 0) {
      var alpha = (txS * txS) * CONFIG.viscous / dt;
      var rBeta = 1.0 / (4.0 + alpha);
      for (var i = 0; i < CONFIG.iterationsViscous; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
        gl.useProgram(progViscous);
        bindTex(0, velocity.read.texture);
        setUniform1i(progViscous, 'u_velocity', 0);
        setUniform2f(progViscous, 'u_texelSize', txS, tyS);
        setUniform1f(progViscous, 'u_alpha', alpha);
        setUniform1f(progViscous, 'u_rBeta', rBeta);
        drawQuad(progViscous);
        velocity.swap();
      }
    }

    // Advect velocity
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.useProgram(progAdvect);
    bindTex(0, velocity.read.texture);
    bindTex(1, velocity.read.texture);
    setUniform1i(progAdvect, 'u_source', 0);
    setUniform1i(progAdvect, 'u_velocity', 1);
    setUniform2f(progAdvect, 'u_texelSize', txS, tyS);
    setUniform1f(progAdvect, 'u_dt', dt * 60);
    setUniform1f(progAdvect, 'u_dissipation', 0.995);
    drawQuad(progAdvect);
    velocity.swap();

    // Divergence
    gl.bindFramebuffer(gl.FRAMEBUFFER, divergenceFBO.fbo);
    gl.useProgram(progDivergence);
    bindTex(0, velocity.read.texture);
    setUniform1i(progDivergence, 'u_velocity', 0);
    setUniform2f(progDivergence, 'u_texelSize', txS, tyS);
    drawQuad(progDivergence);

    // Clear pressure
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Pressure solve (Jacobi iterations)
    for (var i = 0; i < CONFIG.iterationsPoisson; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
      gl.useProgram(progPressure);
      bindTex(0, pressure.read.texture);
      bindTex(1, divergenceFBO.texture);
      setUniform1i(progPressure, 'u_pressure', 0);
      setUniform1i(progPressure, 'u_divergence', 1);
      setUniform2f(progPressure, 'u_texelSize', txS, tyS);
      drawQuad(progPressure);
      pressure.swap();
    }

    // Gradient subtraction
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.useProgram(progGradient);
    bindTex(0, pressure.read.texture);
    bindTex(1, velocity.read.texture);
    setUniform1i(progGradient, 'u_pressure', 0);
    setUniform1i(progGradient, 'u_velocity', 1);
    setUniform2f(progGradient, 'u_texelSize', txS, tyS);
    drawQuad(progGradient);
    velocity.swap();
  }

  function render() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(progRender);
    bindTex(0, velocity.read.texture);
    bindTex(1, pressure.read.texture);
    setUniform1i(progRender, 'u_velocity', 0);
    setUniform1i(progRender, 'u_pressure', 1);
    setUniform1f(progRender, 'u_time', time);
    setUniform2f(progRender, 'u_resolution', texW, texH);
    drawQuad(progRender);
  }

  // ---- Auto demo ----
  var autoAngle = 0;
  var autoPhase = 0;
  var lastAutoSplat = 0;
  var userLastActive = 0;
  var autoActive = true;

  function autoSplat(t) {
    if (!CONFIG.autoDemo) return;
    if (!autoActive && t - userLastActive < CONFIG.autoResumeDelay) return;
    autoActive = true;

    autoAngle += CONFIG.autoSpeed * 0.015;
    autoPhase += 0.007;

    // Create organic wandering motion
    var cx = texW * (0.5 + 0.35 * Math.sin(autoAngle * 0.7 + autoPhase));
    var cy = texH * (0.5 + 0.35 * Math.cos(autoAngle * 0.5));

    var dxA = Math.cos(autoAngle) * CONFIG.autoIntensity * 0.015;
    var dyA = Math.sin(autoAngle * 0.8) * CONFIG.autoIntensity * 0.015;

    splat(cx, cy, dxA, dyA);

    // Secondary wandering point
    var cx2 = texW * (0.5 + 0.3 * Math.cos(autoAngle * 0.4 + 1.5));
    var cy2 = texH * (0.5 + 0.3 * Math.sin(autoAngle * 0.6 + 2.3));
    splat(cx2, cy2, -dxA * 0.7, dyA * 0.6);
  }

  // ---- Mouse input ----
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX * CONFIG.resolution;
    mouseY = e.clientY * CONFIG.resolution;
    mouseActive = true;
    userLastActive = performance.now();
    autoActive = false;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    var touch = e.touches[0];
    if (!touch) return;
    mouseX = touch.clientX * CONFIG.resolution;
    mouseY = touch.clientY * CONFIG.resolution;
    mouseActive = true;
    userLastActive = performance.now();
    autoActive = false;
  }, { passive: true });

  document.addEventListener('mouseleave', function () { mouseActive = false; });

  // ---- Animation loop ----
  var lastTime = 0;
  var running = true;

  function animate(timestamp) {
    if (!running) return;
    requestAnimationFrame(animate);

    var delta = timestamp - lastTime;
    if (delta < 16) return; // cap at ~60fps
    lastTime = timestamp;
    time += delta * 0.001;

    // Mouse splat
    if (mouseActive) {
      var dx = mouseX - prevMouseX;
      var dy = mouseY - prevMouseY;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        splat(mouseX, mouseY, dx * 0.06, dy * 0.06);
      }
    }
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    // Auto demo
    autoSplat(performance.now());

    // Simulation
    step();

    // Render to screen
    render();
  }

  // ---- Initial splats to have some motion on load ----
  function initialSplats() {
    for (var i = 0; i < 6; i++) {
      var x = Math.random() * texW;
      var y = Math.random() * texH;
      var angle = Math.random() * Math.PI * 2;
      var force = 0.02 + Math.random() * 0.02;
      splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force);
    }
  }

  // ---- Init ----
  resize();
  initialSplats();
  requestAnimationFrame(animate);

  window.addEventListener('resize', function () {
    resize();
    initialSplats();
  });

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
    } else {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(animate);
    }
  });
})();
