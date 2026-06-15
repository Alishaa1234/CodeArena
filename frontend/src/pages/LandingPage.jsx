import { Link } from "react-router";
import { useState } from "react";
import useTheme from "../hooks/useTheme";
import "./LandingPage.css";

import pillarCode from "../assets/pillar-code.jpg";
import pillarMock from "../assets/pillar-mock.jpg";
import pillarAts from "../assets/pillar-ats.jpg";
import dashboard from "../assets/dashboard.jpg";

export default function LandingPage() {
  return (
    <div className="landing-page lp-bg-background lp-text-foreground">
      <Nav />
      <main>
        <Hero />
        <LogoCloud />
        <Features />
        <Showcase />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    NAV                                     */
/* -------------------------------------------------------------------------- */

function Nav() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Practice", href: "#features" },
    { label: "Interviews", href: "#features" },
    { label: "ATS", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header className="lp-sticky lp-top-0 lp-z-50 lp-w-full">
      <div className="lp-glass lp-border-b lp-border-border-60">
        <div className="lp-mx-auto lp-flex lp-h-16 lp-max-w-6xl lp-items-center lp-justify-between lp-px-4 lp-sm-px-6">
          <Link to="/" className="lp-flex lp-items-center lp-gap-2">
            <LogoMark />
            <span className="lp-text-base lp-font-semibold lp-tracking-tight">CodeArena</span>
          </Link>

          <nav className="lp-hidden lp-items-center lp-gap-8 lp-md-flex">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="lp-text-sm lp-font-medium lp-text-muted-foreground lp-transition-colors lp-hover-text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="lp-flex lp-items-center lp-gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="lp-grid lp-size-9 lp-cursor-pointer lp-place-items-center lp-rounded-md lp-text-muted-foreground lp-transition-colors lp-hover-bg-secondary lp-hover-text-foreground"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <Link
              to="/login"
              className="lp-hidden lp-rounded-md lp-px-3 lp-py-2 lp-text-sm lp-font-medium lp-text-muted-foreground lp-transition-colors lp-hover-text-foreground lp-sm-inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="lp-inline-flex lp-items-center lp-gap-1.5 lp-rounded-md lp-bg-primary lp-px-3.5 lp-py-2 lp-text-sm lp-font-medium lp-text-primary-foreground lp-shadow-elegant lp-transition-all lp-hover-brightness-110"
            >
              Get started
              <ArrowRight className="lp-size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              className="lp-grid lp-size-9 lp-cursor-pointer lp-place-items-center lp-rounded-md lp-text-muted-foreground lp-transition-colors lp-hover-bg-secondary lp-hover-text-foreground lp-md-hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
        {open ? (
          <div className="lp-border-t lp-border-border-60 lp-md-hidden">
            <nav className="lp-mx-auto lp-flex lp-flex-col lp-px-4 lp-py-4 lp-sm-px-6">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="lp-py-2 lp-text-sm lp-font-medium lp-text-muted-foreground lp-transition-colors lp-hover-text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    HERO                                    */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="lp-relative lp-overflow-hidden">
      <div aria-hidden className="lp-absolute lp-inset-0 lp-bg-hero-glow" />
      <div
        aria-hidden
        className="lp-absolute lp-inset-0 lp-bg-grid lp-opacity-40"
        style={{ maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)" }}
      />
      <div className="lp-relative lp-mx-auto lp-max-w-6xl lp-px-4 lp-pt-20 lp-pb-24 lp-sm-px-6 lp-sm-pt-28 lp-sm-pb-32 lp-lg-pt-36">
        <div className="lp-mx-auto lp-max-w-3xl lp-text-center">
          <a
            href="#features"
            className="lp-animate-fade-up lp-inline-flex lp-items-center lp-gap-2 lp-rounded-full lp-border lp-border-border lp-bg-surface-60 lp-px-3 lp-py-1 lp-text-xs lp-font-medium lp-text-muted-foreground lp-backdrop-blur lp-transition-colors lp-hover-text-foreground"
          >
            <span className="lp-size-1.5 lp-rounded-full lp-bg-primary" />
            New — AI interviewer v2 is live
            <ArrowRight className="lp-size-3" />
          </a>

          <h1
            className="lp-animate-fade-up lp-mt-6 lp-text-balance lp-text-4xl lp-font-semibold lp-tracking-tight lp-sm-text-5xl lp-md-text-6xl lp-lg-text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            Code. Interview.{" "}
            <span className="lp-bg-gradient-to-br-primary lp-bg-clip-text lp-text-transparent">
              Land the offer.
            </span>
          </h1>

          <p
            className="lp-animate-fade-up lp-mx-auto lp-mt-6 lp-max-w-2xl lp-text-pretty lp-text-base lp-text-muted-foreground lp-sm-text-lg"
            style={{ animationDelay: "120ms" }}
          >
            One platform to sharpen your code, simulate real interviews with AI, and
            optimize your resume against modern ATS — built with the rigor engineers expect.
          </p>

          <div
            className="lp-animate-fade-up lp-mt-10 lp-flex lp-flex-col lp-items-center lp-justify-center lp-gap-3 lp-sm-flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              to="/signup"
              className="lp-inline-flex lp-w-full lp-items-center lp-justify-center lp-gap-1.5 lp-rounded-md lp-bg-primary lp-px-5 lp-py-3 lp-text-sm lp-font-medium lp-text-primary-foreground lp-shadow-elegant lp-transition-all lp-hover-brightness-110 lp-sm-w-auto"
            >
              Start free
              <ArrowRight className="lp-size-4" />
            </Link>
            <a
              href="#showcase"
              className="lp-inline-flex lp-w-full lp-items-center lp-justify-center lp-gap-1.5 lp-rounded-md lp-border lp-border-border lp-bg-surface-60 lp-px-5 lp-py-3 lp-text-sm lp-font-medium lp-text-foreground lp-backdrop-blur lp-transition-colors lp-hover-bg-surface lp-sm-w-auto"
            >
              See it in action
            </a>
          </div>
        </div>

        {/* Product preview */}
        <div
          className="lp-animate-fade-up lp-relative lp-mx-auto lp-mt-16 lp-max-w-5xl lp-sm-mt-20"
          style={{ animationDelay: "240ms" }}
        >
          <div
            aria-hidden
            className="lp-absolute lp-inset-0 lp-blur-2xl lp-bg-gradient-to-b-primary-20 lp-rounded-2rem"
            style={{ zIndex: -10, transform: "scale(1.05)" }}
          />
          <div className="lp-overflow-hidden lp-rounded-xl lp-border lp-border-border lp-bg-card lp-shadow-elegant lp-sm-rounded-2xl">
            <div className="lp-flex lp-h-9 lp-items-center lp-gap-2 lp-border-b lp-border-border lp-bg-surface-elevated lp-px-4">
              <span className="lp-size-2.5 lp-rounded-full" style={{ backgroundColor: "oklch(0.7 0.18 25 / 0.6)" }} />
              <span className="lp-size-2.5 lp-rounded-full" style={{ backgroundColor: "oklch(0.78 0.16 85 / 0.6)" }} />
              <span className="lp-size-2.5 lp-rounded-full" style={{ backgroundColor: "oklch(0.72 0.16 145 / 0.6)" }} />
              <span className="lp-ml-3 lp-hidden lp-text-xs lp-text-muted-foreground lp-sm-inline">
                codearena.app / dashboard
              </span>
            </div>
            <img
              src={dashboard}
              alt="CodeArena dashboard preview"
              width={1600}
              height={896}
              className="lp-block lp-aspect-16-9 lp-w-full lp-object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                LOGO CLOUD                                  */
/* -------------------------------------------------------------------------- */

function LogoCloud() {
  const logos = ["Google", "Stripe", "Meta", "Vercel", "Datadog", "Linear"];
  return (
    <section className="lp-border-y lp-border-border-60 lp-bg-surface-40">
      <div className="lp-mx-auto lp-max-w-6xl lp-px-4 lp-py-10 lp-sm-px-6">
        <p className="lp-text-center lp-text-xs lp-font-medium lp-uppercase lp-tracking-widest lp-text-muted-foreground">
          Trusted by engineers shipping at
        </p>
        <div className="lp-mt-6 lp-grid lp-grid-cols-3 lp-items-center lp-justify-items-center lp-gap-6 lp-sm-grid-cols-6">
          {logos.map((l) => (
            <span
              key={l}
              className="lp-text-base lp-font-semibold lp-tracking-tight lp-text-muted-foreground-70 lp-transition-colors lp-hover-text-foreground lp-sm-text-lg"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  FEATURES                                  */
/* -------------------------------------------------------------------------- */

const featuresList = [
  {
    eyebrow: "Practice",
    title: "Hardcore coding practice",
    body: "A first-class editor with real test runners, language servers, and instant feedback. Pattern-grouped problems calibrated to the role you're targeting.",
    img: pillarCode,
    alt: "Code editor preview",
    tags: ["LSP", "Multi-runtime", "Hints"],
  },
  {
    eyebrow: "Interviews",
    title: "AI mock interviews",
    body: "Practice technical and behavioral rounds with an AI interviewer that pushes back, asks follow-ups, and grades signal — not just syntax.",
    img: pillarMock,
    alt: "Mock interview preview",
    tags: ["Voice", "Live transcripts", "Rubric"],
  },
  {
    eyebrow: "Resume",
    title: "ATS score analysis",
    body: "Upload your resume and a JD — get a precise match score, missing keywords, and rewrite suggestions tuned to modern parsers.",
    img: pillarAts,
    alt: "ATS analyzer preview",
    tags: ["Keyword graph", "JD match", "Rewrite"],
  },
];

function Features() {
  return (
    <section id="features" className="lp-relative">
      <div className="lp-mx-auto lp-max-w-6xl lp-px-4 lp-py-20 lp-sm-px-6 lp-sm-py-28">
        <div className="lp-mx-auto lp-max-w-2xl lp-text-center">
          <p className="lp-text-sm lp-font-medium lp-text-primary">Everything in one place</p>
          <h2 className="lp-mt-3 lp-text-balance lp-text-3xl lp-font-semibold lp-tracking-tight lp-sm-text-4xl lp-md-text-5xl">
            Built for the path to the offer.
          </h2>
          <p className="lp-mt-4 lp-text-pretty lp-text-base lp-text-muted-foreground">
            Three products that share one data layer — your practice signals improve your
            mock interviews, and both improve your resume.
          </p>
        </div>

        <div className="lp-mt-14 lp-grid lp-gap-5 lp-sm-gap-6 lp-lg-grid-cols-3">
          {featuresList.map((f) => (
            <article
              key={f.title}
              className="lp-group lp-relative lp-flex lp-flex-col lp-overflow-hidden lp-rounded-2xl lp-border lp-border-border lp-bg-card lp-transition-all"
            >
              <div className="lp-relative lp-aspect-16-10 lp-w-full lp-overflow-hidden lp-bg-surface">
                <img
                  src={f.img}
                  alt={f.alt}
                  width={800}
                  height={500}
                  loading="lazy"
                  className="lp-w-full lp-h-full lp-object-cover lp-transition-all lp-duration-500 lp-group-hover-scale-103"
                />
                <div
                  aria-hidden
                  className="lp-absolute lp-inset-0 lp-h-24 lp-bg-gradient-to-t-card"
                  style={{ top: "auto" }}
                />
              </div>
              <div className="lp-flex lp-flex-1 lp-flex-col lp-p-6">
                <p className="lp-text-xs lp-font-medium lp-uppercase lp-tracking-widest lp-text-primary">
                  {f.eyebrow}
                </p>
                <h3 className="lp-mt-2 lp-text-lg lp-font-semibold lp-tracking-tight">{f.title}</h3>
                <p className="lp-mt-2 lp-text-sm lp-leading-relaxed lp-text-muted-foreground">{f.body}</p>
                <div className="lp-mt-5 lp-flex lp-flex-wrap lp-gap-1.5">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="lp-rounded-full lp-border lp-border-border lp-bg-surface lp-px-2.5 lp-py-0.5 lp-text-xs lp-font-medium lp-text-muted-foreground"
                      style={{ fontSize: "11px" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SHOWCASE                                  */
/* -------------------------------------------------------------------------- */

function Showcase() {
  const steps = [
    {
      n: "01",
      title: "Drop in your resume",
      body: "Upload a PDF or paste your LinkedIn. We parse it like an ATS would.",
    },
    {
      n: "02",
      title: "Practice with intent",
      body: "Get problems and mock rounds aligned to the gaps in your profile.",
    },
    {
      n: "03",
      title: "Apply with confidence",
      body: "Track applications, ATS scores, and interview performance in one place.",
    },
  ];
  return (
    <section id="showcase" className="lp-relative lp-overflow-hidden">
      <div className="lp-mx-auto lp-max-w-6xl lp-px-4 lp-py-20 lp-sm-px-6 lp-sm-py-28">
        <div className="lp-grid lp-gap-10 lp-lg-grid-cols-2 lp-lg-items-center lp-lg-gap-16">
          <div>
            <p className="lp-text-sm lp-font-medium lp-text-primary">A single workflow</p>
            <h2 className="lp-mt-3 lp-text-balance lp-text-3xl lp-font-semibold lp-tracking-tight lp-sm-text-4xl lp-md-text-5xl">
              From resume to offer, one loop.
            </h2>
            <p className="lp-mt-4 lp-text-pretty lp-text-base lp-text-muted-foreground">
              Stop juggling five tools. CodeArena connects your practice, interviews, and
              applications so every signal compounds.
            </p>

            <ol className="lp-mt-10 lp-gap-6 lp-flex lp-flex-col">
              {steps.map((s) => (
                <li key={s.n} className="lp-flex lp-gap-4">
                  <div className="lp-grid lp-size-8 lp-shrink-0 lp-place-items-center lp-rounded-md lp-border lp-border-border lp-bg-surface lp-text-xs lp-font-semibold lp-text-primary">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="lp-text-sm lp-font-semibold">{s.title}</h3>
                    <p className="lp-mt-1 lp-text-sm lp-text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lp-relative">
            <div
              aria-hidden
              className="lp-absolute lp-inset-0 lp-blur-2xl lp-bg-gradient-to-tr-primary-15 lp-rounded-2rem"
              style={{ zIndex: -10, transform: "scale(1.1)" }}
            />
            <div className="lp-overflow-hidden lp-rounded-2xl lp-border lp-border-border lp-bg-card lp-shadow-elegant">
              <div className="lp-flex lp-h-9 lp-items-center lp-gap-2 lp-border-b lp-border-border lp-bg-surface-elevated lp-px-4">
                <span className="lp-size-2.5 lp-rounded-full" style={{ backgroundColor: "oklch(0.7 0.18 25 / 0.6)" }} />
                <span className="lp-size-2.5 lp-rounded-full" style={{ backgroundColor: "oklch(0.78 0.16 85 / 0.6)" }} />
                <span className="lp-size-2.5 lp-rounded-full" style={{ backgroundColor: "oklch(0.72 0.16 145 / 0.6)" }} />
                <span className="lp-ml-3 lp-truncate lp-text-xs lp-text-muted-foreground">
                  codearena.app / resume-analyzer
                </span>
              </div>
              <img
                src={pillarAts}
                alt="Resume analyzer"
                width={800}
                height={608}
                loading="lazy"
                className="lp-block lp-aspect-4-3 lp-w-full lp-object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STATS                                    */
/* -------------------------------------------------------------------------- */

function Stats() {
  const stats = [
    { k: "Engineers", v: "48,720" },
    { k: "Offers reported", v: "14,200+" },
    { k: "Avg ATS lift", v: "+38%" },
    { k: "Mock sessions / day", v: "2.1k" },
  ];
  return (
    <section className="lp-border-y lp-border-border-60 lp-bg-surface-40">
      <div className="lp-mx-auto lp-grid lp-max-w-6xl lp-grid-cols-2 lp-gap-8 lp-px-4 lp-py-14 lp-sm-grid-cols-4 lp-sm-px-6">
        {stats.map((s) => (
          <div key={s.k}>
            <div className="lp-text-3xl lp-font-semibold lp-tracking-tight lp-sm-text-4xl">{s.v}</div>
            <div className="lp-mt-1 lp-text-xs lp-font-medium lp-uppercase lp-tracking-widest lp-text-muted-foreground">
              {s.k}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    CTA                                     */
/* -------------------------------------------------------------------------- */

function CTA() {
  return (
    <section id="pricing" className="lp-relative lp-overflow-hidden">
      <div className="lp-mx-auto lp-max-w-6xl lp-px-4 lp-py-20 lp-sm-px-6 lp-sm-py-28">
        <div className="lp-relative lp-overflow-hidden lp-rounded-3xl lp-border lp-border-border lp-bg-card lp-p-10 lp-text-center lp-shadow-elegant lp-sm-p-16">
          <div aria-hidden className="lp-absolute lp-inset-0 lp-bg-hero-glow lp-opacity-80" />
          <div
            aria-hidden
            className="lp-absolute lp-inset-0 lp-bg-grid lp-opacity-30"
            style={{ maskImage: "radial-gradient(ellipse at center, black, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 70%)" }}
          />
          <div className="lp-relative">
            <h2 className="lp-text-balance lp-text-3xl lp-font-semibold lp-tracking-tight lp-sm-text-4xl lp-md-text-5xl">
              Ready to ship your next offer?
            </h2>
            <p className="lp-mx-auto lp-mt-4 lp-max-w-xl lp-text-pretty lp-text-base lp-text-muted-foreground">
              Start free. Upgrade only when you're crushing it. Cancel anytime.
            </p>
            <div className="lp-mt-8 lp-flex lp-flex-col lp-items-center lp-justify-center lp-gap-3 lp-sm-flex-row">
              <Link
                to="/signup"
                className="lp-inline-flex lp-w-full lp-items-center lp-justify-center lp-gap-1.5 lp-rounded-md lp-bg-primary lp-px-5 lp-py-3 lp-text-sm lp-font-medium lp-text-primary-foreground lp-shadow-glow lp-transition-all lp-hover-brightness-110 lp-sm-w-auto"
              >
                Get started for free
                <ArrowRight className="lp-size-4" />
              </Link>
              <a
                href="#features"
                className="lp-inline-flex lp-w-full lp-items-center lp-justify-center lp-gap-1.5 lp-rounded-md lp-border lp-border-border lp-bg-surface-60 lp-px-5 lp-py-3 lp-text-sm lp-font-medium lp-text-foreground lp-backdrop-blur lp-transition-colors lp-hover-bg-surface lp-sm-w-auto"
              >
                Talk to sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   FOOTER                                   */
/* -------------------------------------------------------------------------- */

function Footer() {
  const cols = [
    ["Product", ["Practice", "Interviews", "ATS", "Changelog"]],
    ["Company", ["About", "Customers", "Careers", "Contact"]],
    ["Resources", ["Docs", "Guides", "Status", "Security"]],
    ["Legal", ["Privacy", "Terms", "Cookies"]],
  ];
  return (
    <footer className="lp-border-t lp-border-border lp-bg-surface-30">
      <div className="lp-mx-auto lp-max-w-6xl lp-px-4 lp-py-14 lp-sm-px-6">
        <div className="lp-grid lp-gap-10 lp-lg-grid-cols-5">
          <div className="lp-lg-col-span-2">
            <Link to="/" className="lp-flex lp-items-center lp-gap-2">
              <LogoMark />
              <span className="lp-text-base lp-font-semibold lp-tracking-tight">CodeArena</span>
            </Link>
            <p className="lp-mt-4 lp-max-w-sm lp-text-sm lp-text-muted-foreground">
              The integrated environment for engineers preparing for their next role.
            </p>
          </div>
          {cols.map(([heading, items]) => (
            <div key={heading}>
              <h4 className="lp-text-xs lp-font-semibold lp-uppercase lp-tracking-widest lp-text-muted-foreground">
                {heading}
              </h4>
              <ul className="lp-mt-4 lp-flex lp-flex-col lp-gap-2.5" style={{ listStyle: "none", padding: 0 }}>
                {items.map((i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="lp-text-sm lp-text-muted-foreground lp-transition-colors lp-hover-text-foreground"
                    >
                      {i}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="lp-mt-12 lp-flex lp-flex-col lp-items-start lp-justify-between lp-gap-4 lp-border-t lp-border-border lp-pt-6 lp-sm-flex-row lp-sm-items-center">
          <p className="lp-text-xs lp-text-muted-foreground">
            &copy; {new Date().getFullYear()} CodeArena Systems. All rights reserved.
          </p>
          <div className="lp-flex lp-items-center lp-gap-5 lp-text-muted-foreground">
            <a href="#" aria-label="X" className="lp-transition-colors lp-hover-text-foreground">
              <XIcon />
            </a>
            <a href="#" aria-label="GitHub" className="lp-transition-colors lp-hover-text-foreground">
              <GitHubIcon />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="lp-transition-colors lp-hover-text-foreground"
            >
              <LinkedInIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    ICONS                                   */
/* -------------------------------------------------------------------------- */

function LogoMark() {
  return (
    <span
      aria-hidden
      className="lp-grid lp-size-7 lp-place-items-center lp-rounded-md lp-bg-gradient-to-br-primary lp-text-primary-foreground lp-shadow-glow"
    >
      <svg viewBox="0 0 24 24" className="lp-size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ArrowRight({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lp-size-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lp-size-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" strokeLinejoin="round" />
    </svg>
  );
}

// Fixed menu icon to match standard hamburger, with namespaced sizing
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lp-size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lp-size-4" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.81l-4.77-6.24L4.8 22H2.04l6.98-7.98L2 2h6.94l4.31 5.69L18.244 2Zm-1.19 18h1.88L7.04 4h-1.96l11.97 16Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lp-size-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.5 3.18-1.18 3.18-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.43-2.7 5.4-5.27 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="lp-size-4" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.78 2.66 4.78 6.12V21h-4v-5.45c0-1.3-.02-2.97-1.8-2.97-1.8 0-2.08 1.4-2.08 2.86V21h-4V9Z" />
    </svg>
  );
}
