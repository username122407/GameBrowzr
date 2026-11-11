# GameBrowzr — Game Discovery Platform

A responsive React frontend capstone project built with Vite and Tailwind CSS. GameBrowzr helps users discover games, view supported platforms, save a wishlist, and open official storefront search pages.

## Features

- Discover games from the RAWG Video Games Database API
- Search for games by title
- Filter the current results by platform and genre
- Sort by rating, release date, or name
- View game details and supported platforms
- Store search links for PC, PlayStation, Xbox, Nintendo, iOS, and Android
- Wishlist saved in browser Local Storage
- Responsive dark interface with purple accents
- Demo data mode when no API key is configured

## Technology stack

- HTML5
- CSS3
- JavaScript (ES6+)
- React
- Tailwind CSS v4
- Vite
- RAWG Video Games Database API
- Browser Local Storage
- Git and GitHub

## Requirements

Install Node.js 20.19+ or 22.12+ and npm.

## Setup

1. Extract or clone this project.
2. Open a terminal in the `gamebrowzr` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a free RAWG API key at https://rawg.io/apidocs.
5. Copy `.env.example` to `.env.local`.
6. Put your key in `.env.local`:

   ```env
   VITE_RAWG_API_KEY=your_actual_key_here
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Open the local URL shown in the terminal (usually http://localhost:5173).

If you skip the API key, GameBrowzr runs in demo mode with sample data. Search and wishlist still work with the sample records.

## Production build

```bash
npm run build
npm run preview
```

The production-ready website is generated in the `dist` folder.

## Project structure

```text
gamebrowzr/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    ├── api/
    │   └── rawg.js
    ├── components/
    │   ├── GameCard.jsx
    │   └── GameModal.jsx
    └── data/
        └── demoGames.js
```

## Data and store-link notes

RAWG supplies game metadata and artwork. GameBrowzr links to official storefront search pages based on the platforms returned for a game. A store search link is not a guarantee that a specific title is sold in that store, region, or at a particular price. Users should verify the title, platform, edition, and regional availability on the store page.

RAWG requires attribution and an active hyperlink from pages where its data or images are used. The application includes RAWG attribution in the footer and game details.

The frontend environment variable `VITE_RAWG_API_KEY` is bundled into browser code and is therefore visible to users. Do not use a private or privileged key. For a public production service, a backend proxy would be needed to keep credentials secret. This capstone is designed as a frontend-only project.

## Suggested Git workflow

Make regular commits as you build and test:

```bash
git init
git add .
git commit -m "Create GameBrowzr React and Vite starter"
git add .
git commit -m "Add RAWG game catalog and search"
git add .
git commit -m "Add filters, game details, and wishlist"
```

Create a GitHub repository and push your commits there. Do not upload `.env.local`.

## Deployment

### Deploy with Vercel

1. Push the project to a GitHub repository (do not commit `.env.local`).
2. Sign in at https://vercel.com/ and choose **Add New → Project**.
3. Import your GameBrowzr GitHub repository.
4. Vercel should detect Vite automatically. Use:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. If using live RAWG data, add `VITE_RAWG_API_KEY` under Project Settings → Environment Variables.
6. Deploy. Vercel will provide a public `*.vercel.app` address.
7. Test the public address on a phone and a desktop browser.

The included `vercel.json` enables fallback routing for client-side routes.

You can also deploy the project using Netlify:

- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_RAWG_API_KEY` as a deployment environment variable if you want live RAWG data.
- Redeploy after changing environment variables.

## Testing checklist

- [ ] Homepage loads at desktop and mobile widths
- [ ] Search returns matching games
- [ ] Platform filter works
- [ ] Genre filter works
- [ ] Sorting works
- [ ] Game details modal opens and closes
- [ ] Store search links open in a new tab
- [ ] Wishlist add/remove works
- [ ] Wishlist remains after page refresh
- [ ] Empty states display correctly
- [ ] Live API mode and demo fallback both work
- [ ] Production build completes successfully

## References

- RAWG API: https://rawg.io/apidocs
- RAWG API documentation: https://api.rawg.io/docs/
- React: https://react.dev/
- Vite: https://vite.dev/guide/
- Tailwind CSS with Vite: https://tailwindcss.com/docs/installation/using-vite

---

**Project status:** Initial frontend starter. Connect your API key, run the tests, and customize the project before final submission.