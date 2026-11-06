import React, { useState, useRef, useEffect } from "react";
import { db } from "./cms";
export default function Contact() {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const enabled = Boolean(db && import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const box = useRef(null),
    token = useRef("");
  useEffect(() => {
    if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) return;
    let id;
    const render = () => {
      if (box.current && window.turnstile)
        id = window.turnstile.render(box.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: (t) => (token.current = t),
          "expired-callback": () => (token.current = ""),
        });
    };
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onload = render;
    document.head.append(script);
    return () => {
      if (id !== undefined) window.turnstile?.remove(id);
      script.remove();
    };
  }, []);
  async function send(e) {
    e.preventDefault();
    if (!enabled) {
      setStatus(
        "Enquiries are not connected yet. Please use the project brief above.",
      );
      return;
    }
    if (!token.current) {
      setStatus("Please complete the verification before sending.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const form = e.currentTarget;
      const { error } = await db.functions.invoke("contact", {
        body: { ...data, token: token.current },
      });
      if (error)
        throw new Error(
          "Could not send. Please refresh the verification and try again.",
        );
      form.reset();
      setStatus("Thank you. Your enquiry has been received.");
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
      token.current = "";
      window.turnstile?.reset();
    }
  }
  return (
    <section
      id="enquiries"
      className="cms-contact container"
      aria-label="Send an enquiry"
    >
      <div>
        <div className="eyebrow">LET’S TALK</div>
        <h2>Send your enquiry.</h2>
        <p>Your message goes directly to our team.</p>
      </div>
      <form onSubmit={send}>
        <label>
          Name
          <input name="name" required maxLength={120} />
        </label>
        <label>
          Email
          <input type="email" name="email" required maxLength={254} />
        </label>
        <label>
          Business
          <input name="business" maxLength={200} />
        </label>
        <label>
          Message
          <textarea name="message" required minLength={10} maxLength={5000} />
        </label>
        <div className="honey" aria-hidden="true">
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-label="Leave empty"
          />
        </div>
        <div ref={box} />
        <button className="button dark" disabled={busy || !enabled}>
          {busy ? "Sending…" : "Send enquiry ↗"}
        </button>
        <p role="status">
          {status ||
            (!enabled
              ? "Enquiry sending becomes available after the secure backend is connected."
              : "")}
        </p>
      </form>
    </section>
  );
}
