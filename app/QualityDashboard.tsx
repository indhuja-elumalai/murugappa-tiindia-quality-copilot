"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SidebarIdentity, TopbarAccount } from "./AuthControls";
import { ProductWalkthrough } from "./ProductWalkthrough";

type ViewId = "command" | "nonconformance" | "investigations" | "suppliers" | "knowledge" | "reports" | "settings";
type Severity = "High" | "Medium" | "Low";
type IncidentStatus = "Open" | "In progress" | "Review" | "Closed";

type Incident = {
  id: string;
  title: string;
  division: string;
  supplier: string;
  component: string;
  observation?: string;
  severity: Severity;
  status: IncidentStatus;
};

type Citation = {
  sourceId: string;
  title: string;
  relevance: number;
  excerpt: string;
};

type Investigation = {
  _id: string;
  threadId: string;
  incidentId: string;
  problem: string;
  division: string;
  evidenceStatus: string;
  problemSummary: string;
  generationMethod: string;
  generatedAt: string;
  containmentChecks: string[];
  rootCauseChecks: string[];
  citations: Citation[];
  recommendedNextAction: string;
  disclaimer: string;
  createdAt: string;
};

const initialIncidents: Incident[] = [
  { id: "NCR-1042", title: "Weld seam variation above tolerance", division: "Tube Products", supplier: "Apex Steel Works", component: "ERW precision tube", severity: "High", status: "In progress" },
  { id: "NCR-1039", title: "Chain link pitch dimensional deviation", division: "Industrial Chains", supplier: "Kaveri Forgings", component: "08B roller chain", severity: "High", status: "Open" },
  { id: "NCR-1037", title: "Surface coating pinholes after curing", division: "TI Cycles", supplier: "Prime Coat Systems", component: "City frame assembly", severity: "Medium", status: "Review" },
  { id: "NCR-1034", title: "Door frame bend angle out of specification", division: "Metal Forming", supplier: "Internal process", component: "Front door sash", severity: "Medium", status: "In progress" },
  { id: "NCR-1028", title: "Packing label traceability mismatch", division: "Fine Blanking", supplier: "Orbit Labels", component: "Seat recliner plate", severity: "Low", status: "Open" },
];

const knowledgeDocuments = [
  { id: "SOP-TUBE-014", type: "Approved SOP", title: "ERW weld variation containment", division: "Tube Products", revision: "Rev 6" },
  { id: "WI-WELD-008", type: "Work instruction", title: "Weld seam inspection", division: "Tube Products", revision: "Rev 4" },
  { id: "NCR-0918", type: "Closed case", title: "Historical ERW seam deviation", division: "Tube Products", revision: "Verified" },
  { id: "SOP-CHAIN-021", type: "Approved SOP", title: "Roller chain dimensional control", division: "Industrial Chains", revision: "Rev 3" },
];

const navigation: { id: ViewId; icon: string; label: string }[] = [
  { id: "command", icon: "▦", label: "Command center" },
  { id: "nonconformance", icon: "◇", label: "Non-conformance" },
  { id: "investigations", icon: "◎", label: "8D investigations" },
  { id: "suppliers", icon: "⌁", label: "Suppliers" },
  { id: "knowledge", icon: "▥", label: "Knowledge base" },
  { id: "reports", icon: "↗", label: "Reports" },
];

const viewLabels: Record<ViewId, string> = {
  command: "Command center",
  nonconformance: "Non-conformance",
  investigations: "8D investigations",
  suppliers: "Supplier quality",
  knowledge: "Knowledge base",
  reports: "Quality reports",
  settings: "Settings",
};

