# 0001. Build the weekly To Do List app on MERN with a Netlify hosted API

**Date**: 2026-11-11
**Status**: In Progress

## Summary

You are building a mobile first To Do List web app where tasks are grouped into weeks that run Monday to Sunday, each week showing how many tasks are open and how many are done. It is a TypeScript MERN app (MongoDB, Express, React, Node) in one repository, and the Express API runs inside a Netlify Function, so the whole thing ships as one Netlify deploy. There is no login: each browser gets an anonymous id, so every visitor sees only their own tasks. The screens follow the Figma file, with a few gaps filled in where the assignment PDF asks for more than the Figma shows.

## Requirements

**User stories**:
- As a user, I want to add a task with a title, a date and a start time, plus an optional end time, priority and description, so that I can plan what I have to do.
- As a user, I want to see my tasks grouped by week (Monday to Sunday), with open and completed counts per week, so that I know how each week is going.
- As a user, I want to tick a task as completed (or untick it back to in progress) and see the counts change at once.
- As a user, I want to edit or delete a task, including by swiping left on it, so that my list stays accurate.
- As a user, I want to search my tasks by keyword and act on the results, so that I can find a task without scrolling through weeks.
- As a reviewer, I want to open a public Netlify URL and use the app without interfering with other reviewers' data.

**Acceptance criteria**:
- **AC-1**: Create. From Home or Search, the add button opens the "Add New Task" sheet with the date set to the selected day. Saving with a valid title (1 to 120 chars after trimming), date and start time creates the task, closes the sheet, shows a "Task created" toast, and the task appears in the matching day list, week counts and week card without a page reload. End time, priority (Low, Medium, High) and description (up to 1000 chars) are optional.
- **AC-2**: Validation. An empty or whitespace only title, a missing date or start time, or an end time not later than the start time shows an inline message under the field and sends no request. The API independently rejects the same inputs with `400 VALIDATION_ERROR` and a `fields` map. The save button is disabled while a request is in flight, so a double tap creates one task.
- **AC-3**: Edit. The edit action opens "Edit Task" prefilled with the stored values. Saving changes updates every place the task shows. Changing the date to another week moves the task to that week and updates both weeks' counts. Clearing end time or priority stores null.
- **AC-4**: Delete. Swiping a row left past the threshold reveals a red Delete button; tapping it deletes the task with no further prompt. The trash icon asks "Delete this task?" first. After delete the task disappears from every list and counts update. Deleting a task that no longer exists shows a toast and refreshes the list.
- **AC-5**: Search. The search bar on Home opens `/search`. Typing searches title and description, case insensitive, 300 ms after the last keystroke, treating the text literally (searching `a.b` does not match `axb`). Each result shows title, date and status, and lets you view, edit, delete (swipe or trash) and toggle status. No match shows an empty state. More than one page of results shows "Load more".
- **AC-6**: Week grouping. A task belongs to the week (Monday 00:00 to Sunday 23:59) that contains its start, in the device time zone. A task on Sunday 23:30 local is in that week; one on Monday 00:00 local is in the next.
- **AC-7**: Week cards. Home shows an "All weeks" section with one card per week that has tasks, sorted oldest first, each showing the date range, open count and completed count, with the current week labelled "This week". Tapping a card expands it to list that week's tasks (grouped by day) and tapping again collapses it. A week with no tasks has no card.
- **AC-8**: Home top section. Home shows the search bar, a Monday to Sunday day strip for the selected week (previous and next week buttons, a "Today" jump, a dot under days with tasks, the selected day as a blue pill), "Task Complete" and "Task Pending" cards with two digit counts for that week, a "Weekly Progress" bar (completed over total, empty when the week has no tasks) and a "Tasks Today" list for the selected day (titled with the day when it is not today). "View All" scrolls to All weeks and expands the selected week.
- **AC-9**: Status. Ticking a row's checkbox marks the task completed (title struck through, muted) and unticking returns it to in progress. Counts, progress bar and week card update immediately. If the request fails, the change reverts and a toast explains it.
- **AC-10**: Onboarding. A first visit lands on the onboarding screen ("Manage What To Do"). "Get Started" goes to Home, and later visits go straight to Home.
- **AC-11**: Isolation. Two browsers (different client ids) never see each other's tasks. Reading, editing or deleting another client's task id returns 404. A request without a valid `X-Client-Id` returns 400.
- **AC-12**: Responsive. Every screen works from 320 px to 1440 px wide with no horizontal scroll. From 640 px up, content sits in a centred column up to 480 px wide. The task sheet's primary button is visible without scrolling the page at 360x640, 1024x768 and 1280x720.
- **AC-13**: Persistence and deploy. Tasks are stored in MongoDB and survive reload and redeploy. The app and the API run from one public Netlify URL, and `GET /api/health` there returns `{ ok: true, db: "up" }`.
- **AC-14**: States. Every list shows skeletons while loading, a friendly empty state when there is nothing, and an inline error with Retry when loading fails. Failed mutations show a toast.
- **AC-15**: View. Tapping a task row (not the checkbox or icons) opens a read only "Task details" sheet with all fields and Edit and Delete actions. The sheet's open state is in the URL, so the browser back button closes it.
- **AC-16**: Accessibility. Every control is reachable and usable by keyboard, has an accessible name, and shows a visible focus ring. Dialogs trap focus and close on Esc. Text meets WCAG AA contrast. Delete is reachable without swiping (trash icon).

