# Contributing

Thanks for helping La Catrina write better verses. Bug fixes, better Spanish, accessibility improvements and new ideas are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first, so we can agree on the approach before you spend time on it.
- By contributing, you agree that your work is released under the [MIT License](LICENSE).
- Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

You need Node.js 22.18 or later.

```bash
npm install
cp .env.example .env   # mock mode: no API key needed
npm run dev
```

Mock mode (`USE_MOCK_MODEL=true`) returns a canned verse, so you can work on everything except the verse quality without an Anthropic API key. Changes to the prompts in `server/prompt.ts` need a real key to test; see the README.

## Making a change

- Match the surrounding code: its naming and structure.
- All interface text lives in `src/i18n/en.json` and `src/i18n/es.json`. Add every new string to both files.
- The Spanish copy and prompt are written natively, in natural Mexican Spanish, not translated from English. If you change one language, write the other on its own terms.
- Keep the site accessible: keyboard use, screen readers, color contrast and reduced motion.
- Never log or store what visitors type.
- Add or update tests in `server/*.test.ts` for backend changes.

## Before opening a pull request

```bash
npm test
npm run build
```

Both must pass. In the pull request, explain what changed and why. For changes to the verses, include a few sample outputs before and after.

## Reporting bugs

Open an issue with the steps to reproduce it, what you expected, what happened, and your browser and device. Please don't paste real people's personal details into issues.

For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
