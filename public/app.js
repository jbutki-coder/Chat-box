const form = document.querySelector("#messageForm");
const statusEl = document.querySelector("#status");
const sendButton = document.querySelector("#sendButton");

function setStatus(message, type) {
  statusEl.textContent = message || "";
  statusEl.className = `status ${type || ""}`.trim();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("", "");

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    consent: formData.get("consent") === "on",
    company: formData.get("company"),
  };

  if (!payload.message || payload.message.trim().length < 3) {
    setStatus("Please type a message first.", "error");
    return;
  }

  if (payload.phone && !payload.consent) {
    setStatus("Please check the consent box so someone can reply by text.", "error");
    return;
  }

  sendButton.disabled = true;
  sendButton.textContent = "Sending...";

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Message could not be sent.");
    }

    form.reset();
    setStatus(data.message || "Thanks. Your message was sent.", "success");
  } catch (error) {
    setStatus(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send message";
  }
});
