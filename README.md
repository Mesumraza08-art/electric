# ISCOCA website

Static multi-page site. Every page is a real .html file at the same URL as the current iscoca.ca, so existing search rankings are kept.

This repo holds the built site: plain HTML, CSS and JS with no build step. Styles are in `assets/css/site.css`, motion and routing in `assets/js/site.js`.

## Deploy to Hostinger

Either way, the files in this repo go straight into `public_html/` (so `index.html` sits at `public_html/index.html`).

- **Git (recommended):** hPanel → Websites → Advanced → Git. Add `https://github.com/Mesumraza08-art/electric.git`, branch `main`, and leave the install path empty (that means `public_html`). Click Deploy. To redeploy automatically on every push, copy the webhook URL from that page into GitHub → Settings → Webhooks.
- **Manual:** hPanel → File Manager → `public_html`. Upload a zip of this folder and extract it there.

`.htaccess` forces HTTPS and `www.iscoca.ca`, sets caching and compression, and serves `404.html` for missing pages. If the site runs on a different domain (for example a temporary Hostinger domain while testing), remove the "Canonical host" rule.

Contact form posts to the existing Cloudflare Worker and Salesforce Web-to-Lead with Turnstile, same field names as today. Test one live submission after deploy.

Before launch:
- Get original high-resolution project photos (current ones are 750px wide).
- Pelham photo shows overhead line work, not the generators; York University photo duplicates the rental equipment photo.
- Get the official vector logo; the mark and wordmark here are redrawn from a 400px PNG.
- Stock photos are from Unsplash (free licence): American Public Power Association, Dean Brierley, Emmanuel Ikwuegbu, colsan ltda, Anton Dmitriev.
