# CLAUDE.md — Content Vault

This file gives Claude Code persistent context about this project. Read it at the start of every session.

## What this project is
A personal **content reference manager** for Komal (creator @theaigirlhere, founder of Allianza Biz).
She saves Instagram posts/reels/carousels and creator profiles she wants to learn from or repurpose,
plus knowledge ("context") and her own content ideas. It started as a single-file React artifact and is
now being built into real local software with accounts and a database.

## Current state of the repo
- `spec/ContentVault (1).jsx` — the FULL working prototype UI (single file, uses a browser `window.storage`
  API for persistence). This is the source of truth for **design, layout, and all features**. Read it first.
- `spec/VaultAuth.jsx` — a standalone login/signup screen prototype matching the same aesthetic.

These two files are the SPEC. The job is to turn them into a real Next.js + Supabase app.

## Target architecture
- **Next.js (App Router) + TypeScript**
- **Supabase** for auth (email/password + Google) and Postgres database
- `@supabase/ssr` package for cookie-based sessions (NOT the deprecated auth-helpers)
- Screenshots stored in **Supabase Storage** (save the URL), NOT base64 — base64 is what made the
  prototype file balloon to 470KB+. Avoid that.

## The four content types (tabs)
Every saved item has a `type`, which decides its tab:
1. `idea` — Content Ideas: formats/types Komal can create
2. `context` — Context Library: knowledge to look up later (can have MULTIPLE source links)
3. `reference` — Saved References: IG posts to reuse/repurpose (has screenshots + a `format`)
4. `profile` — Profiles: creators she admires (shows handle + screenshots)

## Item fields (must match the prototype exactly)
- `type` (one of the four above)
- `title`
- `link` (Instagram or source URL)
- `account` (account/ID tag, e.g. "@theaigirlhere", "Myself", "Allianza Biz")
- `business` (optional business tag: Allianza Biz, RojaFume, KomalFi, Aim Funnels, Personal brand)
- `context` (her notes / the knowledge)
- `tags` (string array, topic tags)
- `format` (reference only: reel | static | carousel)
- `images` (array of screenshot URLs; carousels have several, scrollable)
- `sources` (context only: array of {label, url} for multiple reels on the same topic)
- `useful` (true / false / null)
- `created_at`

## Features that must be preserved from the prototype
- Four tabs with live counts
- Search across title/notes/tags/account/business
- Filters: account, business, useful-rating; plus a Reel/Static/Carousel format filter on the References tab
- Cards with: type+format badge, business tag, account tag, screenshots (scrollable carousel with dots),
  notes, topic tags, useful/not-useful toggles, edit + delete
- Profiles render as handle + avatar + screenshots + "View profile" button (no IG embed)
- Context cards can show MULTIPLE sources ("2 sources on this")
- Add/Edit modal with type picker, screenshot upload, format selector (references), business selector
- **Important:** Instagram cannot be live-embedded in a sandbox; the prototype uses a screenshot + a
  "Watch/Open on Instagram" button. Keep that approach (screenshots are the visual; link opens IG).

## Design system (keep identical to the prototype)
- Warm dark background `#1a1714`, panels `#221e1a`/`#2a2521`, lines `#39322c`
- Text `#ece5dc`, dim `#9c9088`
- Accents: orange `#d4a373` (ideas/primary), blue `#8a9bd4` (context), green `#7a8b6f` (references),
  pink `#c98bb9` (profiles), red `#b56b5a` (delete/negative)
- Display font: Georgia / serif. Body: Helvetica Neue / system sans.
- Brand mark: a small glowing orange dot + "THE CONTENT VAULT" in letter-spaced uppercase.

## Security
- Row Level Security on the items table: each user sees ONLY their own rows.
- In server code, verify auth with `supabase.auth.getUser()` (verifies token with the auth server),
  not `getSession()`.
- Never put the Supabase secret/service-role key in client code.

## Conventions
- Use the App Router (`app/` dir), Server Components for data fetching + auth checks,
  a Client Component for the interactive vault UI, and Server Actions for create/update/delete.
- Keep the single-file prototype's look and behavior; do not redesign.
- Komal works on Windows. Prefer commands that work in PowerShell.

## Migration
Komal has a JSON export of ~22 existing items from the prototype (downloaded via its "Export" button).
A script should import that JSON into the database, scoped to her user id. Keep base64 images working
on import (don't drop data), but new uploads should go to Supabase Storage.
