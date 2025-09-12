// src/App.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/* ================================
   Minimal website maker (React)
   - No hero required (falls back to gradient)
   - Save/Load (localStorage)
   - Export/Import JSON
   - Export HTML (single file)
   - Checklist v1 (name, goal, proof, contrast)
   ================================ */

// ---- Utilities ----
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  if (![3, 6].includes(h.length)) return [15, 23, 42]; // default slate-900
  const norm = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  return [r, g, b];
}
// WCAG contrast
function luminance([r, g, b]) {
  const srgb = [r, g, b].map(v => v / 255).map(v =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
function contrastRatio(hex1, hex2) {
  const L1 = luminance(hexToRgb(hex1));
  const L2 = luminance(hexToRgb(hex2));
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}
function download(name, mime, text) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---- Sample ----
const SAMPLE = {
  company: {
    name: "Harbor & Sage Law",
    tagline: "Practical counsel for complex transactions",
    locations: ["Oslo", "New York", "Amsterdam"],
    industry: "law",
    brand: {
      primary: "#0F172A",
      secondary: "#F7F7F7",
      accent: "#0EA5E9",
      heroImage: ""
    }
  },
  goals: { primary: "Consultation", secondary: [] },
  differentiators: [
    "Clear fee structures",
    "Bench of ex-in-house lawyers",
    "Deal-first, not theory-first"
  ],
  proof: {
    logos: ["Aldin Capital", "Meridian Partners", "Koto Energy"],
    testimonials: [
      {
        quote: "They guided a complex cross-border deal with clarity.",
        author: "COO, Meridian"
      }
    ],
    metrics: [
      { label: "Deals advised", value: "220" },
      { label: "Average close time", value: "14 days" }
    ]
  },
  pages: { mustHave: ["home", "services", "pricing", "contact"] }
};

// ---- Playbooks (deterministic) ----
const PLAYBOOKS = {
  law: {
    heroKind: "editorial",
    ctas: { primary: "Book consultation", secondary: "Download brochure" },
    services: [
      { title: "M&A & Transactions", text: "Structure, diligence, closing." },
      { title: "Commercial Contracts", text: "Clear, enforceable agreements." },
      { title: "Privacy & Compliance", text: "Practical guidance on obligations." }
    ]
  },
  clinic: {
    heroKind: "image",
    ctas: { primary: "Book appointment", secondary: "Call clinic" },
    services: [
      { title: "Primary care", text: "Accessible care with fast booking." },
      { title: "Specialists", text: "Targeted expertise and clear referrals." },
      { title: "Diagnostics", text: "Modern equipment and gentle guidance." }
    ]
  },
  gym: {
    heroKind: "image",
    ctas: { primary: "Start trial", secondary: "View programs" },
    services: [
      { title: "Elite Coaching", text: "High-intensity progress." },
      { title: "Strength Builder", text: "Progressive overload." },
      { title: "Conditioning Lab", text: "Cardio & mobility." }
    ]
  },
  saas: {
    heroKind: "product",
    ctas: { primary: "Start demo", secondary: "Talk to sales" },
    services: [
      { title: "Onboarding flows", text: "Frictionless time-to-value." },
      { title: "Pricing architecture", text: "Plans & entitlements that convert." },
      { title: "Docs & SEO", text: "Content that compounds organic growth." }
    ]
  }
};

const DEFAULT_BRAND = {
  primary: "#0F172A",
  secondary: "#F7F7F7",
  accent: "#0EA5E9",
  heroImage: ""
};

// ---- Core generator ----
function generateDSL(brief) {
  const industry = brief?.company?.industry || "saas";
  const pb = PLAYBOOKS[industry] || PLAYBOOKS.saas;

  const brand = {
    name: brief?.company?.name || "Your company",
    tagline: brief?.company?.tagline || "",
    colors: {
      primary: brief?.company?.brand?.primary || DEFAULT_BRAND.primary,
      secondary: brief?.company?.brand?.secondary || DEFAULT_BRAND.secondary,
      accent: brief?.company?.brand?.accent || DEFAULT_BRAND.accent
    },
    heroImage: brief?.company?.brand?.heroImage || ""
  };

  const sections = [];

  sections.push({
    type: "hero",
    variant: pb.heroKind,
    title: brand.name,
    subtitle: brand.tagline || "We make websites pay for themselves.",
    badge: (brief?.company?.locations || []).join(" · "),
    primaryCta: {
      label: brief?.goals?.primary || pb.ctas.primary,
      href: "#contact"
    },
    secondaryCta: brief?.goals?.secondary?.[0]
      ? { label: brief.goals.secondary[0], href: "#contact" }
      : null,
    heroImage: brand.heroImage
  });

  const diffs = (brief?.differentiators || [])
    .slice(0, 6)
    .map((d) => ({ title: d, text: "Baked into our day-to-day process." }));
  if (diffs.length) {
    sections.push({ type: "value", title: "What you get with us", items: diffs });
  }

  const services =
    PLAYBOOKS[industry]?.services ||
    PLAYBOOKS.saas.services;
  sections.push({ type: "services", title: "Services", items: services });

  const proof = brief?.proof || {};
  if (proof.logos?.length || proof.testimonials?.length || proof.metrics?.length) {
    sections.push({
      type: "proof",
      logos: proof.logos || [],
      testimonials: proof.testimonials || [],
      metrics: proof.metrics || []
    });
  }

  if ((brief?.pages?.mustHave || []).includes("pricing")) {
    sections.push({
      type: "pricing",
      title: "Packages",
      note: "Transparent estimates. Fixed-fee options available.",
      tiers: [
        { name: "Starter", price: "$900", items: ["2–3 pages", "Responsive", "Lead form"] },
        { name: "Growth", price: "$2,300", items: ["5–7 pages", "SEO + schema", "Booking & Maps", "Integrations"] },
        { name: "Scale", price: "$7,000", items: ["10+ pages", "Strategy + funnel", "Advanced SEO/analytics", "CRM / e-com"] }
      ]
    });
  }

  sections.push({
    type: "cta",
    title: "Ready to move faster?",
    cta: { label: brief?.goals?.primary || pb.ctas.primary, href: "#contact" }
  });

  sections.push({
    type: "contact",
    title: "Contact",
    email: "contact@citeks.net",
    locations: brief?.company?.locations || []
  });

  return { meta: { brand }, pages: [{ slug: "home", sections }] };
}

// ---- Checklist (guardrails) ----
function useChecklist(brief) {
  const b = brief || {};
  const brand = b.company?.brand || DEFAULT_BRAND;
  const textOnNeutral = contrastRatio(brand.primary, brand.secondary);
  const btnOnAccent = contrastRatio("#FFFFFF", brand.accent); // white text on accent button
  const proofCount =
    (b.proof?.logos?.length || 0) +
    (b.proof?.testimonials?.length || 0) +
    (b.proof?.metrics?.length || 0);

  const checks = [
    {
      key: "name",
      label: "Company name present",
      pass: (b.company?.name || "").trim().length >= 2
    },
    {
      key: "goal",
      label: "Primary goal selected",
      pass: (b.goals?.primary || "").trim().length > 0
    },
    {
      key: "proof",
      label: "At least 2 proof items (logos + testimonials + metrics)",
      pass: proofCount >= 2
    },
    {
      key: "contrastBody",
      label: "Contrast (body text vs background) ≥ 4.5:1",
      pass: textOnNeutral >= 4.5,
      meta: textOnNeutral.toFixed(2)
    },
    {
      key: "contrastButton",
      label: "Contrast (button text vs accent) ≥ 3:1",
      pass: btnOnAccent >= 3,
      meta: btnOnAccent.toFixed(2)
    }
  ];

  const allPass = checks.every((c) => c.pass);
  return { checks, allPass };
}

// ---- Storage helpers ----
const STORAGE_KEY = "citeks-maker-projects";

function readProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeProjects(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ---- UI Components ----
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div className="ts-h6">{label}</div>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="input"
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        background: "#fff",
      }}
    />
  );
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      className="input"
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        background: "#fff",
        resize: "vertical"
      }}
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className="input"
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        background: "#fff"
      }}
    />
  );
}

