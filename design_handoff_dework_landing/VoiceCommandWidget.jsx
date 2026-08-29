import { useEffect, useRef, useState } from "react";

const LANGUAGES = ['অসমীয়া', 'বাংলা', 'बड़ो', 'डोगरी', 'ગુજરાતી', 'हिन्दी', 'ಕನ್ನಡ', 'کٲشُر', 'कोंकणी', 'मैथिली', 'മലയാളം', 'ꯃꯤꯇꯩꯂꯣꯟ', 'मराठी', 'नेपाली', 'ଓଡ଼ିଆ', 'ਪੰਜਾਬੀ', 'संस्कृतम्', 'ᱥᱟᱱᱛᱟᱲᱤ', 'سنڌي', 'தமிழ்', 'తెలుగు', 'اردو'];
const CYCLE_MS = 2200;
const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function graphemes(word) {
  if (segmenter) return Array.from(segmenter.segment(word), (s) => s.segment);
  return word.split("");
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function buildTrack(offset, trackWidth, pillEdge) {
  const step = 9;
  const numSlots = Math.ceil(trackWidth / step) + 4;
  const patternLength = numSlots * step;
  const squeezeZone = 56;
  const bars = [];
  for (let i = 0; i < numSlots; i++) {
    const x = ((i * step + offset) % patternLength) - step;
    const h = 22 + Math.abs(Math.sin(i * 0.9) * 55) + Math.abs(Math.sin(i * 2.1)) * 23;
    const dist = pillEdge === "right" ? trackWidth - x : x;
    const f = smoothstep(0, squeezeZone, dist);
    const s = 0.1 + 0.9 * f;
    bars.push({ x: Math.round(x * 10) / 10, h: Math.round(Math.min(100, h)), s: Math.round(s * 100) / 100 });
  }
  return bars;
}

export default function VoiceCommandWidget() {
  const [tick, setTick] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    startRef.current = performance.now();
    const loop = () => {
      setTick((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const elapsed = startRef.current ? performance.now() - startRef.current : 0;
  const trackWidth = 246;
  const scrollOffset = (elapsed / 1000) * 22;
  const leftBars = buildTrack(scrollOffset, trackWidth, "right");
  const rightBars = buildTrack(scrollOffset, trackWidth, "left");

  const t = (elapsed % CYCLE_MS) / CYCLE_MS;
  const index = Math.floor(elapsed / CYCLE_MS) % LANGUAGES.length;
  const word = LANGUAGES[index];

  const pillW = 190;
  const charStep = 15;
  const squeezeZone = 26;
  const chars = graphemes(word);
  const wordWidth = chars.length * charStep;
  const xOffset = -wordWidth + t * (pillW + wordWidth);
  const letters = chars.map((ch, i) => {
    const charX = xOffset + i * charStep;
    const sLeft = smoothstep(0, squeezeZone, charX);
    const sRight = smoothstep(0, squeezeZone, pillW - charX);
    const s = Math.max(0.05, Math.min(sLeft, sRight));
    return { ch, x: Math.round(charX * 10) / 10, s: Math.round(s * 100) / 100 };
  });

  return (
    <div style={{ width: 640, height: 180, background: "oklch(98% 0.004 250)", borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: "calc(50% + 74px)", height: 56, transform: "translateY(-50%)", overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black 100%)", maskImage: "linear-gradient(to right, transparent 0, black 24px, black 100%)" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            {leftBars.map((b, i) => (
              <span key={i} style={{ position: "absolute", left: b.x, top: "50%", width: 4, borderRadius: 999, background: "#7CCF00", height: `${b.h}%`, transform: `translateY(-50%) scale(1, ${b.s})` }} />
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", top: "50%", left: "calc(50% + 74px)", right: 0, height: 56, transform: "translateY(-50%)", overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)", maskImage: "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            {rightBars.map((b, i) => (
              <span key={i} style={{ position: "absolute", left: b.x, top: "50%", width: 4, borderRadius: 999, background: "#7CCF00", height: `${b.h}%`, transform: `translateY(-50%) scale(1, ${b.s})` }} />
            ))}
          </div>
        </div>
        <div style={{ pointerEvents: "none", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10 }}>
          <div style={{ height: 56, width: pillW, borderRadius: 999, border: "2px solid oklch(40% 0.07 200)", background: "oklch(98% 0.004 250)", position: "relative", overflow: "hidden" }}>
            {letters.map((c, i) => (
              <span key={i} style={{ position: "absolute", left: c.x, top: "50%", transform: `translateY(-50%) scale(${c.s})`, transformOrigin: "center", fontSize: 18, fontWeight: 600, color: "oklch(40% 0.07 200)", whiteSpace: "pre" }}>
                {c.ch}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
