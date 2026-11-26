import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ====================================================================
// PENGATURAN YANG BOLEH ANDA UBAH
// ====================================================================
const END_TITLE = 'WARISAN LELUHUR NUSANTARA';
const END_SUB = 'Tanpa semen. Tetap berdiri.';

// Waktu tiap kalimat di VO (detik), diukur dari file audio Anda
const SEGMENTS = [
  {
    text: 'Ribuan ton batu candi raksasa di Nusantara ini berdiri kokoh lebih dari seribu tahun tanpa setetes pun semen modern!',
    start: 0.2,
    end: 5.62,
  },
  {
    text: 'Di era Borobudur, para arsitek kuno memahat batu vulkanik dengan sistem pengunci presisi yang saling mengait seperti kepingan teka-teki.',
    start: 6.3,
    end: 12.38,
  },
  {
    text: 'Sementara di era Majapahit, dua bata merah basah digosok langsung hingga sari tanah liatnya menyatu sekuat beton.',
    start: 12.92,
    end: 18.4,
  },
  {
    text: 'Teknologi konstruksi cerdas inilah yang membuat bangunan kuno sanggup menahan guncangan gempa hebat.',
    start: 19.22,
    end: 23.32,
  },
];

// ====================================================================
// UTILITAS
// ====================================================================
const FPS = 30;
const FONT = 'Arial, Helvetica, sans-serif';
const GOLD = '#fde047';
const clampOpt = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Pt = [number, number];

const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex2rgb = (h: string): number[] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const c255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const rgbStr = (c: number[], f = 1) =>
  `rgb(${c255(c[0] * f)},${c255(c[1] * f)},${c255(c[2] * f)})`;
const mixRgb = (a: string, b: string, t: number): number[] => {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
};
const shade = (hex: string, f: number) => rgbStr(hex2rgb(hex), f);
const pts = (p: Pt[]) => p.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');

// ====================================================================
// BENTUK LOW POLY: isi bentuk apa pun dengan mesh segitiga berwarna
// ====================================================================
type PolyProps = {
  id: string;
  points: Pt[];
  color: string;
  seed: number;
  cell?: number;
  spread?: number;
  outline?: string;
  outlineW?: number;
};

const Poly: React.FC<PolyProps> = ({
  id,
  points,
  color,
  seed,
  cell = 70,
  spread = 0.4,
  outline,
  outlineW = 3,
}) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  });
  const cols = Math.ceil((maxX - minX) / cell) + 2;
  const rows = Math.ceil((maxY - minY) / cell) + 2;
  const vx: number[][] = [];
  const vy: number[][] = [];
  for (let r = 0; r <= rows; r++) {
    vx.push([]);
    vy.push([]);
    for (let c = 0; c <= cols; c++) {
      const k = seed * 997 + r * 53 + c * 7;
      vx[r].push(minX + (c - 1) * cell + (rnd(k) - 0.5) * cell * 0.6);
      vy[r].push(minY + (r - 1) * cell + (rnd(k + 3) - 0.5) * cell * 0.6);
    }
  }
  const tris: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = seed * 131 + r * 17 + c * 3;
      const t1: Pt[] = [
        [vx[r][c], vy[r][c]],
        [vx[r][c + 1], vy[r][c + 1]],
        [vx[r + 1][c], vy[r + 1][c]],
      ];
      const t2: Pt[] = [
        [vx[r][c + 1], vy[r][c + 1]],
        [vx[r + 1][c + 1], vy[r + 1][c + 1]],
        [vx[r + 1][c], vy[r + 1][c]],
      ];
      const f1 = shade(color, 1 - spread / 2 + spread * rnd(k));
      const f2 = shade(color, 1 - spread / 2 + spread * rnd(k + 1));
      tris.push(<polygon key={`a${r}-${c}`} points={pts(t1)} fill={f1} stroke={f1} strokeWidth={1.2} />);
      tris.push(<polygon key={`b${r}-${c}`} points={pts(t2)} fill={f2} stroke={f2} strokeWidth={1.2} />);
    }
  }
  return (
    <g>
      <clipPath id={id}>
        <polygon points={pts(points)} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{tris}</g>
      {outline ? (
        <polygon
          points={pts(points)}
          fill="none"
          stroke={outline}
          strokeWidth={outlineW}
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  );
};

// ====================================================================
// LATAR LOW POLY (mesh segitiga bergradasi dan sedikit bergerak)
// ====================================================================
const LowPolyBg: React.FC<{colors: [string, string, string]; seed: number}> = ({colors, seed}) => {
  const frame = useCurrentFrame();
  const cols = 8;
  const rows = 14;
  const cw = 1080 / cols;
  const ch = 1920 / rows;
  const vx: number[][] = [];
  const vy: number[][] = [];
  for (let r = 0; r <= rows + 1; r++) {
    vx.push([]);
    vy.push([]);
    for (let c = 0; c <= cols + 1; c++) {
      const k = seed * 1000 + r * 31 + c;
      vx[r].push((c - 0.5) * cw + (rnd(k) - 0.5) * cw * 0.7 + Math.sin(frame * 0.03 + k) * 6);
      vy[r].push((r - 0.5) * ch + (rnd(k + 7) - 0.5) * ch * 0.7 + Math.cos(frame * 0.025 + k) * 6);
    }
  }
  const tris: React.ReactNode[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const quad: Pt[][] = [
        [
          [vx[r][c], vy[r][c]],
          [vx[r][c + 1], vy[r][c + 1]],
          [vx[r + 1][c], vy[r + 1][c]],
        ],
        [
          [vx[r][c + 1], vy[r][c + 1]],
          [vx[r + 1][c + 1], vy[r + 1][c + 1]],
          [vx[r + 1][c], vy[r + 1][c]],
        ],
      ];
      quad.forEach((tri, idx) => {
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const t = Math.max(0, Math.min(1, cy / 1920));
        const base = t < 0.5 ? mixRgb(colors[0], colors[1], t * 2) : mixRgb(colors[1], colors[2], (t - 0.5) * 2);
        const f = 0.82 + 0.3 * rnd(seed * 77 + r * 19 + c * 5 + idx);
        const col = rgbStr(base, f);
        tris.push(
          <polygon key={`${r}-${c}-${idx}`} points={pts(tri)} fill={col} stroke={col} strokeWidth={1} />
        );
      });
    }
  }
  return <g>{tris}</g>;
};

