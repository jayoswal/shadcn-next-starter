import { useEffect, useRef, useState } from "react";

const LANGUAGES = ['অসমীয়া', 'বাংলা', 'बड़ो', 'डोगरी', 'ગુજરાતી', 'हिन्दी', 'ಕನ್ನಡ', 'کٲشُر', 'कोंकणी', 'मैथिली', 'മലയാളം', 'ꯃꯤꯇꯩꯂꯣꯟ', 'मराठी', 'नेपाली', 'ଓଡ଼ିଆ', 'ਪੰਜਾਬੀ', 'संस्कृतम्', 'ᱥᱟᱱᱛᱟᱲᱤ', 'سنڌي', 'தமிழ்', 'తెలుగు', 'اردو'];
const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function graphemes(word) {
  if (segmenter) return Array.from(segmenter.segment(word), (s) => s.segment);
  return word.split("");
}

function buildPhraseStream() {
  const parts = [];
  let i = 0;
  while (i < LANGUAGES.length) {
    const burstSize = 2 + (i % 3);
    parts.push(LANGUAGES.slice(i, i + burstSize).join(" "));
    parts.push(" ".repeat(8));
    i += burstSize;
  }
  return parts.join("");
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const CHAR_STEP = 24;
const TRACK_WIDTH = 246;
const SQUEEZE_ZONE = 100;
const CANVAS_W = 130;
const CANVAS_H = 40;

function buildTextTrack(charsArr, offset, trackWidth, pillEdge) {
  const out = [];
  const visibleCount = Math.ceil(trackWidth / CHAR_STEP) + 4;
  const startIdx = Math.floor(offset / CHAR_STEP) - 2;
  for (let k = 0; k < visibleCount; k++) {
    const i = startIdx + k;
    const ch = charsArr[((i % charsArr.length) + charsArr.length) % charsArr.length];
    const x = i * CHAR_STEP - offset;
    const dist = pillEdge === "right" ? trackWidth - x : x;
    const f = smoothstep(0, SQUEEZE_ZONE, dist);
    const s = 0.08 + 0.92 * f;
    out.push({ ch, x: Math.round(x * 10) / 10, s: Math.round(s * 100) / 100, isSpace: ch.trim() === "" });
  }
  return out;
}

export default function WordsToWaveformWidget() {
  const [, setTick] = useState(0);
  const [leftChars, setLeftChars] = useState([]);
  const [rightChars, setRightChars] = useState([]);
  const canvasRef = useRef(null);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const activityRef = useRef(0);
  const charsArrRef = useRef(null);
  const canvasReadyRef = useRef(false);

  useEffect(() => {
    startRef.current = performance.now();
    charsArrRef.current = graphemes(buildPhraseStream());

    const drawCanvas = (bars) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!canvasReadyRef.current) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_W * dpr;
        canvas.height = CANVAS_H * dpr;
        canvas.getContext("2d").scale(dpr, dpr);
        canvasReadyRef.current = true;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const barW = 4, gap = 4.5;
      const contentW = bars.length * barW + (bars.length - 1) * gap;
      const startX = (CANVAS_W - contentW) / 2;
      ctx.fillStyle = "#7CCF00";
      bars.forEach((bh, i) => {
        const x = startX + i * (barW + gap);
        const y = (CANVAS_H - bh) / 2;
        roundRectPath(ctx, x, y, barW, bh, barW / 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "destination-in";
      const grad = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.12, "rgba(0,0,0,1)");
      grad.addColorStop(0.88, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      const scrollOffset = (elapsed / 1000) * 70;
      const lc = buildTextTrack(charsArrRef.current, scrollOffset, TRACK_WIDTH, "right");
      const rc = buildTextTrack(charsArrRef.current, scrollOffset, TRACK_WIDTH, "left");
      setLeftChars(lc);
      setRightChars(rc);

      const leftNearPill = lc.some((c) => !c.isSpace && TRACK_WIDTH - c.x < SQUEEZE_ZONE);
      const rightNearPill = rc.some((c) => !c.isSpace && c.x < SQUEEZE_ZONE);
      const targetActive = leftNearPill || rightNearPill ? 1 : 0;
      activityRef.current += (targetActive - activityRef.current) * 0.08;

      const n = 16;
      const t = elapsed / 1000;
      const eqBars = Array.from({ length: n }, (_, i) => {
        const shape = Math.sin((Math.PI * (i + 0.5)) / n);
        const osc = 0.5 + 0.5 * Math.sin(t * (2.2 + (i % 5) * 0.6) + i * 0.7);
        const idleAmp = 3, activeAmp = 24;
        const amp = idleAmp + (activeAmp - idleAmp) * activityRef.current;
        return Math.round(6 + shape * amp * (0.4 + 0.6 * osc));
      });
      drawCanvas(eqBars);

      setTick((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const charStyle = { position: "absolute", top: "50%", fontSize: 17, fontWeight: 600, color: "oklch(40% 0.07 200)", whiteSpace: "pre" };

  return (
    <div style={{ width: 640, height: 180, background: "oklch(98% 0.004 250)", borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: "calc(50% + 74px)", height: 56, transform: "translateY(-50%)", overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black 100%)", maskImage: "linear-gradient(to right, transparent 0, black 24px, black 100%)" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            {leftChars.map((c, i) => (
              <span key={i} style={{ ...charStyle, left: c.x, transform: `translateY(-50%) scale(${c.s})`, transformOrigin: "center" }}>{c.ch}</span>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", top: "50%", left: "calc(50% + 74px)", right: 0, height: 56, transform: "translateY(-50%)", overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)", maskImage: "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            {rightChars.map((c, i) => (
              <span key={i} style={{ ...charStyle, left: c.x, transform: `translateY(-50%) scale(${c.s})`, transformOrigin: "center" }}>{c.ch}</span>
            ))}
          </div>
        </div>
        <div style={{ pointerEvents: "none", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10 }}>
          <div style={{ height: 56, width: 150, borderRadius: 999, border: "2px solid oklch(40% 0.07 200)", background: "oklch(98% 0.004 250)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px" }}>
            <canvas ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H, display: "block" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
