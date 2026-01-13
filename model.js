// Model.js
// Surface of revolution with damping circular waves
// x = r cos u, y = r sin u, z = a e^{-n r} sin( (m*pi/b) r + phi )

export class Model {
  constructor() {
    this.uLines = new Float32Array(); // segments for gl.LINES (each segment = 2 vertices)
    this.vLines = new Float32Array();

    this.uCount = 0; // vertex count (not float count)
    this.vCount = 0;

    this.uVBO = null;
    this.vVBO = null;
  }

  static surfacePoint(r, u, p) {
    const { a, n, m, b, phi } = p;
    const w = (m * Math.PI) / b;
    const z = a * Math.exp(-n * r) * Math.sin(w * r + phi);
    const x = r * Math.cos(u);
    const y = r * Math.sin(u);
    return [x, y, z];
  }

  // Builds two sets of polyline segments (LINES) for U- and V-isoparametric curves
  build(params) {
    const p = { ...params };

    const rMin = 0.0;
    const rMax = p.b;
    const uMin = 0.0;
    const uMax = Math.PI * 2.0;

    const Nr = Math.max(2, p.Nr | 0); // samples along r
    const Nu = Math.max(3, p.Nu | 0); // samples along u

    const rSteps = p.rLines | 0; // how many U-polylines (fixed r)
    const uSteps = p.uLines | 0; // how many V-polylines (fixed u)

    // helper: push segment (P0->P1) into float array list
    const pushSeg = (arr, p0, p1) => {
      arr.push(p0[0], p0[1], p0[2]);
      arr.push(p1[0], p1[1], p1[2]);
    };

    // --- U-polylines: fixed r, u varies (rings) ---
    const uData = [];
    for (let i = 0; i < rSteps; i++) {
      const t = rSteps === 1 ? 0 : i / (rSteps - 1);
      const r = rMin + t * (rMax - rMin);

      let prev = null;
      for (let j = 0; j < Nu; j++) {
        const s = j / (Nu - 1);
        const u = uMin + s * (uMax - uMin);
        const cur = Model.surfacePoint(r, u, p);
        if (prev) pushSeg(uData, prev, cur);
        prev = cur;
      }
    }

    // --- V-polylines: fixed u, r varies (meridians) ---
    const vData = [];
    for (let j = 0; j < uSteps; j++) {
      const t = uSteps === 1 ? 0 : j / (uSteps - 1);
      const u = uMin + t * (uMax - uMin);

      let prev = null;
      for (let i = 0; i < Nr; i++) {
        const s = i / (Nr - 1);
        const r = rMin + s * (rMax - rMin);
        const cur = Model.surfacePoint(r, u, p);
        if (prev) pushSeg(vData, prev, cur);
        prev = cur;
      }
    }

    this.uLines = new Float32Array(uData);
    this.vLines = new Float32Array(vData);
    this.uCount = this.uLines.length / 3;
    this.vCount = this.vLines.length / 3;
  }

  upload(gl) {
    if (!this.uVBO) this.uVBO = gl.createBuffer();
    if (!this.vVBO) this.vVBO = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.uLines, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.vLines, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // Assumes shader has:
  // attribute vec3 aPosition;
  // uniform mat4 uMVP;
  // uniform vec4 uColor;
  draw(gl, program, attribLocs, uniformLocs) {
    const { aPosition } = attribLocs;
    const { uColor } = uniformLocs;

    gl.useProgram(program);
    gl.enableVertexAttribArray(aPosition);

    // U lines
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uVBO);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    if (uColor) gl.uniform4f(uColor, 1, 1, 1, 1);
    gl.drawArrays(gl.LINES, 0, this.uCount);

    // V lines (slightly different color)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vVBO);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    if (uColor) gl.uniform4f(uColor, 0.7, 0.9, 1, 1);
    gl.drawArrays(gl.LINES, 0, this.vCount);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}