## Decision

**Chosen option**: Option 1: One repo MERN app, Express inside a Netlify Function

You build a TypeScript MERN app in one npm workspaces repo, serve the React build from Netlify and run the Express API as a Netlify Function on the same origin, store tasks in MongoDB Atlas, and separate each visitor's data with an anonymous client id.

## Feature design

### Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) everywhere |
| Client | React (current major), Vite, React Router, TanStack Query v5, Tailwind CSS v4, `lucide-react`, Poppins (Google Fonts) |
| Dates | Native `Date` and `Intl`, no date library |
| Server | Node 20+, Express, Mongoose, `zod`, `express-rate-limit`, `serverless-http` |
| Database | MongoDB Atlas (M0 free tier, MongoDB 5.0 or later for `$dateTrunc`) |
| Hosting | Netlify: static site from `client/dist`, function `netlify/functions/api.ts` |
| Tests | Vitest, Supertest, `mongodb-memory-server` |

Repository layout and the full file list are in [docs/system-design.md](../../system-design.md), section 6.

### Data model sketch

One collection, `tasks`:

| Field | Type | Required | Rules |
|---|---|---|---|
| `_id` | ObjectId | yes | Returned as `id` |
| `clientId` | string | yes | UUID v4 from `X-Client-Id`; never returned |
| `title` | string | yes | Trimmed, 1 to 120 chars |
| `description` | string | no | Trimmed, up to 1000 chars, default `""` |
| `startAt` | Date | yes | Selected date plus start time in the user's zone, stored as UTC |
| `endAt` | Date or null | no | Later than `startAt`, less than 24 h after it, default null |
| `priority` | `low` / `medium` / `high` or null | no | Default null |
| `status` | `in_progress` / `completed` | yes | Default `in_progress` |
| `createdAt`, `updatedAt` | Date | auto | Mongoose timestamps |

- Index: `{ clientId: 1, startAt: 1 }`. No other index.
- No relations, no users collection. Hard delete.
- Week, open count, completed count and progress are derived, never stored.

### State transitions

`in_progress` ⇄ `completed` (either direction, any time, by the owner). Delete is terminal from either state.

### API surface