// ====================================================================
// GUNUNG LOW POLY
// ====================================================================
const Mountains: React.FC<{baseY: number; amp: number; color: string; seed: number}> = ({
  baseY,
  amp,
  color,
  seed,
}) => {
  const step = 130;
  const ridge: Pt[] = [];
  const bottom: Pt[] = [];
  const mid: Pt[] = [];
  const n = Math.ceil(1400 / step);
  for (let i = 0; i <= n; i++) {
    const x = -130 + i * step;
    ridge.push([x, baseY - amp * (0.3 + 0.7 * rnd(seed + i * 3))]);
    bottom.push([x, baseY + 420]);
  }
  for (let i = 0; i < n; i++) {
    mid.push([
      (ridge[i][0] + ridge[i + 1][0]) / 2 + (rnd(seed + i + 50) - 0.5) * 40,
      baseY - amp * 0.05 + (rnd(seed + i + 90) - 0.5) * amp * 0.3,
    ]);
  }
  const tris: React.ReactNode[] = [];
  const add = (tri: Pt[], k: number) => {
    const col = shade(color, 0.78 + 0.4 * rnd(seed * 13 + k));
    tris.push(<polygon key={k} points={pts(tri)} fill={col} stroke={col} strokeWidth={1.2} />);
  };
  for (let i = 0; i < n; i++) {
    add([ridge[i], ridge[i + 1], mid[i]], i * 4);
    add([ridge[i], mid[i], bottom[i]], i * 4 + 1);
    add([ridge[i + 1], bottom[i + 1], mid[i]], i * 4 + 2);
    add([mid[i], bottom[i], bottom[i + 1]], i * 4 + 3);
  }
  return <g>{tris}</g>;
};

// ====================================================================
// MATAHARI LOW POLY
// ====================================================================
const Sun: React.FC<{cx: number; cy: number; r: number}> = ({cx, cy, r}) => {
  const f = useCurrentFrame();
  const n = 16;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.5} fill="rgba(253,224,71,0.16)" />
      {Array.from({length: n}).map((_, i) => {
        const a0 = (i / n) * Math.PI * 2 + f * 0.004;
        const a1 = ((i + 1) / n) * Math.PI * 2 + f * 0.004;
        const p: Pt[] = [
          [cx, cy],
          [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r],
          [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r],
        ];
        const col = i % 2 ? '#fde68a' : '#fbbf24';
        return <polygon key={i} points={pts(p)} fill={col} stroke={col} strokeWidth={1.5} />;
      })}
    </g>
  );
};

