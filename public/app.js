const form = document.querySelector("#chatForm");
const transcript = document.querySelector("#transcript");
const statusEl = document.querySelector("#status");
const sendButton = document.querySelector("#sendButton");
const messageInput = document.querySelector("#message");
const nameInput = document.querySelector("#name");
const phoneInput = document.querySelector("#phone");
const consentInput = document.querySelector("#consent");
const companyInput = document.querySelector("#company");

function getSessionId() {
  const existing = sessionStorage.getItem("websiteMessengerSession");
  if (existing) return existing;
  const created = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem("websiteMessengerSession", created);
  return created;
}

const sessionId = getSessionId();

function timeStamp() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function setStatus(message, type) {
  statusEl.textContent = message || "";
  statusEl.className = `send-status ${type || ""}`.trim();
}

function addLine(kind, name, text, options = {}) {
  const line = document.createElement("div");
  line.className = `line ${kind}`;
  if (options.id) line.id = options.id;

  const stamp = document.createElement("span");
  stamp.className = "stamp";
  stamp.textContent = `${name} (${timeStamp()}):`;

  const body = document.createElement("p");
  body.textContent = text;

  line.append(stamp, body);
  transcript.append(line);
  transcript.scrollTop = transcript.scrollHeight;
  return line;
}

function removeLine(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function senderName() {
  const value = nameInput.value.trim();
  return value || "Guest";
}

function buildPayload() {
  return {
    name: nameInput.value,
    phone: phoneInput.value,
    message: messageInput.value,
    consent: consentInput.checked,
    company: companyInput.value,
    sessionId,
  };
}

async function sendMessage() {
  setStatus("", "");
  const payload = buildPayload();
  const message = payload.message.trim();

  if (message.length < 2) {
    setStatus("Type a message first.", "error");
    messageInput.focus();
    return;
  }

  if (payload.phone.trim() && !payload.consent) {
    setStatus("Check the consent box so someone can reply by text.", "error");
    consentInput.focus();
    return;
  }

  addLine("user-line", senderName(), message);
  messageInput.value = "";

  sendButton.disabled = true;
  sendButton.textContent = "Sending";
  addLine("system-line typing-line", "Website Messenger", "Sending to phone", { id: "typingLine" });

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    removeLine("typingLine");

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Message could not be sent.");
    }

    if (data.dryRun) {
      addLine("reply-line", "Website Messenger", "Test mode is on. The chat worked, but no text was actually sent.");
      setStatus(data.message || "Test mode is on. No SMS was sent.", "success");
      return;
    }

    addLine("reply-line", "Website Messenger", "Sent. The site manager should receive this as a text message.");
    setStatus(data.message || "Message sent to the site phone.", "success");
  } catch (error) {
    removeLine("typingLine");
    addLine("error-line", "Website Messenger", error.message || "The message could not be sent right now.");
    setStatus(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    messageInput.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