All routes under `/api`, JSON, body limit 10 kB. "Auth" here is the anonymous `X-Client-Id` header (UUID v4), which scopes data and is not authentication.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/health` | GET | none | `{ ok, db: "up" \| "down" }` | none | |
| `/api/tasks` | GET | `from`, `to` (ISO, required, `to > from`, span at most 42 days) | `{ items: Task[] }` by `startAt`, `_id`; max 500 | client id | 400 |
| `/api/tasks/search` | GET | `q` (trimmed, 1 to 100 chars), `limit` (1 to 50, default 20), `cursor` (optional) | `{ items: Task[], nextCursor: string \| null }` | client id | 400 |
| `/api/tasks/:id` | GET | id | `Task` | client id | 404 |
| `/api/tasks` | POST | `title` (req), `startAt` (req), `description?`, `endAt?`, `priority?` | `201 Task` | client id | 400 |
| `/api/tasks/:id` | PATCH | any of `title`, `description`, `startAt`, `endAt` (nullable), `priority` (nullable), `status` | `Task` | client id | 400, 404 |
| `/api/tasks/:id` | DELETE | id | `204` | client id | 404 |
| `/api/weeks` | GET | `tz` (IANA, required) | `{ weeks: [{ weekStart, open, completed, total }] }` oldest first | client id | 400 |

- `Task` JSON: `{ id, title, description, startAt, endAt, priority, status, createdAt, updatedAt }`, dates as ISO strings.
- Error JSON: `{ error: { code, message, fields? } }`, codes `BAD_REQUEST`, `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`. A 500 never includes a stack.
- Unknown body fields are stripped. A malformed ObjectId returns 404.
- PATCH validates the merged task (stored plus patch) against the end time rule.
- Search: regex special characters in `q` are escaped, then matched case insensitive against `title` or `description`. Sort `startAt` asc, `_id` asc. `cursor` is base64 of `<startAt ISO>|<_id>` of the last item; an undecodable cursor returns 400.
- Weeks: `$match { clientId }`, `$group` by `$dateTrunc { date: "$startAt", unit: "week", startOfWeek: "monday", timezone: tz }`, count total and completed, `open = total - completed`, sort by week asc. `tz` is checked with `new Intl.DateTimeFormat("en", { timeZone: tz })` in `try`; failure returns 400.
- The router is mounted at both `/api` and `/.netlify/functions/api`.

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| Any API call | Client id | `localStorage["todo.clientId"]`, created with `crypto.randomUUID()` on first use; in memory fallback if storage throws |
| Create, edit | `startAt` | Form `date` + `startTime` parsed as local time (`new Date(\`${date}T${time}\`)`), sent as ISO |
| Create, edit | `endAt` | Form `date` + `endTime` the same way, or null when empty |
| Create sheet | Default date | Home `selectedDate` (via `?date=`), else today |
| Create, edit | Default start time | Blank; the user must pick one |
| Home | Selected week range | `startOfWeek(selectedDate)` to `+7 days` in local time, sent as `from`/`to` |
| Home | Day strip dots | Days in the selected week range response that have at least one task |
| Home | "Task Complete" / "Task Pending" counts | Count of `completed` / `in_progress` in the selected week range response, padded to 2 digits |
| Home | Weekly Progress | Completed over total of the same response; 0 when total is 0 |
| Home | Day list | Tasks from the same response whose local day equals `selectedDate`, sorted by `startAt` |
| Home | All weeks cards | `GET /api/weeks?tz=` where `tz = Intl.DateTimeFormat().resolvedOptions().timeZone` (fallback `"UTC"` if the API rejects it) |
| Week card | Date range label | `weekStart` from the API, plus 6 days, formatted with `Intl` |
| Week card | "This week" label | `weekStart` equals `startOfWeek(today).getTime()` |
| Expanded week card | Its tasks | `GET /api/tasks?from=weekStart&to=weekStart+7d` |
| Row | Time and date text | `startAt` (and `endAt`) formatted with `Intl` in local time |
| Row | Priority chip | `priority` (hidden when null) |
| Onboarding gate | Whether to show it | `localStorage["todo.onboarded"] === "1"` |
| Sheet | Which sheet is open | URL params `sheet` (`new`, `view`, `edit`), `id`, `date` |
| Search | Query text | Search input after a 300 ms debounce; not sent when empty after trim |

### Key invariants

- Every database read and write filters on `clientId` from the validated header. No route reads or writes across clients.
- `title` is never empty after trimming. `endAt`, when set, is later than `startAt` and less than 24 h after it.
- `status` is only `in_progress` or `completed`.
- Week membership is always computed from `startAt` and a time zone, never stored.
- The client never sends `clientId`, `createdAt`, `updatedAt` or `id` in a body; the server ignores them if sent.

