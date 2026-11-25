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
  '&': '0C12140815120D', '$': '040F140E051E04', ';': '000C0C000C0408',
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

// Bold = the same glyphs drawn again one sub-pixel to the right.
const btext = (s: string, x: number, y: number, px: number, c: RGB) => { text(s, x, y, px, c); text(s, x + 1 / SS, y, px, c); };
// Greedy word wrap to a column of maxW pixels at glyph scale px.
function wrap(s: string, px: number, maxW: number): string[] {
  const max = Math.floor((maxW / px + 1) / 6), out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

// ---- palette
const NAVY = hex('#14213d'), GOLD = hex('#fca311'), WHITE = hex('#ffffff'), PAPER = hex('#fbf8f1'), INK = hex('#111111');
const SUB = hex('#33383c'), RULE = hex('#c9c2b2');
const SEA = hex('#2f6f9f'), SEA2 = hex('#245a82'), RED = hex('#c0392b'), ORANGE = hex('#f39c12'), YELLOW = hex('#ffd84d');
const GREY = hex('#7f8c8d'), DGREY = hex('#4a5459'), SMOKE = hex('#55585c'), GREEN = hex('#3f8f00'), LGREEN = hex('#76b900');
const SKY = hex('#0f1a33'), BLUE = hex('#1f5fbf'), TEAL = hex('#00838f'), BRICK = hex('#a04000'), PURPLE = hex('#6c3483');

// ---- background and masthead
rect(0, 0, W, H, hex('#e4ddd0'));
rect(0, 0, W, 110, NAVY);
ctext('THE WORLD ON ONE PAGE  -  31 STORIES REPORTED ON', W / 2, 12, 2, 1000, GOLD);
ctext('TUESDAY 24 NOVEMBER 2026', W / 2, 38, 6.5, 1000, WHITE);
rect(0, 104, W, 6, GOLD);

// ---- lead stories with pictures: 3 x 2 tiles
const LW = 328, LH = 200, LX = 12, LG = 8, LT = 118, PIC = 92;
type Lead = { tag: string; head: string; sub: string; accent: RGB; art: (x0: number, y0: number, cx: number) => void };
const sea = (x0: number, y: number, h: number) => { rect(x0, y, LW, h, SEA); for (let i = 0; i < 5; i++) rect(x0 + 18 + i * 64, y + 6 + (i % 2) * 8, 30, 3, SEA2); };
function tanker(x: number, y: number, s: number) {
  circle(x - 6 * s, y - 50 * s, 11 * s, SMOKE); circle(x + 10 * s, y - 60 * s, 12 * s, SMOKE); circle(x + 28 * s, y - 64 * s, 9 * s, SMOKE);
  poly([[x - 50 * s, y], [x + 50 * s, y], [x + 40 * s, y + 18 * s], [x - 40 * s, y + 18 * s]], hex('#8e2a1e'));
  rect(x + 22 * s, y - 16 * s, 18 * s, 16 * s, WHITE);
  poly([[x - 32 * s, y], [x - 20 * s, y - 44 * s], [x - 10 * s, y - 20 * s], [x - 2 * s, y - 38 * s], [x + 10 * s, y]], ORANGE);
  poly([[x - 24 * s, y], [x - 17 * s, y - 24 * s], [x - 9 * s, y - 10 * s], [x - 3 * s, y - 20 * s], [x + 3 * s, y]], YELLOW);
}
function drone(x: number, y: number, s: number, c: RGB) {
  for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { line(x, y, x + ax * 20 * s, y + ay * 12 * s, 4 * s, c); ellipse(x + ax * 20 * s, y + ay * 12 * s, 12 * s, 3.5 * s, c); }
  ellipse(x, y, 11 * s, 7 * s, c);
}

const leads: Lead[] = [
  {
    tag: 'ASIA MARKETS', accent: GREEN,
    head: 'TAIWAN STOCKS POST RECORD 8.99% JUMP AS HUANG RETURNS TO NVIDIA',
    sub: 'TAIEX +3,310 PTS; TSMC LIMIT-UP; KOSPI +6.5%, NIKKEI UP',
    art: (x0, y0) => {
      rect(x0 + 20, y0 + 84, 180, 3, DGREY);
      [30, 22, 26, 18, 70].forEach((h, i) => rect(x0 + 28 + i * 34, y0 + 84 - h, 24, h, i === 4 ? LGREEN : GREY));
      const ax = x0 + 160; line(ax - 110, y0 + 60, ax, y0 + 14, 6, GREEN);
      poly([[ax + 10, y0 + 6], [ax - 12, y0 + 6], [ax + 4, y0 + 28]], GREEN);
      btext('+8.99%', x0 + 204, y0 + 24, 3, GREEN);
      text('TAIEX', x0 + 220, y0 + 62, 2.5, INK);
    },
  },
  {
    tag: 'STRAIT OF HORMUZ', accent: RED,
    head: 'THREE TANKERS HIT MINES AND CATCH FIRE IN THE STRAIT OF HORMUZ',
    sub: "AS ANNOUNCED BY IRAN'S REVOLUTIONARY GUARD NAVY",
    art: (x0, y0, cx) => { sea(x0, y0 + 70, 22); for (const dx of [-100, 0, 100]) tanker(cx + dx, y0 + 68, 0.75); },
  },
  {
    tag: 'CHINA', accent: hex('#b03a2e'),
    head: 'POLITBURO MEMBER CHEN JINING PUT UNDER INVESTIGATION',
    sub: 'SHANGHAI PARTY CHIEF; 4TH POLITBURO MEMBER PROBED SINCE 2025',
    art: (x0, y0, cx) => {
      const g = y0 + 88; rect(x0 + 10, g, LW - 20, 3, DGREY);
      for (const [dx, w, h] of [[-120, 26, 40], [-90, 20, 56], [-30, 22, 46], [40, 24, 38], [96, 20, 30]]) rect(cx + dx, g - h, w, h, GREY);
      poly([[cx - 64, g], [cx - 40, g], [cx - 46, g - 84], [cx - 56, g - 84]], DGREY); // Shanghai Tower
      const px = cx + 10; rect(px - 2, g - 88, 4, 88, DGREY); circle(px, g - 24, 11, hex('#c0392b')); circle(px, g - 58, 8, hex('#c0392b'));
      const mx = cx + 100, my = y0 + 34; circle(mx, my, 26, INK); circle(mx, my, 20, hex('#cfe3f2')); line(mx + 17, my + 17, mx + 40, my + 40, 9, INK);
    },
  },
  {
    tag: 'UKRAINE WAR / NATO', accent: BLUE,
    head: 'RUSSIAN STRIKE ON ZAPORIZHZHIA KILLS 2, INJURES 40+',
    sub: 'INCLUDING CHILDREN. A RUSSIAN DRONE ENTERS POLAND; WARSAW HOLDS FIRE',
    art: (x0, y0, cx) => {
      const g = y0 + 88, bx = cx - 130; rect(x0 + 10, g, LW - 20, 3, DGREY);
      poly([[bx, g], [bx, g - 70], [bx + 30, g - 82], [bx + 44, g - 64], [bx + 70, g - 76], [bx + 70, g]], GREY);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rect(bx + 8 + c * 16, g - 56 + r * 14, 8, 8, (r + c) % 3 ? hex('#2b2f33') : YELLOW);
      poly([[bx + 26, g - 70], [bx + 34, g - 92], [bx + 42, g - 74], [bx + 50, g - 88], [bx + 56, g - 66]], ORANGE);
      for (let y = y0 + 6; y < g; y += 12) rect(cx + 60, y, 3, 7, RED); // border line
      text('UA', cx + 26, y0 + 70, 2.5, BLUE); text('PL', cx + 76, y0 + 70, 2.5, RED);
      drone(cx + 96, y0 + 30, 1, INK);
      line(cx + 20, y0 + 40, cx + 70, y0 + 32, 2, ORANGE);
    },
  },
  {
    tag: 'UKRAINE WAR / LIBYA', accent: hex('#2c7be5'),
    head: 'UKRAINE SAYS ITS DRONES SANK A RUSSIAN WARSHIP OFF LIBYA',
    sub: "KREMLIN WARNS KYIV OF 'PAINFUL CONSEQUENCES'",
    art: (x0, y0, cx) => {
      const sx = cx - 40, sy = y0 + 64;
      poly(place([[-80, 0], [80, 0], [66, 22], [-70, 22]], sx, sy, 14), GREY);
      poly(place([[-26, -26], [22, -26], [28, 0], [-30, 0]], sx, sy, 14), DGREY);
      poly(place([[-5, -50], [0, -50], [0, -26], [-5, -26]], sx, sy, 14), DGREY);
      sea(x0, y0 + 70, 22);
      for (const [dx, r] of [[-60, 7], [-42, 10], [26, 9], [48, 6]]) circle(sx + dx, y0 + 70, r, WHITE);
      drone(cx + 110, y0 + 24, 1, INK);
      line(cx + 92, y0 + 40, sx + 40, sy - 16, 2, ORANGE);
    },
  },
  {
    tag: 'SPACE', accent: PURPLE,
    head: "CHINA'S SHENZHOU-24 LIFTS OFF WITH THE FIRST PAKISTANI ASTRONAUT",
    sub: 'FIRST FOREIGN CREW MEMBER BOUND FOR TIANGONG STATION',
    art: (x0, y0, cx) => {
      rect(x0, y0, LW, PIC, SKY);
      for (let i = 0; i < 26; i++) rect(x0 + ((i * 97) % (LW - 6)), y0 + ((i * 53) % (PIC - 6)), 2, 2, WHITE);
      const rx = cx - 40;
      poly([[rx - 9, y0 + 72], [rx - 9, y0 + 26], [rx, y0 + 8], [rx + 9, y0 + 26], [rx + 9, y0 + 72]], WHITE);
      poly([[rx, y0 + 8], [rx - 9, y0 + 26], [rx + 9, y0 + 26]], RED);
      poly([[rx - 9, y0 + 56], [rx - 18, y0 + 74], [rx - 9, y0 + 70]], GREY); poly([[rx + 9, y0 + 56], [rx + 18, y0 + 74], [rx + 9, y0 + 70]], GREY);
      poly([[rx - 7, y0 + 72], [rx, y0 + 92], [rx + 7, y0 + 72]], ORANGE); poly([[rx - 4, y0 + 72], [rx, y0 + 84], [rx + 4, y0 + 72]], YELLOW);
      const tx = cx + 80, ty = y0 + 36; // Tiangong: modules and solar panels
      rect(tx - 24, ty - 6, 48, 12, GREY); rect(tx - 6, ty - 20, 12, 40, GREY);
      rect(tx - 62, ty - 10, 34, 20, BLUE); rect(tx + 28, ty - 10, 34, 20, BLUE);
      text('TIANGONG', tx - 47, ty + 30, 2, WHITE);
    },
  },
];

leads.forEach((s, i) => {
  const x0 = LX + (i % 3) * (LW + LG), y0 = LT + Math.floor(i / 3) * (LH + LG);
  rect(x0, y0, LW, LH, PAPER);
  s.art(x0, y0, x0 + LW / 2);
  rect(x0, y0 + PIC, LW, 3, s.accent);
  let y = y0 + PIC + 9;
  btext(s.tag, x0 + 8, y, 1.5, s.accent); y += 15;
  for (const l of wrap(s.head, 2, LW - 14)) { btext(l, x0 + 8, y, 2, INK); y += 18; }
  for (const l of wrap(s.sub, 1.5, LW - 14)) { text(l, x0 + 8, y, 1.5, SUB); y += 13; }
  if (y > y0 + LH) throw new Error('lead overflows: ' + s.tag);
});

// ---- the rest of the day, by region: headline + one-line summary
type Brief = [string, string];
type Section = { name: string; color: RGB; items: Brief[] };
const columns: Section[][] = [
  [{
    name: 'ASIA-PACIFIC', color: RED, items: [
      ['SOLOMON ISLANDS ENDS CHINA SECURITY PACT', "WON'T RENEW 2022 DEAL; NEW TREATY WITH AUSTRALIA"],
      ['SOUTH KOREA SCRAMBLES JETS', 'RUSSIAN AIRCRAFT ENTER ITS AIR DEFENCE ZONE'],
      ['N. KOREA THREATENS TO SHUT SWISS OFFICE', "OVER SWISS SANCTIONS ON A PYONGYANG CHILDREN'S CAMP"],
      ['HASINA PLANS DEC 16 RETURN', "EX-BANGLADESH PM'S AIDE; MINISTER: 'IN HANDCUFFS'"],
      ['JAPAN TO PAY ICC DUES EARLY', 'FULL 2027 CONTRIBUTION BY END OF 2026'],
      ['MALAYSIA TO REPATRIATE 6,803', 'MYANMAR NATIONALS TO BE SENT BACK NEXT MONTH'],
    ],
  }],
  [{
    name: 'EUROPE', color: BLUE, items: [
      ['EU PROPOSES 22ND RUSSIA SANCTIONS PACKAGE', 'BANKS, CRYPTO, SHADOW FLEET, REFINERIES, ATHLETES'],
      ["HUNGARY'S MAGYAR MEETS ZELENSKYY", 'IN UKRAINE; RULES OUT SENDING WEAPONS OR TROOPS'],
      ['UNICEF: 3 CHILDREN KILLED A DAY', 'BY RUSSIAN ATTACKS IN UKRAINE'],
      ['LATVIA: WAR MAY REACH TIPPING POINT', 'PRESIDENT RINKEVICS SAYS IT COULD COME NEXT YEAR'],
    ],
  }, {
    name: 'AFRICA', color: PURPLE, items: [
      ['SUDAN: DRONES STRIKE KHARTOUM', 'MAIN AIRPORT AND A UN FACILITY HIT; AT LEAST 4 DEAD'],
      ['AMNESTY: TIGRAY SHELLING PROBE', 'URGES WAR-CRIMES INQUIRY INTO ETHIOPIAN ATTACKS'],
    ],
  }],
  [{
    name: 'MIDDLE EAST', color: BRICK, items: [
      ['GAZA: HAMAS SECURITY CHIEF KILLED', 'ISRAELI STRIKE KILLS NAEEM ABU NAHEL AND 6 OTHERS'],
      ['GAZA: POLICE POST HIT, 3 DEAD', 'ISRAELI DRONE STRIKE IN KHAN YOUNIS DESPITE TRUCE'],
      ['OXFAM: 99% OF GAZA CONTAMINATED', "REPORT ALLEGES 'ENVIRONMENTAL WAR CRIMES'"],
      ['ISRAELI STRIKES IN SOUTH LEBANON', '1.2 MILLION UPROOTED BY THE VIOLENCE'],
      ['ISRAEL DEPORTS POLISH LAWMAKER', 'HELD 14 HOURS AT AIRPORT BEFORE WEST BANK VISIT'],
      ['YEMEN: HOUTHIS SAY 41 CIVILIANS KILLED', 'BLAME SAUDI AIR STRIKES IN A SINGLE DAY'],
    ],
  }],
  [{
    name: 'AMERICAS', color: TEAL, items: [
      ['NVIDIA BRINGS BACK JENSEN HUANG AS CEO', 'SHARES +31.5% IN A DAY, A RECORD $952BN GAIN'],
      ['TRUMP: CHINA MAY BUY 250 MORE BOEINGS', 'US PRESIDENT TELLS CNBC'],
      ['HUCKABEE DOUBTS END OF ISRAEL AID', 'US ENVOY ON $3.8BN-A-YEAR MILITARY AID'],
      ["MEXICO WON'T EXTRADITE CARTEL BOSS", "'EL CHAPO ISIDRO' TO BE TRIED AT HOME"],
      ['GALAPAGOS FLOODS', 'ECUADOR EVACUATES ISLANDERS BY BOAT'],
      ['WHO CHIEF VISITS CUBA', 'AS ISLAND HEALTH SYSTEM BREAKS DOWN'],
      ['IOWA: ARMY TO DETONATE OLD MUNITIONS', 'COURT DENIES EMERGENCY STAY'],
    ],
  }],
];

const BT = LT + 2 * LH + LG + 8, CWD = 244, CG = 8, BOTTOM = H - 8;
columns.forEach((col, i) => {
  const x0 = LX + i * (CWD + CG);
  rect(x0, BT, CWD, BOTTOM - BT, PAPER);
  let y = BT;
  for (const r of col) {
    if (y > BT) y += 4;
    rect(x0, y, CWD, 22, r.color);
    btext(r.name, x0 + 8, y + 4, 2, WHITE);
    y += 31;
    r.items.forEach(([head, sub], k) => {
      if (k) { rect(x0 + 8, y - 6, CWD - 16, 1, RULE); y += 2; }
      for (const l of wrap(head, 1.5, CWD - 14)) { btext(l, x0 + 8, y, 1.5, INK); y += 13.5; }
      y += 1.5;
      for (const l of wrap(sub, 1.5, CWD - 14)) { text(l, x0 + 8, y, 1.5, SUB); y += 12.5; }
      y += 8;
    });
  }
  if (y > BOTTOM) throw new Error('column overflows: ' + col[0].name);
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
