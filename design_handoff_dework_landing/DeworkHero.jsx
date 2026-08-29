import { useEffect, useRef, useState } from "react";

// ---- Design tokens ----
const COLORS = {
  ink: "oklch(18% 0.01 240)",
  inkMuted: "oklch(45% 0.01 240)",
  borderMuted: "oklch(85% 0.01 240)",
  bg: "oklch(99% 0.003 240)",
  cyan: "oklch(58% 0.1 220)",
  cyanBorder: "oklch(55% 0.1 220)",
  cyanText: "oklch(35% 0.09 220)",
  lime: "#7CCF00",
};
const FONT = "'Outfit', sans-serif";
const LANGUAGES = ["اردو", "हिन्दी", "বাংলা", "தமிழ்", "తెలుగు", "मराठी", "ਪੰਜਾਬੀ", "ગુજરાતી", "ಕನ್ನಡ", "മലയാളം"];

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function buildTrack(offset, trackWidth, pillEdge) {
  const step = 9;
  const numSlots = Math.ceil(trackWidth / step) + 4;
  const patternLength = numSlots * step;
  const squeezeZone = 20;
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

/** Waveform-bars-into-word-pill widget. Fully self-driving — no props needed. */
function WaveformWordPill() {
  const [, tick] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    startRef.current = performance.now();
    const loop = () => {
      tick((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const elapsed = startRef.current ? performance.now() - startRef.current : 0;
  const trackWidth = 148;
  const cycleMs = 1100;
  const scrollOffset = (elapsed / 1000) * 20;
  const leftBars = buildTrack(scrollOffset, trackWidth, "right");
  const rightBars = buildTrack(scrollOffset, trackWidth, "left");

  const t = (elapsed % cycleMs) / cycleMs;
  const index = Math.floor(elapsed / cycleMs) % LANGUAGES.length;
  let envelope;
  if (t < 0.18) envelope = smoothstep(0, 1, t / 0.18);
  else if (t > 0.82) envelope = 1 - smoothstep(0, 1, (t - 0.82) / 0.18);
  else envelope = 1;

  const barStyle = (b) => ({ position: "absolute", left: b.x, top: "50%", width: 4, borderRadius: 999, background: COLORS.lime, height: `${b.h}%`, transform: `translateY(-50%) scale(1, ${b.s})` });

  return (
    <div style={{ margin: "22px 0 0 0", padding: "16px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", height: 40, width: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: "calc(50% + 30px)", height: 40, transform: "translateY(-50%)", overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, transparent 0, black 20px, black 100%)", maskImage: "linear-gradient(to right, transparent 0, black 20px, black 100%)" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            {leftBars.map((b, i) => <span key={i} style={barStyle(b)} />)}
          </div>
        </div>
        <div style={{ position: "absolute", top: "50%", left: "calc(50% + 30px)", right: 0, height: 40, transform: "translateY(-50%)", overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)", maskImage: "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            {rightBars.map((b, i) => <span key={i} style={barStyle(b)} />)}
          </div>
        </div>
        <div style={{ pointerEvents: "none", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10 }}>
          <div style={{ height: 40, minWidth: 104, borderRadius: 20, boxShadow: `inset 0 0 0 1.5px ${COLORS.cyanBorder}`, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px", boxSizing: "border-box" }}>
            <span style={{ display: "inline-block", transform: `scaleX(${Math.max(0.02, envelope)})`, opacity: envelope, transformOrigin: "center", fontSize: 14, fontWeight: 600, color: COLORS.cyanText, whiteSpace: "nowrap" }}>
              {LANGUAGES[index]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const IndiaFlag = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2, flexShrink: 0 }}>
    <rect width="20" height="14" fill="#fff" />
    <rect width="20" height="4.67" fill="#FF9933" />
    <rect width="20" height="4.67" y="9.33" fill="#138808" />
    <circle cx="10" cy="7" r="2" fill="none" stroke="#000080" strokeWidth="0.4" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const PhoneOutgoingIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M15 9l6 -6" />
    <path d="M21 8v-5h-5" />
    <path d="M6.279 10.71a13.007 13.007 0 0 0 6.712 7.01a1.66 1.66 0 0 0 1.63 -.163l1.66 -1.055a1.7 1.7 0 0 1 1.85 0l3.028 1.892a1.694 1.694 0 0 1 .11 2.81a9.699 9.699 0 0 1 -12.552 -.892c-2.973 -2.973 -4.911 -6.911 -5.911 -12.552a1.694 1.694 0 0 1 2.81 .11l1.892 3.028a1.7 1.7 0 0 1 0 1.85l-1.056 1.66a1.66 1.66 0 0 0 -.163 1.302" />
  </svg>
);

/**
 * Full "AI Voice Calling Agents" hero section.
 * Usage: <DeworkHero onBookCall={...} onCall={(phone) => ...} />
 * Both handlers are optional — omit to render as static markup.
 */
export default function DeworkHero({ onBookCall, onCall }) {
  const [phone, setPhone] = useState("");

  return (
    <div style={{ width: 382, fontFamily: FONT, background: COLORS.bg, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 22px 0 22px" }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink }}>deWork Labs</span>
        <button onClick={onBookCall} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: COLORS.ink, background: "transparent", border: `1.5px solid ${COLORS.ink}`, borderRadius: 999, padding: "8px 18px", cursor: "pointer" }}>
          Book a call
        </button>
      </div>

      <div style={{ padding: "34px 24px 0 24px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: COLORS.ink, letterSpacing: "-0.01em" }}>AI Voice Calling Agents</h1>
        <p style={{ margin: "12px 0 0 0", fontSize: 15, fontWeight: 400, color: COLORS.inkMuted }}>Talk to our agents in:</p>
      </div>

      <WaveformWordPill />

      <div style={{ padding: "22px 24px 34px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${COLORS.ink}`, borderRadius: 999, padding: "8px 10px 8px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 10, borderRight: `1px solid ${COLORS.borderMuted}` }}>
            <IndiaFlag />
            <ChevronDownIcon />
          </div>
          <input
            type="tel"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT, fontSize: 15, color: COLORS.ink, background: "transparent", minWidth: 0 }}
          />
          <button onClick={() => onCall && onCall(phone)} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 999, border: "none", background: COLORS.cyan, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <PhoneOutgoingIcon />
          </button>
        </div>
      </div>

      <svg viewBox="0 0 382 30" width="382" height="30" style={{ display: "block", filter: `drop-shadow(0 -8px 10px oklch(18% 0.01 240 / 0.15))` }}>
        <path d="M0,30 Q191,0 382,30" fill="none" stroke={COLORS.ink} strokeWidth="1.5" />
      </svg>
    </div>
  );
}
