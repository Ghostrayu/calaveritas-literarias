# Calaverita Generator

A website that writes **calaveritas literarias**: the playful rhyming verses traded in Mexico for Día de los Muertos, in which La Catrina comes to collect someone who is very much alive. Enter a friend's name, pronouns, job and a few quirks, pick a tone, and Claude writes a verse in **Spanish or English**.

## Features

- Spanish and English throughout. The Spanish prompts and interface copy are written natively, not translated.
- Four tones (gentle, roast, sweet tribute, spooky) and he/she/they pronouns, with neutral Spanish wording for "they".
- Download the verse as a PNG card, copy it, or share it.
- Moderation on the way in and out: English and Spanish blocklists, plus prompt rules against cruelty.
- Per-visitor rate limiting, with the visitor IPs hashed.
- No accounts, no analytics, no cookies. Names, traits and verses are never stored.
- A haunted "Noche de Ánimas" mode, for whoever clicks the candles.

## How it works

```
Browser  ──POST /api/generate──▶  Netlify Function  ──▶  Anthropic API
(Vite, TypeScript)                (checks, rate limit,     Spanish: Claude Sonnet 5.5
                                   moderation)              English: Claude Haiku 5.5
```

- **Frontend:** vanilla TypeScript with Vite, in `src/`. It shows a loading popup while the verse is written, then the finished verse.
- **Backend:** one Netlify Function, `netlify/functions/generate.ts`, using the shared code in `server/`. It validates the input, applies the rate limit (stored in Netlify Blobs), builds the prompt, and streams the verse from Claude through the moderation checks.
- The Anthropic API key stays on the server. The browser never calls the API directly.

## Getting started

You need **Node.js 22.18 or later**. The tests run TypeScript directly with Node.

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` starts `netlify dev`, which runs Vite and the function together and opens the site at http://localhost:8888.

`.env.example` sets `USE_MOCK_MODEL=true`, so the site returns a canned verse and works without an API key. To use Claude:

1. Create an API key at [platform.claude.com](https://platform.claude.com). A Claude.ai subscription doesn't include API access.
2. In `.env`, set `ANTHROPIC_API_KEY` and `USE_MOCK_MODEL=false`.

### Settings

All settings are read on the server only. Never prefix them with `VITE_`, or Vite will bundle them into the public site.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key. Required unless the mock is on. |
| `USE_MOCK_MODEL` | `true` returns a canned verse instead of calling Claude. |
| `MODEL_NAME_ES` | Model for Spanish verses. Default `claude-sonnet-5-5`. |
| `MODEL_NAME_EN` | Model for English verses. Default `claude-haiku-5-5`. |
| `RATE_LIMIT_MAX` | Generations per visitor every 10 minutes. Default 10. |
| `RATE_LIMIT_SALT` | Long random string mixed into the hashed visitor IPs. |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Site and function locally, with the browser opened for you |
| `npm test` | Unit tests (moderation, rate limiting, restart detection, …) |
| `npm run build` | Type-check and build the site into `dist/` |

## Project layout

```
src/                  Frontend: form, result card, popup, theme, translations (src/i18n/)
server/               Shared backend code: prompts, Claude client, moderation, rate limit
netlify/functions/    The /api/generate function
public/               Static files served as-is
```

## Deploying

The site is built for Netlify:

1. Connect the repository to Netlify. `netlify.toml` already sets the build command, the publish folder, the functions folder and the `/api/*` redirect.
2. Add the settings above as environment variables in the Netlify dashboard. In production, set `USE_MOCK_MODEL=false` and a long random `RATE_LIMIT_SALT`.
3. Set a monthly spend limit on your Anthropic workspace, so abuse can't run up the bill.

## Privacy

The site doesn't store names, traits or verses, and it uses no analytics and no cookies. The details a visitor enters are sent to the Anthropic API only to write the verse. Logs never contain user input.

## Contributing

Contributions are welcome, especially from native Spanish speakers who can improve the verses. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
