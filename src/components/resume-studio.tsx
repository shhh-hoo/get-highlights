"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultSelections, recommendSelections } from "@/lib/matcher";
import {
  buildRenderedDocument,
  reconcileRenderedDocument,
  renderedTextMap,
} from "@/lib/rendered-document";
import {
  duplicateSnapshot,
  loadSnapshotStore,
  makeSnapshot,
  parseSnapshotJson,
  saveSnapshotStore,
} from "@/lib/storage";
import type {
  ApplicationSnapshot,
  Bullet,
  Locale,
  Profile,
  RenderedEntry,
  RenderedResumeDocument,
  ResumeMaster,
  SelectionState,
} from "@/lib/types";

const PROFILE_LABEL: Record<Profile, string> = {
  ai_product: "AI Product",
  education_product: "Education Product",
  solutions: "Solutions",
  technical: "Technical",
};

const PROFILE_ORDER: Profile[] = ["ai_product", "education_product", "solutions", "technical"];

function currentBulletText(bullet: Bullet, state: SelectionState[string], locale: Locale) {
  const variant = bullet.variants.find((item) => item.profile === state.profile) ?? bullet.variants[0];
  return variant.text[locale];
}

function normalizeSnapshotSelection(master: ResumeMaster, next: SelectionState): SelectionState {
  const result: SelectionState = {};
  for (const section of master.sections) {
    for (const entry of section.entries) {
      for (const bullet of entry.bullets) {
        const candidate = next[bullet.id];
        const fallback = bullet.default_profile ?? bullet.variants[0].profile;
        const profile = candidate && bullet.variants.some((variant) => variant.profile === candidate.profile)
          ? candidate.profile
          : fallback;
        result[bullet.id] = candidate
          ? { enabled: candidate.enabled, profile, score: candidate.score }
          : { enabled: false, profile };
      }
    }
  }
  return result;
}

function formatSavedAt(value: string | null, locale: Locale) {
  if (!value) return locale === "zh" ? "仅保存在本机" : "Local only";
  return new Date(value).toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="score score-muted">—</span>;
  const level = score >= 75 ? "high" : score >= 55 ? "mid" : "low";
  return <span className={`score score-${level}`}>{score}%</span>;
}

