import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import "./admin.css";
import { t, setting, useContent, useSEO, imageURL } from "./cms";
const Admin = lazy(() => import("./Admin"));
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="admin-login">
        <h1>Unable to display this page.</h1>
        <p>
          Please reload. If the problem continues, check the last content
          changes.
        </p>
        <a href="/">Back to website</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
import Contact from "./Contact";
import { Blog, ContentPage } from "./PublicContent";
function Icon({ name }) {
  const paths = {
    social: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21v-2a7 7 0 0114 0v2M18 4a3 3 0 010 6M21 19v-2a6 6 0 00-3-5" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    spark: (
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
    ),
    web: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M2 9h20M6 6.5h.01M9 6.5h.01M7 14l-2 2 2 2M17 14l2 2-2 2M13 13l-2 6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="7.5" />
        <path d="M16 16l6 6M7 11l2-3 3 4 2-3" />
      </>
    ),
    play: (
      <>
        <rect x="3" y="2" width="18" height="20" rx="4" />
        <path d="M10 8l6 4-6 4z" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function Logo({ light = false }) {
  return (
    <img
      className={"logo " + (light ? "logo-light" : "")}
      src={imageURL(setting("logo"))}
      alt="Global ThinQ"
      width="180"
      height="70"
    />
  );
}
function ConceptArt({ kind }) {
  return kind === "brand-concept" ? (
    <div className="concept-art brand-art" aria-hidden="true">
      <span className="concept-note">{t("EVERYDAY, REIMAGINED.")}</span>
      <div className="pack pack-one">
        {t("little")}
        <br />
        <em>{t("joy.")}</em>
        <small>{t("GOOD THINGS. SIMPLY.")}</small>
      </div>
      <div className="pack pack-two">
        {t("little")}
        <br />
        <em>{t("joy.")}</em>
        <small>{t("A MOMENT FOR YOU.")}</small>
      </div>
      <span className="flower">✳</span>
    </div>
  ) : kind === "social-concept" ? (
    <div className="concept-art social-art" aria-hidden="true">
      <div className="social-poster">
        <small>{t("YOUR NEXT CHAPTER")}</small>
        <strong>
          {t("MAKE")}
          <br />
          {t("SOME")}
          <br />
          <i>{t("NOISE.")}</i>
        </strong>
        <span className="poster-star">✳</span>
        <span className="poster-bottom">
          {t("GOOD IDEAS DON'T WHISPER. ↗")}
        </span>
      </div>
      <span className="poster-sticker">
        {t("HELLO,")}
        <br />
        {t("POSSIBILITY.")}
      </span>
    </div>
  ) : (
    <div className="concept-art web-art" aria-hidden="true">
      <div className="mini-browser">
        <div className="browser-top">
          <i />
          <i />
          <i />
          <span>{t("form & everyday")}</span>
        </div>
        <div className="browser-body">
          <small>{t("OBJECTS WITH INTENTION")}</small>
          <strong>
            {t("Less, but")}
            <br />
            <i>{t("better.")}</i>
          </strong>
          <div className="vase">
            <i />
          </div>
          <span className="mini-btn">{t("Explore the collection ↗")}</span>
        </div>
      </div>
      <div className="mini-phone">
        <span>{t("form.")}</span>
        <div className="phone-orb" />
        <small>
          {t("Good design.")}
          <br />
          {t("Every day.")}
        </small>
      </div>
    </div>
  );
}
function App() {
  const content = useContent();
  const { services, portfolio: concepts } = content;
  const steps = content.settings.steps,
    faqs = content.settings.faqs;
  useSEO(content.settings.seo);
  const [menu, setMenu] = useState(false),
    [filter, setFilter] = useState("All"),
    [active, setActive] = useState(0),
    [selected, setSelected] = useState("A complete digital strategy"),
    [modal, setModal] = useState(null),
    [brief, setBrief] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    const items = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    items.forEach((i) => observer.observe(i));
    return () => observer.disconnect();
  }, [content]);
  useEffect(() => {
    if (modal) dialog.current.showModal();
  }, [modal]);
  function close() {
    dialog.current.close();
    setModal(null);
  }
  function choose(name) {
    setSelected(name);
    close();
    document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
  }
  function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBrief(
      `GLOBAL THINQ — PROJECT BRIEF\n\nName: ${d.get("name")}\nBusiness: ${d.get("business")}\nEmail: ${d.get("email")}\nService: ${selected}\n\nGoals:\n${d.get("goals")}`,
    );
    setModal({ kind: "brief" });
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([brief], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Global-ThinQ-project-brief.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <a href="#main" className="skip">
        {t("Skip to content")}
      </a>
      <div className="announcement">
        <span>{t("Fresh thinking. Local insight. Global possibilities.")}</span>
        <a href="#contact">
          {t("Let's make your next move ")}
          <Arrow />
        </a>
      </div>
      <header>
        <nav className="container">
          <a href="#" aria-label="Global ThinQ home">
            <Logo />
          </a>
          <div
            id="mobile-navigation"
            className={"nav-links " + (menu ? "open" : "")}
          >
            {[
              ["Services", "services"],
              ["Creative lab", "work"],
              ["The studio", "studio"],
              ["Our process", "process"],
            ].map(([label, id]) => (
              <a key={id} href={"#" + id} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </div>
          <a className="button dark nav-cta" href="#contact">
            {t("Start a project ")}
            <Arrow />
          </a>
          <button
            className="menu"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            aria-label="Toggle menu"
          >
            {menu ? "✕" : "☰"}
          </button>
        </nav>
      </header>
      <main id="main">
        {content.error && (
          <p className="cms-notice" role="alert">
            {content.error}
          </p>
        )}
        <section className="hero">
          <div className="hero-wash" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <i />
                {t(" INDEPENDENT DIGITAL THINKING · BANGLADESH")}
              </div>
              <h1>
                {t("Good ideas")}
                <br />
                {t("deserve a")}
                <br />
                <em>{t("bigger stage.")}</em>
                <span className="title-spark" aria-hidden="true">
                  ✳
                </span>
              </h1>
              <p>
                {t(
                  "We help ambitious brands find their voice, reach their people, and turn the next big idea into their next big move.",
                )}
              </p>
              <div className="hero-actions">
                <a className="button dark" href="#contact">
                  {t("Let's make something matter ")}
                  <Arrow />
                </a>
                <a href="#work" className="round-link">
                  <span>↓</span>
                  {t(" Explore the possibilities")}
                </a>
              </div>
              <div className="hero-foot">
                <span>{t("STRATEGY. CREATIVE. DIGITAL.")}</span>
                <span>{t("বাংলাদেশ থেকে, আরও দূরে।")}</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="art-frame">
                <img
                  src={imageURL(setting("hero_image"))}
                  alt={setting("hero_alt")}
                  fetchPriority="high"
                />
                <span className="art-number">
                  {t("GT / CREATIVE THINKING, IN MOTION")}
                </span>
              </div>
              <div className="hero-sticker">
                <span>
                  {t("THINK")}
                  <br />
                  {t("OUTSIDE")}
                  <br />
                  <em>{t("the ordinary.")}</em>
                </span>
                <Arrow />
              </div>
              <div className="floating-pill">
                <span className="mini-spark">✳</span>
                {t(" Your next chapter starts here.")}
              </div>
              <span className="visual-caption">
                {t("A LITTLE CURIOUS. A LOT OF POSSIBLE.")}
              </span>
            </div>
          </div>
        </section>
        <div
          className="ticker"
          aria-label="Strategy, creativity, digital and a little different"
        >
          <div className="ticker-track" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i}>
                <span>{t("Strategy with direction")}</span>
                <b>✳</b>
                <span>{t("Creative with character")}</span>
                <b>✳</b>
                <span>{t("Digital with purpose")}</span>
                <b>✳</b>
                <span>{t("A little different")}</span>
                <b>✳</b>
              </div>
            ))}
          </div>
        </div>
        <section className="services-section section" id="services">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <div className="eyebrow">
                  {t("01 / WHAT WE BRING TO THE TABLE")}
                </div>
                <h2>
                  {t("A fresh perspective.")}
                  <br />
                  <em>{t("A connected approach.")}</em>
                </h2>
              </div>
              <p>
                {t("One brand. Many ways to connect.")}
                <br />
                {t(
                  "We bring the right skills together around what your business needs next.",
                )}
              </p>
            </div>
            <div className="service-grid">
              {services.map((s, i) => (
                <button
                  className={"service-card " + s.color + " reveal"}
                  key={s.name}
                  onClick={() => setModal({ kind: "service", data: s })}
                >
                  <div className="service-top">
                    <span className="icon-box">
                      <Icon name={s.icon} />
                    </span>
                    <span className="service-number">0{i + 1} /</span>
                  </div>
                  {s.image && (
                    <img
                      className="cms-card-image"
                      src={imageURL(s.image)}
                      alt={s.alt || s.name}
                    />
                  )}
                  <div className="service-tag">{s.type}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {s.price && <p>{s.price}</p>}
                  <div className="card-bottom">
                    <span>
                      Explore{" "}
                      {s.name === "Search engine optimisation"
                        ? "SEO"
                        : s.name.toLowerCase()}
                    </span>
                    <span className="circle-arrow">
                      <Arrow />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="work-section section" id="work">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <div className="eyebrow">{t("02 / THE CREATIVE LAB")}</div>
                <h2>
                  {t("Less ordinary.")}
                  <br />
                  <em>{t("More possibility.")}</em>
                </h2>
              </div>
              <div>
                <p>
                  {t("A glimpse of where an idea can go.")}
                  <br />
                  {t("Illustrative concepts. Fresh creative directions.")}
                </p>
                <div
                  className="filters"
                  role="group"
                  aria-label="Filter creative concepts"
                >
                  {["All", ...new Set(concepts.map((c) => c.category))].map(
                    (f) => (
                      <button
                        key={f}
                        className={filter === f ? "active" : ""}
                        aria-pressed={filter === f}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
            <div
              className={"concept-grid " + (filter !== "All" ? "filtered" : "")}
            >
              {concepts
                .filter((c) => filter === "All" || c.category === filter)
                .map((c, i) => (
                  <button
                    key={c.name}
                    className={"concept " + c.className}
                    onClick={() => setModal({ kind: "concept", data: c })}
                  >
                    {c.image ? (
                      <img
                        className="concept-art cms-card-image"
                        src={imageURL(c.image)}
                        alt={c.alt || c.name}
                      />
                    ) : (
                      <ConceptArt kind={c.className} />
                    )}
                    <div className="concept-info">
                      <div>
                        <small>
                          {c.type.toUpperCase()} <span>{t("· CONCEPT")}</span>
                        </small>
                        <h3>{c.name}</h3>
                      </div>
                      <span className="circle-arrow">
                        <Arrow />
                      </span>
                    </div>
                  </button>
                ))}
            </div>
            <div className="work-note">
              <span>✳</span>
              {t(
                " These are creative explorations, not commissioned client projects.",
              )}
            </div>
          </div>
        </section>
        <section className="studio-section section" id="studio">
          <div className="container studio-grid">
            <div className="studio-visual reveal">
              <div className="studio-label">
                {t("ROOTED HERE. OPEN TO EVERYWHERE.")}
              </div>
              <div className="studio-word" aria-hidden="true">
                {t("Thin")}
                <span>{t("Q")}</span>
                <i>✳</i>
              </div>
              <div className="studio-bangla" lang="bn">
                {t("আপনার ভাবনা,")}
                <br />
                <span>{t("বাড়ুক সম্ভাবনা।")}</span>
              </div>
              <div className="studio-bottom">
                <span>{t("BANGLADESH ↗ BEYOND")}</span>
                <span>{t("IDEAS INTO GROWTH.")}</span>
              </div>
            </div>
            <div className="studio-copy reveal">
              <div className="eyebrow">
                {t("03 / HELLO, WE'RE GLOBAL THINQ")}
              </div>
              <h2>
                {t("Local understanding.")}
                <br />
                <em>{t("Unboxed thinking.")}</em>
              </h2>
              <p>
                {t(
                  "A small business finding its feet. A brand ready for its next chapter. Your story deserves a digital presence that feels like you.",
                )}
              </p>
              <p>
                {t(
                  "We bring an understanding of Bangladesh's audiences together with an open, curious approach to creative work. Every plan starts with your business, not a template.",
                )}
              </p>
              <div className="studio-values">
                <div>
                  <span>01</span>
                  <h3>{t("People before platforms.")}</h3>
                  <p>
                    {t(
                      "Start with your audience. Choose the channels that make sense.",
                    )}
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <h3>{t("Ideas with intention.")}</h3>
                  <p>
                    {t("Creative choices that support a clear business goal.")}
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <h3>{t("Clear, from the start.")}</h3>
                  <p>
                    {t(
                      "Agreed scope, honest conversations, and a shared direction.",
                    )}
                  </p>
                </div>
              </div>
              <a className="text-link" href="#contact">
                {t("Meet your next creative direction ")}
                <Arrow />
              </a>
            </div>
          </div>
        </section>
        <section className="process-section section" id="process">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <div className="eyebrow">
                  {t("04 / FROM A WHAT-IF TO WHAT'S NEXT")}
                </div>
                <h2>
                  {t("A little structure.")}
                  <br />
                  <em>{t("A lot of room to think.")}</em>
                </h2>
              </div>
              <p>
                {t("Good collaboration needs a clear path.")}
                <br />
                {t("Here's ours.")}
              </p>
            </div>
            <div className="process-layout reveal">
              <div
                className="process-tabs"
                role="tablist"
                aria-label="Project process"
              >
                {steps.map((s, i) => (
                  <button
                    key={s.name}
                    id={"step-" + i}
                    role="tab"
                    aria-selected={active === i}
                    aria-controls="step-panel"
                    onClick={() => setActive(i)}
                  >
                    <span>0{i + 1}</span>
                    {s.name}
                    <Arrow />
                  </button>
                ))}
              </div>
              <div
                className="process-panel"
                id="step-panel"
                role="tabpanel"
                aria-labelledby={"step-" + active}
              >
                <span className="step-giant" aria-hidden="true">
                  0{active + 1}
                </span>
                <span className="step-mark" aria-hidden="true">
                  ✳
                </span>
                <div>
                  <small>STEP 0{active + 1} / 04</small>
                  <h3>{steps[active].title}</h3>
                  <p>{steps[active].text}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="contact-section section" id="contact">
          <div className="container contact-grid">
            <div className="contact-copy reveal">
              <div className="eyebrow">{t("05 / YOUR NEXT CHAPTER")}</div>
              <h2>
                {t("Have a")}
                <br />
                <em>{t("what if?")}</em>
                <br />
                {t("Let's make")}
                <br />
                {t("it happen")}
                <span className="contact-dot">.</span>
              </h2>
              <p>
                {t(
                  "Bring us the big idea, the small question, or the challenge you haven't quite figured out yet.",
                )}
              </p>
              <div className="contact-tag">
                <i />
                {t(" Based in Bangladesh. Thinking beyond.")}
              </div>
            </div>
            <div className="contact-form reveal">
              <div className="form-heading">
                <span>{t("Tell us a little about your project.")}</span>
                <Arrow />
              </div>
              <form onSubmit={submit}>
                <div className="form-row">
                  <label>
                    {t("Your name")}
                    <input
                      required
                      name="name"
                      autoComplete="name"
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    {t("Business name")}
                    <input
                      required
                      name="business"
                      autoComplete="organization"
                      placeholder="Your company or brand"
                    />
                  </label>
                </div>
                <label>
                  {t("Email address")}
                  <input
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                  />
                </label>
                <label>
                  {t("What can we help with?")}
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {[
                      "A complete digital strategy",
                      ...services.map((s) => s.name),
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("What do you have in mind?")}
                  <textarea
                    required
                    rows="4"
                    name="goals"
                    placeholder="Tell us about your goals, ideas, or challenges..."
                  />
                </label>
                <button className="button dark" type="submit">
                  {t("Create my project brief ")}
                  <Arrow />
                </button>
                <p className="form-note">
                  {t(
                    "Create and download a brief to share with Global ThinQ. This form doesn't send an enquiry. Your details stay in your browser.",
                  )}
                </p>
              </form>
            </div>
          </div>
        </section>
        <section className="faq-section section">
          <div className="container faq-grid">
            <div className="reveal">
              <div className="eyebrow">{t("A FEW THINGS, CLEARED UP")}</div>
              <h2>
                {t("Good questions.")}
                <br />
                <em>{t("Straight answers.")}</em>
              </h2>
            </div>
            <div className="faqs reveal">
              {faqs.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span>+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <Blog posts={content.posts} />
        <Contact />
      </main>
      <footer>
        <div className="container">
          <div className="footer-top">
            <div>
              <a href="#" aria-label="Global ThinQ home">
                <Logo light />
              </a>
              <p>
                {t("Independent thinking.")}
                <br />
                {t("Connected digital experiences.")}
              </p>
            </div>
            <div className="footer-nav">
              <span>{t("TAKE A LOOK")}</span>
              <a href="#services">{t("Our services")}</a>
              <a href="#work">{t("Creative lab")}</a>
              <a href="#studio">{t("The studio")}</a>
            </div>
            <div className="footer-nav">
              <span>{t("MAKE A MOVE")}</span>
              <a href="#contact">
                {t("Start a project ")}
                <Arrow />
              </a>
              <a href="#process">{t("How we work")}</a>
              <span className="footer-location">
                {t("Bangladesh ↗ Beyond")}
              </span>
            </div>
          </div>
          <a href="#contact" className="footer-statement">
            {t("Think beyond")}
            <span>{t("ordinary.")}</span>
            <Arrow />
          </a>
          <div className="footer-nav">
            <span>{content.settings.contact.address}</span>
            {content.settings.contact.email && (
              <a href={"mailto:" + content.settings.contact.email}>
                {content.settings.contact.email}
              </a>
            )}
            {content.settings.contact.phone && (
              <a href={"tel:" + content.settings.contact.phone}>
                {content.settings.contact.phone}
              </a>
            )}
            {["facebook", "instagram", "linkedin"].map(
              (k) =>
                (content.settings.contact[k] || "").startsWith("https://") && (
                  <a
                    key={k}
                    href={content.settings.contact[k]}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {k}
                  </a>
                ),
            )}
            <a href="/blog">Journal</a>
            <a href="/admin">Admin login</a>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Global ThinQ</span>
            <span>{t("Ideas into growth.")}</span>
            <a href="#">{t("Back to top ↑")}</a>
          </div>
        </div>
      </footer>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        aria-labelledby="modal-title"
      >
        <button
          className="close-modal"
          aria-label="Close dialog"
          onClick={close}
        >
          ✕
        </button>
        {modal?.kind === "service" ? (
          <>
            <div className="eyebrow">{modal.data.type}</div>
            <h2 id="modal-title">{modal.data.name}</h2>
            <p>{modal.data.detail}</p>
            {modal.data.slug && (
              <a className="text-link" href={"/services/" + modal.data.slug}>
                Full service details ↗
              </a>
            )}
            <ul>
              {modal.data.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <button
              className="button dark"
              onClick={() => choose(modal.data.name)}
            >
              {t("Build a brief for this service ")}
              <Arrow />
            </button>
          </>
        ) : modal?.kind === "concept" ? (
          <>
            {modal.data.image ? (
              <img
                className="cms-card-image"
                src={imageURL(modal.data.image)}
                alt={modal.data.alt || modal.data.name}
              />
            ) : (
              <ConceptArt kind={modal.data.className} />
            )}
            <div className="eyebrow modal-eyebrow">
              {t("ILLUSTRATIVE CREATIVE EXPLORATION")}
            </div>
            <h2 id="modal-title">{modal.data.name}</h2>
            <p>{modal.data.desc}</p>
            {modal.data.client && <p>Client: {modal.data.client}</p>}
            {modal.data.slug && (
              <a className="text-link" href={"/portfolio/" + modal.data.slug}>
                View project ↗
              </a>
            )}
            <div className="concept-tags">
              {modal.data.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <button
              className="button dark"
              onClick={() =>
                choose(
                  modal.data.category === "Branding"
                    ? "Branding & creative"
                    : modal.data.category === "Social"
                      ? "Social media marketing"
                      : "Website design",
                )
              }
            >
              {t("Let's explore your direction ")}
              <Arrow />
            </button>
          </>
        ) : modal?.kind === "brief" ? (
          <>
            <div className="eyebrow">{t("READY FOR THE NEXT STEP")}</div>
            <h2 id="modal-title">{t("Your brief, ready to go.")}</h2>
            <pre>{brief}</pre>
            <div className="dialog-actions">
              <button className="button dark" onClick={download}>
                {t("Download brief ↓")}
              </button>
              <button className="button outline" onClick={close}>
                {t("Keep editing")}
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <Suspense
      fallback={
        <p role="status" className="admin-login">
          Loading…
        </p>
      }
    >
      {location.pathname.startsWith("/admin") ? (
        <Admin />
      ) : location.pathname === "/" ? (
        <App />
      ) : (
        <ContentPage />
      )}
    </Suspense>
  </ErrorBoundary>,
);
