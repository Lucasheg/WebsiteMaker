import React, { useMemo, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * CITEKS Website Maker (MVP)
 * - Paste a BRIEF (JSON) on the left
 * - Click Generate -> Maker builds a DSL (layout plan) with sections chosen by industry + goals
 * - Renderer displays a live, animated preview deterministically (no LLM needed)
 *
 * Later: plug an LLM to improve copy INSIDE the same DSL (no code gen, no hallucinations).
 */

/* -------------------- 1) BRIEF SHAPE (what you paste) -------------------- */
const SAMPLE_BRIEF = {
  company: {
    name: "Harbor & Sage Law",
    tagline: "Practical counsel for complex transactions",
    locations: ["Oslo", "New York"],
    industry: "law",
    brand: {
      adjectives: ["editorial", "trust", "clarity"],
      primary: "#0F172A",
      secondary: "#F7F7F7",
      accent: "#0EA5E9",
      heroImage: "/hero/waterfall.jpg" // can be null; image chosen by heuristics
    }
  },
  goals: {
    primary: "Consultation",
    secondary: ["Download brochure"]
  },
  audience: [
    { role: "CFO", pain: "Risk & cost of deals", desired: "Predictability", objections: "Time-to-value" },
    { role: "Founder", pain: "Legal uncertainty", desired: "Clear path", objections: "Price" }
  ],
  differentiators: [
    "Deal-first counsel with clear fee structures",
    "Bench of ex-inhouse lawyers"
  ],
  pages: {
    mustHave: ["home","services","industries","about","pricing","contact"],
    niceToHave: ["case-studies"]
  },
  proof: {
    logos: ["Aldin Capital","Meridian Partners","Koto Energy"],
    testimonials: [{quote:"They guided a complex cross-border deal with clarity.", author:"COO, Meridian"}],
    metrics: [{label:"Deals advised", value:220}, {label:"Average close time", value:"14 days"}]
  }
};

/* -------------------- 2) INDUSTRY PLAYBOOKS -------------------- */
const PLAYBOOKS = {
  law: {
    heroKind: "editorial",            // editorial | image | product
    motionProfile: "calm",            // calm | crisp | kinetic
    defaultSections: [
      "hero","value","services","proof","pricing","cta","contact"
    ],
    ctas: { primary: "Book consultation", secondary: "Download brochure" },
    heroHints: {
      showImageIf: (brief)=> !!brief.company.brand?.heroImage,
      defaultTitle: (brief)=> `${brief.company.name}`,
      defaultSub: (brief)=> brief.company.tagline || "Business law for decisive companies."
    }
  },
  clinic: {
    heroKind: "image",
    motionProfile: "crisp",
    defaultSections: ["hero","value","services","proof","cta","contact"],
    ctas: { primary: "Book appointment", secondary: "Call clinic" }
  },
  gym: {
    heroKind: "image",
    motionProfile: "kinetic",
    defaultSections: ["hero","value","programs","proof","pricing","cta","contact"],
    ctas: { primary: "Start trial", secondary: "View programs" }
  },
  saas: {
    heroKind: "product",
    motionProfile: "crisp",
    defaultSections: ["hero","value","features","proof","pricing","faq","cta","contact"],
    ctas: { primary: "Start demo", secondary: "Talk to sales" }
  }
};

/* -------------------- 3) GENERATOR: BRIEF -> DSL -------------------- */
function generateDSL(brief) {
  const pb = PLAYBOOKS[brief?.company?.industry] || PLAYBOOKS.saas;
  const colors = normalizeColors(brief?.company?.brand);
  const motion = pb.motionProfile;

  const heroImage =
    pb.heroHints?.showImageIf?.(brief) ? brief.company.brand.heroImage : null;

  const title = pb.heroHints?.defaultTitle?.(brief) || brief?.company?.name || "Your company";
  const subtitle = pb.heroHints?.defaultSub?.(brief) || "We make websites pay for themselves.";

  const sections = [];

  // HERO
  sections.push({
    type: "hero",
    variant: pb.heroKind,
    title,
    subtitle,
    badge: (brief?.company?.locations || []).join(" · "),
    primaryCta: { label: pb.ctas.primary, href: "#contact" },
    secondaryCta: brief?.goals?.secondary?.[0] ? { label: brief.goals.secondary[0], href: "#contact" } : null,
    heroImage
  });

  // VALUE
  const valueBullets = deriveValueBullets(brief);
  if (valueBullets.length) {
    sections.push({
      type: "value",
      title: "The outcomes we optimize for",
      items: valueBullets
    });
  }

  // SERVICES / FEATURES (depends on industry)
  if (pb.defaultSections.includes("services")) {
    sections.push({
      type: "services",
      title: "Services",
      items: deriveServices(brief)
    });
  }
  if (pb.defaultSections.includes("features")) {
    sections.push({
      type: "features",
      title: "Features",
      items: deriveServices(brief) // reuse
    });
  }
  if (pb.defaultSections.includes("programs")) {
    sections.push({
      type: "programs",
      title: "Programs",
      items: [
        { title: "Elite Coaching", text: "High-intensity coaching for rapid progress." },
        { title: "Strength Builder", text: "Progressive overload with accountability." },
        { title: "Conditioning Lab", text: "Cardio and mobility for sustainable energy." }
      ]
    });
  }

  // PROOF
  if (brief?.proof && (brief.proof.logos?.length || brief.proof.testimonials?.length || brief.proof.metrics?.length)) {
    sections.push({
      type: "proof",
      logos: brief.proof.logos || [],
      testimonials: brief.proof.testimonials || [],
      metrics: brief.proof.metrics || []
    });
  }

  // PRICING (if requested)
  if ((brief?.pages?.mustHave || []).includes("pricing")) {
    sections.push({
      type: "pricing",
      title: "Pricing",
      note: "Transparent estimates. Fixed-fee options available.",
      tiers: [
        { name: "Starter", price: "$900", items: ["2–3 pages", "Responsive", "Lead form"] },
        { name: "Growth", price: "$2,300", items: ["5–7 pages", "SEO + schema", "Booking & Maps", "Integrations"] },
        { name: "Scale", price: "$7,000", items: ["10+ pages", "Strategy + funnel", "Advanced SEO/analytics", "CRM / e-com"] }
      ]
    });
  }

  // CTA + CONTACT
  sections.push({ type: "cta", title: "Ready to move faster?", cta: { label: pb.ctas.primary, href:"#contact" } });
  sections.push({ type: "contact", title: "Contact", email: "contact@citeks.net", locations: brief?.company?.locations || [] });

  return {
    meta: {
      brand: {
        name: brief?.company?.name || "Your company",
        tagline: brief?.company?.tagline || "",
        colors
      },
      motion
    },
    pages: [
      { slug: "home", sections }
    ]
  };
}

/* -------------------- 4) HEURISTICS -------------------- */
function normalizeColors(brand) {
  const primary = brand?.primary || "#0F172A";
  const secondary = brand?.secondary || "#F7F7F7";
  const accent = brand?.accent || "#0EA5E9";
  return { primary, secondary, accent };
}

function deriveValueBullets(brief) {
  const bullets = [];
  // Map pains → outcomes
  (brief?.audience || []).slice(0, 3).forEach(p => {
    if (p?.pain && p?.desired) {
      bullets.push({
        title: `${cap(p.desired)} — without ${p.pain.toLowerCase()}`,
        text: `We reduce ${p.pain.toLowerCase()} so you can reach ${p.desired.toLowerCase()}.`
      });
    }
  });
  // Add differentiators as strong bullets
  (brief?.differentiators || []).slice(0, 3).forEach(d => {
    bullets.push({ title: d, text: "Built into our day-to-day process." });
  });
  return bullets.slice(0, 6);
}

function deriveServices(brief) {
  const industry = brief?.company?.industry;
  if (industry === "law") {
    return [
      { title: "M&A & Transactions", text: "Deal structuring, diligence, and closing guidance." },
      { title: "Commercial Contracts", text: "Clear, enforceable agreements that move business forward." },
      { title: "Data & Compliance", text: "Practical counsel on privacy and regulatory obligations." }
    ];
  }
  if (industry === "saas") {
    return [
      { title: "Onboarding flows", text: "Reduce time-to-value with frictionless onboarding." },
      { title: "Pricing architecture", text: "Plans, entitlements, and clarity that convert." },
      { title: "Docs & SEO", text: "Content that compounds organic growth." }
    ];
  }
  // Default generic services
  return [
    { title: "Strategy & IA", text: "Define goals, sitemap, and decision pathways." },
    { title: "Design System", text: "Reusable components with accessibility baked in." },
    { title: "Performance & SEO", text: "Lighthouse-focused builds with schema and structure." }
  ];
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ""; }

/* -------------------- 5) RENDERER -------------------- */
function SiteRenderer({ dsl }) {
  const brand = dsl.meta.brand;
  const motion = dsl.meta.motion;

  const vars = {
    "--bg": brand.colors.secondary,
    "--panel": "#ffffff",
    "--ink": brand.colors.primary,
    "--accent": brand.colors.accent
  };

  const page = dsl.pages[0];

  return (
    <div style={vars}>
      <div className="container" style={{paddingTop: 16, paddingBottom: 24}}>
        <header className="panel" style={{padding: 16, display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius: 16}}>
          <div className="ts-h6" style={{fontWeight:600}}>{brand.name}</div>
          <nav className="ts-h6" style={{display:"flex", gap:16}}>
            <a href="#work" style={{textDecoration:"none", color:"var(--ink)"}}>Work</a>
            <a href="#services" style={{textDecoration:"none", color:"var(--ink)"}}>Services</a>
            <a href="#contact" style={{textDecoration:"none", color:"var(--ink)"}}>Contact</a>
          </nav>
        </header>

        <main className="grid" style={{marginTop:16}}>
          {page.sections.map((s, i)=>(
            <Section key={i} s={s} motion={motion} brand={brand}/>
          ))}
        </main>

        <footer className="panel" style={{marginTop:24, padding:16, borderRadius:16}}>
          <div className="ts-h6" style={{color:"var(--muted)"}}>© {new Date().getFullYear()} {brand.name}</div>
        </footer>
      </div>
    </div>
  );
}

function Section({ s, motion, brand }) {
  const common = { initial:{opacity:0, y:16}, whileInView:{opacity:1,y:0}, viewport:{once:true, amount:.6}, transition:{duration:.45} };

  if (s.type === "hero") {
    return (
      <motion.section {...common} className="hero ar-2-1 panel">
        <div className="hero-img" style={{
          backgroundImage: s.heroImage ? `url(${s.heroImage})` : `linear-gradient(120deg, ${brand.colors.primary}, ${brand.colors.accent})`
        }} />
        <div className="hero-scrim"></div>
        <div className="hero-copy">
          {s.badge && <div className="badge">{s.badge}</div>}
          <h1 className="ts-h1" style={{marginTop:8, fontWeight:700}}>{s.title}</h1>
          <p className="ts-h6" style={{marginTop:8, color:"rgba(255,255,255,.88)"}}>{s.subtitle}</p>
          <div style={{display:"flex", gap:12, marginTop:16}}>
            {s.primaryCta && <a className="btn" href={s.primaryCta.href}>{s.primaryCta.label}</a>}
            {s.secondaryCta && <a className="btn sec" href={s.secondaryCta.href}>{s.secondaryCta.label}</a>}
          </div>
        </div>
      </motion.section>
    );
  }

  if (s.type === "value") {
    return (
      <motion.section {...common} className="panel" style={{padding:16}}>
        <h2 className="ts-h2" style={{fontWeight:700}}>{s.title}</h2>
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", marginTop:12}}>
          {s.items.map((it, idx)=>(
            <div key={idx} className="panel" style={{padding:16}}>
              <div className="ts-h5" style={{fontWeight:600}}>{it.title}</div>
              <div className="ts-h6" style={{color:"var(--muted)", marginTop:4}}>{it.text}</div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  if (s.type === "services" || s.type === "features" || s.type === "programs") {
    return (
      <motion.section {...common} id="services" className="panel" style={{padding:16}}>
        <h2 className="ts-h2" style={{fontWeight:700}}>{s.title}</h2>
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", marginTop:12}}>
          {s.items.map((it, idx)=>(
            <div key={idx} className="panel" style={{padding:16}}>
              <div className="ts-h5" style={{fontWeight:600}}>{it.title}</div>
              <div className="ts-h6" style={{color:"var(--muted)", marginTop:4}}>{it.text}</div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  if (s.type === "proof") {
    return (
      <motion.section {...common} className="panel" style={{padding:16}}>
        <h2 className="ts-h2" style={{fontWeight:700}}>Proof</h2>
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", marginTop:12}}>
          {(s.logos||[]).map((l, i)=>(
            <div key={i} className="panel" style={{padding:16, textAlign:"center"}}>{l}</div>
          ))}
        </div>
        <div className="thin" style={{margin:"16px 0"}}></div>
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))"}}>
          {(s.testimonials||[]).map((t, i)=>(
            <div key={i} className="panel" style={{padding:16}}>
              <div className="ts-h6" style={{fontStyle:"italic"}}>“{t.quote}”</div>
              <div className="ts-h6" style={{marginTop:8, color:"var(--muted)"}}>{t.author}</div>
            </div>
          ))}
        </div>
        {Array.isArray(s.metrics) && s.metrics.length>0 && (
          <>
            <div className="thin" style={{margin:"16px 0"}}></div>
            <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))"}}>
              {s.metrics.map((m, i)=>(
                <div key={i} className="panel" style={{padding:16}}>
                  <div className="ts-h3" style={{color:"var(--accent)", fontWeight:700}}>{m.value}</div>
                  <div className="ts-h6" style={{color:"var(--muted)"}}>{m.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.section>
    );
  }

  if (s.type === "pricing") {
    return (
      <motion.section {...common} className="panel" style={{padding:16}}>
        <h2 className="ts-h2" style={{fontWeight:700}}>{s.title}</h2>
        <p className="ts-h6" style={{color:"var(--muted)"}}>{s.note}</p>
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", marginTop:12}}>
          {s.tiers.map((t, i)=>(
            <div key={i} className="panel" style={{padding:16}}>
              <div className="ts-h5" style={{fontWeight:600}}>{t.name}</div>
              <div className="ts-h3" style={{color:"var(--accent)", fontWeight:700, marginTop:4}}>{t.price}</div>
              <ul className="ts-h6" style={{marginTop:8, color:"var(--muted)"}}>
                {t.items.map((x, j)=><li key={j} style={{marginTop:4}}>• {x}</li>)}
              </ul>
              <a className="btn" href="#contact" style={{marginTop:12}}>Choose {t.name}</a>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  if (s.type === "cta") {
    return (
      <motion.section {...common} className="panel" style={{padding:16, textAlign:"center"}}>
        <h2 className="ts-h2" style={{fontWeight:700}}>{s.title}</h2>
        <a className="btn" href={s.cta.href} style={{marginTop:12}}>{s.cta.label}</a>
      </motion.section>
    );
  }

  if (s.type === "contact") {
    return (
      <motion.section {...common} id="contact" className="panel" style={{padding:16}}>
        <h2 className="ts-h2" style={{fontWeight:700}}>{s.title}</h2>
        <div className="ts-h6" style={{marginTop:8}}>Email: <a href={`mailto:${s.email}`} style={{color:"var(--accent)"}}>{s.email}</a></div>
        {s.locations?.length ? <div className="ts-h6" style={{marginTop:4, color:"var(--muted)"}}>Locations: {s.locations.join(" · ")}</div> : null}
        <form className="panel" style={{padding:16, marginTop:12, display:"grid", gap:12}}>
          <input placeholder="Name" className="ts-h6" style={inputStyle}/>
          <input placeholder="Email" className="ts-h6" style={inputStyle}/>
          <textarea placeholder="Message" rows={5} className="ts-h6" style={inputStyle}/>
          <button className="btn" type="button">Send</button>
        </form>
      </motion.section>
    );
  }

  return null;
}

const inputStyle = { padding:12, borderRadius:12, border:"1px solid var(--hair)", background:"#fff" };

/* -------------------- 6) MAKER UI -------------------- */
export default function Maker(){
  const [briefText, setBriefText] = useState(JSON.stringify(SAMPLE_BRIEF, null, 2));
  const [error, setError] = useState("");
  const dsl = useMemo(()=>{
    try{
      const b = JSON.parse(briefText);
      setError("");
      return generateDSL(b);
    }catch(e){
      setError(e.message);
      return generateDSL(SAMPLE_BRIEF);
    }
  }, [briefText]);

  return (
    <div style={{display:"grid", gridTemplateColumns:"minmax(320px, 520px) 1fr", gap:16, padding:16}}>
      <div className="panel" style={{padding:16, alignSelf:"start"}}>
        <div className="ts-h5" style={{fontWeight:700}}>Brief (paste JSON)</div>
        <p className="ts-h6" style={{color:"var(--muted)", marginTop:4}}>Edit fields, the preview updates live. Keep keys, change values.</p>
        <textarea value={briefText} onChange={(e)=>setBriefText(e.target.value)} rows={28}
          className="ts-h6"
          style={{width:"100%", marginTop:12, border:"1px solid var(--hair)", borderRadius:12, padding:12, fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"}}
        />
        {error && <div className="ts-h6" style={{color:"#dc2626", marginTop:8}}>JSON error: {error}</div>}

        <div className="thin" style={{margin:"12px 0"}}></div>
        <div className="ts-h6" style={{color:"var(--muted)"}}>Tips:</div>
        <ul className="ts-h6" style={{color:"var(--muted)"}}>
          <li>• Change <b>industry</b> (law, clinic, gym, saas) to see different layouts.</li>
          <li>• Set <b>brand.accent</b> (hex) to adapt color.</li>
          <li>• Provide <b>brand.heroImage</b> to force image hero.</li>
        </ul>
      </div>

      <div>
        <SiteRenderer dsl={dsl}/>
      </div>
    </div>
  );
}
