# YOBRO Site

Astro-powered motion landing page and secure web-to-app authentication bridge for [YOBRO](https://yobro.lol).

## Local preview

Install dependencies and start Astro:

```sh
npm install
npm run dev -- --port 4173
```

Then open `http://localhost:4173/en/`.

Create the production build with:

```sh
npm run build
```

The static output is written to `dist/`.

## Routes

- `/` — landing page
- `/en` — English landing page
- `/auth/callback` — email confirmation bridge to `yobro://auth/callback`
- `/auth/reset-password` — password recovery bridge to `yobro://auth/reset-password`
- `/privacy` — privacy summary