// ====================================================================
// TANAH / PULAU LOW POLY
// ====================================================================
const Ground: React.FC<{
  idp: string;
  cx: number;
  cy: number;
  r: number;
  top: string;
  left: string;
  right: string;
}> = ({idp, cx, cy, r, top, left, right}) => {
  const thick = 46;
  const N: Pt = [cx, cy - r / 2];
  const E: Pt = [cx + r, cy];
  const S: Pt = [cx, cy + r / 2];
  const Wp: Pt = [cx - r, cy];
  return (
    <g>
      <Poly id={idp + 'gL'} points={[Wp, S, [S[0], S[1] + thick], [Wp[0], Wp[1] + thick]]} color={left} seed={31} cell={90} />
      <Poly id={idp + 'gR'} points={[S, E, [E[0], E[1] + thick], [S[0], S[1] + thick]]} color={right} seed={32} cell={90} />
      <Poly id={idp + 'gT'} points={[N, E, S, Wp]} color={top} seed={33} cell={100} />
    </g>
  );
};

// ====================================================================
// STUPA DAN CANDI (BERUNDAK, GAYA BOROBUDUR)
// ====================================================================
const Stupa: React.FC<{id: string; x: number; y: number; s: number; seed: number}> = ({id, x, y, s, seed}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Poly id={id + 'L'} points={[[0, 0], [-62, 0], [-52, -45], [-26, -92], [0, -118]]} color="#d8c9ad" seed={seed} cell={40} />
    <Poly id={id + 'R'} points={[[0, 0], [62, 0], [52, -45], [26, -92], [0, -118]]} color="#a39580" seed={seed + 1} cell={40} />
    <Poly id={id + 'S'} points={[[-9, -118], [0, -185], [9, -118]]} color="#e8dcc3" seed={seed + 2} cell={30} />
  </g>
);

const TIERS = [
  {a: 360, h: 85},
  {a: 290, h: 85},
  {a: 220, h: 85},
  {a: 150, h: 85},
];

