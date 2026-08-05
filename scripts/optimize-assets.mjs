import sharp from 'sharp';
import { readdir, mkdir, stat, rm, cp, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'assets-src');       // originals (never served)
const OUT = path.join(ROOT, 'public/assets');    // optimized, served

// Sprites are stored at 2x their on-screen size (retina headroom) and drawn at
// scale 0.5 in Phaser. These all get packed into a single texture atlas.
const ATLAS_DIRS = [
  { dir: 'main-charactor', width: 205 },   // 1024 @ 0.1  -> 102px display
  { dir: 'rattatoiue',     width: 205 },   // 1024 @ 0.1  -> 102px
  { dir: 'ped',            width: 410 },   // 1024 @ 0.2  -> 205px
  { dir: 'google-bro',     width: 266 },   // 1024 @ 0.13 -> 133px
  { dir: 'sheet-bro',      width: 266 },   // 1024 @ 0.13 -> 133px
];
const ATLAS_FILES = [
  { file: 'furnitures/working-desk.png', width: 394 },  // 2816 @ 0.07 -> 197px
  { file: 'furnitures/exit-door.png',    width: 585 },  // 1330 @ 0.22 -> 293px
];

// Too big to atlas, or consumed by the DOM rather than Phaser.
// These are flat illustrations with no hard-edged sprite work, so lossy webp at
// q95 is visually indistinguishable and roughly 12x smaller than lossless png.
const STANDALONE = [
  // bg3 is authored 1:1 at 1920x1080 — same as BG_WIDTH/BG_HEIGHT in MainScene
  { file: 'bg3.png',               width: 1920,  out: 'bg3.webp',               quality: 95 },
  { file: 'dreamspace-banner.png', height: 240,  out: 'dreamspace-banner.webp', quality: 95 },
];

// Referenced by nothing in the codebase — kept in assets-src, dropped from public/
const DEAD = ['bg.png', 'bg1.png', 'bg2.png', 'lugia', 'furnitures/announcement-board.png', 'player.png'];

const ATLAS_MAX_WIDTH = 2048;  // stays well under the 4096 WebGL floor
const PAD = 2;                 // transparent gutter so NEAREST filtering can't sample neighbours

// The atlas is lossless: sprites have hard edges and alpha, where lossy codecs
// leave visible fringing. Lossless webp is ~45% smaller than lossless png.
// NB: do not "optimise" this to png({effort}) — passing `effort` makes sharp
// quantise to a 256-colour palette, which is lossy and wrecks a shared atlas.
const encodeAtlas = (p) => p.webp({ lossless: true, effort: 6 });
const encodeLossy = (p, quality) => p.webp({ quality, effort: 6 });
const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';

/** Shelf packer: sort by height, fill rows left-to-right, wrap at ATLAS_MAX_WIDTH. */
function pack(frames) {
  const sorted = [...frames].sort((a, b) => b.height - a.height);
  let x = 0, y = 0, shelfHeight = 0, atlasWidth = 0;
  for (const f of sorted) {
    if (x + f.width + PAD > ATLAS_MAX_WIDTH) {
      x = 0;
      y += shelfHeight + PAD;
      shelfHeight = 0;
    }
    f.x = x;
    f.y = y;
    x += f.width + PAD;
    shelfHeight = Math.max(shelfHeight, f.height);
    atlasWidth = Math.max(atlasWidth, x - PAD);
  }
  return { frames: sorted, width: atlasWidth, height: y + shelfHeight };
}

/** Phaser JSON Hash format. */
function atlasJson(packed, imageName) {
  const frames = {};
  for (const f of packed.frames) {
    frames[f.name] = {
      frame: { x: f.x, y: f.y, w: f.width, h: f.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.width, h: f.height },
      sourceSize: { w: f.width, h: f.height },
    };
  }
  return {
    frames,
    meta: {
      image: imageName,
      format: 'RGBA8888',
      size: { w: packed.width, h: packed.height },
      scale: '1',
    },
  };
}