const investigationSteps = ["Problem defined", "Evidence retrieved", "Root cause draft", "Corrective action", "Effectiveness review"];
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function QualityDashboard() {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState(initialIncidents[0].id);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState("");
  const [activeView, setActiveView] = useState<ViewId>("command");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All severity");
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const applyHash = () => {
      const candidate = window.location.hash.replace("#", "") as ViewId;
      if (candidate && candidate in viewLabels) setActiveView(candidate);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    window.addEventListener("popstate", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener("popstate", applyHash);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/incidents", { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch("/api/investigations", { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
    ]).then(([incidentPayload, investigationPayload]) => {
      if (incidentPayload?.data?.length) {
        const remote = incidentPayload.data.map((incident: Record<string, string>) => ({
          id: incident.ncrNumber,
          title: incident.title,
          division: incident.division,
          supplier: incident.supplier,
          component: incident.component,
          observation: incident.observation,
          severity: incident.severity,
          status: incident.status,
        })) as Incident[];
        setIncidents(remote);
        setSelectedId(remote[0].id);
      }
      if (investigationPayload?.data) {
        setInvestigations(investigationPayload.data);
        if (investigationPayload.data[0]) setSelectedInvestigationId(investigationPayload.data[0]._id);
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const selected = incidents.find((incident) => incident.id === selectedId) ?? incidents[0];
  const selectedDraft = investigations.find((item) => item._id === selectedInvestigationId)
    ?? investigations.find((item) => item.incidentId === selected.id);
  const incidentDraft = investigations.find((item) => item.incidentId === selected.id);

  const visible = useMemo(() => incidents.filter((incident) => {
    const text = `${incident.id} ${incident.title} ${incident.supplier} ${incident.component}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (severity === "All severity" || incident.severity === severity);
  }), [incidents, query, severity]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function navigate(view: ViewId) {
    setActiveView(view);
    setMobileNavOpen(false);
    window.history.pushState(null, "", view === "command" ? window.location.pathname : `#${view}`);
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const highestNumber = Math.max(...incidents.map((item) => Number(item.id.replace(/\D/g, ""))).filter(Number.isFinite), 1042);
    const next: Incident = {
      id: `NCR-${highestNumber + 1}`,
      title: String(data.get("title")),
      division: String(data.get("division")),
      supplier: String(data.get("supplier")),
      component: String(data.get("component")),
      observation: String(data.get("details")),
      severity: String(data.get("severity")) as Severity,
      status: "Open",
    };

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ncrNumber: next.id,
          title: next.title,
          division: next.division,
          supplier: next.supplier,
          component: next.component,
          observation: next.observation,
          severity: next.severity,
        }),
      });
      if (!response.ok) throw new Error("Unable to save NCR");
      const payload = await response.json();
      next.status = payload.data.status ?? "Open";
    } catch {
      if (clerkConfigured) {
        flash("NCR was not saved. Check the quality API and try again.");
        return;
      }
    }

    setIncidents((current) => [next, ...current]);
    setSelectedId(next.id);
    setModalOpen(false);
    setActiveView("command");
    flash(`${next.id} saved and routed for triage`);
  }

  async function analyzeSelected() {
    setAiLoading(true);
    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: selected.id,
          problem: [selected.title, selected.observation].filter(Boolean).join(". "),
          division: selected.division,
        }),
      });
      if (!response.ok) throw new Error("AI service unavailable");
      const payload = await response.json();
      const draft = payload.data as Investigation;
      setInvestigations((current) => [draft, ...current]);
      setSelectedInvestigationId(draft._id);
      flash("Evidence-backed draft generated and saved to 8D investigations");
    } catch {
      flash("Draft could not be generated. Verify the API and evidence services.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`} aria-label="Primary navigation">
        <div className="brand"><div className="brand-mark">TI</div><div className="brand-copy"><div className="brand-name">Quality Copilot</div><div className="brand-sub">Engineering excellence</div></div></div>
        <div className="nav-label">Workspace</div>
        {navigation.map((item) => (
          <button className={`nav-item ${activeView === item.id ? "active" : ""}`} key={item.id} onClick={() => navigate(item.id)}>
            <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            {item.id === "nonconformance" && <span className="nav-count">{incidents.length}</span>}
            {item.id === "investigations" && investigations.length > 0 && <span className="nav-count green-count">{investigations.length}</span>}
          </button>
        ))}
        <div className="nav-label">System</div>
        <button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><span className="nav-icon">⚙</span><span>Settings</span></button>
        <div className="sidebar-note"><strong>Responsible AI</strong><p>Copilot drafts are evidence-linked and require engineer approval before entering an 8D report.</p></div>
        <SidebarIdentity />
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNavOpen(true)}>☰</button><span className="desktop-copy">Quality operations&nbsp; / &nbsp;</span><strong>{viewLabels[activeView]}</strong></div>
          <div className="top-actions">
            {(activeView === "command" || activeView === "nonconformance") && <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search NCR, supplier or component" aria-label="Search incidents" />}
            <button className="icon-button" aria-label="Notifications" onClick={() => flash("No new quality alerts")}>◉</button>
            <button className="primary" data-tour="new-ncr" onClick={() => setModalOpen(true)}>＋ <span className="desktop-copy">New NCR</span></button>
            <TopbarAccount />
          </div>
        </header>

        <div className="content">
          {activeView === "command" && <CommandCenter incidents={incidents} visible={visible} selected={selected} selectedId={selectedId} severity={severity} query={query} draft={incidentDraft} aiLoading={aiLoading} onSelect={setSelectedId} onSeverity={setSeverity} onClear={() => { setQuery(""); setSeverity("All severity"); }} onAnalyze={analyzeSelected} onOpenInvestigations={() => { if (incidentDraft) setSelectedInvestigationId(incidentDraft._id); navigate("investigations"); }} />}
          {activeView === "nonconformance" && <NonConformanceView incidents={visible} selectedId={selectedId} severity={severity} onSelect={setSelectedId} onSeverity={setSeverity} onClear={() => { setQuery(""); setSeverity("All severity"); }} onCreate={() => setModalOpen(true)} onInvestigate={() => navigate("command")} />}
          {activeView === "investigations" && <InvestigationsView investigations={investigations} selected={selectedDraft} onSelect={setSelectedInvestigationId} onOpenIncident={(id) => { setSelectedId(id); navigate("command"); }} />}
          {activeView === "suppliers" && <SuppliersView incidents={incidents} />}
          {activeView === "knowledge" && <KnowledgeView />}
          {activeView === "reports" && <ReportsView incidents={incidents} investigations={investigations} />}
          {activeView === "settings" && <SettingsView />}
        </div>
      </main>

      {modalOpen && <NewIncidentModal onClose={() => setModalOpen(false)} onSubmit={createIncident} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <ProductWalkthrough />
    </div>
  );
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="hero-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="hero-copy">{copy}</p></div>{action}</div>;
}

function CommandCenter({ incidents, visible, selected, selectedId, severity, draft, aiLoading, onSelect, onSeverity, onClear, onAnalyze, onOpenInvestigations }: {
  incidents: Incident[]; visible: Incident[]; selected: Incident; selectedId: string; severity: string; query: string; draft?: Investigation; aiLoading: boolean;
  onSelect: (id: string) => void; onSeverity: (value: string) => void; onClear: () => void; onAnalyze: () => void; onOpenInvestigations: () => void;
}) {
  return <>
    <PageHeader eyebrow="Operational excellence" title="Quality command center" copy="A unified view of supplier quality, investigations, and preventive action." action={<span className="updated">Live workspace · authenticated quality data</span>} />
    <section className="metrics" data-tour="quality-pulse" aria-label="Quality metrics">
      <Metric label="Open non-conformances" value={String(incidents.filter((item) => item.status !== "Closed").length)} foot={`${incidents.filter((item) => item.severity === "High").length} high-severity records`} icon="N" />
      <Metric label="On-time 8D closure" value="91.4%" foot="↑ 4.8% vs last month" icon="8D" good />
      <Metric label="Supplier PPM" value="186" foot="↓ 22 from previous period" icon="P" good />
      <Metric label="Repeat defect rate" value="2.7%" foot="Target below 3.0%" icon="R" good />
    </section>
    <div className="grid">
      <IncidentPanel incidents={visible} selectedId={selectedId} severity={severity} onSelect={onSelect} onSeverity={onSeverity} onClear={onClear} />
      <CopilotPanel selected={selected} draft={draft} loading={aiLoading} onAnalyze={onAnalyze} onOpen={onOpenInvestigations} />
    </div>
    <div className="section-grid">
      <section className="panel mini-panel"><h3>Non-conformance by division</h3><Bar label="Tube Products" width="82%" value="14" /><Bar label="Metal Forming" width="65%" value="11" /><Bar label="Industrial Chains" width="47%" value="8" /><Bar label="TI Cycles" width="35%" value="6" /></section>
      <section className="panel mini-panel"><h3>Recent quality activity</h3><Activity mark="✓" copy="Containment action approved for NCR-1042" time="18 minutes ago · Quality engineering" /><Activity mark="8D" copy="Supplier response received from Kaveri Forgings" time="42 minutes ago · Supplier portal" /><Activity mark="AI" copy="Approved evidence linked to the current investigation" time="Latest saved draft · Quality Copilot" /></section>
    </div>
  </>;
}

function IncidentPanel({ incidents, selectedId, severity, onSelect, onSeverity, onClear, title = "Active non-conformances" }: {
  incidents: Incident[]; selectedId: string; severity: string; onSelect: (id: string) => void; onSeverity: (value: string) => void; onClear: () => void; title?: string;
}) {
  return <section className="panel" data-tour="incidents">
    <div className="panel-head"><div><h2>{title}</h2><p>Prioritized by severity and customer impact</p></div><div className="filter-row"><select className="filter" value={severity} onChange={(event) => onSeverity(event.target.value)} aria-label="Filter by severity"><option>All severity</option><option>High</option><option>Medium</option><option>Low</option></select><button className="filter" onClick={onClear}>Clear filters</button></div></div>
    <div className="incident-list">
      {incidents.map((incident) => <button key={incident.id} className={`incident-row ${selectedId === incident.id ? "selected" : ""}`} onClick={() => onSelect(incident.id)}>
        <span className="incident-id">{incident.id}</span><span><span className="incident-title">{incident.title}</span><span className="incident-meta">{incident.division} · {incident.component}</span></span><span className="supplier">{incident.supplier}<span>Supplier / source</span></span><span className={`badge ${incident.severity.toLowerCase()}`}>{incident.severity}</span><span className={`badge ${statusClass(incident.status)}`}>{incident.status}</span>
      </button>)}
      {!incidents.length && <div className="empty">No incidents match these filters.</div>}
    </div>
  </section>;
}

function CopilotPanel({ selected, draft, loading, onAnalyze, onOpen }: { selected: Incident; draft?: Investigation; loading: boolean; onAnalyze: () => void; onOpen: () => void }) {
  return <aside className="panel copilot" data-tour="copilot">
    <div className="copilot-head"><div className="copilot-headline"><div className="ai-mark">AI</div><div><h2>8D Investigation Copilot</h2><p>Grounded in approved procedures and past cases</p></div><div className="ai-status"><span className="status-dot" />Ready</div></div></div>
    <div className="selected-incident"><small>Working on · {selected.id}</small><b>{selected.title}</b></div>
    {draft ? <>
      <div className="draft-state"><span>Saved draft</span><time>{formatDate(draft.generatedAt)}</time></div>
      <div className="insight"><strong>Evidence-backed finding</strong>{draft.problemSummary}<ul>{draft.rootCauseChecks.slice(0, 3).map((check) => <li key={check}>{check}</li>)}</ul></div>
      <div className="source-row">{draft.citations.map((source) => <span className="source" title={source.title} key={source.sourceId}>{source.sourceId} · {formatRelevance(source.relevance)}</span>)}</div>
      <details className="how-generated"><summary>How was this generated?</summary><p>{draft.generationMethod}</p><p><strong>Storage:</strong> Saved in your MongoDB-backed 8D investigation history.</p></details>
    </> : <div className="copilot-empty"><strong>No draft generated for this NCR</strong><p>Generate a grounded draft to retrieve approved evidence, propose checks, and save an auditable investigation record.</p></div>}
    <div className="steps">{investigationSteps.map((step, index) => <div className={`step ${draft && index < 2 ? "done" : index === (draft ? 2 : 0) ? "active" : ""}`} key={step}><span className="step-dot">{draft && index < 2 ? "✓" : index + 1}</span><span>{step}</span></div>)}</div>
    <div className="copilot-actions"><button className="copilot-action" disabled={loading} onClick={onAnalyze}>{loading ? "Retrieving and saving evidence…" : draft ? "Regenerate evidence-backed draft" : "Generate evidence-backed draft →"}</button>{draft && <button className="secondary open-investigation" onClick={onOpen}>Open saved investigation</button>}</div>
  </aside>;
}

function NonConformanceView({ incidents, selectedId, severity, onSelect, onSeverity, onClear, onCreate, onInvestigate }: {
  incidents: Incident[]; selectedId: string; severity: string; onSelect: (id: string) => void; onSeverity: (value: string) => void; onClear: () => void; onCreate: () => void; onInvestigate: () => void;
}) {
  const selected = incidents.find((item) => item.id === selectedId) ?? incidents[0];
  return <>
    <PageHeader eyebrow="Controlled intake" title="Non-conformance register" copy="Capture, prioritize, and route every deviation through a traceable quality workflow." action={<button className="primary" onClick={onCreate}>＋ Create NCR</button>} />
    <div className="workspace-grid">
      <IncidentPanel incidents={incidents} selectedId={selectedId} severity={severity} onSelect={onSelect} onSeverity={onSeverity} onClear={onClear} title="Complete NCR register" />
      <aside className="panel record-detail">{selected ? <><p className="eyebrow">Selected record</p><h2>{selected.id}</h2><h3>{selected.title}</h3><dl><div><dt>Division</dt><dd>{selected.division}</dd></div><div><dt>Supplier / source</dt><dd>{selected.supplier}</dd></div><div><dt>Component</dt><dd>{selected.component}</dd></div><div><dt>Severity</dt><dd><span className={`badge ${selected.severity.toLowerCase()}`}>{selected.severity}</span></dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl><div className="observation"><strong>Immediate observation</strong><p>{selected.observation || "No detailed observation was captured for this imported demonstration record."}</p></div><button className="primary full-button" onClick={onInvestigate}>Open in 8D Copilot</button></> : <div className="empty">Select an NCR to inspect it.</div>}</aside>
    </div>
  </>;
}

function InvestigationsView({ investigations, selected, onSelect, onOpenIncident }: { investigations: Investigation[]; selected?: Investigation; onSelect: (id: string) => void; onOpenIncident: (id: string) => void }) {
  return <>
    <PageHeader eyebrow="Evidence and accountability" title="8D investigation history" copy="Every generated draft is saved with its source evidence, method, timestamp, and engineer-review boundary." action={<span className="updated">{investigations.length} saved drafts</span>} />
    {!investigations.length ? <section className="panel empty-workspace"><div className="empty-icon">8D</div><h2>No investigations saved yet</h2><p>Select an NCR in the command center and generate an evidence-backed draft.</p></section> :
    <div className="investigation-layout">
      <section className="panel investigation-list"><div className="panel-head"><div><h2>Saved drafts</h2><p>Private to your authenticated workspace</p></div></div>{investigations.map((item) => <button key={item._id} className={`investigation-list-item ${selected?._id === item._id ? "selected" : ""}`} onClick={() => onSelect(item._id)}><span><b>{item.incidentId}</b><small>{formatDate(item.generatedAt)}</small></span><strong>{item.problem}</strong><em>{item.citations.length} evidence sources</em></button>)}</section>
      {selected && <InvestigationDetail investigation={selected} onOpenIncident={() => onOpenIncident(selected.incidentId)} />}
    </div>}
  </>;
}

function InvestigationDetail({ investigation, onOpenIncident }: { investigation: Investigation; onOpenIncident: () => void }) {
  return <article className="panel investigation-detail">
    <div className="investigation-title"><div><span className="badge low">Saved · grounded draft</span><h2>{investigation.incidentId}</h2><p>{investigation.problem}</p></div><button className="secondary" onClick={onOpenIncident}>Open NCR</button></div>
    <div className="audit-strip"><span><small>Generated</small>{formatDate(investigation.generatedAt)}</span><span><small>Thread ID</small><code>{investigation.threadId.slice(0, 13)}…</code></span><span><small>Storage</small>MongoDB investigation history</span></div>
    <section className="detail-section"><h3>How the draft was generated</h3><p>{investigation.generationMethod}</p><div className="method-flow"><span>Problem statement</span><i>→</i><span>Qdrant retrieval</span><i>→</i><span>Approved evidence</span><i>→</i><span>Reviewable 8D draft</span></div></section>
    <div className="check-grid"><section className="detail-section"><h3>Containment checks</h3><ol>{investigation.containmentChecks.map((item) => <li key={item}>{item}</li>)}</ol></section><section className="detail-section"><h3>Root-cause checks</h3><ol>{investigation.rootCauseChecks.map((item) => <li key={item}>{item}</li>)}</ol></section></div>
    <section className="detail-section"><h3>Retrieved evidence</h3><div className="citation-grid">{investigation.citations.map((citation) => <article className="citation-card" key={citation.sourceId}><div><b>{citation.sourceId}</b><span>{formatRelevance(citation.relevance)} match</span></div><h4>{citation.title}</h4><p>{citation.excerpt}</p></article>)}</div></section>
    <section className="next-action"><strong>Recommended next action</strong><p>{investigation.recommendedNextAction}</p></section>
    <p className="disclaimer">{investigation.disclaimer}</p>
  </article>;
}

function SuppliersView({ incidents }: { incidents: Incident[] }) {
  const suppliers = Object.values(incidents.reduce<Record<string, { name: string; incidents: number; high: number; divisions: Set<string> }>>((accumulator, incident) => {
    const current = accumulator[incident.supplier] ?? { name: incident.supplier, incidents: 0, high: 0, divisions: new Set<string>() };
    current.incidents += 1;
    if (incident.severity === "High") current.high += 1;
    current.divisions.add(incident.division);
    accumulator[incident.supplier] = current;
    return accumulator;
  }, {})).sort((a, b) => b.high - a.high || b.incidents - a.incidents);

  return <><PageHeader eyebrow="Supplier assurance" title="Supplier quality" copy="A risk-ranked view derived from live non-conformance records." /><section className="metrics"><Metric label="Suppliers monitored" value={String(suppliers.length)} foot="Across current NCR records" icon="S" /><Metric label="High-risk sources" value={String(suppliers.filter((item) => item.high > 0).length)} foot="Require containment review" icon="!" /><Metric label="Open supplier NCRs" value={String(incidents.filter((item) => item.supplier !== "Internal process").length)} foot="Includes all severities" icon="N" /><Metric label="Supplier PPM" value="186" foot="↓ 22 from previous period" icon="P" good /></section><section className="panel data-table"><div className="table-row table-head"><span>Supplier / source</span><span>Divisions</span><span>NCRs</span><span>High severity</span><span>Risk status</span></div>{suppliers.map((supplier) => <div className="table-row" key={supplier.name}><strong>{supplier.name}</strong><span>{Array.from(supplier.divisions).join(", ")}</span><span>{supplier.incidents}</span><span>{supplier.high}</span><span><span className={`badge ${supplier.high ? "high" : "low"}`}>{supplier.high ? "Action required" : "Monitored"}</span></span></div>)}</section></>;
}

function KnowledgeView() {
  return <><PageHeader eyebrow="Approved evidence" title="Knowledge base" copy="Controlled procedures and verified historical cases available to the retrieval pipeline." action={<span className="updated">Qdrant collection · quality_approved_evidence</span>} /><section className="knowledge-grid">{knowledgeDocuments.map((document) => <article className="panel knowledge-card" key={document.id}><div><span className="document-icon">DOC</span><span className="badge low">{document.type}</span></div><code>{document.id}</code><h2>{document.title}</h2><p>{document.division}</p><footer><span>{document.revision}</span><span>Indexed for retrieval ✓</span></footer></article>)}</section><section className="panel pipeline-note"><div className="ai-mark">AI</div><div><h3>Evidence governance</h3><p>The Copilot retrieves only this approved corpus. It returns excerpts and relevance scores with every draft so engineers can verify the source before acting.</p></div></section></>;
}

function ReportsView({ incidents, investigations }: { incidents: Incident[]; investigations: Investigation[] }) {
  const high = incidents.filter((item) => item.severity === "High").length;
  return <><PageHeader eyebrow="Performance intelligence" title="Quality reports" copy="Operational indicators calculated from the current authenticated workspace." action={<button className="secondary" onClick={() => window.print()}>Print report</button>} /><section className="metrics"><Metric label="Total NCR records" value={String(incidents.length)} foot="Current workspace" icon="N" /><Metric label="High severity" value={String(high)} foot={`${Math.round((high / Math.max(incidents.length, 1)) * 100)}% of records`} icon="!" /><Metric label="Saved 8D drafts" value={String(investigations.length)} foot="Evidence-backed investigations" icon="8D" good /><Metric label="Evidence coverage" value={investigations.length ? "100%" : "0%"} foot="Drafts with citations" icon="E" good={investigations.length > 0} /></section><div className="section-grid"><section className="panel mini-panel"><h3>NCR distribution by severity</h3><Bar label="High" width={`${(high / Math.max(incidents.length, 1)) * 100}%`} value={String(high)} /><Bar label="Medium" width={`${(incidents.filter((item) => item.severity === "Medium").length / Math.max(incidents.length, 1)) * 100}%`} value={String(incidents.filter((item) => item.severity === "Medium").length)} /><Bar label="Low" width={`${(incidents.filter((item) => item.severity === "Low").length / Math.max(incidents.length, 1)) * 100}%`} value={String(incidents.filter((item) => item.severity === "Low").length)} /></section><section className="panel mini-panel"><h3>Investigation governance</h3><Activity mark="✓" copy={`${investigations.length} drafts stored with audit metadata`} time="MongoDB-backed history" /><Activity mark="Q" copy="Vector retrieval restricted to approved evidence" time="Qdrant evidence collection" /><Activity mark="AI" copy="Engineer approval remains mandatory" time="Responsible AI control" /></section></div></>;
}

function SettingsView() {
  return <><PageHeader eyebrow="Workspace controls" title="Settings" copy="Runtime configuration and responsible-AI safeguards for this quality workspace." /><div className="settings-grid"><SettingCard icon="ID" title="Authentication" status="Configured" copy="Clerk protects pages and API requests. Records are isolated by the authenticated user ID." /><SettingCard icon="DB" title="Operational storage" status="Connected" copy="MongoDB stores NCRs and complete 8D investigation drafts with timestamps and audit identifiers." /><SettingCard icon="Q" title="Evidence retrieval" status="Connected" copy="Qdrant ranks approved procedures and closed cases. Evidence excerpts remain visible in each draft." /><SettingCard icon="AI" title="Responsible AI" status="Enforced" copy="Generated content is labelled as a draft and cannot represent an approved engineering decision." /></div></>;
}

function SettingCard({ icon, title, status, copy }: { icon: string; title: string; status: string; copy: string }) {
  return <article className="panel setting-card"><div className="setting-icon">{icon}</div><div><span className="badge low">{status}</span><h2>{title}</h2><p>{copy}</p></div></article>;
}

function NewIncidentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-ncr-title"><div className="modal-head"><div><p className="eyebrow">Quality intake</p><h2 id="new-ncr-title">Create non-conformance</h2></div><button className="close" onClick={onClose} aria-label="Close dialog">×</button></div><form onSubmit={onSubmit}><div className="form"><div className="field full"><label htmlFor="title">Problem statement</label><input id="title" name="title" required minLength={8} placeholder="Describe the observed deviation clearly" /></div><div className="field"><label htmlFor="division">Division</label><select id="division" name="division"><option>Tube Products</option><option>Industrial Chains</option><option>Metal Forming</option><option>TI Cycles</option></select></div><div className="field"><label htmlFor="severity">Severity</label><select id="severity" name="severity"><option>High</option><option>Medium</option><option>Low</option></select></div><div className="field"><label htmlFor="supplier">Supplier / source</label><input id="supplier" name="supplier" required minLength={2} placeholder="Supplier or internal process" /></div><div className="field"><label htmlFor="component">Component</label><input id="component" name="component" required minLength={2} placeholder="Part or assembly name" /></div><div className="field full"><label htmlFor="details">Immediate observation</label><textarea id="details" name="details" placeholder="Include specification, measured value, lot and containment status" /></div></div><div className="modal-foot"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Create and start triage</button></div></form></div></div>;
}

function Metric({ label, value, foot, icon, good = false }: { label: string; value: string; foot: string; icon: string; good?: boolean }) { return <article className="metric"><div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon">{icon}</span></div><strong className="metric-value">{value}</strong><div className={`metric-foot ${good ? "good" : ""}`}>{foot}</div></article>; }
function Bar({ label, width, value }: { label: string; width: string; value: string }) { return <div className="bar-row"><span>{label}</span><div className="bar"><i style={{ width }} /></div><b>{value}</b></div>; }
function Activity({ mark, copy, time }: { mark: string; copy: string; time: string }) { return <div className="activity"><div className="activity-mark">{mark}</div><div><p>{copy}</p><time>{time}</time></div></div>; }
function statusClass(status: IncidentStatus) { return status === "Open" ? "open" : status === "Review" ? "review" : status === "Closed" ? "low" : "progress"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatRelevance(value: number) { return `${Math.max(0, Math.round(value * 100))}%`; }