const Temple: React.FC<{
  cx: number;
  cy: number;
  idp: string;
  animate?: boolean;
  sway?: number;
}> = ({cx, cy, idp, animate = false, sway = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const els: React.ReactNode[] = [];
  let yb = cy;
  TIERS.forEach((t, i) => {
    const {a, h} = t;
    const yt = yb - h;
    const p = animate
      ? Math.min(1, spring({frame: f - 10 - i * 9, fps, config: {damping: 15, stiffness: 110}}))
      : 1;
    const ox = (sway * (i + 1)) / 5;
    const left: Pt[] = [[cx - a, yt], [cx, yt + a / 2], [cx, yb + a / 2], [cx - a, yb]];
    const right: Pt[] = [[cx, yt + a / 2], [cx + a, yt], [cx + a, yb], [cx, yb + a / 2]];
    const top: Pt[] = [[cx, yt - a / 2], [cx + a, yt], [cx, yt + a / 2], [cx - a, yt]];
    const seams = [1, 2].map((k) => {
      const dy = (h * k) / 3;
      return (
        <g key={k} stroke="rgba(0,0,0,0.22)" strokeWidth={3}>
          <line x1={cx - a} y1={yt + dy} x2={cx} y2={yt + a / 2 + dy} />
          <line x1={cx} y1={yt + a / 2 + dy} x2={cx + a} y2={yt + dy} />
        </g>
      );
    });
    const sc = i === 2 ? 0.36 : 0.45;
    const stupas =
      i < 3 ? (
        <g>
          <Stupa id={`${idp}s${i}a`} x={cx - a / 2} y={yt - a / 4} s={sc} seed={i * 10 + 1} />
          <Stupa id={`${idp}s${i}b`} x={cx + a / 2} y={yt - a / 4} s={sc} seed={i * 10 + 2} />
          <Stupa id={`${idp}s${i}c`} x={cx - a / 2} y={yt + a / 4} s={sc} seed={i * 10 + 3} />
          <Stupa id={`${idp}s${i}d`} x={cx + a / 2} y={yt + a / 4} s={sc} seed={i * 10 + 4} />
        </g>
      ) : null;
    els.push(
      <g key={i} opacity={p} transform={`translate(${ox} ${(1 - p) * 120})`}>
        <Poly id={`${idp}t${i}L`} points={left} color="#cdbb9e" seed={i * 7 + 1} cell={80} />
        <Poly id={`${idp}t${i}R`} points={right} color="#8f806b" seed={i * 7 + 2} cell={80} />
        <Poly id={`${idp}t${i}T`} points={top} color="#e6d7bb" seed={i * 7 + 3} cell={80} />
        {seams}
        {stupas}
      </g>
    );
    yb = yt;
  });
  const pm = animate
    ? Math.min(1, spring({frame: f - 10 - 4 * 9, fps, config: {damping: 12, stiffness: 130}}))
    : 1;
  return (
    <g>
      {els}
      <g opacity={pm} transform={`translate(${sway} ${(1 - pm) * -80})`}>
        <Stupa id={idp + 'main'} x={cx} y={yb} s={0.95} seed={99} />
      </g>
    </g>
  );
};

// ====================================================================
// PEMANDANGAN MATAHARI TERBIT (dipakai adegan awal dan akhir)
// ====================================================================
const Sunrise: React.FC<{idp: string; animate: boolean}> = ({idp, animate}) => {
  const f = useCurrentFrame();
  const sunY = animate
    ? interpolate(f, [0, 70], [1000, 700], {...clampOpt, easing: Easing.out(Easing.cubic)})
    : 700;
  return (
    <g>
      <LowPolyBg colors={['#1e1b4b', '#be185d', '#fb923c']} seed={1} />
      <Sun cx={540} cy={sunY} r={210} />
      <Mountains baseY={1010} amp={230} color="#7a2d6e" seed={11} />
      <Mountains baseY={1140} amp={190} color="#4a2160" seed={23} />
      <Ground idp={idp} cx={540} cy={1090} r={520} top="#4a7c3a" left="#2f5a2a" right="#244620" />
      <Temple cx={540} cy={1090} idp={idp} animate={animate} />
    </g>
  );
};

// ====================================================================
// KOMPONEN TEKS
// ====================================================================
const Heading: React.FC<{
  title: string;
  sub?: string;
  top?: number;
  from?: number;
  to?: number;
  color?: string;
  size?: number;
}> = ({title, sub, top = 150, from = 0, to = 100000, color = 'white', size = 100}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - from, fps, config: {damping: 14, stiffness: 120}});
  const o =
    interpolate(f - from, [0, 8], [0, 1], clampOpt) * interpolate(f, [to - 6, to], [1, 0], clampOpt);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        width: '100%',
        padding: '0 50px',
        boxSizing: 'border-box',
        textAlign: 'center',
        fontFamily: FONT,
        opacity: o,
        transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.05,
          color,
          letterSpacing: 2,
          WebkitTextStroke: '12px #0b1220',
          paintOrder: 'stroke fill',
        }}
      >
        {title}
      </div>
      {sub ? (
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            marginTop: 14,
            color: '#e2e8f0',
            WebkitTextStroke: '8px #0b1220',
            paintOrder: 'stroke fill',
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

// ====================================================================
// ADEGAN A: Hook (0-6 dtk): candi berdiri 1000+ tahun tanpa semen
// ====================================================================
const SceneA: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const count = Math.round(
    interpolate(f, [15, 125], [0, 1000], {...clampOpt, easing: Easing.out(Easing.cubic)})
  );
  const numStr = count >= 1000 ? '1.000' : String(count);
  const numO = interpolate(f, [0, 10, 112, 124], [0, 1, 1, 0], clampOpt);
  const bagP = Math.min(1, spring({frame: f - 120, fps, config: {damping: 12, stiffness: 120}}));
  const slashP = interpolate(f, [140, 160], [0, 1], clampOpt);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <Sunrise idp="A" animate />
        <g transform={`translate(540 420) scale(${0.6 + 0.4 * bagP})`} opacity={bagP}>
          <Poly id="bagBody" points={[[-95, -130], [95, -130], [110, -95], [110, 120], [-110, 120], [-110, -95]]} color="#d1d5db" seed={5} cell={50} outline="#0b1220" />
          <Poly id="bagBand" points={[[-110, -20], [110, -20], [110, 60], [-110, 60]]} color="#dc2626" seed={6} cell={40} />
          <text x={0} y={38} fill="white" fontSize={46} fontWeight={900} fontFamily={FONT} textAnchor="middle">
            SEMEN
          </text>
          <circle
            cx={0}
            cy={0}
            r={175}
            fill="none"
            stroke="#ef4444"
            strokeWidth={26}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - slashP}
          />
          <line
            x1={-124}
            y1={-124}
            x2={124}
            y2={124}
            stroke="#ef4444"
            strokeWidth={26}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - slashP}
          />
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 150,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT,
          opacity: numO,
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            WebkitTextStroke: '14px #0b1220',
            paintOrder: 'stroke fill',
          }}
        >
          {numStr}+
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            color: GOLD,
            marginTop: 8,
            WebkitTextStroke: '10px #0b1220',
            paintOrder: 'stroke fill',
          }}
        >
          TAHUN BERDIRI KOKOH
        </div>
      </div>
      <Heading title="TANPA SEMEN" top={620} from={140} size={110} color="#fca5a5" />
    </AbsoluteFill>
  );
};