### Security model

- **Who sees what**: a client sees and changes only tasks whose `clientId` equals its header. Other clients' tasks are 404. This separates demo data; it is not authentication (see rationale, Premise note).
- **Input**: `zod` validates every query, param and body; wrong types are rejected, which blocks Mongo operator injection. Search input is regex escaped. No `dangerouslySetInnerHTML`.
- **Abuse**: `express-rate-limit` at 120 requests per minute per IP (in memory per function instance, so a soft limit). Body limit 10 kB. Range responses capped at 500 items, search pages at 50.
- **Secrets**: `MONGODB_URI` only in Netlify environment settings and an ignored `server/.env`; `server/.env.example` holds placeholders.
- **Database access**: Atlas allows `0.0.0.0/0` (Netlify has no fixed outbound IP), so the protection is a dedicated database user with a long random password, scoped to this database.
- **Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` via `netlify.toml`.
- **Logging**: one line per request with method, path, status and duration; never the raw client id or request bodies.

### Configuration required

- `MONGODB_URI`: Atlas connection string including the database name. Set in Netlify site environment (Functions scope) and in `server/.env` for local runs.
- `PORT`: local Express port, default 4000. Local only.

### Client design

**Routes**: `/welcome` (Onboarding), `/` (Home), `/search` (Search). The task sheet opens over the current route from URL params: `?sheet=new[&date=YYYY-MM-DD]`, `?sheet=view&id=`, `?sheet=edit&id=`.

**Query keys** (TanStack Query): `["tasks","range",from,to]`, `["tasks","search",q]` (infinite), `["tasks","one",id]`, `["weeks",tz]`.
- Create, edit and delete invalidate `["tasks"]` and `["weeks"]` on success.
- Status toggle is optimistic: cancel `["tasks"]` queries, snapshot, flip status with `setQueriesData` in every cached list, restore on error with a toast, invalidate `["tasks"]` and `["weeks"]` when settled.
- Defaults: `staleTime` 30 s, query `retry` 1, mutation `retry` 0.

**Sheet**: native `<dialog>` opened with `showModal()`. Fixed header, scrolling body, sticky footer with the primary button. Bottom sheet below 640 px, centred modal (max width 480 px) from 640 px. Closing removes the URL params.

**Swipe to delete**: pointer events on the row content, `touch-action: pan-y`. Drag left up to 88 px; release past 44 px snaps open and shows the red Delete button, otherwise snaps closed. Opening a row closes any other open row. A tap elsewhere closes it.

**Week math** (`client/src/lib/week.ts`): `startOfWeek(d)` sets local midnight then subtracts `(getDay() + 6) % 7` days; `addDays` uses `setDate`. Formatting uses `Intl.DateTimeFormat`.

### UI spec (from the Figma)

Reference screenshots: [docs/figma/all-frames.png](../../figma/all-frames.png) and [docs/figma/home-and-new-task-zoom.png](../../figma/home-and-new-task-zoom.png). Figma frames are 390x844.

**Tokens** (define in `@theme` in `client/src/index.css`; colours sampled from the Figma render, so treat them as close, not exact):

| Token | Value | Used for |
|---|---|---|
| `primary` | `#4566EC` | Add button, selected day pill, checkbox border, primary buttons, links |
| `primary-strong` | `#253C98` | Progress fill |
| `complete-ink` | `#1C3082` | Task Complete icon and text |
| `progress-track` | `#DADAFF` | Progress track |
| `complete-bg` | `#EFF2FF` | Task Complete card |
| `pending-bg` | `#FFE6E7` | Task Pending card |
| `danger` | `#BC393E` | Pending icon and text, Delete button, error text |
| `ink` | `#090E23` | Headings and body text |
| `muted` | `#717171` | Labels, secondary text |
| `muted-2` | `#6E7180` | "This Week" captions |
| `icon` | `#C0C0C0` | Row icons, placeholder icons |
| `border` | `#EAEAEA` | Inputs |
| `divider` | `#ECECEC` | Row separators |
| `page` | `#FDFDFF` | Page background |
| `surface` | `#FFFFFF` | Sheets, inputs |
| `overlay` | `rgba(0,0,0,.25)` | Dialog backdrop |

