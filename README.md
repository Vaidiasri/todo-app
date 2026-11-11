# To Do List

A weekly To Do List app. You can add, view, edit, complete and delete tasks, see this week's progress, browse every week that has tasks, and search across all of them.

**Live URL:** TBD (added after the first Netlify deploy)

## Stack

- **Client:** React 19, Vite, React Router, TanStack Query, Tailwind CSS v4
- **API:** Express 5 and Mongoose on Node, validated with zod
- **Database:** MongoDB Atlas
- **Hosting:** Netlify. The static client is served from `client/dist`. The API runs as one Netlify Function (`netlify/functions/api.ts`), and `/api/*` is redirected to it.

There are no accounts. Each browser gets a random id, stored in `localStorage` and sent as the `X-Client-Id` header, and every task is scoped to that id.

## Run it locally

You need Node 20.12 or newer.

```sh
npm install
npm run dev
```

This starts the API on http://localhost:4000 and the web app on http://localhost:5173. Vite proxies `/api` to the API.

With no `MONGODB_URI` set, the API starts a throwaway in-memory MongoDB, so you can try the app with nothing else installed. Data is lost when it restarts. To keep data, copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.

## Environment

| Variable | Where | What |
|---|---|---|
| `MONGODB_URI` | `server/.env` locally, Netlify site settings in production | Atlas connection string including the database name, for example `.../todo?retryWrites=true&w=majority` |
| `PORT` | `server/.env` (optional) | Local API port, default `4000` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API and web app together, with reload |
| `npm test` | Server integration tests (Supertest against in-memory MongoDB) and client unit tests (Vitest) |
| `npm run build` | Type-checks the server and builds the client into `client/dist` |

## API

Task and week routes need the `X-Client-Id` header (a UUID). Every route is rate limited to 120 requests a minute per IP. The limit is held in memory per function instance, so it is a soft limit.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check, including DB status |
| `GET` | `/api/tasks?from&to` | Tasks starting in a time range (the week view) |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/:id` | One task |
| `PATCH` | `/api/tasks/:id` | Partial update, including status toggle |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/tasks/search?q&cursor` | Case-insensitive search on title and description, paged |
| `GET` | `/api/weeks?tz` | Every week that has tasks, with open and completed counts |

Errors use one shape: `{ "error": { "code", "message", "fields"? } }`.

## Deploy to Netlify

1. In MongoDB Atlas, create a free cluster and a database user. Under Network Access, allow `0.0.0.0/0`, because Netlify Functions do not have fixed IPs.
2. Push this repo to GitHub.
3. In Netlify, choose **Add new site, Import an existing project**, and pick the repo. The build settings come from `netlify.toml`, so you don't need to change them.
4. Under **Site configuration, Environment variables**, add `MONGODB_URI`.
5. Deploy, then open `https://<your-site>.netlify.app/api/health`. It should report the database as up.

## Project layout

```
client/              React app (routes, components, API hooks, date helpers)
server/              Express app, Mongoose model, zod schemas, tests
netlify/functions/   Serverless entry that wraps the Express app
docs/specs/          Design spec and build plan
```