// ====================================================================
// ADEGAN B: Borobudur, batu saling mengunci (puzzle ekor burung)
// ====================================================================
const BLOCK_A: Pt[] = [[0, 0], [300, 0], [300, 70], [350, 50], [350, 170], [300, 150], [300, 200], [0, 200]];
const BLOCK_B: Pt[] = [[300, 0], [650, 0], [650, 200], [300, 200], [300, 150], [350, 170], [350, 50], [300, 70]];

const SceneB: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const X0 = 120;
  const Y0 = 480;
  const RH = 200;
  const GAP = 10;
  const rows = [0, 1, 2].map((r) => {
    const t0 = 20 + r * 55;
    const ap = interpolate(f, [t0, t0 + 10], [0, 1], clampOpt);
    const bo = interpolate(f, [t0 + 8, t0 + 16], [0, 1], clampOpt);
    const p = Math.min(1, spring({frame: f - (t0 + 14), fps, config: {damping: 16, stiffness: 130}}));
    const s = 1 + (1 - p) * 0.28;
    const tl = f - (t0 + 14 + 12);
    const sh = (s - 1) * 70;
    return (
      <g key={r} transform={`translate(${X0} ${Y0 + r * (RH + GAP)})`}>
        <g opacity={ap}>
          <Poly id={`bk${r}A`} points={BLOCK_A} color="#8e9aa8" seed={r * 10 + 1} cell={60} />
          <polygon points={pts(BLOCK_A)} fill="none" stroke="#0b1220" strokeOpacity={0.55} strokeWidth={3} strokeLinejoin="round" />
        </g>
        <g opacity={bo}>
          <g transform={`translate(${sh} ${sh})`} opacity={0.35 * (1 - p)}>
            <polygon points={pts(BLOCK_B)} fill="#000" />
          </g>
          <g transform={`translate(475 100) scale(${s}) translate(-475 -100)`}>
            <Poly id={`bk${r}B`} points={BLOCK_B} color="#b3a897" seed={r * 10 + 5} cell={60} />
            <polygon points={pts(BLOCK_B)} fill="none" stroke="#0b1220" strokeOpacity={0.55} strokeWidth={3} strokeLinejoin="round" />
          </g>
        </g>
        {tl >= 0 && tl < 16 ? (
          <circle cx={325} cy={100} r={tl * 7} fill="none" stroke={GOLD} strokeWidth={6} opacity={1 - tl / 16} />
        ) : null}
      </g>
    );
  });
  const allLocked = 20 + 2 * 55 + 26;
  const pulse = interpolate(f, [allLocked, allLocked + 10], [0, 1], clampOpt) * (0.55 + 0.45 * Math.sin(f * 0.3));
  const badgeP = Math.min(1, spring({frame: f - (allLocked + 10), fps, config: {damping: 12, stiffness: 140}}));
  const lblO = interpolate(f, [50, 62], [0, 1], clampOpt);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <LowPolyBg colors={['#0f172a', '#1e3a5f', '#3b6e8f']} seed={2} />
        <Mountains baseY={1500} amp={150} color="#1e3a5f" seed={41} />
        {rows}
        <rect x={X0 - 12} y={Y0 - 12} width={674} height={3 * RH + 2 * GAP + 24} rx={10} fill="none" stroke={GOLD} strokeWidth={8} opacity={pulse} />
        <g opacity={lblO}>
          <line x1={X0 + 325} y1={Y0 + 100} x2={795} y2={Y0 + 100} stroke="white" strokeWidth={4} />
          <circle cx={X0 + 325} cy={Y0 + 100} r={10} fill={GOLD} />
          <text x={805} y={Y0 + 90} fill="white" fontSize={44} fontWeight={900} fontFamily={FONT} stroke="#0b1220" strokeWidth={8} paintOrder="stroke">
            KUNCI
          </text>
          <text x={805} y={Y0 + 140} fill="white" fontSize={44} fontWeight={900} fontFamily={FONT} stroke="#0b1220" strokeWidth={8} paintOrder="stroke">
            PRESISI
          </text>
        </g>
        <g transform={`translate(540 1175) scale(${badgeP})`} opacity={badgeP}>
          <Poly id="badgeB" points={[[-250, -45], [250, -45], [270, 0], [250, 45], [-250, 45], [-270, 0]]} color="#16a34a" seed={8} cell={40} outline="#0b1220" />
          <polyline points="-215,2 -190,24 -150,-18" fill="none" stroke="white" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <text x={20} y={16} fill="white" fontSize={46} fontWeight={900} fontFamily={FONT} textAnchor="middle">
            TANPA SEMEN
          </text>
        </g>
      </svg>
      <Heading title="BOROBUDUR" sub="Batu vulkanik saling mengunci" top={150} from={0} />
    </AbsoluteFill>
  );
};