Font: Poppins 400, 500, 600. Corner radius small (0 to 4 px), cards and inputs 4 px, day pill and add button fully round.

**Onboarding** (`/welcome`): blue (`primary`) hero filling about the top 64% with the zigzag and arc decoration as inline SVG; below it, heading "Manage What To Do" (24 px, 600), body "The best way to manage what you have to do, don't forget your plans" (13 px, `muted`), full width "Get Started" button (48 px tall, `primary`).

**Home** (`/`), 24 px side padding:
1. Search bar (48 px tall, `border`, search icon) that navigates to `/search`.
2. Week row: range label ("10 to 16 Nov") with previous and next chevrons and a "Today" link.
3. Day strip: 7 cells Mon to Sun (weekday abbreviation over day number); selected cell is a `primary` pill about 40x64 with white text; a small dot under days with tasks.
4. Two stat cards side by side (gap 16, about 96 tall): "Task Complete" on `complete-bg` and "Task Pending" on `pending-bg`, each with an icon, a large two digit count and "This Week" caption.
5. "Weekly Progress" heading (18 px, 600) and a 24 px bar (`progress-track`, fill `primary-strong`).
6. "Tasks Today" heading (or the day name, for example "Wed, 12 Nov", when not today) with "View All" on the right, then the day list.
7. "All weeks" heading and the week cards (range, "Open N", "Completed N", chevron; "This week" badge).
8. Floating add button: 72 px `primary` circle with a white plus, fixed bottom right, above content.

**Task row** (about 64 px tall, `divider` bottom border): 20 px checkbox with `primary` border, title (15 px, 500; struck through and `muted` when completed), a small time line (and a date line in Search and in week cards), optional priority chip (text, `low` grey, `medium` primary tint, `high` danger tint), trash and pencil icons (22 px, `icon`). Swipe reveals a full height red Delete button.

**Task sheet**: header "Add New Task" / "Edit Task" / "Task details" with a close X. Fields in order: "Task title" (text input), "Set Time" with "Start" and "Ends" side by side (native time inputs with a clock icon), "Set Date" (native date input showing a formatted label like "Friday 14, January" and a calendar icon; clicking calls `showPicker()` where supported), "Priority" (segmented Low, Medium, High, tap again to clear), "Description" (textarea about 100 px). Footer button "Create task" / "Save changes" (48 px, full width, `primary`). The details view shows the same fields as text with "Edit" and "Delete" buttons.

**Search** (`/search`): back arrow and an autofocused search input on one row, then result rows, "Load more" at the end, and the add button.

**Deviations from the Figma, on purpose**: day strip is Mon to Sun (7 cells, not Sun to Sun); All weeks section added; Priority field and chip added; search results show a date line and row actions; the settings and bell icons in the New Task frame's background are not built.

### Critical test scenarios

- Happy path: create a task, see it in the day list, week counts and week card; tick it and see counts change; edit its date to next week and see both weeks update; delete it by swipe. Verifies **AC-1**, **AC-3**, **AC-4**, **AC-7**, **AC-8**, **AC-9**.
- Validation: POST with empty title, title of spaces, title of 121 chars, missing `startAt`, `endAt` equal to `startAt`, `endAt` 25 h later, `title: { "$gt": "" }`; PATCH that moves `startAt` past the stored `endAt`. Each returns 400 with `fields`. Verifies **AC-2**.
- Isolation: client A creates a task; client B GET, PATCH and DELETE on that id return 404; no header returns 400; malformed id returns 404. Verifies **AC-11**.
- Week boundary: with `tz=Asia/Kolkata`, tasks at Sunday 23:30 and Monday 00:00 local land in different weeks; with `tz=America/New_York`, a task on the Sunday DST ends lands in the week starting the previous Monday; invalid `tz` returns 400. Client `startOfWeek` returns the same instants. Verifies **AC-6**.
- Search: `a.b` matches "a.b" but not "axb"; `FINISH` matches "finishing"; 25 matches with `limit=20` give 20 then 5 with `nextCursor` null; garbage cursor returns 400. Verifies **AC-5**.
- Optimistic failure: toggle while the API returns 500; the checkbox reverts and a toast shows. Verifies **AC-9**, **AC-14**.
- Layout: each screen at 320x640, 360x640, 390x844, 1024x768, 1280x720 with no horizontal scroll and the sheet button visible. Verifies **AC-12**.
- Deploy: on the Netlify URL, `/api/health` returns `db: "up"`; create a task, reload, it is still there; refresh on `/search` loads the page. Verifies **AC-13**.

