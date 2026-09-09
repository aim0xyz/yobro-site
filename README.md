# YOBRO Site

Motion landing page and secure web-to-app authentication bridge for [YOBRO](https://yobro.lol).

## Local preview

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Routes

- `/` — landing page
- `/en` — English landing page
- `/auth/callback` — email confirmation bridge to `yobro://auth/callback`
- `/auth/reset-password` — password recovery bridge to `yobro://auth/reset-password`
- `/privacy` — privacy summary
