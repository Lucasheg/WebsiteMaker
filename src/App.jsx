import React, { useEffect, useMemo, useState } from "react";

/**
 * CITEKS Website Maker (React, single-file)
 * - Left wizard (6 steps) with minimal inputs
 * - Archetype picker (Editorial, Boutique Luxury, Clinical, Modern Tech)
 * - Motion (Calm/Balanced/Kinetic), Density (Airy/Standard/Compact)
 * - Deterministic engine (rules, no AI)
 * - Guardrails (contrast, copy-length, proof, hero-asset gate)
 * - Decision Log + Checklist
 * - Blueprint toggle for structure view
 * - Export HTML (static, deterministic)
 *
 * Keep this file self-contained to stay beginner-friendly.
 */

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

/* ------------------------ RULES & ENGINE ------------------------ */

const ARCHETYPES = {
  editorial: {
    label: "Editorial",
    needsHeroImage: false,
    heroVariant: "type-forward",
    description: "Type-forward, generous whitespace, restrained motion.",
    tone: "formal",
  },
  boutique: {
    label: "Boutique Luxury",
    needsHeroImage: true,
    heroVariant: "image-forward",
    description: "Subtle elegance, high contrast, image-led hero.",
    tone: "refined",
  },
  clinical: {
    label: "Clinical",
    needsHeroImage: false,
    heroVariant: "type-forward",
    description: "Clean lines, light grays, thin rules, clarity first.",
    tone: "precise",
  },
  modern: {
    label: "Modern Tech",
    needsHeroImage: true,
    heroVariant: "image-or-gradient",
    description: "Grid cards, light gradients, crisp CTAs.",
    tone: "neutral",
  },
};

const MOTION_PACKS = ["Calm", "Balanced", "Kinetic"];
const DENSITY = ["Airy", "Standard", "Compact"];

