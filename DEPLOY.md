# Deploying Vitally on Railway

This guide walks through deploying the full-stack app (React + Express + PostgreSQL) to [Railway](https://railway.app).

## Prerequisites

- A [Railway account](https://railway.app) (free tier works to start)
- This repository pushed to GitHub (Railway deploys from a connected repo)
- [Railway CLI](https://docs.railway.app/guides/cli) installed (optional, but useful for running one-off commands like `db:push`)

## 1. Create the Project

1. Go to your [Railway dashboard](https://railway.app/dashboard) and click **New Project**.
2. Select **Deploy from GitHub repo** and pick this repository.
3. Railway auto-detects it as a Node.js project via Nixpacks — no Dockerfile or Procfile is needed.

## 2. Add a PostgreSQL Database

1. Inside your Railway project, click **New** → **Database** → **Add PostgreSQL**.
2. Once provisioned, click the PostgreSQL service, go to **Variables**, and copy the `DATABASE_URL` value (you won't need to paste it manually — see step 3).
3. Click on your **web service**, go to **Variables** → **Add Reference Variable**, and link `DATABASE_URL` from the PostgreSQL service. Railway will inject it automatically at runtime.

## 3. Set Environment Variables

On your web service, go to **Variables** and add the following:

### Required

| Variable         | Value             | Notes                                                |
| ---------------- | ----------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | _(auto-injected)_ | Linked from the PostgreSQL service in step 2         |
| `SESSION_SECRET` | Random string     | Generate one with `openssl rand -base64 32`          |
| `NODE_ENV`       | `production`      | Enables secure cookies and production static serving |

### Optional

| Variable                | Value                           | Notes                                                                                                                  |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`        | Your OpenAI key                 | Enables AI-powered food analysis and recipe suggestions (GPT-4o)                                                       |
| `GOOGLE_GEMINI_API_KEY` | Your Gemini key                 | Alternative AI provider (Gemini 1.5 Flash)                                                                             |
| `GOOGLE_CLIENT_ID`      | Your Google OAuth client ID     | Enables "Sign in with Google". Create at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)     |
| `GOOGLE_CLIENT_SECRET`  | Your Google OAuth client secret | Required alongside `GOOGLE_CLIENT_ID`. Set authorized redirect URI to `https://<your-domain>/api/auth/google/callback` |
| S3 vars (see below)     | —                               | For image uploads; auto-injected if Railway Object Storage is linked                                                   |

> The app works without any optional variables — AI nutrition features and image uploads are gracefully disabled when their keys are absent.

## 4. Configure Build & Start Commands

In your web service **Settings**, set:

| Setting           | Value                              |
| ----------------- | ---------------------------------- |
| **Build Command** | `npm run build && npm run db:push` |
| **Start Command** | `npm run start`                    |

**What these do:**

- `npm run build` — Bundles the React client (via Vite → `dist/public/`) and the Express server (via esbuild → `dist/index.cjs`).
- `npm run db:push` — Applies the Drizzle ORM schema to PostgreSQL. This is idempotent (only applies diffs), so it is safe to run on every deploy. It creates all required tables including the `sessions` table needed for authentication.
- `npm run start` — Runs `node dist/index.cjs`, which serves both the API and the static client build.

**Port:** Railway sets the `PORT` environment variable automatically. The app reads `process.env.PORT` and binds to `0.0.0.0`, so no port configuration is needed.

## 5. Deploy

Once your environment variables and commands are configured, trigger a deploy:

- Push a commit to your connected branch, **or**
- Click **Deploy** in the Railway dashboard.

Railway will run `npm install`, then your build command, then start the app.

## 6. Verify

1. Open the **Deployments** tab and check the build/runtime logs for a successful startup — you should see a log like `serving on port <PORT>`.
2. Click the generated `*.up.railway.app` URL (found in **Settings** → **Networking** → **Public Networking**; enable it if not already active).
3. Register an account and confirm the app loads correctly.

## 7. Custom Domain (Optional)

1. In your web service **Settings** → **Networking** → **Custom Domain**, enter your domain.
2. Add the CNAME record Railway provides to your DNS settings.
3. Railway automatically provisions an SSL certificate.

## 8. Object Storage for Image Uploads (Optional)

If you want to enable meal photo uploads and ingredient scanning images:

1. In your Railway project, click **New** → **Add Object Storage**.
2. Link the Object Storage volume to your web service.
3. Railway auto-injects these environment variables: `ENDPOINT`, `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION`.

The app's S3 client (`server/s3.ts`) already supports Railway's environment variable naming convention — no code changes required.

## 9. Pin Node.js Version (Recommended)

The project does not currently pin a Node.js version. To avoid surprises when Railway updates its default, add an `engines` field to `package.json`:

```json
{
  "engines": {
    "node": "20.x"
  }
}
```

Or create a `.node-version` file in the project root:

```
20
```

## Troubleshooting

| Symptom                                   | Cause                              | Fix                                                                                                                    |
| ----------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET must be set`              | Missing env var                    | Add `SESSION_SECRET` in Railway Variables                                                                              |
| `DATABASE_URL must be set`                | PostgreSQL not linked              | Link `DATABASE_URL` reference variable from the PostgreSQL service                                                     |
| Session/auth errors after deploy          | `sessions` table does not exist    | Run `npm run db:push` (included in the build command above)                                                            |
| `bcrypt` build failure                    | Native compilation issue           | Ensure you are using Railway's default Nixpacks builder, not a custom Dockerfile                                       |
| Cookies not persisting / auth not working | `NODE_ENV` not set to `production` | Set `NODE_ENV=production` — this enables `secure: true` on session cookies, which requires HTTPS (provided by Railway) |
| App starts but page is blank              | Static files not found             | Confirm `npm run build` completed successfully in the deploy logs                                                      |
| S3 upload errors                          | Object Storage not linked          | Link Railway Object Storage or add S3-compatible credentials manually                                                  |
| AI features not working                   | API keys not set                   | Add `OPENAI_API_KEY` or `GOOGLE_GEMINI_API_KEY` — at least one is needed for nutrition AI features                     |

## Architecture on Railway

```
Railway Project
├── Web Service (this repo)
│   ├── Build: npm run build && npm run db:push
│   ├── Start: node dist/index.cjs
│   └── Serves: API (Express) + SPA (React) on single port
├── PostgreSQL (plugin)
│   └── Linked via DATABASE_URL
└── Object Storage (optional)
    └── Linked via ENDPOINT, BUCKET, ACCESS_KEY_ID, etc.
```
