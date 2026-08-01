# BioEchem Portal (Web)

Next.js app for the BioEchem STEM Education programs.

## Local development

All commands run from this folder (`bioechem-portal-web/`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` to `.env.local`.

## Dependencies and deploy

**Where packages live:** every npm package must be installed here, not at the repo root:

```bash
cd bioechem-portal-web
npm install some-package
```

That updates two files you **commit to git**:

| File | Purpose |
|------|---------|
| `package.json` | Lists direct dependencies (name + version range) |
| `package-lock.json` | Pins exact versions so deploy gets the same install |

**What is not committed:** `node_modules/` (listed in `.gitignore`). On Vercel or any CI, the platform runs `npm install` automatically from those two files.

**Current dependencies:**

- `next`, `react`, `react-dom` — app framework
- `@supabase/supabase-js`, `@supabase/ssr` — auth and database
- `lucide-react` — icons (Feather-style, moodboard)
- `tailwindcss` — styling (dev)

When we add UI libraries (e.g. icons), they will appear in `package.json` the same way.

## Deploy on Vercel

1. Connect this GitHub repo to Vercel.
2. Set **Root Directory** to `bioechem-portal-web` (Project Settings → General).
3. Add environment variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; add when used)
4. Deploy — Vercel runs `npm install` then `npm run build` inside this folder.

If Root Directory is wrong, Vercel may miss dependencies or build the wrong app.

