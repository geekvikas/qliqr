# qliqr Marketing Website — Setup

## Quick Start (Static, No Backend)

Just open `index.html` in a browser. The site works fully — waitlist and survey data saves to `localStorage`.

## Persistence: Google Sheets Backend (Free)

To persist data across users and show a real waitlist count:

### 1. Create the Google Sheet

- Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
- Rename the first tab to `Waitlist`
- Add these headers in row 1: `timestamp | name | email | role | country | handle`
- Create a second tab named `Survey`
- Add these headers in row 1: `timestamp | q1_adLength | q2_minPrize | q3_gamesPerDay | q4_shareability | q5_features`

### 2. Deploy the Apps Script

- In the spreadsheet, go to **Extensions > Apps Script**
- Delete any existing code
- Paste the contents of `google-apps-script.js`
- Click **Deploy > New deployment**
- Type: **Web app**
- Execute as: **Me**
- Who has access: **Anyone**
- Click **Deploy** and authorize
- Copy the deployment URL (looks like `https://script.google.com/macros/s/.../exec`)

### 3. Connect the Website

Add this line in `index.html` **before** the closing `</body>` tag, right before the main `<script>`:

```html
<script>window.QLIQR_API_URL = 'YOUR_DEPLOYMENT_URL_HERE';</script>
```

### 4. Done

- Waitlist signups write to the Waitlist tab
- Survey responses write to the Survey tab
- The waitlist count is fetched live on page load
- Email deduplication is built in
- Local storage is used as fallback if the API is unreachable

## Hosting

The site is a single static HTML file. Host it anywhere:

- **GitHub Pages**: Push and enable in repo settings
- **Vercel**: `vercel deploy --prod` from the `website/` folder
- **Netlify**: Drag the `website/` folder into Netlify
- **Cloudflare Pages**: Connect the repo
