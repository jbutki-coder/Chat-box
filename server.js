require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const twilio = require("twilio");

const app = express();
const PORT = process.env.PORT || 3000;

// Render and most hosting platforms put Express behind a proxy.
// This lets express-rate-limit safely read the real visitor IP from X-Forwarded-For.
app.set("trust proxy", 1);

const allowedFrameAncestors = (process.env.ALLOWED_FRAME_ANCESTORS || "*")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "frame-ancestors": allowedFrameAncestors,
      },
    },
  })
);

app.use(express.json({ limit: "15kb" }));
app.use(express.urlencoded({ extended: false, limit: "15kb" }));
app.use(express.static(path.join(__dirname, "public")));

const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_10_MINUTES || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many messages were sent from this connection. Please try again later.",
  },
});

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function looksLikePhone(value) {
  if (!value) return false;
  return /^[+]?[(]?[0-9][0-9\s().-]{6,24}$/.test(value);
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN.");
  }

  return twilio(accountSid, authToken);
}

function getSenderConfig() {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (messagingServiceSid) {
    return { messagingServiceSid };
  }

  if (from) {
    return { from };
  }

  throw new Error("Missing TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID.");
}

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/message", messageLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body.name, 80);
    const visitorPhone = cleanText(req.body.phone, 30);
    const message = cleanText(req.body.message, 900);
    const consent = req.body.consent === true || req.body.consent === "true";
    const honeypot = cleanText(req.body.company, 80);

    if (honeypot) {
      return res.json({ ok: true, message: "Thanks. Your message was sent." });
    }

    if (!message || message.length < 3) {
      return res.status(400).json({ ok: false, error: "Please enter a message." });
    }

    if (visitorPhone && !looksLikePhone(visitorPhone)) {
      return res.status(400).json({ ok: false, error: "Please enter a valid phone number or leave it blank." });
    }

    if (visitorPhone && !consent) {
      return res.status(400).json({ ok: false, error: "Please check the consent box so someone can reply by text." });
    }

    const notifyPhoneNumber = process.env.NOTIFY_PHONE_NUMBER;
    if (!notifyPhoneNumber) {
      return res.status(500).json({ ok: false, error: "Server is missing NOTIFY_PHONE_NUMBER." });
    }

    const smsBody = [
      "New website chatbox message",
      `Name: ${name || "Not provided"}`,
      `Phone: ${visitorPhone || "Not provided"}`,
      `Consent to reply by text: ${consent ? "Yes" : "No"}`,
      "",
      message,
    ].join("\n");

    if (process.env.DRY_RUN === "true") {
      console.log("DRY_RUN message:", smsBody);
      return res.json({ ok: true, message: "Dry run worked. No SMS was sent." });
    }

    const client = getTwilioClient();
    await client.messages.create({
      body: smsBody,
      to: notifyPhoneNumber,
      ...getSenderConfig(),
    });

    return res.json({ ok: true, message: "Thanks. Your message was sent." });
  } catch (error) {
    console.error("Message send failed:", error.message);
    return res.status(500).json({ ok: false, error: "The message could not be sent right now." });
  }
});

app.listen(PORT, () => {
  console.log(`Chatbox SMS app listening on port ${PORT}`);
});
