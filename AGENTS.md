# AGENTS.md

Static GitHub Pages site for a game list, backed by Turso. Vanilla HTML/CSS/JS, no bundler, no test suite.

## Essential commands

- `npm install` — install script dependencies.
- `npm run parse` — regenerate `data/games.json` from `Jueguiños list por los pibes.txt`.
- `npm run setup-db` — create Turso schema, run migrations, seed `games`, create default admin if `.env` has `ADMIN_PIN`.
- `npm run clean-db` — delete game-related rows but **preserves `users` and `played_games`**. Run `npm run setup-db` after to re-seed.
- `npx eslint js/` — lint the JavaScript modules.

If you edit the `.txt` source, run `parse` then `setup-db` in that order.

## Local setup

Scripts use `.env`; the browser uses `js/config.js`. Both are gitignored and hold the same Turso URL, token, and admin PIN.

1. `cp .env.example .env` and fill it.
2. `cp js/config.example.js js/config.js` and fill it.
3. Serve the folder statically over HTTP. ES modules cannot load from `file://`.
   - `npx serve .` (port 3000 by default).
   - Or `python3 -m http.server 8080`.
   - The repo has `.unirunner.json` with `"run": "npx serve ."` and a pinned URL if your runner supports it.

`js/config.js` is ignored; never commit it.

## Auth / users

- `setup-db` creates a `users` table and a default admin from `.env` (`ADMIN_USERNAME`, `ADMIN_PIN`, `ADMIN_DISPLAY_NAME`).
- Roles: `admin`, `user`, `guest`.
- Guests can view games and reviews, and submit suggestions, but cannot vote, write reviews, or use favorites/play order.
- Users and admins can vote, write reviews, save favorites, manage play order, and mark games as played.
- Only admins can create/edit/delete users and manage games.
- Users can change their display name and password via **Mi cuenta**.
- Auth state is stored in `sessionStorage`; closing the tab ends the session.

## Turso / database notes

- `setup-db` uses `dotenv` to read `.env`.
- It skips seeding if `games` already has rows. To re-seed run:
  ```sql
  DELETE FROM games;
  DELETE FROM sqlite_sequence WHERE name='games';
  ```
- It also skips creating the default admin if any `users` row exists.
- Schema creates `games`, `ratings`, `reviews`, `review_votes`, `users`, `favorites`, `play_orders`, `played_games`, `suggestions`, and `suggestion_comments` plus indexes.
- `clean-db` clears `review_votes`, `reviews`, `ratings`, `favorites`, `play_orders`, and `games` but **not** `users` or `played_games`.
- `setup-db` runs lightweight migrations: it adds `author` to `ratings` and `voter` to `review_votes` only if those columns are missing.

## Source data format

`Jueguiños list por los pibes.txt` is parsed into `data/games.json`.

- Console sections look like `------[PSX]------`.
- Game lines look like `Game Name | Genre`.
- Lines wrapped in `(...)` are ignored.

## Deploy flow

- `.github/workflows/deploy.yml` runs on push to `main` or `master`, and on `workflow_dispatch`.
- It copies `js/config.example.js` to `js/config.js`, then injects repo secrets via `sed`.
- Required secrets: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PIN`.
- Set `TURSO_DATABASE_URL` to the `https://...` URL. The workflow strips `https://` before replacing the placeholder `YOUR_DATABASE_URL.turso.io`; a `libsql://...` secret will produce a broken `libsql://libsql://...` URL.

## Lint notes

- `eslint.config.mjs` ignores `js/config.js` and `js/config.example.js`.
- It defines `TURSO_CONFIG` as a readonly browser global.

## Security warning

The Turso token in `js/config.js` is a write token exposed to the browser. Anyone with it can read and modify the database, including the `users` table. Keep `js/config.js` gitignored; rotate the token if it leaks. The login system is UI-level protection only; do not use it for sensitive data.
