import * as React from "react";

export default function DatingAppStyleGuide() {
  const [dark, setDark] = React.useState(false);
  const [tab, setTab] = React.useState("Styleguide");
  const tabs = [
    "Styleguide",
    "Komponenten",
    "Discover",
    "Chat",
    "Profil",
    "Paywall",
    "Verifizierung",
    "Onboarding"
  ];

  // Green brand palette (Dua-like styling, brand-green primary)
  const cssVars = `:root {
  --bg:#ffffff;
  --surface:#F8FAFC;
  --text:#0F172A;
  --muted:#64748B;
  --border:#E5E7EB;

  /* Brand Green – aus Logo (#0B6E4F) abgeleitete Skala */
  --primary-50:#F1F9F6;
  --primary-100:#DCEFE9;
  --primary-200:#B1E7D6;
  --primary-300:#8ADBC2;
  --primary-400:#45DEAE;
  --primary-500:#22BE8D;
  --primary-600:#0B6E4F; /* Logo-Grün */
  --primary-700:#0B5B42;
  --primary-800:#093E2E;
  --primary-900:#072C21;

  /* Neutrale Akzente */
  --accent-100:#F3F4F6;
  --accent-600:#0F172A;

  --success:#10B981; --warning:#F59E0B; --danger:#EF4444;

  --radius-sm:8px; --radius-lg:16px; --radius-pill:9999px;
  --shadow-sm:0 1px 2px rgba(0,0,0,.06);
  --shadow-lg:0 10px 25px rgba(0,0,0,.12);
}
.theme-dark {
  --bg:#0B1220; --surface:#111827; --text:#E5E7EB; --muted:#94A3B8; --border:#1F2937;

  /* Dark-Mode-Tints vom selben Grün */
  --primary-50:#093E2E;
  --primary-100:#07362B;
  --primary-200:#0A4C39;
  --primary-300:#0D6147;
  --primary-400:#0E7A58;
  --primary-500:#22BE8D;
  --primary-600:#0B6E4F;
  --primary-700:#0A5B42;
  --primary-800:#09382C;
  --primary-900:#06261E;

  --accent-100:#111827; --accent-600:#93C5FD;
}`;

  const Container = ({ children }) => (
    <div className={`${dark ? "theme-dark" : ""} min-h-screen w-full`}>
      <style>{cssVars}</style>
      {/* Google Font: Poppins (Dua-like) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div
        className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] transition-colors duration-300"
        style={{fontFamily:'Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}
      >
        {children}
      </div>
    </div>
  );

  const Header = () => (
    <div className="sticky top-0 z-20 backdrop-blur border-b border-[var(--border)] bg-[color:rgb(255_255_255_/_0.6)] dark:bg-[color:rgb(17_24_39_/_0.6)]">
      <div className="mx-auto max-w-[1200px] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] flex items-center justify-center text-white text-xl">❤</div>
          <div className="text-2xl font-extrabold tracking-tight">Flare</div>
          <span className="ml-3 text-sm px-2 py-1 rounded-full bg-[var(--primary-100)] text-[var(--primary-600)]">v0.1 Styleguide</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={()=>setDark(d=>!d)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)]"
          >
            <span className="w-4 h-4 inline-block">{dark ? '🌙' : '☀️'}</span>
            <span>{dark? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const Tabbar = () => (
    <div className="mx-auto max-w-[1200px] px-4">
      <div className="mt-4 mb-6 flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t}
            onClick={()=>setTab(t)}
            className={`px-3 py-2 rounded-full text-sm border ${tab===t? 'bg-[var(--primary-600)] text-white border-transparent':'bg-transparent text-[var(--text)]/80 border-[var(--border)] hover:bg-[var(--surface)]'} transition-colors`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  const Section = ({title, subtitle, children}) => (
    <section className="mx-auto max-w-[1200px] px-6 mb-10">
      <h2 className="text-xl md:text-2xl font-bold mb-1">{title}</h2>
      {subtitle && <p className="text-[15px] text-[var(--muted)] mb-4">{subtitle}</p>}
      <div className="grid gap-6">{children}</div>
    </section>
  );

  const Badge = ({children, tone="primary"}) => (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-[var(--radius-pill)] text-xs font-medium ${
        tone === "primary"
          ? "bg-[var(--primary-100)] text-[var(--primary-600)]"
          : "bg-[var(--accent-100)] text-[var(--accent-600)]"
      }`}
    >
      {children}
    </span>
  );

  const Button = ({children, variant="primary", className="", ...props}) => {
    const base = "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--accent-600)]";
    const variants = {
      primary: `text-white bg-[var(--primary-600)] hover:brightness-110`,
      secondary: `text-[var(--text)] border border-[var(--border)] bg-[var(--surface)] hover:bg-white dark:hover:bg-[rgba(255,255,255,0.06)]`,
      ghost: `text-[var(--text)] hover:bg-[var(--surface)]`
    };
    return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
  };

  const Input = ({label, placeholder, error, hint, ...props}) => (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      <input
        className={`w-full h-11 rounded-[var(--radius-sm)] border px-3 bg-white dark:bg-[rgba(255,255,255,0.04)] transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)] ${error? 'border-[var(--danger)]':'border-[var(--border)]'}`}
        placeholder={placeholder}
        {...props}
      />
      {hint && <div className={`mt-1 text-xs ${error? 'text-[var(--danger)]':'text-[var(--muted)]'}`}>{hint}</div>}
    </label>
  );

  const Toggle = ({checked, onChange, label}) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className="text-sm">{label}</span>
      <span
        className={`w-11 h-6 rounded-full relative transition-colors ${checked? 'bg-[var(--primary-600)]':'bg-[var(--border)]'}`}
        onClick={()=>onChange(!checked)}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked? 'translate-x-5':''}`} />
      </span>
    </label>
  );

  const ColorSwatch = ({name, varName}) => (
    <div className="flex items.center gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="w-12 h-12 rounded-lg border border-[var(--border)]" style={{backgroundColor:`var(${varName})`}} />
      <div className="text-sm">
        <div className="font-semibold">{name}</div>
        <div className="text-[12px] text-[var(--muted)]"><code>{varName}</code></div>
      </div>
    </div>
  );

  // Mock data
  const profiles = [
    {
      id: 1,
      name: "Mara, 27",
      distance: "2 km entfernt",
      tags: ["Kaffee", "Wandern", "Jazz"],
      img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
      bio: "UX Designerin • liebt Dog-Cafés und Sonnenuntergänge."
    },
    {
      id: 2,
      name: "Lea, 29",
      distance: "5 km entfernt",
      tags: ["Kunst", "Pasta", "Yoga"],
      img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop",
      bio: "Museums-Nerd, Sonntagsmarkt, lerne Italienisch."
    },
    {
      id: 3,
      name: "Sara, 30",
      distance: "3 km entfernt",
      tags: ["Bouldern", "Indie", "Hunde"],
      img: "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?q=80&w=1200&auto=format&fit=crop",
      bio: "Immer für einen Roadtrip zu haben."
    }
  ];

  const [topIndex, setTopIndex] = React.useState(0);
  const topProfile = profiles[topIndex % profiles.length];

  const [onlyVerified, setOnlyVerified] = React.useState(true);
  const [incognito, setIncognito] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  return (
    <Container>
      <Header/>
      <Tabbar/>

      {tab === "Styleguide" && (
        <>
          <Section title="Farben" subtitle="Semantische Tokens – Light & Dark werden über den Toggle im Header geschaltet.">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Primary (Brand-Grün)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <ColorSwatch name="Primary 100" varName="--primary-100"/>
                  <ColorSwatch name="Primary 500" varName="--primary-500"/>
                  <ColorSwatch name="Primary 600" varName="--primary-600"/>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Accent & Feedback</h3>
                <div className="grid grid-cols-3 gap-3">
                  <ColorSwatch name="Accent 100" varName="--accent-100"/>
                  <ColorSwatch name="Accent 600" varName="--accent-600"/>
                  <ColorSwatch name="Success" varName="--success"/>
                  <ColorSwatch name="Warning" varName="--warning"/>
                  <ColorSwatch name="Danger" varName="--danger"/>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Typografie" subtitle="**Poppins** für UI & Headlines (Dua-like: modern, clean, rund).">
            <div className="space-y-3">
              <div className="text-4xl font-extrabold">Überschrift H1 – klare, moderne Eleganz</div>
              <div className="text-2xl font-bold">Überschrift H2</div>
              <div className="text-xl font-semibold">H3 – Sekundäre Überschrift</div>
              <p className="text-base leading-7 text-[var(--text)]/90 max-w-3xl">
                Body-Text: kurze, klare Sätze. Zeilenhöhe 1.5, max. Zeilenbreite ~70ch. Genderinklusive Sprache, freundlich, respektvoll.
              </p>
              <p className="text-sm text-[var(--muted)]">Caption / Helper Text</p>
            </div>
          </Section>

          <Section title="Spacing, Radius & Shadow" subtitle="Skalen & visuelle Beispiele">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Abstände</h4>
                <div className="space-y-2">
                  {[4,8,12,16,24,32,40,48,64].map(s=> (
                    <div key={s} className="flex items-center gap-3">
                      <div className="h-3 bg-[var(--primary-100)] rounded" style={{width:`${s}px`}} />
                      <span className="text-xs text-[var(--muted)]">{s}px</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Radii</h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)]" style={{borderRadius:'var(--radius-sm)'}} />
                  <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)]" style={{borderRadius:'var(--radius-lg)'}} />
                  <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)]" style={{borderRadius:'var(--radius-pill)'}} />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Shadows</h4>
                <div className="grid gap-3">
                  <div className="p-4 bg-white dark:bg-[rgba(255,255,255,0.06)] rounded-[var(--radius-lg)]" style={{boxShadow:'var(--shadow-sm)'}}>shadow-sm</div>
                  <div className="p-4 bg-white dark:bg-[rgba(255,255,255,0.06)] rounded-[var(--radius-lg)]" style={{boxShadow:'var(--shadow-lg)'}}>shadow-lg</div>
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

      {tab === "Komponenten" && (
        <Section title="UI-Komponenten" subtitle="Buttons, Inputs, Chips, Cards, Tabs & leere Zustände">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Buttons</h4>
              <div className="flex flex-wrap gap-3">
                <Button>Primär</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button className="rounded-[var(--radius-pill)]">Pill</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Badges</h4>
              <div className="flex flex-wrap gap-2">
                <Badge>Verifiziert</Badge>
                <Badge tone="accent">Neu</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Inputs</h4>
              <div className="grid gap-3">
                <Input label="Name" placeholder="z. B. Alex"/>
                <Input label="Über mich" placeholder="Kurz über dich" hint="Max. 140 Zeichen"/>
                <Input label="Phone" placeholder="+49…" error hint="Bitte gültige Nummer eingeben"/>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Toggles</h4>
              <div className="flex flex-col gap-3">
                <Toggle checked={onlyVerified} onChange={setOnlyVerified} label="Nur verifizierte Kontakte anzeigen"/>
                <Toggle checked={!!incognito} onChange={setIncognito} label="Incognito-Modus"/>
              </div>
            </div>

            <div className="space-y-3 md:col-span-2">
              <h4 className="font-semibold">Card & Empty State</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4" style={{boxShadow:'var(--shadow-lg)'}}>
                  <div className="font-semibold mb-1">Profilkarte</div>
                  <div className="text-sm text-[var(--muted)]">Container für Profilvorschau/Infos</div>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="h-24 rounded-[var(--radius-sm)] bg-[var(--primary-100)]" />
                  <div className="mt-3 h-2 w-1/2 bg-[var(--border)] rounded" />
                  <div className="mt-2 h-2 w-1/3 bg-[var(--border)] rounded" />
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-semibold">Noch nichts hier</div>
                  <div className="text-sm text-[var(--muted)] mb-3">Starte mit deiner ersten Intro-Anfrage.</div>
                  <Button>Profile entdecken</Button>
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {tab === "Discover" && (
        <Section title="Discover (Intro-Deck)" subtitle="Hero-Karte mit Aktionen & Tags">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="relative h-[520px] rounded-[24px] overflow-hidden border border-[var(--border)]" style={{boxShadow:'var(--shadow-lg)'}}>
                <img src={topProfile.img} alt="profil" className="w-full h-full object-cover"/>
                <div
                  className="absolute inset-0 bg-gradient-to-t
                  from-[rgba(11,110,79,0.55)]
                  via-[rgba(11,110,79,0.25)]
                  to-transparent"
                />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="text-2xl font-bold drop-shadow">{topProfile.name} · {topProfile.distance}</div>
                  <div className="mt-1 text-sm opacity-90">{topProfile.bio}</div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {topProfile.tags.map(t=> <span key={t} className="px-3 py-1 rounded-full bg-white/20 text-[12px] backdrop-blur">{t}</span>)}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button onClick={()=>setTopIndex(i=>i+1)} className="w-14 h-14 rounded-full bg-white text-[var(--text)] flex items-center justify-center text-xl shadow-md">✖</button>
                    <button onClick={()=>setShowModal(true)} className="w-14 h-14 rounded-full bg-[var(--accent-600)] text-white flex items.center justify-center text-xl shadow-md">★</button>
                    <button onClick={()=>setTopIndex(i=>i+1)} className="w-14 h-14 rounded-full bg-[var(--primary-600)] text-white flex items-center justify-center text-xl shadow-md">❤</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[16px] p-4 border border-[var(--border)] bg-[var(--surface)]">
                <div className="font-semibold mb-2">Filter (Premium)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="w-full">Distanz &lt; 5 km</Button>
                  <Button variant="secondary" className="w-full">Alter 25–34</Button>
                  <Button variant="secondary" className="w-full">Haustiere ❤</Button>
                  <Button variant="secondary" className="w-full">Nichtraucher</Button>
                </div>
              </div>
              <div className="rounded-[16px] p-4 border border-[var(--border)] bg-[var(--surface)]">
                <div className="font-semibold mb-2">Einstellungen</div>
                <div className="space-y-3">
                  <Toggle checked={onlyVerified} onChange={setOnlyVerified} label="Nur verifizierte zeigen"/>
                  <Toggle checked={incognito} onChange={setIncognito} label="Incognito-Modus"/>
                </div>
              </div>
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-6" onClick={()=>setShowModal(false)}>
              <div className="w.full max-w-md rounded-[24px] border border-[var(--border)] bg-[var(--bg)] p-6" onClick={e=>e.stopPropagation()}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold">Superlike ✨</div>
                    <p className="text-sm text-[var(--muted)]">Springe nach oben & werde gesehen. 1 Credit.</p>
                  </div>
                  <button className="text-2l" onClick={()=>setShowModal(false)}>✖</button>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={()=>setShowModal(false)}>Vielleicht später</Button>
                  <Button className="flex-1" onClick={()=>setShowModal(false)}>Jetzt boosten</Button>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}
    </Container>
  );
}
