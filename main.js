// main.js
import { Model } from './model.js';
'use strict';

let gl;
let canvas;
let surface;
let shProgram;
let spaceball;

let params = {
  a: 4, n: 0.5, m: 6, b: 6, phi: 0,
  Nu: 120, Nr: 120, rLines: 40, uLines: 40
};

function rebuildSurface() {
  if (!surface || !gl) return;
  surface.build(params);
  surface.upload(gl);
}

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  this.iAttribVertex = -1;
  this.iColor = -1;
  this.iModelViewProjectionMatrix = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function draw() {
  if (!gl || !shProgram || !surface || !spaceball) return;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ✅ більш адекватні near/far, щоб об’єкт точно не “обрізало”
  const projection = m4.perspective(Math.PI / 8, 1, 0.1, 100);

  const modelView = spaceball.getViewMatrix();

  const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  const translateToPointZero = m4.translation(0, 0, -10);

  const matAccum0 = m4.multiply(rotateToPointZero, modelView);
  const matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  const modelViewProjection = m4.multiply(projection, matAccum1);

  shProgram.Use();
  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
  gl.lineWidth(1);

  surface.draw(
    gl,
    shProgram.prog,
    { aPosition: shProgram.iAttribVertex },
    { uColor: shProgram.iColor }
  );
}

function initGL() {
  const prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
  shProgram.iColor = gl.getUniformLocation(prog, 'color');

  surface = new Model();
  rebuildSurface();

  gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
  const vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in vertex shader: ' + gl.getShaderInfoLog(vsh));
  }

  const fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in fragment shader: ' + gl.getShaderInfoLog(fsh));
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error in program: ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function setupUI() {
  function bindSlider(id, key, format = (v) => v) {
    const el = document.getElementById(id);
    const out = document.getElementById(id + 'Val');
    if (!el || !out) return;

    const update = () => {
      const isFloat = String(el.step).includes('.');
      params[key] = isFloat ? parseFloat(el.value) : Number(el.value);
      out.textContent = format(params[key]);
      rebuildSurface();
      draw();
    };

    el.addEventListener('input', update);
    update();
  }

  bindSlider('a', 'a');
  bindSlider('n', 'n', (v) => v.toFixed(2));
  bindSlider('m', 'm');
  bindSlider('b', 'b', (v) => v.toFixed(2));
  bindSlider('phi', 'phi', (v) => v.toFixed(2));
  bindSlider('Nu', 'Nu');
  bindSlider('Nr', 'Nr');
  bindSlider('rLines', 'rLines');
  bindSlider('uLines', 'uLines');

  const shotBtn = document.getElementById('shot');
  if (shotBtn) {
    shotBtn.addEventListener('click', () => {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wireframe.png';
      a.click();
    });
  }
}

function init() {
  canvas = document.getElementById('webglcanvas');
  gl = canvas.getContext('webgl');
  if (!gl) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not get a WebGL graphics context.</p>';
    return;
  }

  try {
    initGL();
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not initialize the WebGL graphics context: ' + e + '</p>';
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  setupUI();
  draw();
}

// ✅ Надійний старт для module (можеш прибрати onload="init()" з HTML)
window.addEventListener('load', init);
window.init = init; // залишив, якщо ти не хочеш міняти HTML