// ====================================================================
// ADEGAN C: Majapahit, dua bata basah digosok hingga menyatu
// ====================================================================
const brickPts = (x: number, y: number, w: number, h: number, c = 22): Pt[] => [
  [x + c, y],
  [x + w - c, y],
  [x + w, y + c],
  [x + w, y + h - c],
  [x + w - c, y + h],
  [x + c, y + h],
  [x, y + h - c],
  [x, y + c],
];

const SceneC: React.FC = () => {
  const f = useCurrentFrame();
  const BX = 220;
  const BW = 640;
  const BH = 210;
  const SEAM = 760;
  const drop = interpolate(f, [10, 55], [-260, 0], {...clampOpt, easing: Easing.out(Easing.cubic)});
  const amp = interpolate(f, [70, 80, 135, 150], [0, 46, 46, 0], clampOpt);
  const rubX = amp * Math.sin((f - 70) * 0.55);
  const appear = interpolate(f, [0, 12], [0, 1], clampOpt);
  const th = interpolate(f, [75, 135], [0, 26], clampOpt);
  const seamO = interpolate(f, [135, 160], [1, 0], clampOpt);
  const fuse = interpolate(f, [135, 150], [0, 1], clampOpt);
  const fusePulse = fuse * (0.6 + 0.4 * Math.sin(f * 0.35));
  const dropO = interpolate(f, [25, 35, 85, 100], [0, 1, 1, 0], clampOpt);
  const barW = interpolate(f, [135, 175], [0, BW], clampOpt);
  const barO = interpolate(f, [128, 140], [0, 1], clampOpt);

  // Tanah liat di sambungan
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let x = BX; x <= BX + BW; x += 40) {
    top.push([x, SEAM - th / 2 + 5 * Math.sin(x * 0.05 + f * 0.3)]);
    bot.unshift([x, SEAM + th / 2 + 5 * Math.cos(x * 0.05 + f * 0.3)]);
  }
  const clay: Pt[] = [...top, ...bot];

  const drops = Array.from({length: 10}).map((_, i) => {
    const y = 300 + ((f * 8 + i * 37) % 260);
    const x = BX + 40 + (i * (BW - 80)) / 9;
    return (
      <polygon
        key={i}
        points={pts([[x, y - 16], [x + 10, y + 4], [x, y + 16], [x - 10, y + 4]])}
        fill="#38bdf8"
        stroke="#bae6fd"
        strokeWidth={2}
        opacity={dropO}
      />
    );
  });

  const sparks: React.ReactNode[] = [];
  if (f >= 70 && f < 150) {
    for (let i = 0; i < 14; i++) {
      const a = (((f - 70) * 0.06 + rnd(i)) % 1 + 1) % 1;
      const dir = i % 2 === 0 ? -1 : 1;
      const x = (dir < 0 ? BX : BX + BW) + dir * a * 130;
      const y = SEAM + (rnd(i + 5) - 0.5) * 40 - a * 40;
      const sz = 16 * (1 - a);
      sparks.push(
        <polygon
          key={i}
          points={pts([[x, y - sz], [x + sz, y + sz], [x - sz, y + sz]])}
          fill="#fbbf24"
          opacity={(1 - a) * interpolate(f, [70, 80, 135, 150], [0, 1, 1, 0], clampOpt)}
        />
      );
    }
  }

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <LowPolyBg colors={['#14122b', '#3a2a55', '#7a4a5e']} seed={3} />
        <Mountains baseY={1500} amp={160} color="#4a2d5e" seed={61} />
        <g opacity={appear}>
          {/* bata bawah */}
          <Poly id="brkB" points={brickPts(BX, SEAM, BW, BH)} color="#c2410c" seed={21} cell={55} outline="#0b1220" outlineW={4} />
          {/* bata atas */}
          <g transform={`translate(${rubX} ${drop})`}>
            <Poly id="brkT" points={brickPts(BX, SEAM - BH, BW, BH)} color="#d9531e" seed={22} cell={55} outline="#0b1220" outlineW={4} />
          </g>
        </g>
        {th > 0.5 ? (
          <g opacity={seamO}>
            <Poly id="clay" points={clay} color="#8b5a2b" seed={23} cell={26} />
          </g>
        ) : null}
        {drops}
        {sparks}
        <polygon
          points={pts(brickPts(BX - 8, SEAM - BH - 8, BW + 16, BH * 2 + 16, 26))}
          fill="none"
          stroke={GOLD}
          strokeWidth={10}
          strokeLinejoin="round"
          opacity={fusePulse}
        />
        <g opacity={barO}>
          <text x={BX} y={1075} fill="white" fontSize={46} fontWeight={900} fontFamily={FONT} stroke="#0b1220" strokeWidth={8} paintOrder="stroke">
            KEKUATAN
          </text>
          <text x={BX + BW} y={1075} fill={GOLD} fontSize={46} fontWeight={900} fontFamily={FONT} textAnchor="end" stroke="#0b1220" strokeWidth={8} paintOrder="stroke">
            SEKUAT BETON
          </text>
          <Poly id="barTrack" points={[[BX, 1095], [BX + BW, 1095], [BX + BW, 1145], [BX, 1145]]} color="#334155" seed={30} cell={30} outline="#0b1220" />
          {barW > 4 ? (
            <Poly id="barFill" points={[[BX, 1095], [BX + barW, 1095], [BX + barW, 1145], [BX, 1145]]} color="#f59e0b" seed={31} cell={22} />
          ) : null}
        </g>
      </svg>
      <Heading title="MAJAPAHIT" sub="Bata merah basah digosok" top={150} from={0} />
    </AbsoluteFill>
  );
};

