import { useState, useEffect, useRef } from "react";

const COLORS = {
  parchment: "#f5f0e8",
  parchmentDeep: "#ede4d4",
  terracotta: "#b85c38",
  terracottaLight: "#c97a58",
  ink: "#2c2416",
  inkLight: "#4a3f35",
  sage: "#7a8c72",
  stone: "#d4cbba",
  warmGrey: "#9a8f85",
};

const DOMAIN_COLORS = [
  "#b85c38", "#7a8c72", "#9a8f85", "#c97a58",
  "#6b7a63", "#d4cbba", "#4a3f35", "#b5a898",
];

const DOMAINS = [
  { key: "work", label: "Work & career" },
  { key: "relationships", label: "Relationships & connection" },
  { key: "family", label: "Family & home" },
  { key: "health", label: "Health & body" },
  { key: "growth", label: "Personal growth & learning" },
  { key: "creativity", label: "Creativity & expression" },
  { key: "meaning", label: "Meaning & purpose" },
  { key: "freedom", label: "Freedom & autonomy" },
];

const MORNING_OPTIONS = [
  "Energised and ready",
  "Calm and steady",
  "Neutral — going through the motions",
  "Heavy or already tired",
  "Anxious or overwhelmed",
  "Other",
];

const SLEEP_OPTIONS = [
  "Restful and consistent",
  "Mostly okay",
  "Inconsistent",
  "Poor — not restorative",
  "Other",
];

async function generateAIReflection(answers, mostDraining, mostEnergising) {
  const sliderSummary = Object.entries(answers.energySliders)
    .map(([key, val]) => {
      const domain = key.charAt(0).toUpperCase() + key.slice(1);
      return `${domain}: ${val > 0 ? "+" : ""}${val}`;
    }).join(", ");

  const allocSummary = Object.entries(answers.allocation)
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => `${key}: ${val}%`)
    .join(", ");

  const prompt = `You are writing a reflection for a woman who has just completed a Life Alignment Audit on Flourish Studio — a positive psychology practice for ambitious women navigating burnout and life transitions, founded by Varvara Egorova-Ioane.

Here are her responses:

ENERGY SNAPSHOT:
- What has been giving her energy: "${answers.energising}"
- What has been draining her: "${answers.draining}"
- Morning feeling: "${answers.morning}${answers.morningOther ? ": " + answers.morningOther : ""}"
- What occupies her mind: "${answers.mindOccupied}"
- Sleep quality: "${answers.sleep}${answers.sleepOther ? ": " + answers.sleepOther : ""}"

ENERGY MAP (sliders -5 draining to +5 energising):
${sliderSummary}

ENERGY ALLOCATION (where her time/energy actually goes):
${allocSummary}

Most draining area (combined score): ${mostDraining.label}
Most energising area (combined score): ${mostEnergising.label}

TRUTH LAYER:
- When she felt most like herself: "${answers.mostLikeMyself}"
- What she's been tolerating: "${answers.tolerating}"
- What she senses needs to change: "${answers.senseChange}"

Write a short, personalised reflection in THREE paragraphs. Total maximum 160 words.

Paragraph 1: What seems to be draining her — reflect her own words back without diagnosing. Name the pattern at a high level only.
Paragraph 2: What seems to be sustaining her — the positive anchor, what's giving her energy.
Paragraph 3: There is a gap here worth exploring — open, curious, no diagnosis, no advice, no answers. End with a single open question that makes her want to have a conversation to go deeper.

STRICT RULES:
- Do NOT diagnose anything
- Do NOT tell her what to do
- Do NOT give her the answer or solution
- Do NOT use clinical or therapy language
- Do NOT use em-dashes
- Write warmly, intelligently, directly — as a wise trusted friend would speak, not a therapist
- Use her actual words where possible
- Keep it open — she should leave with curiosity, not conclusions
- No bullet points, no headers, just three clean paragraphs`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return text;
}

