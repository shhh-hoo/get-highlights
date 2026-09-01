# Get Highlights — CV Studio v0

A JD-aware CV composer built around one rule: **facts are locked; selection and wording can change.**

## What v0 does

- Stores the master CV as structured YAML (`content/resume.master.yaml`)
- Pastes a job description and scores existing evidence locally in the browser
- Recommends which bullets to include and which approved wording variant to use
- Lets the user override every recommendation manually
- Switches between Chinese and English wording
- Shows a live two-page A4 preview
- Exports the same preview to PDF through the browser print dialog
- Exposes the factual claims behind each bullet as a locked evidence rail
- Saves application-specific CV versions locally, including JD, locale, selected bullets and wording variants
- Supports new / rename / duplicate / delete plus JSON import and export for local backups

No API key, account or database is required for v0. Application versions use a versioned `localStorage` payload because snapshots are small structured text. The matcher is intentionally deterministic and explainable; an LLM matcher can be added later without changing the data model or renderer.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm start
```

## Architecture

```text
content/resume.master.yaml
        ↓
server-side YAML loader
        ↓
Next.js CV Studio
  ├─ JD matcher (deterministic v0)
  ├─ bullet / wording selector
  ├─ local application snapshots
  └─ live A4 renderer
        ↓
browser print → PDF
```

## Data model

Every bullet contains:

- `facts`: immutable source claims / metrics
- `variants`: approved role-specific wording (`ai_product`, `education_product`, `solutions`, `technical`)
- `tags`: terms used by the local JD matcher

The matcher may select approved evidence and wording, but does not generate new facts.

Each saved application snapshot stores:

- job description
- locale
- bullet inclusion state
- approved wording profile per bullet
- exact rendered bullet text at save time
- timestamps and master revision marker

The exact rendered text is retained so an already-submitted version remains auditable even if the master wording changes later.

## Product direction

Next iterations can add:

1. LLM-assisted JD analysis returning structured relevance scores and rationale
2. editable draft variants with fact-level validation before acceptance
3. automatic two-page fit warnings and layout tuning
4. optional Git-backed or file-based sync for users who want multi-device portability
5. server-side Typst / RenderCV export for deterministic PDF generation