// ====================================================================
// ADEGAN D: Gempa, candi bergoyang tapi tetap kokoh
// ====================================================================
const SceneD: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const amp = interpolate(f, [60, 80, 140, 157], [0, 16, 16, 2], clampOpt);
  const dx = amp * Math.sin(f * 2.3) + amp * 0.5 * Math.sin(f * 5.7);
  const dy = amp * 0.5 * Math.cos(f * 3.1);
  const sway = amp * 1.2 * Math.sin(f * 1.7);
  const crackP = interpolate(f, [62, 100], [0, 1], clampOpt);
  const quakeO = interpolate(f, [60, 70, 120, 130], [0, 1, 1, 0], clampOpt);
  const badgeP = Math.min(1, spring({frame: f - 122, fps, config: {damping: 12, stiffness: 140}}));

  const debris: React.ReactNode[] = [];
  if (amp > 3) {
    for (let i = 0; i < 12; i++) {
      const y = ((f * 14 + i * 191) % 2000) - 100;
      const x = rnd(i * 3 + 1) * 1080;
      const sz = 14 + rnd(i + 9) * 18;
      const rot = f * (4 + i);
      debris.push(
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={Math.min(1, amp / 16)}>
          <polygon points={pts([[0, -sz], [sz, sz * 0.8], [-sz, sz * 0.8]])} fill="#9a8a74" stroke="#5b4f40" strokeWidth={3} />
        </g>
      );
    }
  }

  const wave: string[] = [];
  for (let x = 140; x <= 940; x += 10) {
    const i = (x - 140) / 10;
    const y = 450 + amp * 2.2 * Math.sin(i * 0.9 + f * 1.9) * (0.6 + 0.4 * Math.sin(i * 2.1));
    wave.push(`${x},${y.toFixed(1)}`);
  }

  const cracks = [
    'M 300 1180 L 340 1215 L 320 1245 L 380 1275',
    'M 780 1180 L 735 1220 L 760 1250 L 700 1285',
    'M 540 1335 L 510 1300 L 545 1275 L 520 1245',
    'M 190 1090 L 250 1110 L 235 1145',
  ];

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <g transform={`translate(${dx} ${dy})`}>
          <LowPolyBg colors={['#18122b', '#7f1d1d', '#c2410c']} seed={4} />
          <Mountains baseY={1010} amp={230} color="#6b1f2a" seed={71} />
          <Mountains baseY={1140} amp={190} color="#3b1420" seed={83} />
          <Ground idp="D" cx={540} cy={1090} r={520} top="#6b4a2b" left="#4a3320" right="#35240f" />
          {cracks.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#150c05" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crackP} />
          ))}
          <Temple cx={540} cy={1090} idp="D" sway={sway} />
          {debris}
        </g>
        <g opacity={quakeO}>
          <line x1={140} y1={450} x2={940} y2={450} stroke="#475569" strokeWidth={3} />
          <polyline points={wave.join(' ')} fill="none" stroke="#fca5a5" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <g transform={`translate(540 450) scale(${badgeP})`} opacity={badgeP}>
          <Poly id="badgeD" points={[[-290, -50], [290, -50], [315, 0], [290, 50], [-290, 50], [-315, 0]]} color="#16a34a" seed={9} cell={40} outline="#0b1220" />
          <polyline points="-255,2 -228,26 -185,-20" fill="none" stroke="white" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <text x={25} y={18} fill="white" fontSize={52} fontWeight={900} fontFamily={FONT} textAnchor="middle">
            TETAP KOKOH
          </text>
        </g>
      </svg>
      <Heading title="KONSTRUKSI CERDAS" top={150} from={0} to={56} />
      <Heading title="GEMPA!" top={150} from={60} to={125} color="#fca5a5" size={130} />
    </AbsoluteFill>
  );
};