function PieChart({ data }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2;
  const slices = DOMAINS.map((d, i) => {
    const val = data[d.key] || 0;
    const slice = (val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += slice;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: DOMAIN_COLORS[i], label: d.label, val };
  }).filter(s => s.val > 0);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke={COLORS.stone} strokeWidth="1" />
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity="0.85" stroke={COLORS.parchment} strokeWidth="1.5" />
      ))}
      <circle cx={cx} cy={cy} r={28} fill={COLORS.parchment} />
    </svg>
  );
}

function ProgressBar({ current, total }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "2px", background: COLORS.stone, zIndex: 100 }}>
      <div style={{ height: "100%", background: COLORS.terracotta, width: `${(current / total) * 100}%`, transition: "width 0.5s ease" }} />
    </div>
  );
}

function Screen({ children, style }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.parchment,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      ...style,
    }}>
      <div style={{ maxWidth: "560px", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: COLORS.terracotta, marginBottom: "24px", fontFamily: "Cormorant Garamond, Georgia, serif" }}>{children}</p>;
}

function Question({ children }) {
  return <h2 style={{ fontSize: "28px", fontWeight: "400", color: COLORS.ink, lineHeight: "1.35", marginBottom: "36px", fontFamily: "Cormorant Garamond, Georgia, serif" }}>{children}</h2>;
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "Write freely..."}
      rows={4}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${COLORS.stone}`,
        padding: "12px 0",
        fontSize: "16px",
        color: COLORS.ink,
        fontFamily: "Cormorant Garamond, Georgia, serif",
        resize: "none",
        outline: "none",
        lineHeight: "1.7",
        boxSizing: "border-box",
      }}
    />
  );
}

function ChoiceButton({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "16px 20px",
        marginBottom: "10px",
        background: selected ? COLORS.terracotta : "transparent",
        border: `1px solid ${selected ? COLORS.terracotta : COLORS.stone}`,
        borderRadius: "2px",
        color: selected ? COLORS.parchment : COLORS.inkLight,
        fontSize: "16px",
        fontFamily: "Cormorant Garamond, Georgia, serif",
        cursor: "pointer",
        transition: "all 0.2s",
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </button>
  );
}

function NextButton({ onClick, label = "Continue", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: "36px",
        padding: "16px 40px",
        background: disabled ? COLORS.stone : COLORS.ink,
        color: disabled ? COLORS.warmGrey : COLORS.parchment,
        border: "none",
        borderRadius: "2px",
        fontSize: "13px",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        fontFamily: "Cormorant Garamond, Georgia, serif",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}

function EnergySlider({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "15px", color: COLORS.ink, fontFamily: "Cormorant Garamond, Georgia, serif" }}>{label}</span>
        <span style={{
          fontSize: "13px",
          color: value > 0 ? COLORS.sage : value < 0 ? COLORS.terracotta : COLORS.warmGrey,
          fontFamily: "Cormorant Garamond, Georgia, serif",
          minWidth: "24px",
          textAlign: "right",
        }}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div style={{ position: "relative", height: "24px", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: COLORS.stone }} />
        <div style={{ position: "absolute", left: "50%", width: "1px", height: "8px", background: COLORS.warmGrey, transform: "translateX(-50%)" }} />
        <input
          type="range"
          min="-5"
          max="5"
          step="1"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "relative",
            width: "100%",
            appearance: "none",
            background: "transparent",
            cursor: "pointer",
            zIndex: 1,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
        <span style={{ fontSize: "11px", color: COLORS.warmGrey, letterSpacing: "0.05em" }}>Draining</span>
        <span style={{ fontSize: "11px", color: COLORS.warmGrey, letterSpacing: "0.05em" }}>Energising</span>
      </div>
    </div>
  );
}

function AllocationInput({ domain, value, onChange, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: "15px", color: COLORS.inkLight, fontFamily: "Cormorant Garamond, Georgia, serif" }}>{domain}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={e => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
          style={{
            width: "52px",
            padding: "6px 8px",
            border: `1px solid ${COLORS.stone}`,
            borderRadius: "2px",
            background: "transparent",
            fontSize: "15px",
            color: COLORS.ink,
            fontFamily: "Cormorant Garamond, Georgia, serif",
            textAlign: "center",
            outline: "none",
          }}
        />
        <span style={{ fontSize: "13px", color: COLORS.warmGrey }}>%</span>
      </div>
    </div>
  );
}

export default function LifeAuditTool() {
  const [screen, setScreen] = useState(0);
  const [answers, setAnswers] = useState({
    energising: "",
    draining: "",
    morning: "",
    morningOther: "",
    mindOccupied: "",
    sleep: "",
    sleepOther: "",
    energySliders: Object.fromEntries(DOMAINS.map(d => [d.key, 0])),
    allocation: Object.fromEntries(DOMAINS.map(d => [d.key, 0])),
    likeMyself: "",
    tolerating: "",
    senseChange: "",
    mostLikeMyself: "",
    email: "",
    wantsCall: false,
  });
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  const totalScreens = 16;

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));
  const updateSlider = (key, val) => setAnswers(prev => ({ ...prev, energySliders: { ...prev.energySliders, [key]: val } }));
  const updateAlloc = (key, val) => setAnswers(prev => ({ ...prev, allocation: { ...prev.allocation, [key]: val } }));

  const allocTotal = Object.values(answers.allocation).reduce((a, b) => a + b, 0);

  const next = () => { setScreen(s => s + 1); window.scrollTo(0, 0); };
  const back = () => { setScreen(s => s - 1); window.scrollTo(0, 0); };

  // Pick the most draining and most energising domain for output
  // Misalignment score: combines draining slider + high time allocation
  // The domain taking the most time while giving least energy = biggest misalignment
  const misalignmentScore = (domain) => {
    const slider = answers.energySliders[domain.key] || 0; // -5 to +5
    const allocation = answers.allocation[domain.key] || 0; // 0 to 100
    const drainScore = ((-slider + 5) / 10) * 0.6; // inverted: -5 drain = highest score
    const allocScore = (allocation / 100) * 0.4; // high time investment amplifies
    return drainScore + allocScore;
  };
  const energyScore = (domain) => {
    const slider = answers.energySliders[domain.key] || 0;
    const allocation = answers.allocation[domain.key] || 0;
    return ((slider + 5) / 10) * 0.7 + (allocation / 100) * 0.3;
  };
  const mostDraining = DOMAINS.reduce((a, b) => misalignmentScore(a) > misalignmentScore(b) ? a : b);
  const mostEnergising = DOMAINS.reduce((a, b) => energyScore(a) > energyScore(b) ? a : b);
  const signalAnswer = answers.senseChange || answers.tolerating || answers.draining;

  const sliderStyle = `
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${COLORS.terracotta};
      cursor: pointer;
      border: 2px solid ${COLORS.parchment};
      box-shadow: 0 1px 4px rgba(44,36,22,0.15);
    }
    input[type=range]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${COLORS.terracotta};
      cursor: pointer;
      border: 2px solid ${COLORS.parchment};
    }
  `;

  return (
    <div style={{ fontFamily: "Cormorant Garamond, Georgia, serif", background: COLORS.parchment }}>
      <style>{sliderStyle}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet" />

      <ProgressBar current={screen} total={totalScreens} />

      {/* SCREEN 0 — LANDING */}
      {screen === 0 && (
        <Screen>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.4em", textTransform: "uppercase", color: COLORS.terracotta, marginBottom: "32px" }}>Flourish Studio</p>
            <h1 style={{ fontSize: "42px", fontWeight: "300", color: COLORS.ink, lineHeight: "1.2", marginBottom: "20px" }}>The Life<br />Alignment Audit</h1>
            <div style={{ width: "40px", height: "1px", background: COLORS.terracotta, margin: "0 auto 28px" }} />
            <p style={{ fontSize: "18px", color: COLORS.inkLight, lineHeight: "1.8", marginBottom: "16px", fontStyle: "italic" }}>
              A 10-minute reflection to help you see where your energy is going — and where something may be out of alignment.
            </p>
            <p style={{ fontSize: "14px", color: COLORS.warmGrey, lineHeight: "1.7", marginBottom: "48px" }}>
              There are no right or wrong answers. Answer as honestly as you can, based on the past month.
            </p>
            <button
              onClick={next}
              style={{
                padding: "18px 48px",
                background: COLORS.terracotta,
                color: COLORS.parchment,
                border: "none",
                borderRadius: "2px",
                fontSize: "13px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontFamily: "Cormorant Garamond, Georgia, serif",
                cursor: "pointer",
              }}
            >
              Begin
            </button>
          </div>
        </Screen>
      )}

      {/* SCREEN 1 — Q1 Energising */}
      {screen === 1 && (
        <Screen>
          <Label>Part 1 of 3 — Energy Snapshot</Label>
          <Question>Over the past month, what has been giving you the most energy?</Question>
          <TextArea value={answers.energising} onChange={v => update("energising", v)} placeholder="Write freely — there's no right answer..." />
          <NextButton onClick={next} disabled={!answers.energising.trim()} />
        </Screen>
      )}

      {/* SCREEN 2 — Q2 Draining */}
      {screen === 2 && (
        <Screen>
          <Label>Part 1 of 3 — Energy Snapshot</Label>
          <Question>Over the past month, what has been draining you the most?</Question>
          <TextArea value={answers.draining} onChange={v => update("draining", v)} placeholder="Be honest — this is just for you..." />
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={!answers.draining.trim()} />
          </div>
        </Screen>
      )}

      {/* SCREEN 3 — Q3 Morning */}
      {screen === 3 && (
        <Screen>
          <Label>Part 1 of 3 — Energy Snapshot</Label>
          <Question>Over the past month, on a typical weekday morning — how have you felt when you wake up?</Question>
          {MORNING_OPTIONS.map(opt => (
            <ChoiceButton key={opt} label={opt} selected={answers.morning === opt} onClick={() => update("morning", opt)} />
          ))}
          {answers.morning === "Other" && (
            <TextArea value={answers.morningOther} onChange={v => update("morningOther", v)} placeholder="Describe how you've been waking up..." />
          )}
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={!answers.morning} />
          </div>
        </Screen>
      )}

      {/* SCREEN 4 — Q4 Mind occupied */}
      {screen === 4 && (
        <Screen>
          <Label>Part 1 of 3 — Energy Snapshot</Label>
          <Question>Over the past month, what has been occupying your mind the most?</Question>
          <TextArea value={answers.mindOccupied} onChange={v => update("mindOccupied", v)} placeholder="The thoughts that keep coming back..." />
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={!answers.mindOccupied.trim()} />
          </div>
        </Screen>
      )}

      {/* SCREEN 5 — Q5 Sleep */}
      {screen === 5 && (
        <Screen>
          <Label>Part 1 of 3 — Energy Snapshot</Label>
          <Question>Over the past month, how has your sleep been?</Question>
          {SLEEP_OPTIONS.map(opt => (
            <ChoiceButton key={opt} label={opt} selected={answers.sleep === opt} onClick={() => update("sleep", opt)} />
          ))}
          {answers.sleep === "Other" && (
            <TextArea value={answers.sleepOther} onChange={v => update("sleepOther", v)} placeholder="Tell us more..." />
          )}
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={!answers.sleep} />
          </div>
        </Screen>
      )}

      {/* SCREEN 6 — Energy Map intro */}
      {screen === 6 && (
        <Screen>
          <div style={{ textAlign: "center" }}>
            <Label>Part 2 of 3 — Energy Map</Label>
            <h2 style={{ fontSize: "32px", fontWeight: "300", color: COLORS.ink, lineHeight: "1.35", marginBottom: "20px" }}>Now let's map your energy across the different areas of your life.</h2>
            <div style={{ width: "40px", height: "1px", background: COLORS.stone, margin: "0 auto 24px" }} />
            <p style={{ fontSize: "16px", color: COLORS.inkLight, lineHeight: "1.8", fontStyle: "italic" }}>For each area, move the slider to show whether it's been draining you or energising you over the past month.</p>
            <NextButton onClick={next} label="Let's map it" />
          </div>
        </Screen>
      )}

      {/* SCREEN 7 — Energy Sliders */}
      {screen === 7 && (
        <Screen>
          <Label>Part 2 of 3 — Energy Map</Label>
          <Question>Over the past month, how much energy has each area been giving or taking?</Question>
          {DOMAINS.map(d => (
            <EnergySlider key={d.key} label={d.label} value={answers.energySliders[d.key]} onChange={v => updateSlider(d.key, v)} />
          ))}
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} />
          </div>
        </Screen>
      )}

      {/* SCREEN 8 — Allocation */}
      {screen === 8 && (
        <Screen>
          <Label>Part 2 of 3 — Energy Map</Label>
          <Question>Over the past month, where has most of your energy actually gone?</Question>
          <p style={{ fontSize: "14px", color: COLORS.warmGrey, marginBottom: "32px", lineHeight: "1.6" }}>
            Distribute 100% across the areas below. This should reflect reality — not how you wish it were.
            {" "}<span style={{ color: allocTotal === 100 ? COLORS.sage : allocTotal > 100 ? COLORS.terracotta : COLORS.warmGrey, fontWeight: "500" }}>
              Total: {allocTotal}%
            </span>
          </p>

          <div style={{ display: "flex", gap: "40px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 200px" }}>
              <PieChart data={answers.allocation} />
              <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {DOMAINS.map((d, i) => answers.allocation[d.key] > 0 && (
                  <div key={d.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: DOMAIN_COLORS[i] }} />
                    <span style={{ fontSize: "11px", color: COLORS.warmGrey }}>{answers.allocation[d.key]}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              {DOMAINS.map((d, i) => (
                <AllocationInput key={d.key} domain={d.label} value={answers.allocation[d.key]} onChange={v => updateAlloc(d.key, v)} color={DOMAIN_COLORS[i]} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={allocTotal !== 100} label={allocTotal === 100 ? "Continue" : `${100 - allocTotal}% remaining`} />
          </div>
        </Screen>
      )}

      {/* SCREEN 9 — Truth layer intro */}
      {screen === 9 && (
        <Screen>
          <div style={{ textAlign: "center" }}>
            <Label>Part 3 of 3 — The Truth Layer</Label>
            <h2 style={{ fontSize: "32px", fontWeight: "300", color: COLORS.ink, lineHeight: "1.35", marginBottom: "20px" }}>Three final questions.</h2>
            <div style={{ width: "40px", height: "1px", background: COLORS.stone, margin: "0 auto 24px" }} />
            <p style={{ fontSize: "16px", color: COLORS.inkLight, lineHeight: "1.8", fontStyle: "italic" }}>These are the ones that matter most. Take your time with them.</p>
            <NextButton onClick={next} label="I'm ready" />
          </div>
        </Screen>
      )}

      {/* SCREEN 10 — Q: Most like yourself */}
      {screen === 10 && (
        <Screen>
          <Label>Part 3 of 3 — The Truth Layer</Label>
          <Question>In the past month, when did you feel most like yourself — even briefly? What was happening?</Question>
          <TextArea value={answers.mostLikeMyself} onChange={v => update("mostLikeMyself", v)} placeholder="A moment, a place, a conversation..." />
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={!answers.mostLikeMyself.trim()} />
          </div>
        </Screen>
      )}

      {/* SCREEN 11 — Q: Tolerating */}
      {screen === 11 && (
        <Screen>
          <Label>Part 3 of 3 — The Truth Layer</Label>
          <Question>What have you been tolerating over the past month that you wish you weren't?</Question>
          <TextArea value={answers.tolerating} onChange={v => update("tolerating", v)} placeholder="The things you keep putting up with..." />
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={next} disabled={!answers.tolerating.trim()} />
          </div>
        </Screen>
      )}

      {/* SCREEN 12 — Q: Sense change */}
      {screen === 12 && (
        <Screen>
          <Label>Part 3 of 3 — The Truth Layer</Label>
          <Question>If something in your life needs to change, what do you already sense it is?</Question>
          <p style={{ fontSize: "14px", color: COLORS.warmGrey, marginBottom: "24px", fontStyle: "italic", lineHeight: "1.6" }}>You usually already know. This is permission to say it, even just to yourself.</p>
          <TextArea value={answers.senseChange} onChange={v => update("senseChange", v)} placeholder="The thing you already sense but haven't said out loud..." />
          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <button onClick={back} style={{ padding: "16px 24px", background: "transparent", border: `1px solid ${COLORS.stone}`, borderRadius: "2px", color: COLORS.warmGrey, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Cormorant Garamond, Georgia, serif", cursor: "pointer" }}>Back</button>
            <NextButton onClick={async () => {
              next();
              setAiLoading(true);
              setAiError(false);
              try {
                const result = await generateAIReflection(answers, mostDraining, mostEnergising);
                setAiOutput(result);
              } catch(e) {
                setAiError(true);
              } finally {
                setAiLoading(false);
              }
            }} disabled={!answers.senseChange.trim()} label="See my reflection" />
          </div>
        </Screen>
      )}

      {/* SCREEN 13 — OUTPUT */}
      {screen === 13 && (
        <Screen>
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: COLORS.terracotta, marginBottom: "40px" }}>Your Alignment Snapshot</p>

            {/* Energy map summary — always shown */}
            <div style={{ background: COLORS.parchmentDeep, border: `1px solid ${COLORS.stone}`, borderRadius: "2px", padding: "24px", marginBottom: "36px" }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.warmGrey, marginBottom: "16px" }}>Your energy map</p>
              <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: "11px", color: COLORS.warmGrey, marginBottom: "4px" }}>Most draining</p>
                  <p style={{ fontSize: "17px", color: COLORS.terracotta, fontFamily: "Cormorant Garamond, Georgia, serif" }}>{mostDraining.label}</p>
                </div>
                <div style={{ width: "1px", height: "32px", background: COLORS.stone }} />
                <div>
                  <p style={{ fontSize: "11px", color: COLORS.warmGrey, marginBottom: "4px" }}>Most energising</p>
                  <p style={{ fontSize: "17px", color: COLORS.sage, fontFamily: "Cormorant Garamond, Georgia, serif" }}>{mostEnergising.label}</p>
                </div>
              </div>
            </div>

            {/* AI loading state */}
            {aiLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ width: "32px", height: "32px", border: `2px solid ${COLORS.stone}`, borderTop: `2px solid ${COLORS.terracotta}`, borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite" }} />
                </div>
                <p style={{ fontSize: "16px", color: COLORS.warmGrey, fontStyle: "italic", fontFamily: "Cormorant Garamond, Georgia, serif" }}>Reading your responses...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* AI error fallback */}
            {aiError && !aiLoading && (
              <p style={{ fontSize: "16px", color: COLORS.warmGrey, fontStyle: "italic", lineHeight: "1.8", marginBottom: "28px" }}>
                Something in your responses points to a gap between where your energy is going and what is actually sustaining you. That gap is worth exploring.
              </p>
            )}

            {/* AI output */}
            {aiOutput && !aiLoading && (
              <div style={{ marginBottom: "36px" }}>
                {aiOutput.split("\n\n").filter(p => p.trim()).map((para, i) => (
                  <p key={i} style={{
                    fontSize: i === aiOutput.split("\n\n").filter(p => p.trim()).length - 1 ? "18px" : "17px",
                    color: i === aiOutput.split("\n\n").filter(p => p.trim()).length - 1 ? COLORS.ink : COLORS.inkLight,
                    lineHeight: "1.85",
                    marginBottom: "20px",
                    fontFamily: "Cormorant Garamond, Georgia, serif",
                    fontStyle: i === 0 ? "normal" : i === aiOutput.split("\n\n").filter(p => p.trim()).length - 1 ? "italic" : "normal",
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {!aiLoading && (
              <>
                <div style={{ width: "40px", height: "1px", background: COLORS.stone, marginBottom: "28px" }} />
                <p style={{ fontSize: "16px", color: COLORS.ink, lineHeight: "1.8", marginBottom: "36px" }}>
                  If this resonates, we can unpack it properly together. In a free 30-minute session, we will map this out and identify what may need to shift.
                </p>
                <NextButton onClick={next} label="I'd like to explore this" />
                <p style={{ marginTop: "16px", fontSize: "13px", color: COLORS.warmGrey, cursor: "pointer", textDecoration: "underline" }} onClick={next}>Skip to contact options</p>
              </>
            )}
          </div>
        </Screen>
      )}

      {/* SCREEN 14 — EMAIL CAPTURE */}
      {screen === 14 && (
        <Screen>
          <Label>Let's talk</Label>
          <h2 style={{ fontSize: "32px", fontWeight: "300", color: COLORS.ink, lineHeight: "1.35", marginBottom: "16px" }}>Leave your email and I'll be in touch within a day.</h2>
          <p style={{ fontSize: "16px", color: COLORS.inkLight, lineHeight: "1.7", marginBottom: "36px", fontStyle: "italic" }}>No commitment. Just a conversation.</p>

          <input
            type="email"
            placeholder="your@email.com"
            value={answers.email}
            onChange={e => update("email", e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${COLORS.stone}`,
              padding: "12px 0",
              fontSize: "18px",
              color: COLORS.ink,
              fontFamily: "Cormorant Garamond, Georgia, serif",
              outline: "none",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer", marginBottom: "36px" }}>
            <input
              type="checkbox"
              checked={answers.wantsCall}
              onChange={e => update("wantsCall", e.target.checked)}
              style={{ marginTop: "4px", accentColor: COLORS.terracotta }}
            />
            <span style={{ fontSize: "16px", color: COLORS.inkLight, lineHeight: "1.6" }}>
              I'd be open to a free 30-minute conversation to explore this further
            </span>
          </label>

          <NextButton onClick={async () => {
              try {
                await fetch("/.netlify/functions/submit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: answers.email,
                    wantsCall: answers.wantsCall,
                    energising: answers.energising,
                    draining: answers.draining,
                    morning: answers.morning + (answers.morningOther ? ": " + answers.morningOther : ""),
                    mindOccupied: answers.mindOccupied,
                    sleep: answers.sleep + (answers.sleepOther ? ": " + answers.sleepOther : ""),
                    energySliders: answers.energySliders,
                    allocation: answers.allocation,
                    mostLikeMyself: answers.mostLikeMyself,
                    tolerating: answers.tolerating,
                    senseChange: answers.senseChange,
                    aiOutput: aiOutput,
                    mostDraining: mostDraining.label,
                    mostEnergising: mostEnergising.label,
                  }),
                });
              } catch(e) {
                console.log("Submit error", e);
              }
              next();
            }} label="Send" disabled={!answers.email.trim()} />
        </Screen>
      )}

      {/* SCREEN 15 — THANK YOU */}
      {screen === 15 && (
        <Screen>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.4em", textTransform: "uppercase", color: COLORS.terracotta, marginBottom: "32px" }}>Flourish Studio</p>
            <h2 style={{ fontSize: "36px", fontWeight: "300", color: COLORS.ink, lineHeight: "1.3", marginBottom: "20px" }}>Thank you for taking the time to reflect.</h2>
            <div style={{ width: "40px", height: "1px", background: COLORS.terracotta, margin: "0 auto 28px" }} />
            <p style={{ fontSize: "18px", color: COLORS.inkLight, lineHeight: "1.8", fontStyle: "italic", marginBottom: "16px" }}>
              That kind of honesty takes courage. I'll be in touch soon.
            </p>
            <p style={{ fontSize: "15px", color: COLORS.warmGrey, lineHeight: "1.7" }}>
              In the meantime, sit with what came up. The fact that you're here means something is already shifting.
            </p>
            <p style={{ marginTop: "48px", fontSize: "16px", color: COLORS.ink, fontStyle: "italic" }}>— Varvara</p>
          </div>
        </Screen>
      )}
    </div>
  );
}
