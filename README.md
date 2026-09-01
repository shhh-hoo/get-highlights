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

No API key is required for v0. The matcher is intentionally deterministic and explainable; an LLM matcher can be added later without changing the data model or renderer.

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
  └─ live A4 renderer
        ↓
browser print → PDF
```

## Data model

Every bullet contains:

- `facts`: immutable source claims / metrics
- `variants`: approved role-specific wording (`ai_product`, `education_product`, `solutions`, `technical`)
- `tags`: terms used by the local JD matcher

The matcher may select or reorder approved evidence, but does not generate new facts.

## Product direction

Next iterations can add:

1. LLM-assisted JD analysis returning structured relevance scores and rationale
2. editable draft variants with fact-level validation before acceptance
3. saved application snapshots per company / role
4. automatic two-page fit warnings and layout tuning
5. server-side Typst / RenderCV export for deterministic PDF generation
