# Mr. & Miss University Sri Lanka — Website & Registration System

This package contains everything needed to run the pageant website and its
registration database.

```
project/
├── index.html              ← the full website (open this directly to preview)
├── images/
│   ├── hero/                ← 4 photos rotating in the hero background
│   ├── gallery/              ← 11 photos in the gallery grid
│   └── judges/                ← judge portrait(s)
├── README.md                ← you are here
└── backend/                 ← the registration API + admin dashboard
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── models/Registration.js
    ├── routes/registrations.js
    ├── middleware/upload.js
    ├── middleware/adminAuth.js
    ├── public/admin.html    ← dashboard at /admin once deployed
    └── uploads/              ← local-mode uploads land here (unused if Cloudinary is set up)
```

**Frontend stack:** plain HTML/CSS/JS — no build step, no npm install needed.
Built this way instead of React/Tailwind so it's files you can open, edit, or
deploy anywhere without tooling. It can be migrated to React later if you
outgrow it.

**Backend stack:** Node.js + Express + MongoDB, with Cloudinary for photo
storage in production.

**Photos:** all real photos from Mr. & Miss University 2025 — the hero
slider, gallery, winners' portraits, and one judge photo. None of these are
placeholders anymore.

---

## 1. Important — read this before you launch

The `index.html` file works as a live preview out of the box: fill out the
registration form and you'll see the full success animation. But **that
preview does not save anything anywhere** — it's running in "Preview Mode"
so you can see and test the design before the backend exists.

Look near the top of the `<script>` block in `index.html`:

```js
const API_BASE_URL = '';        // set to your deployed backend URL
const DEV_PREVIEW_MODE = true;  // set to false once the backend is live
```

Until you flip `DEV_PREVIEW_MODE` to `false` and deploy the backend below,
**real registrations will not be stored.** A small gold banner at the bottom
of the site reminds visitors of this until you turn it off. Don't publish
the site to real users with this still set to `true`.

**One more thing to confirm:** the judges section includes one real photo,
but I couldn't reliably read the name on the placard in the photo (it looks
like "Ms. [?] Fernando" but I'm not confident enough to publish a guess).
The card currently reads "Name to be confirmed" — please fill in the correct
name and title in the `#judges` section before launch.

---

## 2. Customization checklist

| What | Where |
|---|---|
| Event date / countdown | `EVENT_DATE` constant near the top of the `<script>` in `index.html` |
| Schedule dates | `#schedule` section in `index.html` — keep these in sync with `EVENT_DATE` |
| Stats (500+ Participants, etc.) | `data-target` attributes in the `#about` section |
| Gallery photos | `GALLERY_ITEMS` array in the script — add more by dropping files in `images/gallery/` |
| Hero slider photos | the 4 `<div class="hero__slide">` elements at the top of the hero section |
| Judge's name | `#judges` section — currently "Name to be confirmed", see note above |
| More judges & guests | `#judges` section — remaining cards are still TBA placeholders |
| Past winners | `#winners` section — Promod Dilshan & Selani Chamathka (2025), with real photos |
| Social links & contact info | `<footer>` section |
| Background music | `<audio id="bgAudio">` tag — add a `<source>` pointing to your own royalty-free track |
| Logo | Already embedded from your uploaded file, background removed |

---

## 3. Running the backend locally

Requirements: [Node.js](https://nodejs.org) 18+ and a MongoDB database
(Atlas free tier is easiest — see section 4).

```bash
cd backend
npm install
cp .env.example .env
# open .env and fill in MONGODB_URI, ADMIN_PASSWORD, CLIENT_URL
npm run dev
```

The API runs at `http://localhost:5000`. Health check:
`http://localhost:5000/api/health`.

To test the full flow locally: open `index.html` in a browser (or serve it
with any static server), set `API_BASE_URL = 'http://localhost:5000'` and
`DEV_PREVIEW_MODE = false`, and submit the form.

---

## 4. Setting up MongoDB Atlas (free tier)

1. Create an account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0** cluster.
3. Under **Database Access**, add a database user with a username and password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) —
   simplest option for a small project since most hosts use dynamic IPs.
5. Click **Connect → Drivers**, copy the connection string, and paste it into
   `.env` as `MONGODB_URI`. Replace `<username>` and `<password>` with the
   values from step 3, and add a database name before the `?`, e.g.
   `.../mr_miss_university?retryWrites=true...`.

---

## 5. Setting up Cloudinary (recommended before going live)

Hosts like Render don't guarantee locally-saved files survive a restart or
redeploy, so photo uploads should go to Cloudinary in production rather than
the local `uploads/` folder.

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. On your dashboard, find the **API Environment variable** — it looks like
   `cloudinary://123456789012345:AbCdEfGhIjKlMnOpQrStUvWxYz@your-cloud-name`.
3. Paste that whole string into `.env` as `CLOUDINARY_URL`.

That's it — the backend detects `CLOUDINARY_URL` automatically and switches
from local disk storage to Cloudinary, no code changes needed. Leave it
blank to keep using local disk storage (fine for local development).

---

## 6. Deploying

### Backend (Render.com — free tier available)
1. Push the `backend/` folder to a GitHub repo.
2. In Render, click **New → Web Service**, connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables from your `.env` (`MONGODB_URI`,
   `ADMIN_PASSWORD`, `CLIENT_URL`, `MAX_UPLOAD_BYTES`, `CLOUDINARY_URL`)
   under **Environment**.
5. Deploy. Note the resulting URL, e.g. `https://mr-miss-api.onrender.com`.

Railway.app works the same way if you prefer it.

### Frontend (Netlify, Vercel, or GitHub Pages)
1. In `index.html`, set:
   ```js
   const API_BASE_URL = 'https://mr-miss-api.onrender.com'; // your Render URL
   const DEV_PREVIEW_MODE = false;
   ```
2. Deploy the **whole project folder** (`index.html` + the `images/` folder
   together) — drag the folder onto [Netlify Drop](https://app.netlify.com/drop),
   or push it all to a GitHub repo and enable GitHub Pages. Dragging just
   `index.html` on its own will leave every photo broken.
3. Back in Render, update the backend's `CLIENT_URL` environment variable to
   your new frontend URL, so CORS allows it.

---

## 7. Using the admin dashboard

Once deployed, go to `https://your-backend-url/admin`. Log in with the
`ADMIN_PASSWORD` you set in `.env`. From there you can search by name or
university, filter by category, view full details and photos, export
everything to CSV, or delete an entry.

The admin password is a single shared secret — simple by design for a small
team, but not the same as individual staff logins. Keep it out of group
chats and rotate it after the event if you shared it during setup.

---

## 8. A note on the data you're collecting

This form collects full names, dates of birth, phone numbers, email
addresses, and photos of university students. A few suggestions:

- Keep `ADMIN_PASSWORD` and `CLOUDINARY_URL` long, random, and known only to organisers who need them.
- Serve the deployed site over HTTPS (Render, Netlify, and Vercel all do this by default).
- Decide up front how long you'll keep registrant data after the event, and delete it when that's done.
- The registration form's consent checkbox is a good start, but check whether your club or university has its own data-handling policy to follow.

---

## 9. What's a placeholder vs. what's real

- **Real:** your logo, all 11 gallery photos, all 4 hero slider photos, the
  2025 winners' names and portraits, the organizing body credit, and one
  judge's photo (name pending your confirmation — see section 1).
- **Placeholder — please edit:** event date, schedule dates, stat numbers,
  remaining judge/guest cards, social links, contact details, and the
  background audio track.
