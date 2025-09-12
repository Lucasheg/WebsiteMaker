import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CITEKS – Website Maker (Builder-first layout)
 * - Full-screen builder panel on first load
 * - Accordion groups to keep the UI tidy (no option overload)
 * - Live preview below, updates instantly
 * - Image upload for Hero + Gallery (data URLs, no backend needed)
 * - Export static HTML (single file) for drag-and-drop Netlify deploys
 */

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

const DEFAULT_BRAND = {
  name: "Your company",
  tagline: "One clear outcome. Everything else is noise.",
  locations: ["Oslo", "New York", "Amsterdam"],
  colors: { primary: "#0F172A", accent: "#0EA5E9", neutral: "#F7F7F7" },
};

const SAMPLE = {
  brand: {
    name: "Harbor & Sage Law",
    tagline: "Practical counsel for complex transactions.",
    locations: ["Oslo", "New York", "Amsterdam"],
    colors: { primary: "#0F172A", accent: "#0EA5E9", neutral: "#F7F7F7" },
  },
  hero: {
    variant: "image", // "image" | "editorial" | "product"
    title: "Harbor & Sage Law",
    subtitle:
      "Complex deals, made navigable. Transaction lawyers who speak operator.",
    overlay: 0.4,
    imageUrl: "", // or a data URL after upload
    parallax: false,
    primaryCta: "Book consultation",
    secondaryCta: "Download brochure",
  },
  layout: {
    container: 1140, // 960 | 1140 | 1280
    radius: 16, // px
    scale: "m", // s | m | l
    density: "normal", // loose | normal | dense
    headerStyle: "solid", // solid | transparent
  },
  animation: {
    level: "medium", // low | medium | high
  },
  sections: {
    value: true,
    services: true,
    proof: true,
    pricing: true,
    cta: true,
    contact: true,
    gallery: false,
  },
  valueItems: [
    { title: "Clarity over clever", text: "Single goal per page. Less friction." },
    { title: "Trust quickly", text: "Proof early: results, reviews, guarantees." },
    { title: "Speed matters", text: "Fast loads. Tight interactions. No clutter." },
  ],
  services: [
    { title: "M&A & Transactions", text: "Deal structuring and closing guidance." },
    { title: "Commercial Contracts", text: "Clear, enforceable agreements." },
    { title: "Data & Compliance", text: "Practical privacy & regulatory counsel." },
  ],
  proof: {
    logos: ["Aldin Capital", "Meridian Partners", "Koto Energy"],
    testimonials: [
      {
        quote:
          "They guided a complex cross-border deal with clarity.",
        author: "COO, Meridian",
      },
    ],
    metrics: [
      { label: "Deals advised", value: "220" },
      { label: "Avg. close time", value: "14 days" },
    ],
  },
  pricing: [
    { name: "Starter", price: "$900", items: ["2–3 pages", "Responsive", "Lead form"] },
    {
      name: "Growth",
      price: "$2,300",
      items: ["5–7 pages", "SEO + schema", "Booking & Maps", "Integrations"],
    },
    {
      name: "Scale",
      price: "$7,000",
      items: ["10+ pages", "Strategy + funnel", "Advanced SEO/analytics", "CRM / e-com"],
    },
  ],
  contact: {
    email: "contact@citeks.net",
  },
  gallery: [], // {src:dataUrl, alt:string}[]
};

