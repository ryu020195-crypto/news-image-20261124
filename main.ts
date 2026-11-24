// Draws a one-image summary of the world news of Tuesday 24 November 2026 and writes it as PNG to
// $MAKEFUN_OUTPUT_DIR (or /output)/entry.png. Node 22 standard library only; no randomness, so output is byte-stable.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';

const W = 1024, H = 1024, SS = 2; // drawn at 2x then box-downsampled for smooth edges
const CW = W * SS, CH = H * SS;
const buf = new Uint8Array(CW * CH * 3);

type RGB = [number, number, number];
type Pt = [number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function span(y: number, x0: number, x1: number, c: RGB) {
  const a = Math.max(0, Math.ceil(x0 - 0.5)), b = Math.min(CW - 1, Math.ceil(x1 - 0.5) - 1);
  if (y < 0 || y >= CH) return;
  for (let x = a; x <= b; x++) { const i = (y * CW + x) * 3; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; }
}
// Even-odd scanline fill; points are in final-image pixels.
function poly(pts: Pt[], c: RGB) {
  const p = pts.map(([x, y]) => [x * SS, y * SS]);
  const ys = p.map((q) => q[1]);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(CH - 1, Math.ceil(Math.max(...ys))); y++) {
    const yc = y + 0.5, xs: number[] = [];
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      if ((y1 <= yc) !== (y2 <= yc)) xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) span(y, xs[i], xs[i + 1], c);
  }
}
const rect = (x: number, y: number, w: number, h: number, c: RGB) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c);
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB) {
  const pts: Pt[] = [];
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  poly(pts, c);
}
const circle = (cx: number, cy: number, r: number, c: RGB) => ellipse(cx, cy, r, r, c);
function line(x1: number, y1: number, x2: number, y2: number, w: number, c: RGB) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2;
  poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], c);
}
const place = (pts: Pt[], cx: number, cy: number, deg: number): Pt[] => {
  const a = (deg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  return pts.map(([x, y]) => [cx + x * co - y * si, cy + x * si + y * co]);
};

// 5x7 pixel font: 7 rows, each two hex digits (5 low bits, MSB = left column).
const FONT: Record<string, string> = {
  A: '0E11111F111111', B: '1E11111E11111E', C: '0E11101010110E', D: '1E11111111111E', E: '1F10101E10101F',
  F: '1F10101E101010', G: '0E11101711110F', H: '1111111F111111', I: '0E04040404040E', J: '0702020202120C',
  K: '11121418141211', L: '1010101010101F', M: '111B1515111111', N: '11111915131111', O: '0E11111111110E',
  P: '1E11111E101010', Q: '0E11111115120D', R: '1E11111E141211', S: '0F10100E01011E', T: '1F040404040404',
  U: '1111111111110E', V: '11111111110A04', W: '1111111515150A', X: '11110A040A1111', Y: '11110A04040404',
  Z: '1F01020408101F', '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F',
  '3': '1F02040201110E', '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
  '8': '0E11110E11110E', '9': '0E11110F01020C', ' ': '00000000000000', ':': '000C0C000C0C00', '-': '0000001F000000',
  ',': '000000000C0408', '.': '00000000000C0C', "'": '0C040800000000', '/': '01010204081010',
  '+': '0004041F040400', '%': '18190204081303', '!': '04040404040004',
};
const textW = (s: string, px: number) => (s.length * 6 - 1) * px;
function text(s: string, x: number, y: number, px: number, c: RGB) {
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 7; r++) {
      const bits = parseInt(g.slice(r * 2, r * 2 + 2), 16);
      for (let col = 0; col < 5; col++) if (bits & (16 >> col)) rect(x + col * px, y + r * px, px, px, c);
    }
    x += 6 * px;
  }
}
// Centred text, shrunk to fit maxW.
function ctext(s: string, cx: number, y: number, px: number, maxW: number, c: RGB) {
  const p = Math.min(px, maxW / (s.length * 6 - 1));
  text(s, cx - textW(s, p) / 2, y + ((px - p) * 7) / 2, p, c);
}

// ---- palette
const NAVY = hex('#14213d'), GOLD = hex('#fca311'), WHITE = hex('#ffffff'), PAPER = hex('#f3eee4'), INK = hex('#1b1b1b');
const SEA = hex('#2f6f9f'), SEA2 = hex('#245a82'), RED = hex('#c0392b'), ORANGE = hex('#f39c12'), YELLOW = hex('#ffd84d');
const GREY = hex('#7f8c8d'), DGREY = hex('#4a5459'), SMOKE = hex('#55585c'), GREEN = hex('#76b900'), SAND = hex('#e9c98a');
const LEAF = hex('#2e8b57'), BEIGE = hex('#efe3c8'), CLOUD = hex('#8a949c'), BROWN = hex('#7a5230');