function BulletEditor({
  bullet,
  state,
  locale,
  displayText,
  onChange,
}: {
  bullet: Bullet;
  state: SelectionState[string];
  locale: Locale;
  displayText?: string;
  onChange: (next: SelectionState[string]) => void;
}) {
  const availableProfiles = PROFILE_ORDER.filter((profile) => bullet.variants.some((variant) => variant.profile === profile));
  return (
    <div className={`bullet-card ${state.enabled ? "is-selected" : ""}`}>
      <div className="bullet-card-top">
        <label className="check-row">
          <input type="checkbox" checked={state.enabled} onChange={(event) => onChange({ ...state, enabled: event.target.checked })} />
          <span>{state.enabled ? "Included" : "Excluded"}</span>
        </label>
        <ScoreBadge score={state.score} />
      </div>
      <p className="bullet-copy">{displayText ?? currentBulletText(bullet, state, locale)}</p>
      <div className="bullet-actions">
        <select value={state.profile} onChange={(event) => onChange({ ...state, profile: event.target.value as Profile })}>
          {availableProfiles.map((profile) => <option key={profile} value={profile}>{PROFILE_LABEL[profile]}</option>)}
        </select>
        <details>
          <summary>Facts locked</summary>
          <ul>{bullet.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </details>
      </div>
    </div>
  );
}

export function ResumeStudio({ master }: { master: ResumeMaster }) {
  const initialSelection = useMemo(() => defaultSelections(master), [master]);
  const [locale, setLocale] = useState<Locale>("zh");
  const [jd, setJd] = useState("");
  const [selection, setSelection] = useState<SelectionState>(initialSelection);
  const [renderedDocument, setRenderedDocument] = useState<RenderedResumeDocument>(() => buildRenderedDocument(master, initialSelection, "zh"));
  const [zoom, setZoom] = useState(0.72);
  const [applications, setApplications] = useState<ApplicationSnapshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pageOverflow, setPageOverflow] = useState<number[]>([0, 0]);

  const selectedCount = useMemo(() => Object.values(selection).filter((item) => item.enabled).length, [selection]);
  const activeApplication = useMemo(() => applications.find((item) => item.id === activeId) ?? null, [applications, activeId]);
  const historicalText = useMemo(() => renderedTextMap(renderedDocument), [renderedDocument]);
  const hasOverflow = pageOverflow.some((pixels) => pixels > 2);
  const staleMaster = Boolean(activeApplication && activeApplication.masterRevision !== master.revision);

  useEffect(() => {
    const stored = loadSnapshotStore();
    if (stored?.applications.length) {
      const active = stored.applications.find((item) => item.id === stored.activeId) ?? stored.applications[0];
      const normalized = normalizeSnapshotSelection(master, active.selection);
      const document = active.renderedDocument ?? buildRenderedDocument(master, normalized, active.locale);
      setApplications(stored.applications);
      setActiveId(active.id);
      setJd(active.jd);
      setLocale(active.locale);
      setSelection(normalized);
      setRenderedDocument(document);
      setSavedAt(active.updatedAt);
    } else {
      const document = buildRenderedDocument(master, initialSelection, "zh");
      const initial = makeSnapshot({
        name: "Working draft",
        jd: "",
        locale: "zh",
        selection: initialSelection,
        renderedText: renderedTextMap(document),
        renderedDocument: document,
        masterRevision: master.revision,
      });
      setApplications([initial]);
      setActiveId(initial.id);
      setRenderedDocument(document);
      saveSnapshotStore({ schemaVersion: 2, activeId: initial.id, applications: [initial] });
      setSavedAt(initial.updatedAt);
    }
    setHydrated(true);
  }, [initialSelection, master]);

  useEffect(() => {
    if (!hydrated || !activeId) return;
    const timer = window.setTimeout(() => {
      const now = new Date().toISOString();
      setApplications((current) => {
        const next = current.map((application) => application.id === activeId ? {
          ...application,
          schemaVersion: 2 as const,
          jd,
          locale,
          selection,
          renderedText: renderedTextMap(renderedDocument),
          renderedDocument,
          updatedAt: now,
        } : application);
        saveSnapshotStore({ schemaVersion: 2, activeId, applications: next });
        return next;
      });
      setSavedAt(now);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeId, hydrated, jd, locale, renderedDocument, selection]);

  useEffect(() => {
    let frame = 0;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      const pages = Array.from(document.querySelectorAll<HTMLElement>("#print-resume .paper"));
      setPageOverflow(pages.map((page) => Math.max(0, page.scrollHeight - page.clientHeight)));
    };

    frame = window.requestAnimationFrame(measure);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      for (const page of document.querySelectorAll<HTMLElement>("#print-resume .paper")) observer.observe(page);
    }
    void document.fonts?.ready.then(measure);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [renderedDocument]);

  const captureCurrent = (source = applications) => {
    if (!activeId) return source;
    const now = new Date().toISOString();
    return source.map((application) => application.id === activeId ? {
      ...application,
      schemaVersion: 2 as const,
      jd,
      locale,
      selection,
      renderedText: renderedTextMap(renderedDocument),
      renderedDocument,
      updatedAt: now,
    } : application);
  };

  const persistApplications = (next: ApplicationSnapshot[], nextActiveId: string) => {
    setApplications(next);
    setActiveId(nextActiveId);
    saveSnapshotStore({ schemaVersion: 2, activeId: nextActiveId, applications: next });
    setSavedAt(new Date().toISOString());
  };

  const applySelection = (nextSelection: SelectionState) => {
    const document = reconcileRenderedDocument({
      master,
      previousDocument: renderedDocument,
      previousSelection: selection,
      nextSelection,
      locale,
    });
    setSelection(nextSelection);
    setRenderedDocument(document);
  };

  const markCurrentMasterRevision = () => {
    if (!activeId) return;
    setApplications((current) => current.map((application) => application.id === activeId
      ? { ...application, masterRevision: master.revision }
      : application));
  };

  const loadApplication = (application: ApplicationSnapshot) => {
    const committed = captureCurrent();
    const target = committed.find((item) => item.id === application.id) ?? application;
    const normalized = normalizeSnapshotSelection(master, target.selection);
    const document = target.renderedDocument ?? buildRenderedDocument(master, normalized, target.locale);
    persistApplications(committed, target.id);
    setJd(target.jd);
    setLocale(target.locale);
    setSelection(normalized);
    setRenderedDocument(document);
    setSavedAt(target.updatedAt);
  };

  const createApplication = () => {
    const committed = captureCurrent();
    const nextSelection = defaultSelections(master);
    const document = buildRenderedDocument(master, nextSelection, locale);
    const created = makeSnapshot({
      name: locale === "zh" ? "新投递" : "New application",
      jd: "",
      locale,
      selection: nextSelection,
      renderedText: renderedTextMap(document),
      renderedDocument: document,
      masterRevision: master.revision,
    });
    persistApplications([created, ...committed], created.id);
    setJd("");
    setSelection(nextSelection);
    setRenderedDocument(document);
  };

  const renameApplication = (name: string) => {
    if (!activeId) return;
    const next = applications.map((application) => application.id === activeId
      ? { ...application, name, updatedAt: new Date().toISOString() }
      : application);
    persistApplications(next, activeId);
  };

  const duplicateApplication = () => {
    if (!activeApplication) return;
    const committed = captureCurrent();
    const source = committed.find((item) => item.id === activeApplication.id) ?? activeApplication;
    const copy = duplicateSnapshot(source);
    persistApplications([copy, ...committed], copy.id);
    setJd(copy.jd);
    setLocale(copy.locale);
    setSelection(normalizeSnapshotSelection(master, copy.selection));
    setRenderedDocument(copy.renderedDocument ?? buildRenderedDocument(master, copy.selection, copy.locale));
  };

  const deleteApplication = () => {
    if (!activeId) return;
    if (applications.length > 1 && !window.confirm(locale === "zh" ? "删除这个本地版本？" : "Delete this local version?")) return;
    let next = captureCurrent().filter((application) => application.id !== activeId);
    if (!next.length) {
      const nextSelection = defaultSelections(master);
      const document = buildRenderedDocument(master, nextSelection, locale);
      next = [makeSnapshot({
        name: locale === "zh" ? "新投递" : "New application",
        jd: "",
        locale,
        selection: nextSelection,
        renderedText: renderedTextMap(document),
        renderedDocument: document,
        masterRevision: master.revision,
      })];
    }
    const target = next[0];
    const normalized = normalizeSnapshotSelection(master, target.selection);
    persistApplications(next, target.id);
    setJd(target.jd);
    setLocale(target.locale);
    setSelection(normalized);
    setRenderedDocument(target.renderedDocument ?? buildRenderedDocument(master, normalized, target.locale));
  };

  const exportApplication = () => {
    if (!activeApplication) return;
    const committed = captureCurrent();
    const snapshot = committed.find((item) => item.id === activeApplication.id) ?? activeApplication;
    persistApplications(committed, snapshot.id);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${snapshot.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-") || "application"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importApplication = async (file: File | undefined) => {
    if (!file) return;
    const imported = parseSnapshotJson(await file.text());
    if (!imported) {
      window.alert(locale === "zh" ? "无法读取这个版本文件。" : "Could not read this snapshot file.");
      return;
    }
    imported.selection = normalizeSnapshotSelection(master, imported.selection);
    imported.renderedDocument = imported.renderedDocument ?? buildRenderedDocument(master, imported.selection, imported.locale);
    imported.renderedText = renderedTextMap(imported.renderedDocument);
    const committed = captureCurrent();
    persistApplications([imported, ...committed], imported.id);
    setJd(imported.jd);
    setLocale(imported.locale);
    setSelection(imported.selection);
    setRenderedDocument(imported.renderedDocument);
  };

  const analyze = () => {
    if (!jd.trim()) return;
    applySelection(recommendSelections(master, jd));
  };

  const updateBullet = (id: string, next: SelectionState[string]) => {
    applySelection({ ...selection, [id]: next });
  };

  const changeLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    setRenderedDocument(buildRenderedDocument(master, selection, nextLocale));
    markCurrentMasterRevision();
  };

  const refreshFromMaster = () => {
    setRenderedDocument(buildRenderedDocument(master, selection, locale));
    markCurrentMasterRevision();
  };

  const overflowLabel = pageOverflow
    .map((pixels, index) => pixels > 2 ? `P${index + 1} +${Math.ceil(pixels * 25.4 / 96)}mm` : null)
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="studio-shell">
      <header className="appbar no-print">
        <div>
          <div className="brand-line"><span className="brand-mark">GH</span><strong>Get Highlights</strong><span className="beta">CV Studio v0</span></div>
          <p>Locked facts. JD-aware selection. Human-approved wording.</p>
        </div>
        <div className="appbar-actions">
          <span className="save-indicator">● {locale === "zh" ? "已保存在本机" : "Saved locally"} · {formatSavedAt(savedAt, locale)}</span>
          <div className="segmented">
            <button className={locale === "zh" ? "active" : ""} onClick={() => changeLocale("zh")}>中文</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")}>EN</button>
          </div>
          <button className="secondary" onClick={() => applySelection(defaultSelections(master))}>Reset</button>
          <button className="primary" disabled={hasOverflow} title={hasOverflow ? "Resolve page overflow before export" : undefined} onClick={() => window.print()}>
            {hasOverflow ? "Fix overflow" : "Export PDF"}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="jd-panel no-print">
          <section className="applications-block">
            <div className="applications-heading">
              <div><span className="eyebrow">APPLICATIONS</span><strong>{locale === "zh" ? "本地版本" : "Local versions"}</strong></div>
              <button className="text-button" onClick={createApplication}>+ {locale === "zh" ? "新建" : "New"}</button>
            </div>
            <div className="application-list">
              {applications.map((application) => (
                <button key={application.id} className={`application-row ${application.id === activeId ? "active" : ""}`} onClick={() => loadApplication(application)}>
                  <span>{application.name}</span>
                  <small>{new Date(application.updatedAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" })}</small>
                </button>
              ))}
            </div>
            {activeApplication && (
              <>
                <input className="application-name" value={activeApplication.name} onChange={(event) => renameApplication(event.target.value)} aria-label="Application name" />
                {staleMaster && (
                  <button className="refresh-master" onClick={refreshFromMaster}>
                    {locale === "zh" ? "此版本已冻结 · 使用最新母版刷新" : "Frozen snapshot · Refresh from current master"}
                  </button>
                )}
                <div className="snapshot-actions">
                  <button onClick={duplicateApplication}>{locale === "zh" ? "复制" : "Duplicate"}</button>
                  <button onClick={exportApplication}>{locale === "zh" ? "导出 JSON" : "Export JSON"}</button>
                  <label>{locale === "zh" ? "导入" : "Import"}<input type="file" accept="application/json,.json" onChange={(event) => { void importApplication(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
                  <button className="danger-text" onClick={deleteApplication}>{locale === "zh" ? "删除" : "Delete"}</button>
                </div>
              </>
            )}
          </section>

          <div className="panel-heading jd-heading">
            <span className="eyebrow">01 · TARGET ROLE</span>
            <h2>Paste the JD</h2>
            <p>We score against your existing evidence. No claims are invented.</p>
          </div>
          <textarea value={jd} onChange={(event) => setJd(event.target.value)} placeholder="Paste a job description here…\n\n例如：负责 AI 产品策略、用户研究、LLM Eval、跨团队协作与产品落地…" />
          <button className="primary analyze" disabled={!jd.trim()} onClick={analyze}>Analyze & recommend</button>
          <div className="analysis-note"><span>{selectedCount}</span> bullets currently selected</div>
          <div className="principles"><strong>Safety rail</strong><p>Selection and wording may change. Dates, metrics, scope and factual claims stay locked.</p></div>
        </aside>

        <section className="composer no-print">
          <div className="panel-heading sticky-title">
            <span className="eyebrow">02 · COMPOSER</span>
            <h2>Choose the evidence</h2>
            <p>Scores combine JD relevance with evidence strength. Override any recommendation.</p>
          </div>
          <div className="composer-scroll">
            {master.sections.map((section) => (
              <section className="editor-section" key={section.id}>
                <div className="editor-section-title">{section.title[locale]}</div>
                {section.entries.map((entry) => (
                  <div className="editor-entry" key={entry.id}>
                    <div className="editor-entry-head"><strong>{entry.title[locale]}</strong>{entry.meta && <span>{entry.meta[locale]}</span>}</div>
                    {entry.bullets.map((bullet) => (
                      <BulletEditor
                        key={bullet.id}
                        bullet={bullet}
                        state={selection[bullet.id]}
                        locale={locale}
                        displayText={selection[bullet.id]?.enabled ? historicalText[bullet.id] : undefined}
                        onChange={(next) => updateBullet(bullet.id, next)}
                      />
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </section>

        <section className="preview-panel">
          <div className="preview-toolbar no-print">
            <div>
              <span className="eyebrow">03 · LIVE PREVIEW</span>
              <strong>Two-page A4</strong>
              <span className={`fit-status ${hasOverflow ? "is-overflow" : "is-fit"}`}>
                {hasOverflow ? `${locale === "zh" ? "超出" : "Overflow"}: ${overflowLabel}` : (locale === "zh" ? "页面适配正常" : "Pages fit")}
              </span>
            </div>
            <label>Zoom <input type="range" min="0.55" max="0.92" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          </div>
          <div className="preview-stage">
            <div className="preview-stack" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <ResumePages document={renderedDocument} overflow={pageOverflow} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ResumePages({ document, overflow }: { document: RenderedResumeDocument; overflow: number[] }) {
  const work = document.sections.find((section) => section.id === "work");
  const education = document.sections.find((section) => section.id === "education");
  const projects = document.sections.find((section) => section.id === "projects");

  const renderEntry = (entry: RenderedEntry) => (
    <div className="cv-entry" key={entry.id}>
      <div className="cv-entry-header">
        <div><h3>{entry.title}</h3>{entry.subtitle && <p>{entry.subtitle}</p>}</div>
        {entry.meta && <span>{entry.meta}</span>}
      </div>
      <ul>{entry.bullets.map((bullet) => <li key={bullet.id}>{bullet.text}</li>)}</ul>
    </div>
  );

  return (
    <div id="print-resume">
      <article className={`paper page-one ${overflow[0] > 2 ? "is-overflowing" : ""}`}>
        <ResumeHeader document={document} />
        {work && work.entries.length > 0 && <CvSection title={work.title}>{work.entries.map(renderEntry)}</CvSection>}
        {education && education.entries.length > 0 && <CvSection title={education.title}>{education.entries.map(renderEntry)}</CvSection>}
        <CvSection title={document.about.title}><div className="about-copy">{document.about.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></CvSection>
      </article>

      <article className={`paper page-two ${overflow[1] > 2 ? "is-overflowing" : ""}`}>
        <ResumeHeader document={document} compact />
        {projects && projects.entries.length > 0 && <CvSection title={projects.title}>{projects.entries.map(renderEntry)}</CvSection>}
        <CvSection title={document.skills.title}>
          <div className="skills-grid">{document.skills.groups.map((skill) => <div key={skill.label}><strong>{skill.label}</strong><span>{skill.items.join(" · ")}</span></div>)}</div>
        </CvSection>
      </article>
    </div>
  );
}

function ResumeHeader({ document, compact = false }: { document: RenderedResumeDocument; compact?: boolean }) {
  return (
    <>
      <header className={`resume-header ${compact ? "compact" : ""}`}>
        <div><h1>{document.identity.name}</h1><p>{document.identity.headline}</p></div>
        <div className="contact-line">{document.identity.contact.map((item) => <span key={item}>{item}</span>)}</div>
      </header>
      {!compact && <div className="metric-strip">{document.metrics.map((metric) => <div key={metric.value + metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</div>}
    </>
  );
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="cv-section"><div className="cv-section-title"><span>{title}</span></div>{children}</section>;
}