// ---- App ----
export default function App() {
  // form state
  const [name, setName] = useState(SAMPLE.company.name);
  const [tagline, setTagline] = useState(SAMPLE.company.tagline);
  const [locations, setLocations] = useState(SAMPLE.company.locations.join(", "));
  const [industry, setIndustry] = useState(SAMPLE.company.industry);
  const [primary, setPrimary] = useState(SAMPLE.company.brand.primary);
  const [secondary, setSecondary] = useState(SAMPLE.company.brand.secondary);
  const [accent, setAccent] = useState(SAMPLE.company.brand.accent);
  const [hero, setHero] = useState(SAMPLE.company.brand.heroImage);
  const [goal, setGoal] = useState(SAMPLE.goals.primary);

  const [diff, setDiff] = useState(SAMPLE.differentiators.join("\n"));
  const [testi, setTesti] = useState(
    SAMPLE.proof.testimonials.map((t) => `${t.quote} — ${t.author}`).join("\n")
  );
  const [logos, setLogos] = useState(SAMPLE.proof.logos.join(", "));
  const [metrics, setMetrics] = useState(
    SAMPLE.proof.metrics.map((m) => `${m.label}: ${m.value}`).join("\n")
  );

  // projects in storage
  const [projectName, setProjectName] = useState("Sample – Harbor & Sage Law");
  const [projectsMap, setProjectsMap] = useState(readProjects);

  // derived brief
  const brief = useMemo(() => {
    const toList = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
    const toLines = (s) => (s ? s.split("\n").map((x) => x.trim()).filter(Boolean) : []);
    const testimonials = toLines(testi)
      .map((l) => {
        const [q, a] = l.split("—").map((x) => x && x.trim());
        return q ? { quote: q, author: a || "" } : null;
      })
      .filter(Boolean);
    const metricsList = toLines(metrics)
      .map((l) => {
        const [label, value] = l.split(":").map((x) => x && x.trim());
        return label && value ? { label, value } : null;
      })
      .filter(Boolean);

    return {
      company: {
        name: name || "Your company",
        tagline,
        locations: toList(locations),
        industry: industry || "saas",
        brand: { primary, secondary, accent, heroImage: hero || "" }
      },
      goals: { primary: goal, secondary: [] },
      differentiators: toLines(diff),
      proof: {
        logos: toList(logos),
        testimonials,
        metrics: metricsList
      },
      pages: { mustHave: ["home", "services", "pricing", "contact"] }
    };
  }, [name, tagline, locations, industry, primary, secondary, accent, hero, goal, diff, testi, logos, metrics]);

  const dsl = useMemo(() => generateDSL(brief), [brief]);
  const { checks, allPass } = useChecklist(brief);

  // actions
  function saveProject() {
    if (!projectName.trim()) return alert("Give this project a name first.");
    const map = { ...readProjects(), [projectName.trim()]: brief };
    writeProjects(map);
    setProjectsMap(map);
    alert("Saved.");
  }
  function loadProject(name) {
    const map = readProjects();
    const b = map[name];
    if (!b) return;
    setProjectName(name);
    setName(b.company?.name || "");
    setTagline(b.company?.tagline || "");
    setLocations((b.company?.locations || []).join(", "));
    setIndustry(b.company?.industry || "saas");
    setPrimary(b.company?.brand?.primary || DEFAULT_BRAND.primary);
    setSecondary(b.company?.brand?.secondary || DEFAULT_BRAND.secondary);
    setAccent(b.company?.brand?.accent || DEFAULT_BRAND.accent);
    setHero(b.company?.brand?.heroImage || "");
    setGoal(b.goals?.primary || "Consultation");
    setDiff((b.differentiators || []).join("\n"));
    setTesti((b.proof?.testimonials || []).map(t => `${t.quote} — ${t.author}`).join("\n"));
    setLogos((b.proof?.logos || []).join(", "));
    setMetrics((b.proof?.metrics || []).map(m => `${m.label}: ${m.value}`).join("\n"));
  }
  function exportJSON() {
    download(`${(projectName || "project").replace(/\s+/g, "-").toLowerCase()}.json`, "application/json", JSON.stringify(brief, null, 2));
  }
  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const b = JSON.parse(reader.result);
        setProjectName(b.company?.name || "Imported Project");
        setName(b.company?.name || "");
        setTagline(b.company?.tagline || "");
        setLocations((b.company?.locations || []).join(", "));
        setIndustry(b.company?.industry || "saas");
        setPrimary(b.company?.brand?.primary || DEFAULT_BRAND.primary);
        setSecondary(b.company?.brand?.secondary || DEFAULT_BRAND.secondary);
        setAccent(b.company?.brand?.accent || DEFAULT_BRAND.accent);
        setHero(b.company?.brand?.heroImage || "");
        setGoal(b.goals?.primary || "Consultation");
        setDiff((b.differentiators || []).join("\n"));
        setTesti((b.proof?.testimonials || []).map(t => `${t.quote} — ${t.author}`).join("\n"));
        setLogos((b.proof?.logos || []).join(", "));
        setMetrics((b.proof?.metrics || []).map(m => `${m.label}: ${m.value}`).join("\n"));
      } catch {
        alert("Invalid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportHTML() {
    const html = renderStandaloneHTML(dsl);
    download(`${(projectName || "site").replace(/\s+/g, "-").toLowerCase()}.html`, "text/html", html);
  }

  // ---- UI ----
  return (
    <div style={styles.page}>
      <style>{baseCss}</style>

      <aside style={styles.sidebar}>
        <div style={styles.sectionHeader}>
          <div className="ts-h5" style={{ fontWeight: 700 }}>CITEKS Maker</div>
          <div className="ts-h6" style={{ color: "var(--muted)" }}>Private tool — oversiktlig & deterministic</div>
        </div>

        <div className="thin" style={{ margin: "12px 0" }} />

        <Field label="Project name">
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g., Harbor & Sage Law — Draft A" />
        </Field>

        <div className="thin" style={{ margin: "12px 0" }} />

        <div className="ts-h6" style={{ fontWeight: 600, marginBottom: 4 }}>Company</div>
        <div style={styles.grid2}>
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company" /></Field>
          <Field label="Tagline"><Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short promise" /></Field>
        </div>
        <Field label="Locations (comma)"><Input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Oslo, New York, Amsterdam" /></Field>
        <div style={styles.grid2}>
          <Field label="Industry">
            <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="law">Law</option>
              <option value="clinic">Clinic</option>
              <option value="gym">Gym</option>
              <option value="saas">SaaS</option>
            </Select>
          </Field>
          <Field label="Primary goal">
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option>Consultation</option>
              <option>Book appointment</option>
              <option>Start demo</option>
              <option>Get quote</option>
            </Select>
          </Field>
        </div>

        <div className="thin" style={{ margin: "12px 0" }} />

        <div className="ts-h6" style={{ fontWeight: 600, marginBottom: 4 }}>Brand</div>
        <div style={styles.grid3}>
          <Field label="Primary"><Input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="#0F172A" /></Field>
          <Field label="Accent"><Input value={accent} onChange={(e) => setAccent(e.target.value)} placeholder="#0EA5E9" /></Field>
          <Field label="Neutral (bg)"><Input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="#F7F7F7" /></Field>
        </div>
        <Field label="Hero image URL (optional)">
          <Input value={hero} onChange={(e) => setHero(e.target.value)} placeholder="https://…/image.jpg or /images/file.jpg" />
        </Field>

        <div className="thin" style={{ margin: "12px 0" }} />

        <div className="ts-h6" style={{ fontWeight: 600, marginBottom: 4 }}>Value & Proof</div>
        <Field label="Differentiators (one per line)"><Textarea rows={3} value={diff} onChange={(e) => setDiff(e.target.value)} /></Field>
        <Field label="Testimonials (quote — author, one per line)"><Textarea rows={3} value={testi} onChange={(e) => setTesti(e.target.value)} /></Field>
        <div style={styles.grid2}>
          <Field label="Client logos (comma)"><Input value={logos} onChange={(e) => setLogos(e.target.value)} /></Field>
          <Field label="Metrics (Label: Value, one per line)"><Textarea rows={3} value={metrics} onChange={(e) => setMetrics(e.target.value)} /></Field>
        </div>

        <div className="thin" style={{ margin: "12px 0" }} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button className="btn" onClick={saveProject}>Save</button>
          <select
            className="input"
            style={{ width: 220 }}
            onChange={(e) => e.target.value && loadProject(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Load saved project…</option>
            {Object.keys(projectsMap).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button className="btn sec" onClick={exportJSON}>Export JSON</button>
          <label className="btn sec" style={{ cursor: "pointer" }}>
            Import JSON
            <input type="file" accept=".json,application/json" onChange={importJSON} style={{ display: "none" }} />
          </label>
          <button className="btn" onClick={exportHTML}>Export HTML</button>
        </div>

        <div className="thin" style={{ margin: "12px 0" }} />

        <Checklist checks={checks} />
      </aside>

      <main style={styles.preview}>
        <Header brand={dsl.meta.brand} />
        {dsl.pages[0].sections.map((s, idx) => (
          <Section key={idx} s={s} brand={dsl.meta.brand} />
        ))}
        <Footer brand={dsl.meta.brand} />
      </main>
    </div>
  );
}

// ---- Presentational ----
function Header({ brand }) {
  return (
    <header className="panel site" style={styles.header}>
      <div className="ts-h6" style={{ fontWeight: 600 }}>{brand.name}</div>
      <nav className="ts-h6">
        <a href="#services">Services</a>
        <a href="#pricing" style={{ marginLeft: 16 }}>Pricing</a>
        <a href="#contact" style={{ marginLeft: 16 }}>Contact</a>
      </nav>
    </header>
  );
}

function Footer({ brand }) {
  return (
    <footer className="panel site" style={styles.footer}>
      <div className="ts-h6 tips">© {new Date().getFullYear()} {brand.name}</div>
    </footer>
  );
}

function Section({ s, brand }) {
  if (s.type === "hero") {
    return (
      <section className="hero ar-2-1 reveal" style={{ ...styles.card, padding: 0, position: "relative", overflow: "hidden" }}>
        <div
          className="hero-img"
          style={{
            position: "absolute",
            inset: 0,
            background: s.heroImage
              ? `url(${s.heroImage}) center/cover no-repeat`
              : `linear-gradient(120deg, ${brand.colors.primary}, ${brand.colors.accent})`,
            transform: "scale(1.02)"
          }}
        />
        <div className="hero-scrim" style={styles.scrim} />
        <div className="hero-copy" style={{ position: "relative", color: "#fff", padding: 24, maxWidth: 720 }}>
          {s.badge ? <div className="badge">{s.badge}</div> : null}
          <h1 className="ts-h1" style={{ fontWeight: 700, marginTop: 8 }}>{s.title}</h1>
          <p className="ts-h6" style={{ marginTop: 8, color: "rgba(255,255,255,.88)" }}>{s.subtitle}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            {s.primaryCta ? <a className="btn" href={s.primaryCta.href}>{s.primaryCta.label}</a> : null}
            {s.secondaryCta ? <a className="btn sec" href={s.secondaryCta.href}>{s.secondaryCta.label}</a> : null}
          </div>
        </div>
      </section>
    );
  }

  if (["value", "services"].includes(s.type)) {
    return (
      <section id={s.type === "services" ? "services" : undefined} className="panel reveal" style={styles.card}>
        <h2 className="ts-h2" style={{ fontWeight: 700 }}>{s.title}</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 12 }}>
          {(s.items || []).map((it, i) => (
            <div key={i} className="panel" style={{ ...styles.card, padding: 16 }}>
              <div className="ts-h5" style={{ fontWeight: 600 }}>{it.title}</div>
              <div className="ts-h6" style={{ color: "var(--muted)", marginTop: 4 }}>{it.text}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (s.type === "proof") {
    return (
      <section className="panel reveal" style={styles.card}>
        <h2 className="ts-h2" style={{ fontWeight: 700 }}>Proof</h2>
        {!!s.logos?.length && (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: 12 }}>
            {s.logos.map((l, i) => <div key={i} className="logo-chip">{l}</div>)}
          </div>
        )}
        {!!s.testimonials?.length && (
          <>
            <div className="thin" style={{ margin: "12px 0" }} />
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {s.testimonials.map((t, i) => (
                <div key={i} className="panel" style={{ ...styles.card, padding: 16 }}>
                  <div className="ts-h6" style={{ fontStyle: "italic" }}>“{t.quote}”</div>
                  <div className="ts-h6" style={{ marginTop: 8, color: "var(--muted)" }}>{t.author}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {!!s.metrics?.length && (
          <>
            <div className="thin" style={{ margin: "12px 0" }} />
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {s.metrics.map((m, i) => (
                <div key={i} className="panel" style={{ ...styles.card, padding: 16 }}>
                  <div className="ts-h3" style={{ color: "var(--accent)", fontWeight: 700 }}>{m.value}</div>
                  <div className="ts-h6" style={{ color: "var(--muted)" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  if (s.type === "pricing") {
    return (
      <section id="pricing" className="panel reveal" style={styles.card}>
        <h2 className="ts-h2" style={{ fontWeight: 700 }}>{s.title}</h2>
        <p className="ts-h6" style={{ color: "var(--muted)" }}>{s.note}</p>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 12 }}>
          {s.tiers.map((t, i) => (
            <div key={i} className="panel" style={{ ...styles.card, padding: 16 }}>
              <div className="ts-h5" style={{ fontWeight: 600 }}>{t.name}</div>
              <div className="ts-h3" style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>{t.price}</div>
              <ul className="ts-h6" style={{ marginTop: 8, color: "var(--muted)" }}>
                {t.items.map((x, j) => <li key={j} style={{ marginTop: 4 }}>• {x}</li>)}
              </ul>
              <a className="btn" href="#contact" style={{ marginTop: 12 }}>Choose {t.name}</a>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (s.type === "cta") {
    return (
      <section className="panel reveal" style={{ ...styles.card, textAlign: "center" }}>
        <h2 className="ts-h2" style={{ fontWeight: 700 }}>{s.title}</h2>
        <a className="btn" href={s.cta.href} style={{ marginTop: 12 }}>{s.cta.label}</a>
      </section>
    );
  }

  if (s.type === "contact") {
    return (
      <section id="contact" className="panel reveal" style={styles.card}>
        <h2 className="ts-h2" style={{ fontWeight: 700 }}>{s.title}</h2>
        <div className="ts-h6" style={{ marginTop: 8 }}>
          Email: <a href="mailto:contact@citeks.net" style={{ color: "var(--accent)" }}>contact@citeks.net</a>
        </div>
        {!!s.locations?.length && (
          <div className="ts-h6" style={{ marginTop: 4, color: "var(--muted)" }}>
            Locations: {s.locations.join(" · ")}
          </div>
        )}
        <form className="panel" style={{ ...styles.card, padding: 16, marginTop: 12, display: "grid", gap: 12 }}>
          <Input placeholder="Name" />
          <Input placeholder="Email" />
          <Textarea rows={5} placeholder="Message" />
          <button className="btn" type="button">Send</button>
        </form>
      </section>
    );
  }

  return null;
}

function Checklist({ checks }) {
  return (
    <div className="panel" style={{ ...styles.card, padding: 12 }}>
      <div className="ts-h6" style={{ fontWeight: 700, marginBottom: 6 }}>Checklist</div>
      <ul className="ts-h6" style={{ margin: 0, paddingLeft: 18 }}>
        {checks.map((c) => (
          <li key={c.key} style={{ marginTop: 6 }}>
            <span style={{ color: c.pass ? "green" : "crimson", fontWeight: 600 }}>
              {c.pass ? "✓" : "•"}
            </span>{" "}
            {c.label}
            {"meta" in c ? <span style={{ color: "var(--muted)" }}> — {c.meta}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Export: standalone HTML ----
function renderStandaloneHTML(dsl) {
  // Keep it simple: inline same CSS and minimal JS for reveal
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(dsl.meta.brand.name)}</title>
<style>${baseCss}</style>
</head>
<body>
<header class="panel site" style="padding:12px 16px; display:flex; align-items:center; justify-content:space-between; border-radius:16px;">
  <div class="ts-h6" style="font-weight:600">${escapeHtml(dsl.meta.brand.name)}</div>
  <nav class="ts-h6"><a href="#services">Services</a><a href="#pricing" style="margin-left:16px">Pricing</a><a href="#contact" style="margin-left:16px">Contact</a></nav>
</header>
<main id="app"></main>
<footer class="panel site" style="padding:16px; border-radius:16px; margin-top:16px">
  <div class="ts-h6 tips">© ${new Date().getFullYear()} ${escapeHtml(dsl.meta.brand.name)}</div>
</footer>
<script>
${escapeJs(`
  const app = document.getElementById('app');
  const brand = ${JSON.stringify(dsl.meta.brand)};
  const sections = ${JSON.stringify(dsl.pages[0].sections)};

  const styles = {
    card: "background:#fff; border:1px solid var(--hair); border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.04); padding:16px;",
    scrim: "position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.25))"
  };
  document.documentElement.style.setProperty('--ink', brand.colors.primary);
  document.documentElement.style.setProperty('--accent', brand.colors.accent);
  document.documentElement.style.setProperty('--bg', brand.colors.secondary);

  function sectionEl(s){
    const wrap = document.createElement('section');
    wrap.className = 'panel reveal';
    wrap.style = styles.card;
    if (s.type==='hero'){
      wrap.className = 'hero ar-2-1 reveal';
      wrap.style = styles.card + ';position:relative;overflow:hidden;padding:0';
      const bg = document.createElement('div');
      bg.style = "position:absolute;inset:0;background:" + (s.heroImage ? \`url(\${s.heroImage}) center/cover no-repeat\` : \`linear-gradient(120deg, \${brand.colors.primary}, \${brand.colors.accent})\`) + ";transform:scale(1.02)";
      const scr = document.createElement('div'); scr.style = styles.scrim;
      const copy = document.createElement('div'); copy.style = "position:relative;color:#fff;padding:24px;max-width:720px";
      if (s.badge){ const b=document.createElement('div'); b.className='badge'; b.textContent=s.badge; copy.appendChild(b); }
      const h1 = document.createElement('h1'); h1.className='ts-h1'; h1.style='font-weight:700;margin-top:8px'; h1.textContent=s.title;
      const p = document.createElement('p'); p.className='ts-h6'; p.style='margin-top:8px;color:rgba(255,255,255,.88)'; p.textContent=s.subtitle;
      const ctas = document.createElement('div'); ctas.style='display:flex;gap:12px;margin-top:16px';
      if(s.primaryCta){ const a=document.createElement('a'); a.className='btn'; a.href=s.primaryCta.href; a.textContent=s.primaryCta.label; ctas.appendChild(a); }
      if(s.secondaryCta){ const a=document.createElement('a'); a.className='btn sec'; a.href=s.secondaryCta.href; a.textContent=s.secondaryCta.label; ctas.appendChild(a); }
      copy.append(h1,p,ctas);
      wrap.append(bg,scr,copy);
      return wrap;
    }
    if (s.type==='value' || s.type==='services'){
      const h2 = document.createElement('h2'); h2.className='ts-h2'; h2.style='font-weight:700'; h2.textContent=s.title;
      const grid = document.createElement('div'); grid.style='display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px';
      (s.items||[]).forEach(it=>{
        const card=document.createElement('div'); card.style=styles.card;
        const t=document.createElement('div'); t.className='ts-h5'; t.style='font-weight:600'; t.textContent=it.title;
        const tx=document.createElement('div'); tx.className='ts-h6'; tx.style='color:var(--muted);margin-top:4px'; tx.textContent=it.text;
        card.append(t,tx); grid.appendChild(card);
      });
      wrap.append(h2,grid); return wrap;
    }
    if (s.type==='proof'){
      const h2=document.createElement('h2'); h2.className='ts-h2'; h2.style='font-weight:700'; h2.textContent='Proof';
      wrap.append(h2);
      if ((s.logos||[]).length){
        const logos=document.createElement('div'); logos.style='display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-top:12px';
        s.logos.forEach(l=>{ const chip=document.createElement('div'); chip.className='logo-chip'; chip.textContent=l; logos.appendChild(chip); });
        wrap.append(logos);
      }
      if ((s.testimonials||[]).length){
        const sep=document.createElement('div'); sep.className='thin'; sep.style='margin:12px 0'; wrap.append(sep);
        const grid=document.createElement('div'); grid.style='display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))';
        s.testimonials.forEach(t=>{ const card=document.createElement('div'); card.style=styles.card;
          const q=document.createElement('div'); q.className='ts-h6'; q.style='font-style:italic'; q.textContent='“'+t.quote+'”';
          const a=document.createElement('div'); a.className='ts-h6'; a.style='margin-top:8px;color:var(--muted)'; a.textContent=t.author||'';
          card.append(q,a); grid.appendChild(card);
        });
        wrap.append(grid);
      }
      if ((s.metrics||[]).length){
        const sep2=document.createElement('div'); sep2.className='thin'; sep2.style='margin:12px 0'; wrap.append(sep2);
        const grid2=document.createElement('div'); grid2.style='display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))';
        s.metrics.forEach(m=>{ const card=document.createElement('div'); card.style=styles.card;
          const v=document.createElement('div'); v.className='ts-h3'; v.style='color:var(--accent);font-weight:700'; v.textContent=m.value;
          const lb=document.createElement('div'); lb.className='ts-h6'; lb.style='color:var(--muted)'; lb.textContent=m.label;
          card.append(v,lb); grid2.appendChild(card);
        });
        wrap.append(grid2);
      }
      return wrap;
    }
    if (s.type==='pricing'){
      const h2=document.createElement('h2'); h2.className='ts-h2'; h2.style='font-weight:700'; h2.textContent=s.title;
      const note=document.createElement('p'); note.className='ts-h6'; note.style='color:var(--muted)'; note.textContent=s.note||'';
      const grid=document.createElement('div'); grid.style='display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px';
      s.tiers.forEach(t=>{ const card=document.createElement('div'); card.style=styles.card;
        const nm=document.createElement('div'); nm.className='ts-h5'; nm.style='font-weight:600'; nm.textContent=t.name;
        const pr=document.createElement('div'); pr.className='ts-h3'; pr.style='color:var(--accent);font-weight:700;margin-top:4px'; pr.textContent=t.price;
        const ul=document.createElement('ul'); ul.className='ts-h6'; ul.style='margin-top:8px;color:var(--muted)';
        t.items.forEach(x=>{ const li=document.createElement('li'); li.style='margin-top:4px'; li.textContent='• '+x; ul.appendChild(li); });
        const a=document.createElement('a'); a.className='btn'; a.href='#contact'; a.style='margin-top:12px'; a.textContent='Choose '+t.name;
        card.append(nm,pr,ul,a); grid.appendChild(card);
      });
      wrap.append(h2,note,grid); return wrap;
    }
    if (s.type==='cta'){
      const h2=document.createElement('h2'); h2.className='ts-h2'; h2.style='font-weight:700'; h2.textContent=s.title;
      const a=document.createElement('a'); a.className='btn'; a.href=s.cta.href; a.style='margin-top:12px'; a.textContent=s.cta.label;
      wrap.style.textAlign='center'; wrap.append(h2,a); return wrap;
    }
    if (s.type==='contact'){
      const h2=document.createElement('h2'); h2.className='ts-h2'; h2.style='font-weight:700'; h2.textContent=s.title;
      const em=document.createElement('div'); em.className='ts-h6'; em.style='margin-top:8px'; em.innerHTML='Email: <a href="mailto:contact@citeks.net" style="color:var(--accent)">contact@citeks.net</a>';
      const wrap2=document.createElement('div'); wrap2.append(h2,em);
      if ((s.locations||[]).length){ const loc=document.createElement('div'); loc.className='ts-h6'; loc.style='margin-top:4px;color:var(--muted)'; loc.textContent='Locations: '+s.locations.join(' · '); wrap2.append(loc); }
      const form=document.createElement('form'); form.className='panel'; form.style='${styles.card};padding:16px;margin-top:12px;display:grid;gap:12px';
      form.innerHTML='<input class="input" placeholder="Name"/><input class="input" placeholder="Email"/><textarea rows="5" class="input" placeholder="Message"></textarea><button class="btn" type="button">Send</button>';
      wrap.append(wrap2); wrap.append(form); return wrap;
    }
    return wrap;
  }

  sections.forEach(s => app.appendChild(sectionEl(s)));

  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:0.25});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
`)}</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function escapeJs(s) {
  return s.replace(/<\/script>/gi, "<\\/script>");
}

// ---- Styles ----
const baseCss = `
:root{
  --bg:#f7f7f7; --panel:#ffffff; --ink:#0f172a; --muted:#475569; --hair:#e5e7eb; --accent:#0ea5e9;
  --p:16px; --h6:18px; --h5:20px; --h4:25px; --h3:31.25px; --h2:39.06px; --h1:48.83px;
}
*{box-sizing:border-box}
html,body,#root{height:100%}
body{background:var(--bg); color:var(--ink); font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial}
.panel{background:#fff; border:1px solid var(--hair); border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.04)}
.btn{display:inline-flex; align-items:center; gap:8px; background:var(--accent); color:#fff; padding:10px 14px; border-radius:999px; text-decoration:none; border:none; cursor:pointer}
.btn.sec{background:#0f172a;}
.ts-p{font-size:var(--p); line-height:1.5}
.ts-h6{font-size:var(--h6); line-height:1.3; letter-spacing:-0.005em}
.ts-h5{font-size:var(--h5); line-height:1.3; letter-spacing:-0.01em}
.ts-h4{font-size:var(--h4); line-height:1.3; letter-spacing:-0.012em}
.ts-h3{font-size:var(--h3); line-height:1.2; letter-spacing:-0.015em}
.ts-h2{font-size:var(--h2); line-height:1.1; letter-spacing:-0.018em}
.ts-h1{font-size:var(--h1); line-height:1.0; letter-spacing:-0.02em}
.thin{border-top:1px solid var(--hair)}
.hero{position:relative; overflow:hidden; border-radius:16px}
.ar-2-1{aspect-ratio:2/1}
.hero-scrim{position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.25))}
.reveal{opacity:0; transform:translateY(12px); transition:opacity .45s ease, transform .45s ease}
.reveal.visible{opacity:1; transform:none}
.logo-chip{display:inline-block; padding:10px 12px; border:1px solid var(--hair); border-radius:12px; text-align:center}
header.site, footer.site{padding:12px 16px; display:flex; align-items:center; justify-content:space-between; border-radius:16px}
`;

const styles = {
  page: {
    display: "grid",
    gridTemplateColumns: "minmax(340px, 520px) 1fr",
    gap: 16,
    padding: 16,
    maxWidth: 1440,
    margin: "0 auto"
  },
  sidebar: {
    background: "var(--panel)",
    border: "1px solid var(--hair)",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.04)",
    padding: 16,
    alignSelf: "start"
  },
  sectionHeader: {},
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  preview: { display: "grid", gap: 16, alignContent: "start" },
  card: {
    background: "#fff",
    border: "1px solid var(--hair)",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.04)",
    padding: 16
  },
  header: { padding: 12, borderRadius: 16 },
  footer: { padding: 16, borderRadius: 16 },
  scrim: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.25))" }
};