// ---- background and header
rect(0, 0, W, H, hex('#d9d4c7'));
rect(0, 0, W, 168, NAVY);
ctext('WORLD NEWS IN ONE PICTURE', W / 2, 22, 4, 980, GOLD);
ctext('TUESDAY 24 NOVEMBER 2026', W / 2, 76, 6, 980, WHITE);
rect(0, 160, W, 8, GOLD);

// ---- six story tiles
const TW = 490, TH = 268, MX = 16, GAP = 12, TOP = 182;
type Story = { tag: string; lines: [string, string]; accent: RGB; icon: (cx: number, y0: number, x0: number) => void };

const sea = (x0: number, y: number, h: number) => { rect(x0 + 12, y, TW - 24, h, SEA); for (let i = 0; i < 6; i++) rect(x0 + 30 + i * 75, y + 10 + (i % 2) * 14, 40, 4, SEA2); };

const stories: Story[] = [
  {
    tag: 'STRAIT OF HORMUZ', lines: ['3 OIL TANKERS HIT', 'MINES, CATCH FIRE'], accent: RED,
    icon: (cx, y0, x0) => {
      sea(x0, y0 + 84, 50);
      for (const dx of [-150, 0, 150]) {
        const x = cx + dx, y = y0 + 80;
        circle(x - 8, y - 62, 13, SMOKE); circle(x + 10, y - 72, 14, SMOKE); circle(x + 30, y - 78, 12, SMOKE); circle(x + 48, y - 80, 9, SMOKE);
        poly([[x - 62, y], [x + 62, y], [x + 50, y + 24], [x - 50, y + 24]], hex('#8e2a1e'));
        rect(x + 28, y - 20, 22, 20, WHITE);
        poly([[x - 40, y], [x - 26, y - 56], [x - 14, y - 26], [x - 4, y - 48], [x + 12, y]], ORANGE);
        poly([[x - 30, y], [x - 22, y - 30], [x - 12, y - 12], [x - 4, y - 26], [x + 4, y]], YELLOW);
      }
    },
  },
  {
    tag: 'UKRAINE WAR / LIBYA', lines: ['UKRAINE SAYS DRONES', 'SANK RUSSIAN WARSHIP'], accent: hex('#2c7be5'),
    icon: (cx, y0, x0) => {
      const sx = cx - 40, sy = y0 + 92;
      poly(place([[-95, 0], [95, 0], [78, 26], [-82, 26]], sx, sy, 14), GREY);
      poly(place([[-30, -30], [26, -30], [34, 0], [-36, 0]], sx, sy, 14), DGREY);
      poly(place([[-6, -62], [0, -62], [0, -30], [-6, -30]], sx, sy, 14), DGREY);
      poly(place([[40, -14], [80, -14], [80, 0], [40, 0]], sx, sy, 14), DGREY);
      sea(x0, y0 + 98, 36);
      for (const [dx, r] of [[-70, 9], [-50, 13], [30, 11], [55, 8]]) circle(sx + dx, y0 + 98, r, WHITE);
      const dxc = cx + 140, dyc = y0 + 38; // quadcopter drone
      for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { line(dxc, dyc, dxc + ax * 30, dyc + ay * 18, 6, INK); ellipse(dxc + ax * 30, dyc + ay * 18, 18, 5, INK); }
      ellipse(dxc, dyc, 16, 11, INK);
      line(dxc - 20, dyc + 22, sx + 40, sy - 20, 3, ORANGE);
    },
  },
  {
    tag: 'TECH / MARKETS', lines: ['NVIDIA BRINGS BACK', 'JENSEN HUANG AS CEO'], accent: GREEN,
    icon: (cx, y0) => {
      const x = cx - 80, y = y0 + 64;
      for (let i = -2; i <= 2; i++) { rect(x + i * 15 - 3, y - 64, 6, 128, DGREY); rect(x - 64, y + i * 15 - 3, 128, 6, DGREY); }
      rect(x - 52, y - 52, 104, 104, INK);
      rect(x - 40, y - 40, 80, 80, GREEN);
      ctext('CEO', x, y - 10, 4, 76, INK);
      const ax = cx + 90; // up arrow: shares rally
      poly([[ax - 18, y0 + 120], [ax + 18, y0 + 120], [ax + 18, y0 + 50], [ax + 44, y0 + 50], [ax, y0 + 4], [ax - 44, y0 + 50], [ax - 18, y0 + 50]], GREEN);
      ctext('STOCKS', ax + 2, y0 + 70, 2, 70, INK);
    },
  },
  {
    tag: 'CLIMATE: COP31', lines: ['TALKS COLLAPSE OVER', 'FOSSIL FUELS LEFT OUT'], accent: hex('#16a085'),
    icon: (cx, y0) => {
      const gx = cx - 60, gy = y0 + 64;
      circle(gx, gy, 60, SEA);
      circle(gx - 22, gy - 18, 22, LEAF); circle(gx + 24, gy + 14, 18, LEAF); circle(gx - 6, gy + 34, 12, LEAF);
      poly([[gx - 6, gy - 66], [gx + 10, gy - 30], [gx - 8, gy - 4], [gx + 12, gy + 26], [gx - 2, gy + 66], [gx - 12, gy + 66], [gx + 2, gy + 26], [gx - 18, gy - 4], [gx, gy - 30], [gx - 16, gy - 66]], RED);
      const fx = cx + 110; // smokestack
      rect(fx - 60, y0 + 92, 120, 36, DGREY);
      rect(fx + 10, y0 + 30, 24, 64, DGREY);
      circle(fx + 22, y0 + 18, 14, SMOKE); circle(fx + 40, y0 + 4, 12, SMOKE); circle(fx + 56, y0 - 6, 9, SMOKE);
    },
  },
  {
    tag: 'GAZA', lines: ['RAIN FLOODS 70,000+', 'TENTS AS WINTER HITS'], accent: hex('#8e44ad'),
    icon: (cx, y0, x0) => {
      for (let i = 0; i < 7; i++) circle(cx - 180 + i * 60, y0 + 16 + (i % 2) * 6, 24, CLOUD);
      for (let i = 0; i < 22; i++) { const x = x0 + 30 + i * 20, y = y0 + 34 + ((i * 7) % 5) * 6; line(x, y, x - 8, y + 26, 3, SEA); }
      for (const dx of [-160, -70, 20, 110, 190]) {
        const x = cx + dx, y = y0 + 112;
        poly([[x - 40, y], [x, y - 52], [x + 40, y]], BEIGE);
        poly([[x - 6, y], [x, y - 52], [x + 6, y]], hex('#b9a57c'));
      }
      sea(x0, y0 + 100, 34);
    },
  },
  {
    tag: 'PACIFIC', lines: ['SOLOMONS TO END', 'CHINA SECURITY PACT'], accent: hex('#d35400'),
    icon: (cx, y0, x0) => {
      sea(x0, y0 + 88, 46);
      const ix = cx - 90, iy = y0 + 96;
      ellipse(ix, iy, 90, 18, SAND);
      line(ix, iy - 4, ix + 14, iy - 74, 9, BROWN);
      for (const a of [-160, -120, -60, -20]) poly(place([[0, -5], [50, 0], [0, 5]], ix + 14, iy - 74, a), LEAF);
      const lx = cx + 110, ly = y0 + 56; // broken chain link
      for (const dx of [-38, 38]) { ellipse(lx + dx, ly, 32, 20, DGREY); ellipse(lx + dx, ly, 20, 9, PAPER); }
      rect(lx - 6, ly - 30, 12, 60, PAPER);
      line(lx - 18, ly + 34, lx + 18, ly - 34, 7, RED);
    },
  },
];

stories.forEach((s, i) => {
  const x0 = MX + (i % 2) * (TW + GAP), y0 = TOP + Math.floor(i / 2) * (TH + GAP);
  rect(x0, y0, TW, TH, PAPER);
  rect(x0, y0, 8, TH, s.accent);
  s.icon(x0 + TW / 2, y0 + 12, x0);
  ctext(s.tag, x0 + TW / 2, y0 + 158, 3, TW - 30, s.accent);
  ctext(s.lines[0], x0 + TW / 2, y0 + 186, 4, TW - 24, INK);
  ctext(s.lines[1], x0 + TW / 2, y0 + 224, 4, TW - 24, INK);
});

// ---- downsample and encode PNG (RGB, filter 0)
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
  const o = y * (W * 3 + 1);
  for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) {
    let sum = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) sum += buf[((y * SS + dy) * CW + x * SS + dx) * 3 + k];
    raw[o + 1 + x * 3 + k] = Math.round(sum / (SS * SS));
  }
}
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
writeFileSync(join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png'), png);
