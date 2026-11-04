/**
 * Contact form: sends messages through FormSubmit (free, no account, no backend).
 * Setup: put your address in CONTACT_EMAIL, publish the site, send one test message,
 * then click the activation link FormSubmit emails you.
 */
(function () {
  "use strict";

  const CONTACT_EMAIL = "mishaliapillay16@gmail.com";
  const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

  const form = document.getElementById("contact-form");
  if (!form) return;

  const button = form.querySelector("button[type=submit]");
  const status = form.querySelector(".status");

  function say(message) {
    status.textContent = message;
  }

  async function send(data) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message,
        _replyto: data.email,
        _subject: `Portfolio message from ${data.name}`,
        _template: "table",
      }),
    });
    const body = await res.json();
    if (!res.ok || body.success === "false") throw new Error(body.message || "Send failed");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      say("Please fill in every field with a valid email.");
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    if (data._honey) return; // a bot filled the hidden field

    button.disabled = true;
    say("Sending…");
    try {
      await send(data);
      form.reset();
      say("Thanks! I'll get back to you soon.");
    } catch {
      say("Couldn't send right now. Please reach me on LinkedIn.");
    } finally {
      button.disabled = false;
    }
  });
})();