// ====================================================================
// ADEGAN E: Penutup
// ====================================================================
const SceneE: React.FC = () => {
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <Sunrise idp="E" animate={false} />
      </svg>
      <Heading title={END_TITLE} sub={END_SUB} top={150} from={6} size={92} color={GOLD} />
    </AbsoluteFill>
  );
};

// ====================================================================
// SUBTITLE (dipecah per 3 kata, waktu sesuai panjang huruf)
// ====================================================================
type Chunk = {text: string; from: number; to: number};

const buildChunks = (): Chunk[] => {
  const out: Chunk[] = [];
  SEGMENTS.forEach((seg) => {
    const words = seg.text.split(' ');
    const groups: string[] = [];
    let cur: string[] = [];
    words.forEach((w) => {
      cur.push(w);
      if (cur.length >= 3 || cur.join(' ').length >= 20) {
        groups.push(cur.join(' '));
        cur = [];
      }
    });
    if (cur.length) groups.push(cur.join(' '));
    const total = groups.reduce((s, g) => s + g.length, 0);
    let t = seg.start;
    groups.forEach((g) => {
      const d = ((seg.end - seg.start) * g.length) / total;
      out.push({text: g, from: Math.round(t * FPS), to: Math.round((t + d) * FPS)});
      t += d;
    });
  });
  return out;
};
const CHUNKS = buildChunks();

const CaptionView: React.FC<{text: string; from: number}> = ({text, from}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - from, fps, config: {damping: 12, stiffness: 220}});
  const words = text.toUpperCase().split(' ');
  return (
    <div
      style={{
        position: 'absolute',
        top: 1370,
        left: 50,
        width: 880,
        textAlign: 'center',
        fontFamily: FONT,
        fontSize: 84,
        fontWeight: 900,
        lineHeight: 1.1,
        transform: `scale(${0.8 + 0.2 * p})`,
        WebkitTextStroke: '14px #0b1220',
        paintOrder: 'stroke fill',
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{color: i === words.length - 1 ? GOLD : 'white'}}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>
  );
};

// ====================================================================
// PEMBUNGKUS ADEGAN (fade in) DAN KOMPOSISI UTAMA
// ====================================================================
const SceneFade: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12], [0, 1], clampOpt);
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const CandiShorts: React.FC = () => {
  const frame = useCurrentFrame();
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  return (
    <AbsoluteFill style={{backgroundColor: '#0b1220'}}>
      <Audio src={staticFile('vo.wav')} />
      <Sequence from={0} durationInFrames={196}>
        <SceneFade>
          <SceneA />
        </SceneFade>
      </Sequence>
      <Sequence from={182} durationInFrames={210}>
        <SceneFade>
          <SceneB />
        </SceneFade>
      </Sequence>
      <Sequence from={380} durationInFrames={197}>
        <SceneFade>
          <SceneC />
        </SceneFade>
      </Sequence>
      <Sequence from={565} durationInFrames={157}>
        <SceneFade>
          <SceneD />
        </SceneFade>
      </Sequence>
      <Sequence from={712} durationInFrames={101}>
        <SceneFade>
          <SceneE />
        </SceneFade>
      </Sequence>
      {chunk ? <CaptionView key={chunk.from} text={chunk.text} from={chunk.from} /> : null}
    </AbsoluteFill>
  );
};
