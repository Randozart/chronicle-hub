# AGENTS.md

ChronicleHub is a Quality-Based Narrative (QBN) interactive-fiction platform — a spiritual successor to StoryNexus (games like *Fallen London*). Single Next.js 16 App Router monolith: React 19 + React Compiler, Tailwind CSS 4, MongoDB via native driver (no ORM), NextAuth v4, Tone.js/Strudel audio, React Flow editor graph, S3 asset storage.

An existing `CLAUDE.md` covers similar ground; this file adds operational gotchas discovered from plans/git history. Keep both in mind — where they conflict, trust this one (CLAUDE.md predates several refactors).

## Commands

```bash
npm run dev        # dev server on :3000 (requires .env.local, see below)
npm run build      # production build (also the primary "does it compile" check)
npm run lint       # eslint (flat config; scripts/** is globally ignored)
npx tsc --noEmit <file>   # per-file typecheck — the convention used in docs/plans
```

- **There is no test framework.** Verification workflow (per `docs/plans/*`): targeted `npx tsc --noEmit` on touched files, then `npm run lint` (no new diagnostics vs. baseline), then `npm run build`.
- `npm run build` can fail on Linux with a missing native binary — fix is `npm install lightningcss-linux-x64-gnu --no-save` (documented in the 2026-08-23 plan; environmental, don't commit the dependency).
- `npm run validate:composer` is **broken**: it calls `scripts/validate-image-composer.sh`, which does not exist. `scripts/` contains only standalone audio/sample tooling scripts (convert-sfz, generate-presets, etc.), not part of the app build.

## Environment

`.env.local` (gitignored) is required for dev/build since `src/engine/database.ts` throws at import time without it:

- `MONGODB_URI` — required
- `MONGODB_DB_NAME` — optional, defaults to `chronicle-hub-db`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — required for auth
- `ADMIN_EMAIL` — the sysadmin "god mode" account; bypasses all access checks (see access control below)
- Optional: `RESEND_API_KEY` / SMTP settings (email), `AWS_S3_*` (asset storage)

## Repository layout (parent folder is not the repo)

The git repo is `chronicle-hub/`. It has **two remotes**: `chronicle-hub` (public, github.com/Randozart/chronicle-hub) and `private` (chronicle-hub-private). The sibling `chronicle-hub-private/chronicle-hub-private/` directory is a separate, divergent checkout of the private remote (older deps, default README) — do not edit it when working on this codebase.

Untracked junk that shows up in `git status`: `Microsoft/` (Windows PowerShell profile artifacts), `validation-output/`, `test-build-tmp/`, `parser_refactor_report.md` (research report, gitignored).

## Architecture

### Request auth gate: `src/proxy.ts`

Next.js 16 renamed middleware to **proxy** — this project uses `src/proxy.ts` (there is no `middleware.ts`). It holds a hardcoded allowlist of public paths; anything not listed redirects to `/login` when unauthenticated.

**Gotcha: adding a new public page or API route requires editing the allowlist in `src/proxy.ts`**, or it will be login-walled. (Past bugs: `migrate-guest` route originally lived outside `/api` and never matched.)

### Route map

- `/` — dashboard (discover/my worlds)
- `/create/[storyId]/*` — the world **editor**, one subroute per tab (storylets, qualities, decks, locations, markets, opportunities, images, composer, audio, graph, players, settings, ...). Each tab keeps its own components in a local `components/` directory next to `page.tsx`.
- `/play/[storyId]` — the game **player** (guest-playable); `/play/[storyId]/creation` — character creation
- `/lazarus/*` — legacy StoryNexus import pipeline (restricted, see below)
- `/revival` — public revival/archive showcase
- `/playground/ligature` — standalone audio playground (public)
- `/docs/*` — extensive in-app documentation for creators (ScribeScript, qualities, effects, macros, ...); useful reference for engine semantics
- `/sysadmin`, `/api/sysadmin/*` — platform administration

### Engine (`src/engine/`)

Framework-agnostic TypeScript shared by client and server:

- `models.ts` — core data model. Key types: `QualityType` enum (`P`yramidal, `C`ounter, `T`racker, `I`tem, `S`tring, `E`quipable), `Storylet`, `Opportunity` (deck card), `ResolveOption` (with paired `pass_*`/`fail_*` outcomes), `QualityDefinition`.
- `gameEngine.ts` — `GameEngine` class. Constructor deep-copies player state (mutations only via controlled methods); exposes `getEffectiveQualitiesProxy()`, a JS `Proxy` computing effective levels (base + equipment bonuses) on the fly so scripts always see modified values.
- `mechanics/` — effect parsing, quality operations, scheduler.
- `scribescript/` + `textProcessor.ts` — the ScribeScript DSL (see below).
- `audio/` — the "Ligature" audio engine: own parser (`parser.ts`), synth/scheduler on Tone.js, Strudel integration (`strudelEngine.ts` drives a strudel.cc **iframe embed** via postMessage — this is why `next.config.ts` sets `Access-Control-Allow-Origin: *` on `/sounds/*`, the iframe needs to fetch local samples), tracker/.it import, MIDI conversion.
- `lazarus/` + `lazarusAccess.ts` — legacy StoryNexus data import (two modes: direct structured-JSON mapping, and inference/reconstruction from scraped JSONL). Access gated by an `archivist` role or per-user `author:<world>` access tags.
- `accessControl.ts` — `verifyWorldAccess(worldId, 'reader'|'writer'|'owner')`: the standard guard for editor/admin APIs. Precedence: `ADMIN_EMAIL` env god-mode → user roles `owner`/`admin` → world owner → collaborator role → `isOpenSource` worlds allow reader access to anyone.
- `database.ts` — Mongo client singleton (cached on `global` in dev to survive HMR).
- `dataLoader.ts` (React `cache`) and `contentCache.ts` (`unstable_cache`) — world content loading; worlds store most content inline under `content`, but storylets/opportunities live in their own collections.

### ScribeScript (the DSL)

Writers embed logic in text fields: `{$quality_id}` interpolation, `visible_if`/`unlock_if` condition strings, `pass_quality_change` effect strings, `{ // comments }`. Evaluation flows through `textProcessor.ts` (`evaluateText`/`evaluateCondition`) into `scribescript/` helpers. Numeric expressions are ultimately evaluated by `src/utils/safeEval.ts` — literally `new Function('Math', ...)` with Math injected; on error it returns the raw expression string. There are Prism highlighters for it in `src/utils/` (`prism-scribescript.ts`, `scribeHighlighter.ts`).

**Gotcha:** quality *names* themselves may contain ScribeScript; UI that humanizes lock reasons must run `evaluate()` over names and the final assembled string (shared util pattern introduced in `src/utils/lockReason.ts` / `categoryMatching.ts` — prefer the shared utils over copy-pasting regex humanizers; three divergent copies caused a real bug batch).

### Auth, roles, guests

- NextAuth v4 credentials provider (email/password, bcrypt), JWT sessions; session is enriched with `id`, `roles`, `hasAgreedToTos` via callbacks in `src/lib/auth.ts` (`(session.user as any).id` is the norm for getting the user id).
- Email verification with a whitelist bypass (`whitelistService.ts`); ToS enforcement via `TosEnforcer` + `tosAgreedAt`.
- **Guest play**: unauthenticated players get characters persisted to `localStorage` (see `GameHub.tsx`), later claimable via `/api/character/migrate-guest`.

### API route conventions (`src/app/api/`)

Pattern (see `worlds/route.ts`): `getServerSession(authOptions)` → 401, resolve user id/roles (`ADMIN_EMAIL` match or DB `roles` check for sysadmin), then `clientPromise` → `db.collection(...)` with inline Mongo queries and projections. Admin/editor routes additionally call `verifyWorldAccess`. No service layer for most routes — logic lives in the route file; larger domains have `*Service.ts` files in `src/engine/`.

## Conventions

- Path alias `@/*` → `./src/*`. TypeScript strict, ESM only. Engine files use 4-space indent; newer app code tends toward 2-space — match the file you're editing.
- `'use client'` on interactive components; React Compiler is enabled (`reactCompiler: true`), so avoid mutation-heavy patterns that break memoization assumptions.
- Theming is CSS custom properties (`src/styles/`, `themeParser.ts`, `public/themes/`); player-facing layouts are pluggable (`src/components/layouts/`: Elysium, London, Nexus, Tabletop). Scrollbars etc. must use the dedicated `--scrollbar-*` vars with fallbacks, not hardcoded colors.
- Design/plan documents live in `docs/plans/YYYY-MM-DD-<topic>-design.md` / `-implementation.md` (implementation docs include per-step `npx tsc --noEmit` verification commands). Follow this pattern for non-trivial work.
- Commits: conventional-prefix style (`fix(api): ...`, `feat(categories): ...`, `docs: ...`).
- Branches: per-feature/topic. **`parser-rework` is parked and known-broken** — do not build on it; active work has historically been cherry-picked onto `-clean` variants (e.g. `bugfix-batch-aug2026-clean`).

## Known issues / security notes

`docs/SECURITY_AUDIT.md` (note: file paths in it are stale Windows paths) lists: open CORS on `/api/strudel-samples`, no rate limiting on auth endpoints, S3 uploads use `public-read` ACL, and inconsistent admin-role checks across some `/api/admin/*` routes. Don't regress these further; standardizing `verifyWorldAccess` across admin routes is a known open item.