async function dirSize(dir) {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) total += (await stat(path.join(e.parentPath ?? e.path, e.name))).size;
  }
  return total;
}

async function main() {
  // Stash originals in assets-src/ the first time this runs
  if (!existsSync(SRC)) {
    await cp(OUT, SRC, { recursive: true });
    console.log(`Originals copied to assets-src/ (${mb(await dirSize(SRC))})\n`);
  }
  const before = await dirSize(SRC);

  // Rebuild public/assets from scratch so re-runs are idempotent
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // --- Collect every frame destined for the atlas -------------------------
  const jobs = [];
  for (const { dir, width } of ATLAS_DIRS) {
    for (const name of (await readdir(path.join(SRC, dir))).sort()) {
      if (name.endsWith('.png')) jobs.push({ rel: path.join(dir, name), width });
    }
  }
  for (const f of ATLAS_FILES) jobs.push({ rel: f.file, width: f.width });

  // Resize into raw RGBA. Frame name = path without the .png, e.g. "ped/stand1".
  const frames = [];
  for (const j of jobs) {
    const { data, info } = await sharp(path.join(SRC, j.rel))
      .resize({ width: j.width })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    frames.push({ name: j.rel.replace(/\.png$/, ''), buf: data, width: info.width, height: info.height });
  }

  // --- Pack and write the atlas -------------------------------------------
  // Blit raw pixels rather than sharp's composite(): frames never overlap, so
  // alpha blending is pure loss — its premultiply round-trip shifts opaque
  // pixels and badly mangles antialiased edges. A straight row copy is exact.
  const packed = pack(frames);
  const stride = packed.width * 4;
  const canvas = Buffer.alloc(stride * packed.height); // zero = transparent
  for (const f of packed.frames) {
    for (let row = 0; row < f.height; row++) {
      f.buf.copy(canvas, (f.y + row) * stride + f.x * 4, row * f.width * 4, (row + 1) * f.width * 4);
    }
  }
  await encodeAtlas(
    sharp(canvas, { raw: { width: packed.width, height: packed.height, channels: 4 } })
  ).toFile(path.join(OUT, 'atlas.webp'));
  await writeFile(
    path.join(OUT, 'atlas.json'),
    JSON.stringify(atlasJson(packed, 'atlas.webp'), null, 2)
  );

  const atlasBytes = (await stat(path.join(OUT, 'atlas.webp'))).size;
  console.log(
    `atlas.webp  ${packed.frames.length} frames  ${packed.width}x${packed.height}  ${mb(atlasBytes)}`
  );

  // --- Standalone images ---------------------------------------------------
  for (const s of STANDALONE) {
    const to = path.join(OUT, s.out);
    await mkdir(path.dirname(to), { recursive: true });
    await encodeLossy(
      sharp(path.join(SRC, s.file)).resize({ width: s.width, height: s.height, fit: 'inside' }),
      s.quality
    ).toFile(to);
    console.log(`${s.out.padEnd(26)} ${mb((await stat(to)).size).padStart(9)}`);
  }

  // --- Pass-through for everything else (svg, mp4, ...) --------------------
  const handled = new Set([...jobs.map((j) => j.rel), ...STANDALONE.map((s) => s.file)]);
  for (const e of await readdir(SRC, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const rel = path.relative(SRC, path.join(e.parentPath ?? e.path, e.name));
    if (handled.has(rel) || rel === '.DS_Store') continue;
    if (DEAD.some((d) => rel === d || rel.startsWith(d + path.sep))) continue;
    const to = path.join(OUT, rel);
    await mkdir(path.dirname(to), { recursive: true });
    await cp(path.join(SRC, rel), to);
    console.log(`${rel.padEnd(26)} (copied as-is)`);
  }

  console.log(`\npublic/assets: ${mb(before)} -> ${mb(await dirSize(OUT))}`);
}

main();
