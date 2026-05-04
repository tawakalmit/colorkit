class Color {
  constructor(r, g, b) {
    this.r = this.clamp(r);
    this.g = this.clamp(g);
    this.b = this.clamp(b);
  }
  set(r, g, b) {
    this.r = this.clamp(r);
    this.g = this.clamp(g);
    this.b = this.clamp(b);
  }
  multiply(m) {
    this.r = this.clamp(this.r * m[0] + this.g * m[1] + this.b * m[2]);
    this.g = this.clamp(this.r * m[3] + this.g * m[4] + this.b * m[5]);
    this.b = this.clamp(this.r * m[6] + this.g * m[7] + this.b * m[8]);
  }
  hueRotate(angle = 0) {
    angle = (angle / 180) * Math.PI;
    const s = Math.sin(angle), c = Math.cos(angle);
    this.multiply([
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ]);
  }
  grayscale(v = 1) {
    this.multiply([
      0.2126 + 0.7874 * (1 - v), 0.7152 - 0.7152 * (1 - v), 0.0722 - 0.0722 * (1 - v),
      0.2126 - 0.2126 * (1 - v), 0.7152 + 0.2848 * (1 - v), 0.0722 - 0.0722 * (1 - v),
      0.2126 - 0.2126 * (1 - v), 0.7152 - 0.7152 * (1 - v), 0.0722 + 0.9278 * (1 - v),
    ]);
  }
  sepia(v = 1) {
    this.multiply([
      0.393 + 0.607 * (1 - v), 0.769 - 0.769 * (1 - v), 0.189 - 0.189 * (1 - v),
      0.349 - 0.349 * (1 - v), 0.686 + 0.314 * (1 - v), 0.168 - 0.168 * (1 - v),
      0.272 - 0.272 * (1 - v), 0.534 - 0.534 * (1 - v), 0.131 + 0.869 * (1 - v),
    ]);
  }
  saturate(v = 1) {
    this.multiply([
      0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v,
      0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v,
      0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v,
    ]);
  }
  linear(slope = 1, intercept = 0) {
    this.r = this.clamp(this.r * slope + intercept * 255);
    this.g = this.clamp(this.g * slope + intercept * 255);
    this.b = this.clamp(this.b * slope + intercept * 255);
  }
  brightness(v = 1) { this.linear(v); }
  contrast(v = 1) { this.linear(v, -(0.5 * v) + 0.5); }
  invert(v = 1) {
    this.r = this.clamp((v + (this.r / 255) * (1 - 2 * v)) * 255);
    this.g = this.clamp((v + (this.g / 255) * (1 - 2 * v)) * 255);
    this.b = this.clamp((v + (this.b / 255) * (1 - 2 * v)) * 255);
  }
  hsl() {
    const r = this.r / 255, g = this.g / 255, b = this.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 100, s: s * 100, l: l * 100 };
  }
  clamp(v) { return Math.min(255, Math.max(0, v)); }
}

class Solver {
  constructor(target) {
    this.target = target;
    this.targetHSL = target.hsl();
    this.reusedColor = new Color(0, 0, 0);
  }
  solve() {
    const result = this.solveNarrow(this.solveWide());
    return { filter: this.css(result.values), loss: result.loss };
  }
  solveWide() {
    const A = 5, c = 15, a = [60, 180, 18000, 600, 1.2, 1.2];
    let best = { loss: Infinity };
    for (let i = 0; best.loss > 25 && i < 3; i++) {
      const result = this.spsa(A, a, c, [50, 20, 3750, 50, 100, 100], 1000);
      if (result.loss < best.loss) best = result;
    }
    return best;
  }
  solveNarrow(wide) {
    const A = wide.loss, A1 = A + 1, c = 2;
    const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1];
    return this.spsa(A, a, c, wide.values, 500);
  }
  spsa(A, a, c, values, iters) {
    const alpha = 1, gamma = 0.16666666666666666;
    let best = null, bestLoss = Infinity;
    const deltas = new Array(6), highArgs = new Array(6), lowArgs = new Array(6);
    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma);
      for (let i = 0; i < 6; i++) {
        deltas[i] = Math.random() > 0.5 ? 1 : -1;
        highArgs[i] = values[i] + ck * deltas[i];
        lowArgs[i] = values[i] - ck * deltas[i];
      }
      const lossDiff = this.loss(highArgs) - this.loss(lowArgs);
      for (let i = 0; i < 6; i++) {
        const g = (lossDiff / (2 * ck)) * deltas[i];
        const ak = a[i] / Math.pow(A + k + 1, alpha);
        values[i] = fix(values[i] - ak * g, i);
      }
      const loss = this.loss(values);
      if (loss < bestLoss) { best = values.slice(0); bestLoss = loss; }
    }
    return { values: best, loss: bestLoss };
    function fix(value, idx) {
      const max = idx === 2 ? 7500 : (idx === 4 || idx === 5) ? 200 : 100;
      if (idx === 3) {
        if (value > max) value %= max;
        else if (value < 0) value = max + (value % max);
      } else {
        value = Math.min(max, Math.max(0, value));
      }
      return value;
    }
  }
  loss(filters) {
    const c = this.reusedColor;
    c.set(0, 0, 0);
    c.invert(filters[0] / 100);
    c.sepia(filters[1] / 100);
    c.saturate(filters[2] / 100);
    c.hueRotate(filters[3] * 3.6);
    c.brightness(filters[4] / 100);
    c.contrast(filters[5] / 100);
    const hsl = c.hsl();
    return (
      Math.abs(c.r - this.target.r) + Math.abs(c.g - this.target.g) + Math.abs(c.b - this.target.b) +
      Math.abs(hsl.h - this.targetHSL.h) + Math.abs(hsl.s - this.targetHSL.s) + Math.abs(hsl.l - this.targetHSL.l)
    );
  }
  css(filters) {
    const f = (i, m = 1) => Math.round(filters[i] * m);
    return `brightness(0) saturate(100%) invert(${f(0)}%) sepia(${f(1)}%) saturate(${f(2)}%) hue-rotate(${f(3, 3.6)}deg) brightness(${f(4)}%) contrast(${f(5)}%)`;
  }
}

function hexToFilter(hex) {
  const result = /^#?([a-f\d]{1,2})([a-f\d]{1,2})([a-f\d]{1,2})$/i.exec(
    hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r+r+g+g+b+b)
  );
  if (!result) return null;
  const [r, g, b] = [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
  const { filter, loss } = new Solver(new Color(r, g, b)).solve();
  return { filter: `filter: ${filter};`, loss };
}

// ESM export (hapus jika tidak pakai module bundler)
// export { hexToFilter };
