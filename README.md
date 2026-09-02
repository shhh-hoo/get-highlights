# Get Highlights — CV Studio v0

A JD-aware CV composer built around one rule: **facts are locked; selection and wording can change.**

## What v0 does

- Stores the master CV as structured YAML (`content/resume.master.yaml`)
- Pastes a job description and scores existing evidence locally in the browser
- Combines JD relevance with evidence strength so strong outcomes are not discarded just because wording differs
- Applies document-level bullet budgets instead of selecting independently inside every project
- Recommends which bullets to include and which approved wording variant to use
- Lets the user override every recommendation manually
- Switches between Chinese and English wording
- Shows a live two-page A4 preview at readable CV typography
- Detects page overflow and blocks PDF export instead of silently shrinking or clipping content
- Exports the same preview to PDF through the browser print dialog
- Exposes the factual claims behind each bullet as a locked evidence rail
- Saves application-specific CV versions locally, including JD, locale, selected bullets and wording variants
- Freezes the exact rendered document inside each saved application so later master edits do not rewrite historical submissions
- Derives the master revision from the YAML content hash and offers an explicit “refresh from current master” action
- Supports new / rename / duplicate / delete plus JSON import and export for local backups

No API key, account or database is required for v0. Application versions use a versioned `localStorage` payload because snapshots are small structured text. The matcher is intentionally deterministic and explainable; an LLM matcher can be added later without changing the data model or renderer.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validate

```bash
npm test
npm run build
```

The test suite covers document-level selection budgets, evidence anchors, malformed snapshot imports, the real resume master, and historical wording preservation across master changes.

## Architecture

```text
content/resume.master.yaml
        ↓
server-side YAML loader + content revision hash
        ↓
Next.js CV Studio
  ├─ JD matcher (deterministic v0)
  │    ├─ JD relevance
  │    ├─ evidence strength
  │    └─ document-level selection budget
  ├─ bullet / wording selector
  ├─ local application snapshots
  │    ├─ selection config
  │    └─ frozen rendered document
  └─ live A4 renderer + overflow gate
        ↓
browser print → PDF
```

## Data model

Every bullet contains:

- `facts`: immutable source claims / metrics
- `variants`: approved role-specific wording (`ai_product`, `education_product`, `solutions`, `technical`)
- `tags`: terms used by the local JD matcher
- optional `priority`: a small evidence prior when explicit product judgment is needed

The matcher may select approved evidence and wording, but does not generate new facts.

Each saved application snapshot stores:

- job description
- locale
- bullet inclusion state
- approved wording profile per bullet
- exact rendered bullet text at save time
- the complete rendered resume document at save time
- timestamps and the content-derived master revision

Historical applications render the frozen document. A user must explicitly refresh an application from the current master before later master edits are applied.

## Product direction

Next iterations can add:

1. LLM-assisted JD analysis returning structured relevance scores and rationale
2. editable draft variants with fact-level validation before acceptance
3. more actionable fit diagnostics, such as recommending the lowest-value bullet to remove
4. optional Git-backed or file-based sync for users who want multi-device portability
5. server-side Typst / RenderCV export for deterministic PDF generation