export default function App() {
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [hero, setHero] = useState(SAMPLE.hero);
  const [layout, setLayout] = useState(SAMPLE.layout);
  const [animation, setAnimation] = useState(SAMPLE.animation);
  const [sections, setSections] = useState(SAMPLE.sections);
  const [valueItems, setValueItems] = useState(SAMPLE.valueItems);
  const [services, setServices] = useState(SAMPLE.services);
  const [proof, setProof] = useState(SAMPLE.proof);
  const [pricing, setPricing] = useState(SAMPLE.pricing);
  const [contact, setContact] = useState(SAMPLE.contact);
  const [gallery, setGallery] = useState(SAMPLE.gallery);

  const containerCss = useMemo(() => {
    // type scale multiplier
    const scaleMap = { s: 0.92, m: 1, l: 1.08 };
    const mult = scaleMap[layout.scale || "m"] || 1;

    // density adjusts vertical rhythm
    const densityMap = { loose: 1.15, normal: 1, dense: 0.9 };
    const dMult = densityMap[layout.density || "normal"] || 1;

    return `
      :root{
        --ink:${brand.colors.primary};
        --accent:${brand.colors.accent};
        --bg:${brand.colors.neutral};
        --container:${layout.container}px;
        --radius:${layout.radius}px;

        --ts-p:${16 * mult}px;
        --ts-h6:${18 * mult}px;
        --ts-h5:${20 * mult}px;
        --ts-h4:${25 * mult}px;
        --ts-h3:${31.25 * mult}px;
        --ts-h2:${39.06 * mult}px;
        --ts-h1:${48.83 * mult}px;

        --y-gap:${12 * dMult}px;
      }
    `;
  }, [brand.colors, layout]);

  // builder accordions open/close
  const [open, setOpen] = useState({
    brand: true,
    layout: false,
    hero: true,
    animation: false,
    sections: false,
    value: false,
    services: false,
    proof: false,
    pricing: false,
    contact: false,
    gallery: false,
    export: false,
  });

  function toggle(name) {
    setOpen((s) => ({ ...s, [name]: !s[name] }));
  }

  // Update helpers
  const updBrand = (patch) => setBrand((s) => ({ ...s, ...patch }));
  const updBrandColor = (k, v) =>
    setBrand((s) => ({ ...s, colors: { ...s.colors, [k]: v } }));
  const updHero = (patch) => setHero((s) => ({ ...s, ...patch }));
  const updLayout = (patch) => setLayout((s) => ({ ...s, ...patch }));
  const updAnim = (patch) => setAnimation((s) => ({ ...s, ...patch }));
  const updSections = (k) => setSections((s) => ({ ...s, [k]: !s[k] }));
  const updProof = (patch) => setProof((s) => ({ ...s, ...patch }));
  const updContact = (patch) => setContact((s) => ({ ...s, ...patch }));

  // File upload handlers (hero + gallery)
  async function onHeroFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    updHero({ imageUrl: url });
  }
  async function onAddGalleryFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const items = [];
    for (const f of files) {
      const src = await fileToDataUrl(f);
      items.push({ src, alt: f.name });
    }
    setGallery((g) => [...g, ...items]);
  }
  function removeGalleryIndex(i) {
    setGallery((g) => g.filter((_, idx) => idx !== i));
  }

  function loadSample() {
    setBrand(SAMPLE.brand);
    setHero(SAMPLE.hero);
    setLayout(SAMPLE.layout);
    setAnimation(SAMPLE.animation);
    setSections(SAMPLE.sections);
    setValueItems(SAMPLE.valueItems);
    setServices(SAMPLE.services);
    setProof(SAMPLE.proof);
    setPricing(SAMPLE.pricing);
    setContact(SAMPLE.contact);
    setGallery(SAMPLE.gallery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAll() {
    setBrand(DEFAULT_BRAND);
    setHero({
      variant: "image",
      title: DEFAULT_BRAND.name,
      subtitle: DEFAULT_BRAND.tagline,
      overlay: 0.35,
      imageUrl: "",
      parallax: false,
      primaryCta: "Get in touch",
      secondaryCta: "",
    });
    setLayout({ container: 1140, radius: 16, scale: "m", density: "normal", headerStyle: "solid" });
    setAnimation({ level: "medium" });
    setSections({ value: true, services: true, proof: true, pricing: true, cta: true, contact: true, gallery: false });
    setValueItems([
      { title: "Clarity over clever", text: "Single goal per page. Less friction." },
      { title: "Trust quickly", text: "Proof early: results, reviews, guarantees." },
      { title: "Speed matters", text: "Fast loads. Tight interactions. No clutter." },
    ]);
    setServices([
      { title: "Strategy & IA", text: "Define goals, sitemap, and decision pathways." },
      { title: "Design System", text: "Reusable components with accessibility baked in." },
      { title: "Performance & SEO", text: "Lighthouse-focused builds with schema and structure." },
    ]);
    setProof({ logos: [], testimonials: [], metrics: [] });
    setPricing([
      { name: "Starter", price: "$900", items: ["2–3 pages", "Responsive", "Lead form"] },
      { name: "Growth", price: "$2,300", items: ["5–7 pages", "SEO + schema", "Booking & Maps", "Integrations"] },
      { name: "Scale", price: "$7,000", items: ["10+ pages", "Strategy + funnel", "Advanced SEO/analytics", "CRM / e-com"] },
    ]);
    setContact({ email: "contact@citeks.net" });
    setGallery([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportStaticHtml() {
    const html = buildExportHtml({
      brand,
      hero,
      layout,
      animation,
      sections,
      valueItems,
      services,
      proof,
      pricing,
      contact,
      gallery,
    });
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <style>{baseCss}</style>
      <style>{containerCss}</style>

      {/* ======== BUILDER (full screen on load) ======== */}
      <section className="builder panel">
        <header className="builder-head">
          <div className="brand-chip">CITEKS Maker</div>
          <div className="builder-actions">
            <button className="btn" onClick={loadSample}>Load example</button>
            <button className="btn sec" onClick={resetAll}>Reset</button>
            <a className="btn ghost" href="#preview">Scroll to preview</a>
          </div>
        </header>

        <div className="accordion-col">
          {/* BRAND */}
          <Accordion title="Brand & Identity" open={open.brand} onToggle={() => toggle("brand")}>
            <div className="grid two">
              <Labeled inputId="brandName" label="Company name">
                <input id="brandName" className="input" value={brand.name}
                       onChange={(e) => updBrand({ name: e.target.value })} />
              </Labeled>
              <Labeled inputId="brandTag" label="Tagline">
                <input id="brandTag" className="input" value={brand.tagline}
                       onChange={(e) => updBrand({ tagline: e.target.value })} />
              </Labeled>
              <Labeled inputId="brandLoc" label="Locations (comma)">
                <input id="brandLoc" className="input"
                       value={brand.locations.join(", ")}
                       onChange={(e) =>
                         updBrand({ locations: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })
                       } />
              </Labeled>
            </div>
            <div className="grid three" style={{ marginTop: "var(--y-gap)" }}>
              <Labeled inputId="colPri" label="Primary (ink)">
                <input id="colPri" type="color" className="input color" value={brand.colors.primary}
                       onChange={(e) => updBrandColor("primary", e.target.value)} />
              </Labeled>
              <Labeled inputId="colAccent" label="Accent">
                <input id="colAccent" type="color" className="input color" value={brand.colors.accent}
                       onChange={(e) => updBrandColor("accent", e.target.value)} />
              </Labeled>
              <Labeled inputId="colNeu" label="Neutral (bg)">
                <input id="colNeu" type="color" className="input color" value={brand.colors.neutral}
                       onChange={(e) => updBrandColor("neutral", e.target.value)} />
              </Labeled>
            </div>
          </Accordion>

          {/* LAYOUT */}
          <Accordion title="Layout & Typography" open={open.layout} onToggle={() => toggle("layout")}>
            <div className="grid three">
              <Labeled label="Container">
                <Select value={layout.container} onChange={(v) => updLayout({ container: Number(v) })}
                        options={[
                          { value: 960, label: "960px (compact)" },
                          { value: 1140, label: "1140px (standard)" },
                          { value: 1280, label: "1280px (wide)" },
                        ]} />
              </Labeled>
              <Labeled label="Corner radius">
                <Select value={layout.radius} onChange={(v) => updLayout({ radius: Number(v) })}
                        options={[
                          { value: 8, label: "8px" },
                          { value: 16, label: "16px" },
                          { value: 24, label: "24px" },
                        ]} />
              </Labeled>
              <Labeled label="Type scale">
                <RadioGroup value={layout.scale}
                            onChange={(v) => updLayout({ scale: v })}
                            options={[
                              { value: "s", label: "Small" },
                              { value: "m", label: "Medium" },
                              { value: "l", label: "Large" },
                            ]} />
              </Labeled>
              <Labeled label="Density">
                <RadioGroup value={layout.density}
                            onChange={(v) => updLayout({ density: v })}
                            options={[
                              { value: "loose", label: "Loose" },
                              { value: "normal", label: "Normal" },
                              { value: "dense", label: "Dense" },
                            ]} />
              </Labeled>
              <Labeled label="Header style">
                <RadioGroup value={layout.headerStyle}
                            onChange={(v) => updLayout({ headerStyle: v })}
                            options={[
                              { value: "solid", label: "Solid" },
                              { value: "transparent", label: "Transparent over hero" },
                            ]} />
              </Labeled>
            </div>
          </Accordion>

          {/* HERO */}
          <Accordion title="Hero" open={open.hero} onToggle={() => toggle("hero")}>
            <div className="grid two">
              <Labeled label="Hero variant">
                <RadioGroup value={hero.variant}
                            onChange={(v) => updHero({ variant: v })}
                            options={[
                              { value: "image", label: "Image" },
                              { value: "editorial", label: "Editorial" },
                              { value: "product", label: "Product" },
                            ]} />
              </Labeled>
              <Labeled label="Overlay strength">
                <input type="range" min={0} max={0.8} step={0.05} value={hero.overlay}
                       onChange={(e) => updHero({ overlay: Number(e.target.value) })} />
              </Labeled>
              <Labeled label="Title">
                <input className="input" value={hero.title}
                       onChange={(e) => updHero({ title: e.target.value })} />
              </Labeled>
              <Labeled label="Subtitle">
                <input className="input" value={hero.subtitle}
                       onChange={(e) => updHero({ subtitle: e.target.value })} />
              </Labeled>
              <Labeled label="Primary CTA">
                <input className="input" value={hero.primaryCta}
                       onChange={(e) => updHero({ primaryCta: e.target.value })} />
              </Labeled>
              <Labeled label="Secondary CTA">
                <input className="input" value={hero.secondaryCta}
                       onChange={(e) => updHero({ secondaryCta: e.target.value })} />
              </Labeled>
              <Labeled label="Hero image URL (optional)">
                <input className="input" value={hero.imageUrl || ""}
                       onChange={(e) => updHero({ imageUrl: e.target.value })} placeholder="https://…" />
              </Labeled>
              <Labeled label="Or upload hero image">
                <input type="file" accept="image/*" onChange={onHeroFile} />
              </Labeled>
              <Labeled label="Parallax">
                <RadioGroup value={hero.parallax ? "1" : "0"}
                            onChange={(v) => updHero({ parallax: v === "1" })}
                            options={[
                              { value: "0", label: "Off" },
                              { value: "1", label: "On" },
                            ]} />
              </Labeled>
            </div>
          </Accordion>

          {/* ANIMATION */}
          <Accordion title="Animation level" open={open.animation} onToggle={() => toggle("animation")}>
            <RadioGroup
              value={animation.level}
              onChange={(v) => updAnim({ level: v })}
              options={[
                { value: "low", label: "Low (subtle fades)" },
                { value: "medium", label: "Medium (fades + slides)" },
                { value: "high", label: "High (parallax + motion)" },
              ]}
            />
          </Accordion>

          {/* SECTIONS ON/OFF */}
          <Accordion title="Sections to include" open={open.sections} onToggle={() => toggle("sections")}>
            <div className="grid three">
              {Object.entries(sections).map(([k, v]) => (
                <label key={k} className="check">
                  <input type="checkbox" checked={v} onChange={() => updSections(k)} /> {k}
                </label>
              ))}
            </div>
          </Accordion>

          {/* VALUE */}
          <Accordion title="Value items (what the client gets)" open={open.value} onToggle={() => toggle("value")}>
            <Repeater
              items={valueItems}
              onAdd={() => setValueItems((s) => [...s, { title: "", text: "" }])}
              onChange={(idx, patch) =>
                setValueItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
              }
              onRemove={(idx) => setValueItems((s) => s.filter((_, i) => i !== idx))}
            />
          </Accordion>

          {/* SERVICES */}
          <Accordion title="Services" open={open.services} onToggle={() => toggle("services")}>
            <Repeater
              items={services}
              onAdd={() => setServices((s) => [...s, { title: "", text: "" }])}
              onChange={(idx, patch) =>
                setServices((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
              }
              onRemove={(idx) => setServices((s) => s.filter((_, i) => i !== idx))}
            />
          </Accordion>

          {/* PROOF */}
          <Accordion title="Proof (logos, testimonials, metrics)" open={open.proof} onToggle={() => toggle("proof")}>
            <div className="grid two">
              <Labeled label="Client logos (comma)">
                <input className="input"
                  value={(proof.logos || []).join(", ")}
                  onChange={(e) => updProof({ logos: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
              </Labeled>
              <Labeled label="Testimonials (one per line: quote — author)">
                <textarea className="input" rows={4}
                  value={(proof.testimonials || []).map((t) => `${t.quote} — ${t.author || ""}`).join("\n")}
                  onChange={(e) =>
                    updProof({
                      testimonials: e.target.value
                        .split("\n")
                        .map((ln) => {
                          const [q, a] = ln.split("—").map((x) => x && x.trim());
                          return q ? { quote: q, author: a || "" } : null;
                        })
                        .filter(Boolean),
                    })
                  } />
              </Labeled>
              <Labeled label="Metrics (one per line: Label: Value)">
                <textarea className="input" rows={3}
                  value={(proof.metrics || []).map((m) => `${m.label}: ${m.value}`).join("\n")}
                  onChange={(e) =>
                    updProof({
                      metrics: e.target.value
                        .split("\n")
                        .map((ln) => {
                          const [label, value] = ln.split(":").map((x) => x && x.trim());
                          return label && value ? { label, value } : null;
                        })
                        .filter(Boolean),
                    })
                  } />
              </Labeled>
            </div>
          </Accordion>

          {/* PRICING */}
          <Accordion title="Pricing tiers" open={open.pricing} onToggle={() => toggle("pricing")}>
            <TierEditor tiers={pricing} onChange={setPricing} />
          </Accordion>

          {/* CONTACT */}
          <Accordion title="Contact" open={open.contact} onToggle={() => toggle("contact")}>
            <div className="grid two">
              <Labeled label="Email">
                <input className="input" value={contact.email}
                       onChange={(e) => updContact({ email: e.target.value })} />
              </Labeled>
            </div>
          </Accordion>

          {/* GALLERY */}
          <Accordion title="Gallery images" open={open.gallery} onToggle={() => toggle("gallery")}>
            <div className="grid two">
              <Labeled label="Add images">
                <input type="file" accept="image/*" multiple onChange={onAddGalleryFiles} />
              </Labeled>
            </div>
            {gallery.length > 0 && (
              <div className="thumbs">
                {gallery.map((g, i) => (
                  <div key={i} className="thumb">
                    <img src={g.src} alt={g.alt || `image-${i}`} />
                    <button className="mini danger" onClick={() => removeGalleryIndex(i)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </Accordion>

          {/* EXPORT */}
          <Accordion title="Export & Deploy" open={open.export} onToggle={() => toggle("export")}>
            <p className="tips">
              Click <b>Export static HTML</b> to download a self-contained <code>index.html</code>.  
              Then in Netlify: <i>Add new site → Deploy manually</i> and drag the file in.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={exportStaticHtml}>Export static HTML</button>
              <a className="btn ghost" href="#preview">Scroll to preview</a>
            </div>
          </Accordion>
        </div>
      </section>

      {/* ======== PREVIEW (below builder) ======== */}
      <section id="preview" className="preview">
        <SitePreview
          brand={brand}
          hero={hero}
          layout={layout}
          animation={animation}
          sections={sections}
          valueItems={valueItems}
          services={services}
          proof={proof}
          pricing={pricing}
          contact={contact}
          gallery={gallery}
        />
      </section>
    </div>
  );
}

/* ---------------------- Components ---------------------- */

function Accordion({ title, open, onToggle, children }) {
  return (
    <div className="accordion">
      <button className="accordion-head" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <span className={cx("chev", open && "open")}>▾</span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function Labeled({ label, inputId, children }) {
  return (
    <label htmlFor={inputId} className="label">
      <div className="label-text">{label}</div>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RadioGroup({ value, onChange, options }) {
  return (
    <div className="radios">
      {options.map((o) => (
        <label key={o.value} className={cx("radio", value === o.value && "active")}>
          <input
            type="radio"
            name={`r-${options[0].value}-${options.length}`}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Repeater({ items, onAdd, onChange, onRemove }) {
  return (
    <div className="repeater">
      {items.map((it, i) => (
        <div key={i} className="panel row">
          <input className="input" placeholder="Title" value={it.title}
                 onChange={(e) => onChange(i, { title: e.target.value })} />
          <input className="input" placeholder="Text" value={it.text}
                 onChange={(e) => onChange(i, { text: e.target.value })} />
          <button className="mini danger" onClick={() => onRemove(i)}>Remove</button>
        </div>
      ))}
      <button className="mini" onClick={onAdd}>+ Add item</button>
    </div>
  );
}

function TierEditor({ tiers, onChange }) {
  function update(idx, patch) {
    onChange(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function remove(idx) {
    onChange(tiers.filter((_, i) => i !== idx));
  }
  return (
    <div className="repeater">
      {tiers.map((t, i) => (
        <div key={i} className="panel row">
          <input className="input" placeholder="Name" value={t.name}
                 onChange={(e) => update(i, { name: e.target.value })} />
          <input className="input" placeholder="Price" value={t.price}
                 onChange={(e) => update(i, { price: e.target.value })} />
          <input className="input" placeholder="Comma features"
                 value={(t.items || []).join(", ")}
                 onChange={(e) =>
                   update(i, { items: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })
                 } />
          <button className="mini danger" onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
      <button className="mini" onClick={() => onChange([...tiers, { name: "", price: "", items: [] }])}>
        + Add tier
      </button>
    </div>
  );
}

/* ---------------------- Preview ---------------------- */

function SitePreview({
  brand,
  hero,
  layout,
  animation,
  sections,
  valueItems,
  services,
  proof,
  pricing,
  contact,
  gallery,
}) {
  // animation settings
  const anim = useMemo(() => {
    if (animation.level === "high") return { y: 20, dur: 600, obs: 0.15, parallax: hero.parallax };
    if (animation.level === "low") return { y: 8, dur: 350, obs: 0.35, parallax: false };
    return { y: 12, dur: 450, obs: 0.25, parallax: hero.parallax };
  }, [animation.level, hero.parallax]);

  // observe for reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.2 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [brand, hero, layout, sections, valueItems, services, proof, pricing, gallery]);

  return (
    <div className="site-root" style={{ background: "var(--bg)" }}>
      <div className={cx("site-header", layout.headerStyle === "transparent" && "transparent")}>
        <div className="container head-inner">
          <div className="logo">{brand.name}</div>
          <nav>
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#contact" className="btn sm">Contact</a>
          </nav>
        </div>
      </div>

      <HeroBlock brand={brand} hero={hero} anim={anim} />

      <main>
        <div className="container">
          {sections.value && <CardsGrid title="What you get with us" items={valueItems} anim={anim} />}
          {sections.services && (
            <CardsGrid title="Services" items={services} id="services" anim={anim} />
          )}
          {sections.proof && <ProofBlock proof={proof} anim={anim} />}
          {sections.gallery && gallery.length > 0 && <GalleryBlock gallery={gallery} anim={anim} />}
          {sections.pricing && <PricingBlock tiers={pricing} anim={anim} />}
          {sections.cta && <CtaBlock label={hero.primaryCta || "Get in touch"} anim={anim} />}
          {sections.contact && <ContactBlock email={contact.email} locations={brand.locations} anim={anim} />}
        </div>
      </main>

      <footer>
        <div className="container foot">
          <div>© {new Date().getFullYear()} {brand.name}</div>
          <div className="muted">{brand.locations.join(" · ")}</div>
        </div>
      </footer>
    </div>
  );
}

function HeroBlock({ brand, hero, anim }) {
  // parallax effect (optional)
  const ref = useRef(null);
  useEffect(() => {
    if (!anim.parallax) return;
    const el = ref.current;
    if (!el) return;
    function onScroll() {
      const y = window.scrollY * 0.25;
      el.style.transform = `translate3d(0, ${y}px, 0) scale(1.02)`;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [anim.parallax]);

  const hasImg = !!hero.imageUrl;
  const overlay = Math.min(Math.max(hero.overlay ?? 0.35, 0), 0.8);

  return (
    <section className="hero-block" style={{ borderRadius: "var(--radius)" }}>
      <div
        ref={ref}
        className={cx("hero-bg", hasImg ? "with-img" : "with-grad")}
        style={{
          backgroundImage: hasImg
            ? `url(${hero.imageUrl})`
            : `linear-gradient(120deg, ${brand.colors.primary}, ${brand.colors.accent})`,
          opacity: 1,
        }}
      />
      <div className="hero-scrim" style={{ background: `rgba(0,0,0,${overlay})` }} />
      <div className={cx("hero-inner", "reveal")} style={{ "--y": `${anim.y}px`, "--dur": `${anim.dur}ms` }}>
        <div className="badge">{brand.locations.join(" · ")}</div>
        <h1 className="ts-h1">{hero.title || brand.name}</h1>
        <p className="ts-h6 sub">{hero.subtitle || brand.tagline}</p>
        <div className="cta-row">
          {hero.primaryCta && <a href="#contact" className="btn">{hero.primaryCta}</a>}
          {hero.secondaryCta && <a href="#work" className="btn sec">{hero.secondaryCta}</a>}
        </div>
      </div>
    </section>
  );
}

function CardsGrid({ title, items, id, anim }) {
  return (
    <section id={id} className="section">
      <h2 className="ts-h2">{title}</h2>
      <div className="grid three">
        {items.map((it, i) => (
          <div key={i} className="panel reveal" style={{ "--y": "12px", "--dur": "420ms" }}>
            <div className="ts-h5" style={{ fontWeight: 600 }}>{it.title || "Untitled"}</div>
            <div className="ts-h6 muted" style={{ marginTop: 4 }}>{it.text || ""}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProofBlock({ proof, anim }) {
  return (
    <section className="section">
      <h2 className="ts-h2">Proof</h2>
      {proof.logos?.length > 0 && (
        <div className="logo-row">
          {proof.logos.map((l, i) => (
            <div key={i} className="chip">{l}</div>
          ))}
        </div>
      )}
      {proof.testimonials?.length > 0 && (
        <div className="grid two" style={{ marginTop: "var(--y-gap)" }}>
          {proof.testimonials.map((t, i) => (
            <div key={i} className="panel reveal">
              <div className="ts-h6" style={{ fontStyle: "italic" }}>“{t.quote}”</div>
              <div className="ts-h6 muted" style={{ marginTop: 8 }}>{t.author}</div>
            </div>
          ))}
        </div>
      )}
      {proof.metrics?.length > 0 && (
        <div className="grid three" style={{ marginTop: "var(--y-gap)" }}>
          {proof.metrics.map((m, i) => (
            <div key={i} className="panel stat reveal">
              <div className="ts-h3 accent">{m.value}</div>
              <div className="ts-h6 muted">{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GalleryBlock({ gallery }) {
  return (
    <section className="section">
      <h2 className="ts-h2">Gallery</h2>
      <div className="grid three">
        {gallery.map((g, i) => (
          <div key={i} className="panel imgp">
            <img src={g.src} alt={g.alt || `img-${i}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingBlock({ tiers }) {
  return (
    <section className="section">
      <h2 className="ts-h2">Pricing</h2>
      <div className="grid three">
        {tiers.map((t, i) => (
          <div key={i} className="panel">
            <div className="ts-h5" style={{ fontWeight: 600 }}>{t.name}</div>
            <div className="ts-h3 accent" style={{ marginTop: 4 }}>{t.price}</div>
            <ul className="ts-h6 muted" style={{ marginTop: 8 }}>
              {(t.items || []).map((x, j) => <li key={j}>• {x}</li>)}
            </ul>
            <a href="#contact" className="btn" style={{ marginTop: 12 }}>Choose {t.name}</a>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBlock({ label }) {
  return (
    <section className="section center">
      <h2 className="ts-h2">Ready to move faster?</h2>
      <a href="#contact" className="btn" style={{ marginTop: 12 }}>{label}</a>
    </section>
  );
}

function ContactBlock({ email, locations }) {
  return (
    <section className="section" id="contact">
      <h2 className="ts-h2">Contact</h2>
      <div className="panel">
        <div className="ts-h6">Email: <a className="accent" href={`mailto:${email}`}>{email}</a></div>
        {locations?.length > 0 && (
          <div className="ts-h6 muted" style={{ marginTop: 4 }}>
            Locations: {locations.join(" · ")}
          </div>
        )}
        <form className="grid two" style={{ marginTop: "var(--y-gap)" }} onSubmit={(e) => e.preventDefault()}>
          <input className="input" placeholder="Name" />
          <input className="input" placeholder="Email" />
          <textarea className="input" rows={5} placeholder="Message" />
          <button className="btn" style={{ width: "fit-content" }}>Send</button>
        </form>
      </div>
    </section>
  );
}

/* ---------------------- Utils & CSS ---------------------- */

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(file);
  });
}

const baseCss = `
/* Reset-ish */
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0; font-family: ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial; color:var(--ink); background:var(--bg)}

/* Type scale */
.ts-p{font-size:var(--ts-p); line-height:1.5}
.ts-h6{font-size:var(--ts-h6); line-height:1.3; letter-spacing:-.005em}
.ts-h5{font-size:var(--ts-h5); line-height:1.3; letter-spacing:-.01em}
.ts-h4{font-size:var(--ts-h4); line-height:1.3; letter-spacing:-.012em}
.ts-h3{font-size:var(--ts-h3); line-height:1.2; letter-spacing:-.015em}
.ts-h2{font-size:var(--ts-h2); line-height:1.1; letter-spacing:-.018em}
.ts-h1{font-size:var(--ts-h1); line-height:1.0; letter-spacing:-.02em}

/* UI atoms */
.panel{background:#fff; border:1px solid #e5e7eb; border-radius:var(--radius); box-shadow:0 8px 24px rgba(0,0,0,.04)}
.input{background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:10px 12px; width:100%}
.input.color{height:40px; padding:0}
.btn{display:inline-flex; align-items:center; gap:8px; background:var(--accent); color:#fff; border:none; border-radius:999px; padding:10px 14px; cursor:pointer; text-decoration:none}
.btn.sec{background:var(--ink); color:#fff}
.btn.ghost{background:transparent; color:var(--ink); border:1px solid #e5e7eb}
.btn.sm{padding:8px 12px; font-size:14px}
.muted{color:#64748b}
.accent{color:var(--accent)}
.label{display:flex; flex-direction:column; gap:6px}
.label-text{font-size:14px; color:#475569}
.grid{display:grid; gap:var(--y-gap)}
.grid.two{grid-template-columns:repeat(2, minmax(0,1fr))}
.grid.three{grid-template-columns:repeat(3, minmax(0,1fr))}
@media (max-width: 900px){ .grid.two, .grid.three{grid-template-columns:1fr} }

/* Builder */
.builder{max-width:1200px; margin:0 auto; padding:16px; min-height:100vh}
.builder-head{display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px}
.brand-chip{font-weight:700}
.builder-actions{display:flex; gap:8px; flex-wrap:wrap}
.accordion-col{display:grid; gap:12px}
.accordion{border:1px solid #e5e7eb; border-radius:var(--radius); overflow:hidden; background:#fff}
.accordion-head{width:100%; text-align:left; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; background:#fff; border:none; cursor:pointer}
.accordion-body{padding:12px 14px}
.chev{transform:rotate(-90deg); transition:transform .2s ease}
.chev.open{transform:rotate(0deg)}
.radio{display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid #e5e7eb; border-radius:999px; cursor:pointer}
.radio.active{border-color:var(--accent)}
.radios{display:flex; gap:8px; flex-wrap:wrap}
.repeater .row{display:grid; grid-template-columns:1fr 2fr auto; gap:8px; padding:12px}
.repeater .mini{border:1px solid #e5e7eb; background:#fff; border-radius:999px; padding:8px 10px; cursor:pointer}
.repeater .mini.danger{border-color:#fecaca; color:#b91c1c}

/* Preview shell */
.preview{padding:16px 16px 48px}
.site-root .container{max-width:var(--container); margin:0 auto; padding:0 16px}
.site-header{position:sticky; top:0; z-index:10; background:#fff; border-bottom:1px solid #e5e7eb}
.site-header.transparent{background:transparent; border-bottom-color:transparent; position:absolute; width:100%}
.head-inner{display:flex; align-items:center; justify-content:space-between; padding:12px 0}
.logo{font-weight:700}
.site-header nav{display:flex; gap:12px; align-items:center}
.site-header nav a{color:inherit; text-decoration:none}

/* Hero */
.hero-block{position:relative; height:56vh; min-height:380px; overflow:hidden; margin:16px; border-radius:var(--radius)}
.hero-bg{position:absolute; inset:0; background-position:center; background-size:cover; will-change:transform}
.hero-scrim{position:absolute; inset:0}
.hero-inner{position:relative; z-index:1; color:#fff; padding:36px; max-width:760px}
.hero-inner .badge{display:inline-block; background:rgba(255,255,255,.16); padding:6px 10px; border-radius:999px; font-size:14px}
.hero-inner .sub{color:rgba(255,255,255,.9); margin-top:8px}
.cta-row{display:flex; gap:10px; margin-top:14px}

/* Sections */
.section{margin-top:24px}
.center{text-align:center}
.logo-row{display:flex; flex-wrap:wrap; gap:8px; margin-top:8px}
.chip{border:1px solid #e5e7eb; border-radius:999px; padding:8px 12px}
.panel.stat{display:flex; flex-direction:column; align-items:flex-start; gap:4px}
.panel.imgp img{width:100%; height:220px; object-fit:cover; border-radius:12px}

/* Thumbs */
.thumbs{display:flex; flex-wrap:wrap; gap:8px; margin-top:10px}
.thumb{border:1px solid #e5e7eb; border-radius:12px; padding:8px; background:#fff}
.thumb img{width:180px; height:120px; object-fit:cover; display:block; border-radius:8px}
.thumb .mini{margin-top:6px}

/* Reveal */
.reveal{opacity:0; transform:translateY(var(--y, 12px)); transition:opacity var(--dur, 420ms) ease, transform var(--dur, 420ms) ease}
.reveal.visible{opacity:1; transform:none}

/* Footer */
footer .foot{display:flex; align-items:center; justify-content:space-between; padding:24px 0; color:#64748b}
`;

/* ---------------------- Export HTML ---------------------- */

function buildExportHtml(model) {
  // Basic one-page export (hero + selected sections), self-contained CSS
  // Uses the same styles + generated content; no JS required in the output.
  const {
    brand,
    hero,
    layout,
    sections,
    valueItems,
    services,
    proof,
    pricing,
    contact,
    gallery,
  } = model;

  const css = `
  ${baseCss}
  :root{
    --ink:${brand.colors.primary};
    --accent:${brand.colors.accent};
    --bg:${brand.colors.neutral};
    --container:${layout.container}px;
    --radius:${layout.radius}px;

    --ts-p:16px; --ts-h6:18px; --ts-h5:20px; --ts-h4:25px; --ts-h3:31.25px; --ts-h2:39.06px; --ts-h1:48.83px;
    --y-gap:12px;
  }
  .reveal,.visible{opacity:1; transform:none} /* no observer in static export */
  .site-header.transparent{position:absolute; width:100%; background:transparent; border-bottom-color:transparent}
  `;

  const hasImg = !!hero.imageUrl;
  const overlay = Math.min(Math.max(hero.overlay ?? 0.35, 0), 0.8);

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(brand.name)} — Preview</title>
<style>${css}</style>
<body>
  <div class="site-root" style="background:var(--bg)">
    <div class="site-header ${layout.headerStyle === "transparent" ? "transparent" : ""}">
      <div class="container head-inner">
        <div class="logo">${escapeHtml(brand.name)}</div>
        <nav>
          <a href="#work">Work</a>
          <a href="#services">Services</a>
          <a href="#contact" class="btn sm">Contact</a>
        </nav>
      </div>
    </div>

    <section class="hero-block" style="border-radius:var(--radius)">
      <div class="hero-bg ${hasImg ? "with-img" : "with-grad"}" style="background-image:${
    hasImg
      ? `url('${escapeAttr(hero.imageUrl)}')`
      : `linear-gradient(120deg, ${brand.colors.primary}, ${brand.colors.accent})`
  }"></div>
      <div class="hero-scrim" style="background:rgba(0,0,0,${overlay})"></div>
      <div class="hero-inner">
        <div class="badge">${escapeHtml(brand.locations.join(" · "))}</div>
        <h1 class="ts-h1">${escapeHtml(hero.title || brand.name)}</h1>
        <p class="ts-h6 sub">${escapeHtml(hero.subtitle || brand.tagline)}</p>
        <div class="cta-row">
          ${
            hero.primaryCta
              ? `<a href="#contact" class="btn">${escapeHtml(hero.primaryCta)}</a>`
              : ""
          }
          ${
            hero.secondaryCta
              ? `<a href="#work" class="btn sec">${escapeHtml(hero.secondaryCta)}</a>`
              : ""
          }
        </div>
      </div>
    </section>

    <main>
      <div class="container">
        ${
          sections.value
            ? blockCards("What you get with us", valueItems)
            : ""
        }
        ${
          sections.services
            ? blockCards("Services", services, "services")
            : ""
        }
        ${sections.proof ? blockProof(proof) : ""}
        ${
          sections.gallery && gallery.length
            ? blockGallery(gallery)
            : ""
        }
        ${sections.pricing ? blockPricing(pricing) : ""}
        ${
          sections.cta
            ? `<section class="section center">
                 <h2 class="ts-h2">Ready to move faster?</h2>
                 <a href="#contact" class="btn" style="margin-top:12px">${escapeHtml(
                   hero.primaryCta || "Get in touch"
                 )}</a>
               </section>`
            : ""
        }
        ${sections.contact ? blockContact(contact, brand.locations) : ""}
      </div>
    </main>

    <footer>
      <div class="container foot">
        <div>© ${new Date().getFullYear()} ${escapeHtml(brand.name)}</div>
        <div class="muted">${escapeHtml(brand.locations.join(" · "))}</div>
      </div>
    </footer>
  </div>
</body>
</html>`;

  return html;
}

// helpers for export
function blockCards(title, items, id = "") {
  return `<section ${id ? `id="${id}"` : ""} class="section">
    <h2 class="ts-h2">${escapeHtml(title)}</h2>
    <div class="grid three">
      ${items
        .map(
          (it) => `<div class="panel">
            <div class="ts-h5" style="font-weight:600">${escapeHtml(it.title || "Untitled")}</div>
            <div class="ts-h6 muted" style="margin-top:4px">${escapeHtml(it.text || "")}</div>
          </div>`
        )
        .join("")}
    </div>
  </section>`;
}
function blockProof(proof) {
  return `<section class="section">
    <h2 class="ts-h2">Proof</h2>
    ${
      proof.logos?.length
        ? `<div class="logo-row">${proof.logos
            .map((l) => `<div class="chip">${escapeHtml(l)}</div>`)
            .join("")}</div>`
        : ""
    }
    ${
      proof.testimonials?.length
        ? `<div class="grid two" style="margin-top:var(--y-gap)">${proof.testimonials
            .map(
              (t) => `<div class="panel">
                <div class="ts-h6" style="font-style:italic">“${escapeHtml(t.quote)}”</div>
                <div class="ts-h6 muted" style="margin-top:8px">${escapeHtml(t.author || "")}</div>
              </div>`
            )
            .join("")}</div>`
        : ""
    }
    ${
      proof.metrics?.length
        ? `<div class="grid three" style="margin-top:var(--y-gap)">${proof.metrics
            .map(
              (m) => `<div class="panel stat">
                <div class="ts-h3 accent">${escapeHtml(m.value)}</div>
                <div class="ts-h6 muted">${escapeHtml(m.label)}</div>
              </div>`
            )
            .join("")}</div>`
        : ""
    }
  </section>`;
}
function blockPricing(tiers) {
  return `<section class="section">
    <h2 class="ts-h2">Pricing</h2>
    <div class="grid three">
      ${tiers
        .map(
          (t) => `<div class="panel">
            <div class="ts-h5" style="font-weight:600">${escapeHtml(t.name)}</div>
            <div class="ts-h3 accent" style="margin-top:4px">${escapeHtml(t.price)}</div>
            <ul class="ts-h6 muted" style="margin-top:8px">
              ${(t.items || []).map((x) => `<li>• ${escapeHtml(x)}</li>`).join("")}
            </ul>
            <a href="#contact" class="btn" style="margin-top:12px">Choose ${escapeHtml(t.name)}</a>
          </div>`
        )
        .join("")}
    </div>
  </section>`;
}
function blockGallery(gallery) {
  return `<section class="section">
    <h2 class="ts-h2">Gallery</h2>
    <div class="grid three">
      ${gallery
        .map((g, i) => `<div class="panel imgp"><img src="${escapeAttr(g.src)}" alt="${escapeAttr(g.alt || `img-${i}`)}"/></div>`)
        .join("")}
    </div>
  </section>`;
}
function blockContact(contact, locations) {
  return `<section class="section" id="contact">
    <h2 class="ts-h2">Contact</h2>
    <div class="panel">
      <div class="ts-h6">Email: <a class="accent" href="mailto:${escapeAttr(contact.email)}">${escapeHtml(contact.email)}</a></div>
      ${
        locations?.length
          ? `<div class="ts-h6 muted" style="margin-top:4px">Locations: ${escapeHtml(locations.join(" · "))}</div>`
          : ""
      }
      <form class="grid two" style="margin-top:var(--y-gap)" onsubmit="return false">
        <input class="input" placeholder="Name"/>
        <input class="input" placeholder="Email"/>
        <textarea class="input" rows="5" placeholder="Message"></textarea>
        <button class="btn" style="width:fit-content">Send</button>
      </form>
    </div>
  </section>`;
}

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s = "") {
  return escapeHtml(s).replaceAll("\n", " ");
}