## Build plan

Order follows Tracer Bullet slices (no project build approach was recorded, so this is the default): a thin thread through every layer first, then each slice thickens it. Each slice ends runnable locally, and slice 0 is also deployed.

**Slice 0: skeleton, deployed**
1. Create the npm workspaces repo (`client`, `server`), `tsconfig` files, `.gitignore` (ignores `node_modules`, `dist`, `.env`, `.netlify`), root scripts `dev`, `build`, `test`. Satisfies **AC-13**. **[x] Done 2026-11-11.**
2. Server: `createApp()` with JSON body limit, error handler and error JSON shape, `GET /api/health`, cached `connectDb()`, `local.ts` listener. Satisfies **AC-13**. **[x] Done 2026-11-11.**
3. Function `netlify/functions/api.ts` with `serverless-http`, router mounted at `/api` and `/.netlify/functions/api`; `netlify.toml` with build, functions, redirects and headers. Satisfies **AC-13**. **[x] Done 2026-11-11 (handler run locally on both paths; not yet deployed).**
4. Client: Vite React app with Tailwind v4 tokens, Poppins, router with three empty routes, Vite proxy for `/api`. Satisfies **AC-12**, **AC-13**. **[x] Done 2026-11-11.**
5. Create the Atlas cluster and database user, set `MONGODB_URI` on Netlify, deploy, and confirm `/api/health` shows `db: "up"`. Satisfies **AC-13**.

**Slice 1: create and see a task**
6. `Task` model and index; `clientId` middleware; `zod` schemas for create and range query; `POST /api/tasks`, `GET /api/tasks?from&to`; serializer. Satisfies **AC-1**, **AC-2**, **AC-11**, **AC-13**. **[x] Done 2026-11-11.**
7. Client: `clientId.ts`, fetch wrapper with `X-Client-Id` and `ApiError`, `lib/week.ts` with tests. Satisfies **AC-6**, **AC-11**. **[x] Done 2026-11-11.**
8. Home: search bar (link only), week row, day strip with dots, day list with `TaskRow` (read only), add button. Satisfies **AC-6**, **AC-8**. **[x] Done 2026-11-11 (add button centred per the Figma, not bottom right).**
9. `TaskSheet` with `TaskForm` in create mode: fields, inline validation, disabled save while pending, invalidation, toast. Satisfies **AC-1**, **AC-2**. **[x] Done 2026-11-11.**

**Slice 2: status and stats**
10. `PATCH /api/tasks/:id` with partial schema and merged end time check. Satisfies **AC-2**, **AC-3**, **AC-9**. **[x] Done 2026-11-11.**
11. Checkbox with optimistic toggle and revert; stat cards and Weekly Progress from the week response. Satisfies **AC-8**, **AC-9**. **[x] Done 2026-11-11.**

**Slice 3: view, edit, delete**
12. `GET /api/tasks/:id`, `DELETE /api/tasks/:id`. Satisfies **AC-4**, **AC-11**, **AC-15**. **[x] Done 2026-11-11.**
13. View sheet, edit mode of the form, URL driven sheet state. Satisfies **AC-3**, **AC-15**. **[x] Done 2026-11-11.**
14. Trash with `ConfirmDialog`; swipe to delete on `TaskRow`; 404 handling with toast and refetch. Satisfies **AC-4**. **[x] Done 2026-11-11.**

