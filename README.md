# WordPress SMS Chatbox for Render

This is a small Node/Express app you can deploy on Render and embed inside a WordPress lightbox or iframe.

A visitor fills out the form, and the backend sends you an SMS notification through Twilio. Your Twilio credentials stay on Render as private environment variables, not inside WordPress.

## What it includes

- `server.js` — Express backend with `/api/message`
- `public/index.html` — the chatbox form
- `public/styles.css` — simple vintage-style layout
- `public/app.js` — frontend form submission
- `.env.example` — environment variable template
- `render.yaml` — optional Render Blueprint file
- `wordpress-embed.html` — iframe/lightbox snippet for WordPress

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:3000
```

For local testing without sending a real SMS, set this in `.env`:

```env
DRY_RUN=true
```

## Environment variables

Set these in Render under **Environment Variables**:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567
NOTIFY_PHONE_NUMBER=+1YOURNUMBERHERE
ALLOWED_FRAME_ANCESTORS=*
DRY_RUN=false
RATE_LIMIT_PER_10_MINUTES=5
```

Use your own test phone number for `NOTIFY_PHONE_NUMBER` in E.164 format, like:

```text
+18105551212
```

Do not commit your real `.env` file to GitHub.

## Twilio sender options

You can use either:

```env
TWILIO_PHONE_NUMBER=+15551234567
```

or a Messaging Service:

```env
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

If `TWILIO_MESSAGING_SERVICE_SID` is set, the app uses that instead of `TWILIO_PHONE_NUMBER`.

## Deploy on Render

1. Create a new GitHub repo.
2. Upload these project files.
3. In Render, create a new **Web Service** from that repo.
4. Use:

```text
Build Command: npm install
Start Command: npm start
```

5. Add the environment variables above.
6. Deploy.
7. Visit your Render URL and submit a test message.

## Embed on WordPress

Open `wordpress-embed.html`, replace:

```text
https://YOUR-RENDER-SERVICE.onrender.com
```

with your real Render URL.

Then paste the full snippet into a WordPress **Custom HTML** block.

## Lock iframe access to your WordPress site

For first testing, this is easy:

```env
ALLOWED_FRAME_ANCESTORS=*
```

After it works, tighten it to your WordPress domain:

```env
ALLOWED_FRAME_ANCESTORS='self',https://yourwordpressdomain.org
```

## Important safety notes

- Do not put Twilio credentials in WordPress HTML or frontend JavaScript.
- Do not commit `.env` to GitHub.
- If you collect a visitor phone number and plan to text them back, keep the consent checkbox.
- If you start sending automated texts to visitors, review SMS compliance and opt-in rules with your SMS provider.
