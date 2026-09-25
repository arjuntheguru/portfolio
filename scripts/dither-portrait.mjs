// Turns scripts/portrait.jpg into the 1-bit dithered portrait used on the site.
// Output is an SVG of solid runs, used as a CSS mask so the colour comes from the theme.
// Run with: npm run portrait
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("./portrait.jpg", import.meta.url));
const OUT = fileURLToPath(new URL("../public/portrait.svg", import.meta.url));

// Crop around the head and shoulders (source is 1440x1359), then sample at W x H dots.
const CROP = { left: 330, top: 125, width: 780, height: 975 };
const W = 192;
const H = 240;

const { data } = await sharp(SRC)
  .extract(CROP)
  .grayscale()
  .normalise({ lower: 0.5, upper: 99.5 })
  .sharpen({ sigma: 1.2 })
  .resize(W, H, { kernel: "lanczos3" })
  .raw()
  .toBuffer({ resolveWithObject: true });

// Darken mid-tones so the face keeps detail, and push the bright sky to paper.
const WHITE_POINT = 200; // the sky sits around 195 after normalising
const px = Float32Array.from(data, (v) => {
  const g = Math.pow(Math.min(1, v / WHITE_POINT), 1.6);
  return g > 0.85 ? 1 : g;
});

// Atkinson dithering: spreads 6/8 of the error, which keeps highlights clean.
const ink = new Uint8Array(W * H);
const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const on = px[i] < 0.5;
    ink[i] = on ? 1 : 0;
    const err = (px[i] - (on ? 0 : 1)) / 8;
    for (const [dx, dy] of spread) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < W && yy < H) px[yy * W + xx] += err;
    }
  }
}

// One path segment per horizontal run of ink dots.
let d = "";
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; ) {
    if (!ink[y * W + x]) { x++; continue; }
    let end = x;
    while (end < W && ink[y * W + end]) end++;
    d += `M${x} ${y}h${end - x}v1h-${end - x}z`;
    x = end;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges"><path d="${d}"/></svg>\n`;
await writeFile(OUT, svg);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB, ${W}x${H} dots)`);