**Slice 4: weeks**
15. `GET /api/weeks?tz` aggregation with tz validation. Satisfies **AC-6**, **AC-7**. **[x] Done 2026-11-11.**
16. All weeks section with `WeekCard` (lazy range fetch on expand, "This week" label) and "View All". Satisfies **AC-7**, **AC-8**. **[x] Done 2026-11-11.**

**Slice 5: search**
17. `GET /api/tasks/search` with escaping and cursor. Satisfies **AC-5**. **[x] Done 2026-11-11.**
18. Search route: debounced input, infinite query, shared `TaskRow` with date line, empty state, Load more. Satisfies **AC-5**. **[x] Done 2026-11-11.**

**Slice 6: onboarding**
19. Onboarding screen with SVG decoration and the `todo.onboarded` gate. Satisfies **AC-10**. **[x] Done 2026-11-11.**

**Slice 7: harden and ship**
20. Loading skeletons, empty states, inline errors with Retry, toaster with an `aria-live` region. Satisfies **AC-14**. **[x] Done 2026-11-11.**
21. Responsive pass (320 px to 1440 px, centred column, sheet as modal from 640 px) and accessibility pass (labels, focus rings, keyboard, contrast). Satisfies **AC-12**, **AC-16**. **[x] Done 2026-11-11 (checked at 320, 360, 390, 1024, 1280, 1440 px; `muted-2` and `icon` tokens darkened from the Figma to pass contrast).**
22. Rate limiter, security headers check, request logging with hashed client id. Satisfies **AC-11**. **[x] Done 2026-11-11.**
23. Server integration tests and client unit tests from Critical test scenarios; layout check at the listed viewports. Satisfies **AC-2**, **AC-5**, **AC-6**, **AC-11**, **AC-12**. **[x] Done 2026-11-11 (server 18, client 11 tests).**
24. README (setup, env, scripts, deploy, live URL), final deploy and deploy smoke test, push to GitHub. Satisfies **AC-13**. **README done 2026-11-11; deploy and push owed (needs you).**

## Consequences

**Positive**:
- One repo, one deploy, one URL, same origin: no CORS, no second host to keep awake, and the API is clearly "your own".
- Week math lives in two small, tested places (`lib/week.ts` and the weeks pipeline) and respects the user's time zone.
- Reviewers get their own data with zero sign up.

**Negative / tradeoffs**:
- Function cold starts add about 1 to 2 s to the first request after idle (Mongo connect included). Skeletons hide it, but it is visible.
- The client id is not authentication. Anyone with the id can read those tasks, and clearing site data loses access to them.
- Rate limiting is per function instance, so it is a soft limit.
- Atlas must allow all IPs because Netlify has no fixed outbound address; security rests on the database password.
- Search is a regex scan per client; fine for thousands of tasks per client, not for millions.
- Last write wins when two tabs edit the same task. No offline support.

**Neutral**:
- Express is wrapped by `serverless-http`; the same app runs as a normal server locally and in tests, so moving to a long running host later is a small change.
- Some Figma values (font, exact colours, spacing) are taken from the rendered canvas, not Dev Mode, so they may differ slightly from the source file.

## Follow-up

- [ ] Confirm in the first deploy which path shape reaches Express (`/api/...` or `/.netlify/functions/api/...`) and drop the unused mount if you want.
- [ ] Confirm font family and exact token values in Figma Dev Mode if you get access (needs a Figma login).
- [ ] Agent Skills and MCP servers were deferred ("Not now, later"). Useful ones for this stack: an Agent Skill for React with TanStack Query (cache and mutation conventions), Tailwind v4 (the `@theme` token setup), Express and Mongoose (schema and aggregation patterns), Netlify Functions (bundling and redirects), plus the Netlify MCP server (deploys, env vars, function logs) and the MongoDB MCP server (inspect the Atlas collection and index). Run `/architect` tool discovery or `npx skills find <tool>` when you want them.
- [ ] Optional later: idempotency key on create, real accounts, reminders, offline mode.

## Rationale

See [rationale.md](rationale.md).
