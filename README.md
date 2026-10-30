# Calaverita Generator

A website that writes **calaveritas literarias**: the playful rhyming verses traded in Mexico for Día de los Muertos, in which La Catrina comes to collect someone who is very much alive. Enter a friend's name, pronouns, job and a few quirks, pick a tone, and the open-weight **Gemma 4** model writes a verse in **Spanish or English**. An open-source rhyme checker reads every Spanish verse before anyone sees it and sends it back to be rewritten if the rhyme doesn't hold.

## Features

- Spanish and English throughout. The Spanish prompts and interface copy are written natively, not translated.
- Four tones (gentle, roast, sweet tribute, spooky) and he/she/they pronouns, with neutral Spanish wording for "they".
- Download the verse as a PNG card, copy it, or share it.
- Moderation on the way in and out: English and Spanish blocklists, plus prompt rules against cruelty.
- Quality checks on the way out: lines where the model comments on its own verse are caught and the verse is rewritten, and Spanish verses must rhyme in true consonant rhyme (lines 2 and 4 of every stanza).
- Runs on any OpenAI-compatible endpoint: DigitalOcean serverless inference in production, or Gemma on your own machine with Ollama.
- Per-visitor rate limiting, with the visitor IPs hashed.
- No accounts, no analytics, no cookies. Names, traits and verses are never stored.
- A haunted "Noche de Ánimas" mode, for whoever clicks the candles.

## How it works

```
Browser  ──POST /api/generate──▶  Netlify Function  ──▶  DigitalOcean serverless inference
(Vite, TypeScript)                (checks, rate limit,     Gemma 4 31B (open weights)
                                   moderation, rhyme)       or any OpenAI-compatible server
```

- **Frontend:** vanilla TypeScript with Vite, in `src/`. It shows a loading popup while the verse is written, then the finished verse.
- **Backend:** one Netlify Function, `netlify/functions/generate.ts`, using the shared code in `server/`. It validates the input, applies the rate limit (stored in Netlify Blobs), builds the prompt, and streams the verse from Gemma through the moderation and rhyme checks. The browser shows a candle until a verse has passed every check; rejected drafts never reach it.
- The model access key stays on the server. The browser never calls the model directly.

## Getting started

You need **Node.js 22.18 or later**. The tests run TypeScript directly with Node.

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` starts `netlify dev`, which runs Vite and the function together and opens the site at http://localhost:8888.

`.env.example` sets `USE_MOCK_MODEL=true`, so the site returns a canned verse and works without an API key. To use Gemma on DigitalOcean:

1. Create a model access key in the DigitalOcean control panel (serverless inference).
2. In `.env`, set `MODEL_ACCESS_KEY` and `USE_MOCK_MODEL=false`.

To run Gemma on your own machine instead, pull a Gemma model in [Ollama](https://ollama.com), set `INFERENCE_BASE_URL=http://localhost:11434/v1`, `MODEL_NAME` to the tag you pulled, and any value for `MODEL_ACCESS_KEY`.

### Settings

All settings are read on the server only. Never prefix them with `VITE_`, or Vite will bundle them into the public site.

| Variable | Purpose |
|---|---|
| `MODEL_ACCESS_KEY` | DigitalOcean model access key. Required unless the mock is on. |
| `USE_MOCK_MODEL` | `true` returns a canned verse instead of calling the model. |
| `MODEL_NAME` | Model that writes the verses. Default `gemma-4-31B-it`. |
| `INFERENCE_BASE_URL` | OpenAI-compatible endpoint. Default `https://inference.do-ai.run/v1`. |
| `RATE_LIMIT_MAX` | Generations per visitor every 10 minutes. Default 10. |
| `RATE_LIMIT_SALT` | Long random string mixed into the hashed visitor IPs. |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Site and function locally, with the browser opened for you |
| `npm test` | Unit tests (moderation, rhyme, rate limiting, restart detection, …) |
| `npm run build` | Type-check and build the site into `dist/` |

## Project layout

```
src/                  Frontend: form, result card, popup, theme, translations (src/i18n/)
server/               Shared backend code: prompts, model client, moderation, rhyme, rate limit
netlify/functions/    The /api/generate function
public/               Static files served as-is
```

## Deploying

The site is built for Netlify:

1. Connect the repository to Netlify. `netlify.toml` already sets the build command, the publish folder, the functions folder and the `/api/*` redirect.
2. Add the settings above as environment variables in the Netlify dashboard. In production, set `USE_MOCK_MODEL=false` and a long random `RATE_LIMIT_SALT`.
3. Set a billing alert on your DigitalOcean account, so abuse can't quietly run up the bill.

## Privacy

The site doesn't store names, traits or verses, and it uses no analytics and no cookies. The details a visitor enters are sent to the model endpoint (DigitalOcean serverless inference by default) only to write the verse. Logs never contain user input.

## Contributing

Contributions are welcome, especially from native Spanish speakers who can improve the verses. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
