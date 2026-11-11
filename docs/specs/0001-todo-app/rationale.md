# 0001. Rationale: weekly To Do List app

Decision record for [index.md](index.md). The build does not need this file.

## Context

The SDE 1 assignment asks for a MERN To Do List: create, edit, delete and search tasks; group them by week (Monday to Sunday) with open and completed counts per week card; mark tasks completed or in progress; swipe left to delete; a responsive mobile UI that follows a given Figma file; and delivery as a GitHub repo plus a Netlify deploy "using your own API".

The forces that shaped the design:
- **Netlify hosts static sites**, but the brief wants a real Node and Mongo API. The API has to live somewhere a reviewer can reach from the Netlify URL, ideally with no extra service to keep running.
- **No login is asked for**, yet the deploy is public. With one shared list, every reviewer would see and change everyone else's tasks.
- **"Week" depends on time zone.** A task at Sunday 23:30 in India is Monday in Tokyo. Grouping has to use the viewer's zone, and the Monday boundary must hold across daylight saving changes.
- **The Figma and the PDF disagree** (single week view vs week cards, Sun to Sun strip vs Mon to Sun weeks, start and end times vs one date and time, no priority field). The build needs these settled up front.
- **It is an assessment**: reviewers judge correctness, code clarity and fidelity to the design, not scale.

**Premise note**: the anonymous client id gives each browser its own data. It is not authentication, and the spec does not treat it as security for private data. That is acceptable here because the app holds no personal data and the brief has no login.

## Options considered

### Option 1: One repo, Express inside a Netlify Function (chosen)

React build served by Netlify; Express wrapped with `serverless-http` as one Netlify Function; `/api/*` rewritten to it on the same origin; MongoDB Atlas.

**Pros**:
- One repo, one deploy, one URL, one set of env vars; no CORS.
- Clearly "your own API" on Netlify, as the brief asks.
- The same Express app runs locally and in tests as a normal server.

**Cons**:
- Cold starts of about 1 to 2 s after idle.
- In memory rate limit and connection cache are per instance.

### Option 2: Netlify for the client, Express on Render or Railway

A separate long running Node host for the API, called cross origin.

**Pros**:
- A normal server: no cold start inside a request, shared in memory state.

**Cons**:
- Two deploys, two URLs, CORS setup. Free tiers sleep, so the first call can take 30 s or more, which is worse than a function cold start.

### Option 3: Netlify Functions with one function per route, no Express

Hand written handlers, one per endpoint.

**Pros**:
- Smallest functions, no adapter.

**Cons**:
- Drops the "E" in MERN that reviewers expect, duplicates routing, validation and error handling across files, and is harder to run locally.

### Option 4: A backend as a service (Firebase, Supabase) instead of Mongo and Express

**Pros**:
- Built in auth and hosting.

**Cons**:
- Not MERN; does not show your own API. Rejected by the brief.

## Rationale

Option 1 is the only one that meets "Netlify deploy using your own API" with a single deployable and no cross origin plumbing, and its cold start (about 1 to 2 s) is shorter than the free tier sleep of Option 2. Wrapping Express keeps the code recognisably MERN and lets the same app power local development and Supertest tests, which Option 3 would lose.

For identity, an anonymous id per browser solves the shared demo problem without adding a login the brief never asked for. For weeks, deriving the week from `startAt` plus the viewer's IANA zone (client `Date` math for ranges, `$dateTrunc` with `startOfWeek: "monday"` on the server for the summary) keeps one rule in two small, testable places, and avoids a stored `weekStart` that would be wrong for any other zone and stale after edits.

For the UI, the Figma top section is kept intact for the selected week and the PDF's week cards are added below it, so both the design and the requirement are visible on Home without inventing a new layout.

### Smaller decisions

| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript | Shared `Task` types between client and server; catches shape errors early |
| Repo | npm workspaces (`client`, `server`) | One install, one root `dev`, no extra tooling |
| Server state | TanStack Query | Caching, invalidation and the optimistic toggle with rollback, in a few lines |
| Time model | Date and start required, end optional | Meets "date and time mandatory" while keeping the Figma's Start and Ends fields |
| Week strip | Mon to Sun, 7 cells | The PDF defines weeks as Mon to Sun; Figma's 8 cell Sun to Sun strip would straddle two weeks |
| Priority | Added as a segmented control and row chip | Required by the PDF, missing in the Figma |
| Sheet | Native `<dialog>` with URL state | Free focus trap and Esc; back button closes it |
| Date and time inputs | Native inputs, styled | Phone native pickers, no picker library |
| Dates | Native `Date` and `Intl` | Week math is a few lines; no dependency |
| Delete confirm | Trash asks, swipe does not | Swipe is already deliberate; trash is a single tap |
| Status values | `in_progress`, `completed` | Matches the PDF wording; UI shows "Pending" per Figma |
| Deletion | Hard delete | No undo requirement, nothing references a task |
| Search | Escaped regex, cursor paging | Literal matching, stable pages; text index not needed at this size |
| Agent skills and MCP | Deferred | Your choice ("Not now, later"); listed in Follow-up |

## Figma evidence

**Source**: public Figma file "To Do List Mobile app", Page 1, viewed in the browser without Dev Mode (the Figma connector was not authorised). Screenshots saved in `docs/figma/`:
- `all-frames.png`: all four frames (Onboarding, Home, New Task, Frame 9 search), including the bottom of Home with the add button and the New Task "Create task" button.
- `home-and-new-task-zoom.png`: Home and New Task zoomed for detail.

**Frames**: each is 390x844.
- **Onboarding**: blue hero with a zigzag line and arcs over the top portion, "Manage What To Do", one line of body text, "Get Started".
- **Home**: search bar; a day strip from Sun 09 to Sun 16 with Wed 12 selected; "Task Complete" (08) and "Task Pending" (10) cards with "This Week"; "Weekly Progress" bar; "Tasks Today" with "View All"; rows with checkbox, title, trash and pencil icons; one row swiped to show a red Delete; floating plus button.
- **New Task**: bottom sheet over a dimmed Home ("Add New Task", X), "Task title", "Set Time" with Start and Ends, "Set Date" showing "Friday 14, January", "Description", "Create task". The dimmed background shows a header with settings and bell icons that appear nowhere else.
- **Frame 9 (search)**: back arrow, search input, rows with checkbox and title.

**How colours were taken**: from the zoomed screenshot, the darkest pixel in each element's region was sampled (to avoid anti aliased edges and white background), then rounded to the hex values in the index token table. Sizes were measured against the 390 px frame width. Treat both as close approximations; Dev Mode would give exact values.

**Conflicts found and how they were settled**: see the gap table in [docs/system-design.md](../../system-design.md), section 3, and "Deviations from the Figma" in [index.md](index.md).