const INDUSTRY_DEFAULTS = {
  law: {
    ctas: { primary: "Book consultation", secondary: "Download brochure" },
    sections: [
      "hero",
      "value",
      "services",
      "proof",
      "pricing",
      "cta",
      "contact",
    ],
    services: [
      { title: "M&A & Transactions", text: "Deal structuring and closing." },
      {
        title: "Commercial Contracts",
        text: "Clear agreements that move business forward.",
      },
      { title: "Data & Compliance", text: "Practical privacy guidance." },
    ],
  },
  clinic: {
    ctas: { primary: "Book appointment", secondary: "Call clinic" },
    sections: ["hero", "value", "services", "proof", "cta", "contact"],
    services: [
      { title: "Primary Care", text: "Accessible care with fast booking." },
      { title: "Specialists", text: "Targeted expertise and referrals." },
      { title: "Diagnostics", text: "Modern equipment and guidance." },
    ],
  },
  gym: {
    ctas: { primary: "Start trial", secondary: "View programs" },
    sections: ["hero", "value", "services", "proof", "pricing", "cta", "contact"],
    services: [
      { title: "Elite Coaching", text: "Rapid, accountable progress." },
      { title: "Strength Builder", text: "Progressive overload program." },
      { title: "Conditioning Lab", text: "Cardio and mobility training." },
    ],
  },
  saas: {
    ctas: { primary: "Start demo", secondary: "Talk to sales" },
    sections: [
      "hero",
      "value",
      "services",
      "proof",
      "pricing",
      "cta",
      "contact",
    ],
    services: [
      { title: "Onboarding", text: "Reduce time-to-value." },
      { title: "Pricing Arch.", text: "Plans that convert." },
      { title: "Docs & SEO", text: "Compounding organic growth." },
    ],
  },
};

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function wcagContrast(hex1, hex2) {
  const l = (hex) => {
    const [r, g, b] = hexToRgb(hex);
    const [R, G, B] = [r, g, b].map((v) => {
      const srgb = v / 255;
      return srgb <= 0.03928
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const L1 = l(hex1);
  const L2 = l(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c)=>c+c).join("") : h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function wordCount(s) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

function parseLines(s) {
  return (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseLogos(s) {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseTestimonials(s) {
  return parseLines(s)
    .map((l) => {
      const [q, a] = l.split("—").map((x) => x.trim());
      if (!q) return null;
      return { quote: q.replace(/^["“”]+|["“”]+$/g, ""), author: a || "" };
    })
    .filter(Boolean);
}

function parseMetrics(s) {
  return parseLines(s)
    .map((l) => {
      const [label, value] = l.split(":").map((x) => x.trim());
      if (!label || !value) return null;
      return { label, value };
    })
    .filter(Boolean);
}

/** brief -> DSL (deterministic) */
function generateDSL(brief) {
  const industry = INDUSTRY_DEFAULTS[brief.industry] || INDUSTRY_DEFAULTS.saas;
  const arche = ARCHETYPES[brief.archetype] || ARCHETYPES.editorial;
  const seed = hashSeed(brief.companyName || "acme");

  // CTA set
  const ctas = industry.ctas;
  const primaryCta = brief.goal || ctas.primary;

  // Services from industry rules
  const services = industry.services;

  // Sections order (can be swapped by seed to vary card layout)
  const sections = [...industry.sections];

  const dsl = {
    meta: {
      brand: {
        name: brief.companyName || "Your company",
        tagline:
          brief.tagline ||
          "We build websites that pay for themselves.",
        colors: {
          ink: brief.ink || "#0F172A",
          neutral: brief.neutral || "#F7F7F7",
          accent: brief.accent || "#0EA5E9",
        },
        locations: parseLines(brief.locations).join(" · "),
      },
      archetype: brief.archetype,
      motion: brief.motion,
      density: brief.density,
      seed,
    },
    sections: [],
  };

  // HERO
  dsl.sections.push({
    type: "hero",
    variant: arche.heroVariant,
    needsHeroImage: arche.needsHeroImage,
    title: brief.companyName || "Your company",
    subtitle: brief.tagline || "",
    badge: parseLines(brief.locations).join(" · "),
    heroImage: brief.heroImage || "",
    primaryCta: { label: primaryCta, href: "#contact" },
    secondaryCta: { label: industry.ctas.secondary, href: "#contact" },
  });

  // VALUE (differentiators)
  const diffs = parseLines(brief.differentiators)
    .slice(0, 6)
    .map((t) => ({ title: t, text: "Baked into our day-to-day." }));
  if (diffs.length) {
    dsl.sections.push({ type: "value", title: "What you get with us", items: diffs });
  }

  // SERVICES
  dsl.sections.push({
    type: "services",
    title: "Services",
    items: services,
  });

  // PROOF
  const logos = parseLogos(brief.logos);
  const testimonials = parseTestimonials(brief.testimonials);
  const metrics = parseMetrics(brief.metrics);
  if (logos.length || testimonials.length || metrics.length) {
    dsl.sections.push({
      type: "proof",
      logos,
      testimonials,
      metrics,
    });
  }

  // PRICING (always available here as reference)
  dsl.sections.push({
    type: "pricing",
    title: "Packages",
    note: "Transparent estimates. Fixed-fee options available.",
    tiers: [
      { name: "Starter", price: "$900", items: ["2–3 pages", "Responsive", "Lead form"] },
      { name: "Growth", price: "$2,300", items: ["5–7 pages", "SEO + schema", "Booking & Maps", "Integrations"] },
      {
        name: "Scale",
        price: "$7,000",
        items: ["10+ pages", "Strategy + funnel", "Advanced SEO/analytics", "CRM / e-com"],
      },
    ],
  });

  // CTA + CONTACT
  dsl.sections.push({
    type: "cta",
    title: "Ready to move faster?",
    cta: { label: primaryCta, href: "#contact" },
  });
  dsl.sections.push({
    type: "contact",
    title: "Contact",
    email: "contact@citeks.net",
    locations: parseLines(brief.locations),
  });

  // seeded variant (example: reverse value cards if seed mod 2)
  dsl.variant = seed % 2 === 0 ? "A" : "B";

  return dsl;
}

/* ------------------------ GUARDRAILS (CHECKS) ------------------------ */

function runChecks(brief, dsl) {
  const checks = [];

  // 1) Contrast checks (ink vs neutral, accent vs neutral)
  const cInk = wcagContrast(brief.ink || "#0F172A", brief.neutral || "#F7F7F7");
  const cAccent = wcagContrast(brief.accent || "#0EA5E9", brief.neutral || "#F7F7F7");
  checks.push({
    id: "contrast-ink",
    label: `Body contrast (ink vs neutral) ≥ 4.5:1`,
    ok: cInk >= 4.5,
    hint: `Current: ${cInk.toFixed(2)}:1`,
    must: true,
  });
  checks.push({
    id: "contrast-accent",
    label: `Accent contrast (accent vs neutral) ≥ 3:1`,
    ok: cAccent >= 3.0,
    hint: `Current: ${cAccent.toFixed(2)}:1`,
    must: true,
  });

  // 2) Hero copy length (h1 ≤ 9 words, subtitle 8–24 words)
  const h1w = wordCount(brief.companyName || "");
  const subw = wordCount(brief.tagline || "");
  checks.push({
    id: "copy-h1",
    label: "Hero headline ≤ 9 words",
    ok: h1w > 0 && h1w <= 9,
    hint: `Current: ${h1w} words`,
    must: true,
  });
  checks.push({
    id: "copy-sub",
    label: "Hero subtitle between 8–24 words (or leave empty)",
    ok: subw === 0 || (subw >= 8 && subw <= 24),
    hint: subw ? `Current: ${subw} words` : "Empty is allowed",
    must: false,
  });

  // 3) Proof items ≥ 2 (any mix)
  const logos = parseLogos(brief.logos);
  const testimonials = parseTestimonials(brief.testimonials);
  const metrics = parseMetrics(brief.metrics);
  const proofCount = logos.length + testimonials.length + metrics.length;
  checks.push({
    id: "proof-min",
    label: "At least 2 proof items (logos/testimonials/metrics)",
    ok: proofCount >= 2,
    hint: `Current: ${proofCount}`,
    must: true,
  });

  // 4) Asset gate: if archetype needs hero image
  const arche = ARCHETYPES[brief.archetype] || ARCHETYPES.editorial;
  const needHero = arche.needsHeroImage;
  const hasHero = !!(brief.heroImage && brief.heroImage.trim());
  checks.push({
    id: "hero-asset",
    label: `${arche.label} requires a strong hero image`,
    ok: !needHero || hasHero,
    hint: needHero ? (hasHero ? "Image provided" : "No hero image URL") : "Not required",
    must: needHero, // block export if required
  });

  // 5) Completeness: company & goal present
  checks.push({
    id: "company",
    label: "Company name provided",
    ok: !!(brief.companyName && brief.companyName.trim()),
    hint: brief.companyName ? "OK" : "Missing",
    must: true,
  });
  checks.push({
    id: "goal",
    label: "Primary goal selected",
    ok: !!(brief.goal && brief.goal.trim()),
    hint: brief.goal || "Missing",
    must: true,
  });

  // Overall score
  const mustChecks = checks.filter((c) => c.must);
  const passCount = mustChecks.filter((c) => c.ok).length;
  const completeness = Math.round((passCount / mustChecks.length) * 100);

  return { checks, completeness };
}

/* ------------------------ UI ------------------------ */

export default function App() {
  const [step, setStep] = useState(1);
  const [blueprint, setBlueprint] = useState(false);

  const [brief, setBrief] = useState({
    companyName: "Harbor & Sage Law",
    tagline:
      "Practical counsel for complex transactions with clear fee structures and fast turnaround.",
    locations: "Oslo\nNew York\nAmsterdam",
    industry: "law",
    goal: "Book consultation",

    // brand
    ink: "#0F172A",
    neutral: "#F7F7F7",
    accent: "#0EA5E9",
    heroImage: "",

    // proof & content
    differentiators: "Clear fee structures\nEx in-house counsel bench\nDeal-first, not theory-first",
    testimonials: "“They guided a complex cross-border deal with clarity.” — COO, Meridian",
    logos: "Aldin Capital, Meridian Partners, Koto Energy",
    metrics: "Deals advised: 220\nAverage close time: 14 days",

    // system
    archetype: "editorial",
    motion: "Calm",
    density: "Standard",
  });

  const dsl = useMemo(() => generateDSL(brief), [brief]);
  const { checks, completeness } = useMemo(() => runChecks(brief, dsl), [brief, dsl]);

  const hardBlocks = checks.filter((c) => c.must && !c.ok);
  const canExport = hardBlocks.length === 0;

  const decisionLog = useMemo(() => {
    const arche = ARCHETYPES[brief.archetype];
    const ind = INDUSTRY_DEFAULTS[brief.industry];
    const reasons = [];
    reasons.push(`Archetype: ${arche.label} (${arche.description})`);
    reasons.push(`Industry: ${brief.industry} → CTA: “${ind.ctas.primary}” & section order ${ind.sections.join(" → ")}`);
    if (arche.needsHeroImage) {
      reasons.push(`Hero image required by archetype: ${brief.heroImage ? "provided" : "missing"}`);
    } else {
      reasons.push(`Type-forward hero acceptable (no image required).`);
    }
    const cInk = wcagContrast(brief.ink, brief.neutral).toFixed(2);
    const cAccent = wcagContrast(brief.accent, brief.neutral).toFixed(2);
    reasons.push(`Contrast (ink/neutral): ${cInk}:1, (accent/neutral): ${cAccent}:1`);
    reasons.push(`Motion: ${brief.motion}, Density: ${brief.density}, Variant: ${dsl.variant}`);
    return reasons;
  }, [brief, dsl]);

  useEffect(() => {
    document.title = "CITEKS Maker";
  }, []);

  return (
    <div className="app">
      {/* Inline styles to avoid editing index.css for now */}
      <Style />

      <header className="topbar">
        <div className="brand">CITEKS Maker</div>
        <div className="top-actions">
          <label className="switch">
            <input type="checkbox" checked={blueprint} onChange={(e) => setBlueprint(e.target.checked)} />
            <span>Blueprint</span>
          </label>
          <button
            className={cx("btn", canExport ? "" : "btn-disabled")}
            onClick={() => canExport && exportHtml(brief, dsl)}
            title={canExport ? "Export static HTML" : "Fix checklist items first"}
          >
            Export HTML
          </button>
        </div>
      </header>

      <div className="layout">
        {/* LEFT: Wizard */}
        <aside className="panel left">
          <Progress completeness={completeness} />
          <Steps step={step} setStep={setStep} />

          {step === 1 && (
            <Section title="1) Company & Goal">
              <Text label="Company name" value={brief.companyName} onChange={(v) => setBrief({ ...brief, companyName: v })} />
              <Text label="Tagline (8–24 words works best)" value={brief.tagline} onChange={(v) => setBrief({ ...brief, tagline: v })} />
              <Select
                label="Industry"
                value={brief.industry}
                onChange={(v) => setBrief({ ...brief, industry: v })}
                options={[
                  ["law", "Law"],
                  ["clinic", "Clinic"],
                  ["gym", "Gym"],
                  ["saas", "SaaS"],
                ]}
              />
              <Select
                label="Primary goal"
                value={brief.goal}
                onChange={(v) => setBrief({ ...brief, goal: v })}
                options={[
                  ["Book consultation", "Book consultation"],
                  ["Book appointment", "Book appointment"],
                  ["Start demo", "Start demo"],
                  ["Get quote", "Get quote"],
                ]}
              />
              <Textarea label="Locations (one per line)" value={brief.locations} onChange={(v) => setBrief({ ...brief, locations: v })} rows={3} />
            </Section>
          )}

          {step === 2 && (
            <Section title="2) Brand & Assets">
              <Text label="Accent color" value={brief.accent} onChange={(v) => setBrief({ ...brief, accent: v })} />
              <Text label="Ink (text) color" value={brief.ink} onChange={(v) => setBrief({ ...brief, ink: v })} />
              <Text label="Neutral (background) color" value={brief.neutral} onChange={(v) => setBrief({ ...brief, neutral: v })} />
              <Text label="Hero image URL (optional / required by some archetypes)" value={brief.heroImage} onChange={(v) => setBrief({ ...brief, heroImage: v })} />
            </Section>
          )}

          {step === 3 && (
            <Section title="3) Audience & Proof">
              <Textarea label="Differentiators (one per line)" value={brief.differentiators} onChange={(v) => setBrief({ ...brief, differentiators: v })} rows={4} />
              <Textarea label="Testimonials (quote — author, one per line)" value={brief.testimonials} onChange={(v) => setBrief({ ...brief, testimonials: v })} rows={4} />
              <Text label="Client logos (comma-separated)" value={brief.logos} onChange={(v) => setBrief({ ...brief, logos: v })} />
              <Textarea label="Metrics (Label: Value, one per line)" value={brief.metrics} onChange={(v) => setBrief({ ...brief, metrics: v })} rows={3} />
            </Section>
          )}

          {step === 4 && (
            <Section title="4) Pages & IA">
              <p className="hint">This MVP generates a high-quality single-page flow with sections; we’ll expand to multi-page later.</p>
              <ArchetypePicker
                value={brief.archetype}
                onChange={(v) => setBrief({ ...brief, archetype: v })}
              />
            </Section>
          )}

          {step === 5 && (
            <Section title="5) Motion & Density">
              <Select
                label="Motion"
                value={brief.motion}
                onChange={(v) => setBrief({ ...brief, motion: v })}
                options={MOTION_PACKS.map((m) => [m, m])}
              />
              <Select
                label="Density"
                value={brief.density}
                onChange={(v) => setBrief({ ...brief, density: v })}
                options={DENSITY.map((d) => [d, d])}
              />
              <p className="hint">“Calm” = subtle reveals; “Balanced” adds a few more cues; “Kinetic” applies scrollytelling to hero.</p>
            </Section>
          )}

          {step === 6 && (
            <Section title="6) Review">
              <DecisionLog items={decisionLog} />
              <Checklist checks={checks} />
            </Section>
          )}
        </aside>

        {/* RIGHT: Preview */}
        <main className={cx("panel preview", blueprint && "blueprint")}>
          <Preview dsl={dsl} motion={brief.motion} density={brief.density} />
        </main>
      </div>
    </div>
  );
}

/* ------------------------ Preview Renderer ------------------------ */

function Preview({ dsl, motion, density }) {
  // density → spacing scale
  const space = density === "Compact" ? 8 : density === "Airy" ? 20 : 12;

  const s = dsl.meta.brand.colors;
  const cssVars = {
    "--ink": s.ink,
    "--neutral": s.neutral,
    "--accent": s.accent,
    "--space": `${space}px`,
  };

  return (
    <div className="page" style={cssVars}>
      <div className="container">
        {/* HERO */}
        <Hero sec={dsl.sections.find((x) => x.type === "hero")} brand={dsl.meta.brand} motion={motion} />

        {/* Others in order */}
        {dsl.sections
          .filter((sec) => sec.type !== "hero")
          .map((sec, idx) => {
            if (sec.type === "value") return <Value key={idx} sec={sec} />;
            if (sec.type === "services") return <Services key={idx} sec={sec} />;
            if (sec.type === "proof") return <Proof key={idx} sec={sec} />;
            if (sec.type === "pricing") return <Pricing key={idx} sec={sec} />;
            if (sec.type === "cta") return <CTA key={idx} sec={sec} />;
            if (sec.type === "contact") return <Contact key={idx} sec={sec} />;
            return null;
          })}
      </div>
    </div>
  );
}

function Hero({ sec, brand, motion }) {
  const hasImg = sec.heroImage;
  return (
    <section className={cx("hero", motionClass(motion))}>
      <div
        className={cx("hero-bg", hasImg ? "with-img" : "gradient")}
        style={hasImg ? { backgroundImage: `url(${sec.heroImage})` } : {}}
      />
      <div className="hero-scrim" />
      <div className="hero-copy">
        {sec.badge && <span className="badge">{sec.badge}</span>}
        <h1 className="h1">{sec.title}</h1>
        {sec.subtitle && <p className="sub">{sec.subtitle}</p>}
        <div className="cta-row">
          <a className="btn" href={sec.primaryCta.href}>{sec.primaryCta.label}</a>
          {sec.secondaryCta?.label && <a className="btn outline" href={sec.secondaryCta.href}>{sec.secondaryCta.label}</a>}
        </div>
      </div>
    </section>
  );
}

function Value({ sec }) {
  return (
    <section className="section">
      <h2 className="h2">{"What you get with us"}</h2>
      <div className="grid">
        {sec.items.map((it, i) => (
          <div className="card" key={i}>
            <div className="card-title">{it.title}</div>
            <div className="card-text">{it.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Services({ sec }) {
  return (
    <section className="section">
      <h2 className="h2">{sec.title}</h2>
      <div className="grid">
        {sec.items.map((it, i) => (
          <div className="card" key={i}>
            <div className="card-title">{it.title}</div>
            <div className="card-text">{it.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Proof({ sec }) {
  return (
    <section className="section">
      <h2 className="h2">Proof</h2>
      {!!sec.logos.length && (
        <>
          <div className="logos">
            {sec.logos.map((l, i) => (
              <div key={i} className="logo-chip">{l}</div>
            ))}
          </div>
          <div className="hr" />
        </>
      )}
      {!!sec.testimonials.length && (
        <div className="grid">
          {sec.testimonials.map((t, i) => (
            <div className="card" key={i}>
              <div className="quote">“{t.quote}”</div>
              <div className="muted">{t.author}</div>
            </div>
          ))}
        </div>
      )}
      {!!sec.metrics.length && (
        <>
          <div className="hr" />
          <div className="metrics">
            {sec.metrics.map((m, i) => (
              <div className="metric" key={i}>
                <div className="metric-value">{m.value}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Pricing({ sec }) {
  return (
    <section className="section">
      <h2 className="h2">{sec.title}</h2>
      <p className="muted">{sec.note}</p>
      <div className="grid">
        {sec.tiers.map((t, i) => (
          <div className="card" key={i}>
            <div className="card-title">{t.name}</div>
            <div className="price">{t.price}</div>
            <ul className="list">
              {t.items.map((x, j) => <li key={j}>• {x}</li>)}
            </ul>
            <a className="btn" href="#contact">Choose {t.name}</a>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA({ sec }) {
  return (
    <section className="section center">
      <h2 className="h2">{sec.title}</h2>
      <a className="btn" href={sec.cta.href}>{sec.cta.label}</a>
    </section>
  );
}

function Contact({ sec }) {
  return (
    <section id="contact" className="section">
      <h2 className="h2">{sec.title}</h2>
      <div className="muted" style={{marginTop: 6}}>Email: <a href="mailto:contact@citeks.net">contact@citeks.net</a></div>
      {!!sec.locations?.length && <div className="muted" style={{marginTop: 6}}>Locations: {sec.locations.join(" · ")}</div>}
      <form className="contact-form">
        <input placeholder="Name" />
        <input placeholder="Email" />
        <textarea placeholder="Message" rows={5} />
        <button type="button" className="btn">Send</button>
      </form>
    </section>
  );
}

/* ------------------------ Small UI components ------------------------ */

function Progress({ completeness }) {
  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${completeness}%` }} />
      <div className="progress-label">{completeness}% complete</div>
    </div>
  );
}

function Steps({ step, setStep }) {
  const items = [
    "Company & Goal",
    "Brand & Assets",
    "Audience & Proof",
    "Pages & IA",
    "Motion & Density",
    "Review",
  ];
  return (
    <div className="steps">
      {items.map((t, i) => (
        <button key={t} className={cx("step", step === i + 1 && "active")} onClick={() => setStep(i + 1)}>
          <span className="step-index">{i + 1}</span> {t}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="section-panel">
      <div className="panel-title">{title}</div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

function Text({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 4, placeholder }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}

function ArchetypePicker({ value, onChange }) {
  return (
    <div className="archetypes">
      {Object.entries(ARCHETYPES).map(([key, a]) => (
        <button
          key={key}
          className={cx("arch", value === key && "arch-active")}
          onClick={() => onChange(key)}
          type="button"
        >
          <div className="arch-title">{a.label}</div>
          <div className="arch-text">{a.description}</div>
          <div className="arch-meta">{a.needsHeroImage ? "Needs hero image" : "Type-forward ok"}</div>
        </button>
      ))}
    </div>
  );
}

function DecisionLog({ items }) {
  return (
    <div className="decision-log">
      <div className="panel-subtitle">Decision Log</div>
      <ul>
        {items.map((x, i) => <li key={i}>• {x}</li>)}
      </ul>
    </div>
  );
}

function Checklist({ checks }) {
  return (
    <div className="checklist">
      <div className="panel-subtitle">Checklist</div>
      <ul>
        {checks.map((c) => (
          <li key={c.id} className={c.ok ? "ok" : c.must ? "bad" : "warn"}>
            <b>{c.ok ? "✓" : c.must ? "✕" : "!"}</b> {c.label} <span className="hint">({c.hint})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function motionClass(m) {
  if (m === "Calm") return "mv-calm";
  if (m === "Balanced") return "mv-balanced";
  return "mv-kinetic";
}

/* ------------------------ Export HTML ------------------------ */

function exportHtml(brief, dsl) {
  const tokens = dsl.meta.brand.colors;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(dsl.meta.brand.name)}</title>
<style>
  :root { --ink:${tokens.ink}; --neutral:${tokens.neutral}; --accent:${tokens.accent}; --space:12px; }
  body{margin:0;background:var(--neutral);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial}
  .container{max-width:1200px;margin:0 auto;padding:0 16px}
  .hero{position:relative;aspect-ratio:2/1;border-radius:16px;overflow:hidden;margin:16px 0}
  .hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.02);}
  .hero-bg.gradient{background:linear-gradient(120deg, var(--ink), var(--accent));}
  .hero-scrim{position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,.38), rgba(0,0,0,.25));}
  .hero-copy{position:relative;color:#fff;padding:24px;max-width:760px}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.15);font-size:14px}
  .h1{font-size:48.83px;line-height:1;letter-spacing:-.02em;margin:8px 0}
  .sub{font-size:18px;line-height:1.4;opacity:.9;margin:8px 0}
  .cta-row{display:flex;gap:12px;margin-top:12px}
  .btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;padding:10px 14px;border-radius:999px;text-decoration:none;border:none}
  .btn.outline{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)}
  .section{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin:16px 0}
  .h2{font-size:39.06px;letter-spacing:-.018em;margin:0 0 8px 0}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#fff}
  .card-title{font-size:20px;font-weight:600}
  .card-text{color:#475569;margin-top:4px}
  .logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
  .logo-chip{padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;text-align:center}
  .hr{border-top:1px solid #e5e7eb;margin:12px 0}
  .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  .metric{border:1px solid #e5e7eb;border-radius:12px;padding:16px}
  .metric-value{font-size:31.25px;color:var(--accent);font-weight:700}
  .metric-label{color:#475569}
  .price{font-size:31.25px;color:var(--accent);font-weight:700;margin:6px 0}
  .list{color:#475569;padding-left:0;list-style:none}
  .center{text-align:center}
  .contact-form{display:grid;gap:8px;margin-top:12px}
  .contact-form input, .contact-form textarea{padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px}
</style>
</head>
<body>
  <div class="container">
    ${renderStatic(dsl)}
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = sanitizeFilename(`${dsl.meta.brand.name}-site.html`);
  a.click();
  URL.revokeObjectURL(a.href);
}

function sanitizeFilename(s) {
  return (s || "site").replace(/[^\w\-]+/g, "_").slice(0, 60);
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function renderStatic(dsl) {
  // minimal static rendering: reuse the same order used in live preview
  const sec = dsl.sections.find((x) => x.type === "hero");
  const heroBg = sec.heroImage ? `style="background-image:url('${escapeHtml(sec.heroImage)}')"` : `class="hero-bg gradient"`;
  return `
  <section class="hero">
    <div class="hero-bg" ${sec.heroImage ? heroBg : ""}></div>
    <div class="hero-scrim"></div>
    <div class="hero-copy">
      ${sec.badge ? `<span class="badge">${escapeHtml(sec.badge)}</span>` : ""}
      <h1 class="h1">${escapeHtml(sec.title)}</h1>
      ${sec.subtitle ? `<p class="sub">${escapeHtml(sec.subtitle)}</p>` : ""}
      <div class="cta-row">
        <a class="btn" href="${escapeHtml(sec.primaryCta.href)}">${escapeHtml(sec.primaryCta.label)}</a>
        ${sec.secondaryCta?.label ? `<a class="btn outline" href="${escapeHtml(sec.secondaryCta.href)}">${escapeHtml(sec.secondaryCta.label)}</a>` : ""}
      </div>
    </div>
  </section>
  ${dsl.sections
    .filter((x) => x.type !== "hero")
    .map((x) => {
      if (x.type === "value") {
        return `
        <section class="section">
          <h2 class="h2">What you get with us</h2>
          <div class="grid">
            ${x.items
              .map(
                (it) => `<div class="card">
                  <div class="card-title">${escapeHtml(it.title)}</div>
                  <div class="card-text">Built into our day-to-day.</div>
                </div>`
              )
              .join("")}
          </div>
        </section>`;
      }
      if (x.type === "services") {
        return `
        <section class="section">
          <h2 class="h2">${escapeHtml(x.title)}</h2>
          <div class="grid">
            ${x.items
              .map(
                (it) => `<div class="card">
                  <div class="card-title">${escapeHtml(it.title)}</div>
                  <div class="card-text">${escapeHtml(it.text)}</div>
                </div>`
              )
              .join("")}
          </div>
        </section>`;
      }
      if (x.type === "proof") {
        return `
        <section class="section">
          <h2 class="h2">Proof</h2>
          ${x.logos.length ? `<div class="logos">${x.logos.map((l) => `<div class="logo-chip">${escapeHtml(l)}</div>`).join("")}</div><div class="hr"></div>` : ""}
          ${x.testimonials.length ? `<div class="grid">
            ${x.testimonials
              .map(
                (t) => `<div class="card">
                  <div class="card-text"><em>“${escapeHtml(t.quote)}”</em></div>
                  <div class="card-text" style="color:#475569;margin-top:6px">${escapeHtml(t.author || "")}</div>
                </div>`
              )
              .join("")}
          </div>` : ""}
          ${x.metrics.length ? `<div class="hr"></div><div class="metrics">
            ${x.metrics
              .map(
                (m) => `<div class="metric">
                  <div class="metric-value">${escapeHtml(m.value)}</div>
                  <div class="metric-label">${escapeHtml(m.label)}</div>
                </div>`
              )
              .join("")}
          </div>` : ""}
        </section>`;
      }
      if (x.type === "pricing") {
        return `
        <section class="section">
          <h2 class="h2">${escapeHtml(x.title)}</h2>
          <p class="card-text" style="margin-top:6px">Transparent estimates. Fixed-fee options available.</p>
          <div class="grid">
            ${x.tiers
              .map(
                (t) => `<div class="card">
                  <div class="card-title">${escapeHtml(t.name)}</div>
                  <div class="price">${escapeHtml(t.price)}</div>
                  <ul class="list">${t.items.map((it) => `<li>• ${escapeHtml(it)}</li>`).join("")}</ul>
                  <a class="btn" href="#contact">Choose ${escapeHtml(t.name)}</a>
                </div>`
              )
              .join("")}
          </div>
        </section>`;
      }
      if (x.type === "cta") {
        return `
        <section class="section center">
          <h2 class="h2">${escapeHtml(x.title)}</h2>
          <a class="btn" href="${escapeHtml(x.cta.href)}">${escapeHtml(x.cta.label)}</a>
        </section>`;
      }
      if (x.type === "contact") {
        return `
        <section class="section">
          <h2 class="h2">${escapeHtml(x.title)}</h2>
          <div class="card-text" style="margin-top:6px">Email: <a href="mailto:contact@citeks.net">contact@citeks.net</a></div>
          ${x.locations?.length ? `<div class="card-text" style="color:#475569;margin-top:6px">Locations: ${x.locations.join(" · ")}</div>` : ""}
          <form class="contact-form">
            <input placeholder="Name" />
            <input placeholder="Email" />
            <textarea placeholder="Message" rows="5"></textarea>
            <button type="button" class="btn">Send</button>
          </form>
        </section>`;
      }
      return "";
    })
    .join("")}
  `;
}

/* ------------------------ Styles (inline for now) ------------------------ */

function Style() {
  return (
    <style>{`
:root{
  --ink:#0F172A;
  --neutral:#F7F7F7;
  --accent:#0EA5E9;
  --hair:#e5e7eb;
  --p:16px; --h6:18px; --h5:20px; --h4:25px; --h3:31.25px; --h2:39.06px; --h1:48.83px;
}
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;background:var(--neutral);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial}
a{color:var(--accent);text-decoration:none}

.app{display:flex;flex-direction:column;height:100%}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--hair);background:#fff}
.brand{font-weight:700}
.top-actions{display:flex;gap:8px;align-items:center}
.switch{display:flex;gap:8px;align-items:center;font-size:14px;color:#475569}

.layout{display:grid;grid-template-columns:320px 1fr;gap:16px;padding:16px;height:100%;overflow:hidden}
.panel{background:#fff;border:1px solid var(--hair);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.04)}
.left{padding:12px;overflow:auto}
.preview{padding:0;overflow:auto}

.progress{position:relative;height:8px;background:#f1f5f9;border-radius:999px;margin:6px 0 10px 0}
.progress-bar{height:8px;background:var(--accent);border-radius:999px;transition:width .3s ease}
.progress-label{font-size:12px;color:#475569;margin-top:6px}

.steps{display:flex;flex-direction:column;gap:6px;margin:10px 0}
.step{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--hair);background:#fff;cursor:pointer;text-align:left}
.step.active{border-color:var(--accent);box-shadow:0 0 0 3px rgba(14,165,233,.15)}
.step-index{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:#f1f5f9;font-size:12px}

.section-panel{border:1px solid var(--hair);border-radius:12px;padding:10px;margin:8px 0}
.panel-title{font-weight:700;margin-bottom:6px}
.panel-subtitle{font-weight:600;margin:6px 0}
.panel-body{display:grid;gap:8px}

.field{display:flex;flex-direction:column;gap:6px}
.field .label{font-size:14px;color:#475569}
.field input,.field textarea,.field select{padding:10px 12px;border:1px solid var(--hair);border-radius:12px;background:#fff}

.btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;padding:10px 14px;border-radius:999px;border:none;cursor:pointer}
.btn-disabled{opacity:.5;cursor:not-allowed}

.archetypes{display:grid;grid-template-columns:1fr;gap:8px}
.arch{display:flex;flex-direction:column;gap:6px;border:1px solid var(--hair);border-radius:12px;padding:12px;background:#fff;cursor:pointer;text-align:left}
.arch-active{outline:3px solid rgba(14,165,233,.15);border-color:var(--accent)}
.arch-title{font-weight:600}
.arch-text{color:#475569}
.arch-meta{font-size:12px;color:#64748b}

.decision-log ul,.checklist ul{margin:8px 0 0 0;padding:0;list-style:none}
.checklist li{margin:4px 0}
.checklist li.ok{color:#166534}
.checklist li.warn{color:#92400e}
.checklist li.bad{color:#991b1b}
.checklist .hint{color:#64748b;margin-left:6px}

.page{padding:12px}
.container{max-width:1200px;margin:0 auto;padding:0 16px}
.h1{font-size:var(--h1);letter-spacing:-.02em;line-height:1}
.h2{font-size:var(--h2);letter-spacing:-.018em;line-height:1.1;margin:0 0 8px}
.muted{color:#475569}

.hero{position:relative;aspect-ratio:2/1;border-radius:16px;overflow:hidden;margin:12px 0}
.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.02)}
.hero-bg.gradient{background:linear-gradient(120deg, var(--ink), var(--accent))}
.hero-scrim{position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,.38), rgba(0,0,0,.25))}
.hero-copy{position:relative;color:#fff;padding:24px;max-width:760px}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.15);font-size:14px}

.section{background:#fff;border:1px solid var(--hair);border-radius:16px;padding:16px;margin:12px 0}
.center{text-align:center}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.card{border:1px solid var(--hair);border-radius:12px;padding:16px;background:#fff}
.card-title{font-weight:600}
.card-text{color:#475569}
.price{font-size:31.25px;color:var(--accent);font-weight:700;margin:6px 0}
.list{list-style:none;padding-left:0;color:#475569}

.logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.logo-chip{padding:10px 12px;border:1px solid var(--hair);border-radius:12px;text-align:center}

.hr{border-top:1px solid var(--hair);margin:12px 0}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.metric{border:1px solid var(--hair);border-radius:12px;padding:16px}
.metric-value{font-size:31.25px;color:var(--accent);font-weight:700}
.metric-label{color:#475569}

/* Motion variants */
.mv-calm .section, .mv-calm .card, .mv-calm .hero-copy { animation: rise .6s ease both; }
.mv-balanced .section, .mv-balanced .card { animation: rise .5s ease both; }
.mv-kinetic .hero .hero-copy{ animation: slideIn .5s ease both; }
@keyframes rise { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
@keyframes slideIn { from { opacity:0; transform: translateX(-8px); } to { opacity:1; transform:none; } }

/* Blueprint overlay */
.blueprint *{ background-image:none !important; box-shadow:none !important; }
.blueprint .hero, .blueprint .section, .blueprint .card, .blueprint .logo-chip, .blueprint .metric { outline:1px dashed rgba(15,23,42,.3) }
`}</style>
  );
}
