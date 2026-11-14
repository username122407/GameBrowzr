# GameBrowzr — Game Discovery Platform

A responsive React frontend capstone project built with Vite. GameBrowzr helps users discover games, view supported platforms, save a wishlist, and open official storefront search pages.

## Features

- Discover games from the IGDB video game database
- Search games by title
- Filter results by platform and genre
- Sort by rating, release date, or name
- View game details, descriptions, artwork, and supported platforms
- Store search links for PC, PlayStation, Xbox, Nintendo, iOS, and Android
- Wishlist saved in browser Local Storage
- Responsive dark interface with purple accents
- Demo data fallback when the API is not configured or unavailable

## Technology stack

- HTML5, CSS3, JavaScript (ES6+), React, Vite
- IGDB API for game metadata and artwork
- Twitch OAuth application credentials for server-side API authentication
- Vercel serverless functions to keep credentials out of browser code
- Browser Local Storage, Git, and GitHub

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Twitch account with two-factor authentication enabled
- A Twitch Developer application for IGDB access

## Configure IGDB access

IGDB is free for non-commercial usage under the Twitch Developer Service Agreement. It requires Twitch application credentials and does not allow direct browser API requests because of CORS and credential-security restrictions. This project uses Vercel serverless functions as a secure proxy.

1. Sign in to the [Twitch Developer Console](https://dev.twitch.tv/console/apps).
2. Create a new application. Set the OAuth Redirect URL to `http://localhost` and choose the **Confidential** client type if the form asks for it.
3. Create the application and copy its **Client ID**.
4. Generate a **Client Secret** from the application management page.
5. In your Vercel project, open **Settings → Environment Variables** and add:
   - `TWITCH_CLIENT_ID` = your Twitch application Client ID
   - `TWITCH_CLIENT_SECRET` = your Twitch application Client Secret
6. Select Production (and Preview if you want preview deployments to use the API), save, then redeploy the project.

Never put the Client Secret in a `VITE_` variable, React component, or committed file. Never upload `.env.local` to GitHub. The included `.env.example` contains placeholders only.

## Local setup

1. Clone or extract the project.
2. Install packages:

   ```bash
   npm install
   ```

3. For the frontend-only preview, run:

   ```bash
   npm run dev
   ```

   The Vite preview can show the included sample games. The `/api` serverless functions are hosted by Vercel, so the live IGDB integration should be tested through Vercel deployment or the Vercel CLI.

4. To run the Vercel functions locally, install/use the Vercel CLI and run:

   ```bash
   npx vercel dev
   ```

   Add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` to a local `.env.local` file first. Do not commit that file.

## Production build

```bash
npm run build
npm run preview
```

The static frontend is generated in the `dist` folder. Vercel also deploys the functions in the root `api/` folder.

## Project structure

```text
GameBrowzr/
├── api/
│   ├── games.js
│   └── games/
│       └── [id].js
├── lib/
│   └── igdb.js
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
    │   └── igdb.js
    ├── components/
    │   ├── GameCard.jsx
    │   └── GameModal.jsx
    └── data/
        └── demoGames.js
```

## API and data notes

IGDB provides game metadata, platform information, ratings, genres, descriptions, and cover artwork. The frontend calls the project's `/api/games` and `/api/games/:id` endpoints; those serverless functions authenticate with Twitch and call IGDB. The server returns a normalized shape for the existing React components.

IGDB documents a rate limit of four requests per second. The serverless API caches responses at the edge for five minutes where supported. Store search links are search shortcuts, not a guarantee that a specific title is sold in that store, region, or at a particular price. Users should verify the title, platform, edition, and regional availability on the store page.

Include a visible link to [IGDB](https://www.igdb.com/) as the source of game data. Review the current [IGDB API documentation](https://api-docs.igdb.com/) and [Twitch Developer Agreement](https://www.twitch.tv/p/en/legal/developer-agreement/) before publishing or changing the project's use.

## Git workflow

```bash
git add .
git commit -m "Replace RAWG with IGDB API"
git push
```

Do not commit `.env.local` or any client secret.

## Deploy with Vercel

1. Push the project to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and choose **Add New → Project**.
3. Import the GameBrowzr repository.
4. Use these settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
5. Add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` under **Settings → Environment Variables**.
6. Deploy or redeploy after adding the variables.
7. Open the deployed URL and test searching, filters, game details, store links, and the wishlist.

## Testing checklist

- [ ] Homepage loads at desktop and mobile widths
- [ ] Live IGDB search returns matching games
- [ ] Platform filter works
- [ ] Genre filter works
- [ ] Sorting works
- [ ] Game details modal opens and closes
- [ ] Store search links open in a new tab
- [ ] Wishlist add/remove works
- [ ] Wishlist remains after page refresh
- [ ] Demo data appears if the API is unavailable
- [ ] Vercel API endpoints return game data after credentials are configured
- [ ] Production build completes successfully

## References

- [IGDB API documentation](https://api-docs.igdb.com/)
- [Twitch Developer Console](https://dev.twitch.tv/console/apps)
- [Twitch OAuth application authentication](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/guide/)
- [Vercel Functions](https://vercel.com/docs/functions)

---

**Project status:** IGDB integration is prepared. Add your Twitch application credentials in Vercel, redeploy, and test the live catalog before capstone submission.
