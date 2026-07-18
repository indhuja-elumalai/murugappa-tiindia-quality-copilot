"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SidebarIdentity, TopbarAccount } from "./AuthControls";
import { ProductWalkthrough } from "./ProductWalkthrough";

type Incident = {
  id: string;
  title: string;
  division: string;
  supplier: string;
  component: string;
  severity: "High" | "Medium" | "Low";
  status: "Open" | "In progress" | "Review";
};

const initialIncidents: Incident[] = [
  { id: "NCR-1042", title: "Weld seam variation above tolerance", division: "Tube Products", supplier: "Apex Steel Works", component: "ERW precision tube", severity: "High", status: "In progress" },
  { id: "NCR-1039", title: "Chain link pitch dimensional deviation", division: "Industrial Chains", supplier: "Kaveri Forgings", component: "08B roller chain", severity: "High", status: "Open" },
  { id: "NCR-1037", title: "Surface coating pinholes after curing", division: "TI Cycles", supplier: "Prime Coat Systems", component: "City frame assembly", severity: "Medium", status: "Review" },
  { id: "NCR-1034", title: "Door frame bend angle out of specification", division: "Metal Forming", supplier: "Internal process", component: "Front door sash", severity: "Medium", status: "In progress" },
  { id: "NCR-1028", title: "Packing label traceability mismatch", division: "Fine Blanking", supplier: "Orbit Labels", component: "Seat recliner plate", severity: "Low", status: "Open" },
];

const navItems = [
  ["▦", "Command center"], ["◇", "Non-conformance", "5"], ["◎", "8D investigations"],
  ["⌁", "Suppliers"], ["▥", "Knowledge base"], ["↗", "Reports"],
];

const steps = ["Problem defined", "Containment verified", "Root cause analysis", "Corrective action", "Effectiveness review"];

export function QualityDashboard() {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [selectedId, setSelectedId] = useState(initialIncidents[0].id);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All severity");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [aiInsight, setAiInsight] = useState("Three similar cases indicate checking incoming material chemistry, weld current stability, and roll alignment before changing process parameters.");
  const [aiSources, setAiSources] = useState(["SOP-TUBE-014", "WI-WELD-008", "2 similar NCRs"]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/incidents", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload?.data?.length) return;
        const remote = payload.data.map((incident: Record<string, string>) => ({
          id: incident.ncrNumber,
          title: incident.title,
          division: incident.division,
          supplier: incident.supplier,
          component: incident.component,
          severity: incident.severity,
          status: incident.status,
        })) as Incident[];
        setIncidents(remote);
        setSelectedId(remote[0].id);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const selected = incidents.find((incident) => incident.id === selectedId) ?? incidents[0];
  const visible = useMemo(() => incidents.filter((incident) => {
    const text = `${incident.id} ${incident.title} ${incident.supplier} ${incident.component}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (severity === "All severity" || incident.severity === severity);
  }), [incidents, query, severity]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Incident = {
      id: `NCR-${1043 + incidents.length - initialIncidents.length}`,
      title: String(data.get("title")),
      division: String(data.get("division")),
      supplier: String(data.get("supplier")),
      component: String(data.get("component")),
      severity: String(data.get("severity")) as Incident["severity"],
      status: "Open",
    };
    let saved = next;
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ncrNumber: next.id, title: next.title, division: next.division, supplier: next.supplier, component: next.component, severity: next.severity }),
      });
      if (response.ok) {
        const payload = await response.json();
        saved = { ...next, status: payload.data.status ?? "Open" };
      }
    } catch {
      // The portfolio demo remains functional with its synthetic local dataset.
    }
    setIncidents((current) => [saved, ...current]);
    setSelectedId(saved.id);
    setModalOpen(false);
    flash(`${saved.id} created and routed for triage`);
  }

  async function analyzeSelected() {
    setAiLoading(true);
    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: selected.id, problem: selected.title, division: selected.division }),
      });
      if (!response.ok) throw new Error("AI service unavailable");
      const payload = await response.json();
      setAiInsight(payload.root_cause_checks.join(" "));
      setAiSources(payload.citations.map((citation: { source_id: string }) => citation.source_id));
      flash("Evidence-backed root cause draft generated");
    } catch {
      flash("Demo evidence retained — connect the AI service for live retrieval");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand"><div className="brand-mark">TI</div><div className="brand-copy"><div className="brand-name">Quality Copilot</div><div className="brand-sub">Engineering excellence</div></div></div>
        <div className="nav-label">Workspace</div>
        {navItems.map(([icon, label, count], index) => <button className={`nav-item ${index === 0 ? "active" : ""}`} key={label}><span className="nav-icon">{icon}</span><span>{label}</span>{count && <span className="nav-count">{count}</span>}</button>)}
        <div className="nav-label">System</div>
        <button className="nav-item"><span className="nav-icon">⚙</span><span>Settings</span></button>
        <div className="sidebar-note"><strong>Responsible AI</strong><p>Copilot suggestions require engineer review before they enter an approved 8D report.</p></div>
        <SidebarIdentity />
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb"><button className="icon-button mobile-menu" aria-label="Open menu">☰</button><span className="desktop-copy">Quality operations&nbsp; / &nbsp;</span><strong>Command center</strong></div>
          <div className="top-actions"><input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search NCR, supplier or component" aria-label="Search incidents"/><button className="icon-button" aria-label="Notifications">◉</button><button className="primary" data-tour="new-ncr" onClick={() => setModalOpen(true)}>＋ <span className="desktop-copy">New NCR</span></button><TopbarAccount /></div>
        </header>

        <div className="content">
          <div className="hero-row"><div><p className="eyebrow">Operational excellence</p><h1>Quality command center</h1><p className="hero-copy">A unified view of supplier quality, investigations, and preventive action.</p></div><span className="updated">Portfolio prototype · synthetic data · 18 Jul 2026</span></div>

          <section className="metrics" data-tour="quality-pulse" aria-label="Quality metrics">
            <Metric label="Open non-conformances" value={String(incidents.length + 7)} foot="3 require attention" icon="N" />
            <Metric label="On-time 8D closure" value="91.4%" foot="↑ 4.8% vs last month" icon="8D" good />
            <Metric label="Supplier PPM" value="186" foot="↓ 22 from previous period" icon="P" good />
            <Metric label="Repeat defect rate" value="2.7%" foot="Target below 3.0%" icon="R" good />
          </section>

          <div className="grid">
            <section className="panel" data-tour="incidents">
              <div className="panel-head"><div><h2>Active non-conformances</h2><p>Prioritized by severity and customer impact</p></div><div className="filter-row"><select className="filter" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity"><option>All severity</option><option>High</option><option>Medium</option><option>Low</option></select><button className="filter" onClick={() => setQuery("")}>Clear filters</button></div></div>
              <div className="incident-list">
                {visible.map((incident) => <button key={incident.id} className={`incident-row ${selectedId === incident.id ? "selected" : ""}`} onClick={() => setSelectedId(incident.id)}>
                  <span className="incident-id">{incident.id}</span><span><span className="incident-title">{incident.title}</span><span className="incident-meta">{incident.division} · {incident.component}</span></span><span className="supplier">{incident.supplier}<span>Supplier / source</span></span><span className={`badge ${incident.severity.toLowerCase()}`}>{incident.severity}</span><span className={`badge ${incident.status === "Open" ? "open" : incident.status === "Review" ? "review" : "progress"}`}>{incident.status}</span>
                </button>)}
                {!visible.length && <div className="empty">No incidents match these filters.</div>}
              </div>
            </section>

            <aside className="panel copilot" data-tour="copilot">
              <div className="copilot-head"><div className="copilot-headline"><div className="ai-mark">AI</div><div><h2>8D Investigation Copilot</h2><p>Grounded in approved procedures and past cases</p></div><div className="ai-status"><span className="status-dot"/>Ready</div></div></div>
              <div className="selected-incident"><small>Working on · {selected.id}</small><b>{selected.title}</b></div>
              <div className="insight">{aiInsight}</div>
              <div className="source-row">{aiSources.map((source) => <span className="source" key={source}>{source}</span>)}</div>
              <div className="steps">{steps.map((step, index) => <div className={`step ${index < 2 ? "done" : index === 2 ? "active" : ""}`} key={step}><span className="step-dot">{index < 2 ? "✓" : index + 1}</span><span>{step}</span></div>)}</div>
              <button className="copilot-action" disabled={aiLoading} onClick={analyzeSelected}>{aiLoading ? "Retrieving approved evidence…" : "Continue root cause analysis →"}</button>
            </aside>
          </div>

          <div className="section-grid">
            <section className="panel mini-panel"><h3>Non-conformance by division</h3><Bar label="Tube Products" width="82%" value="14"/><Bar label="Metal Forming" width="65%" value="11"/><Bar label="Industrial Chains" width="47%" value="8"/><Bar label="TI Cycles" width="35%" value="6"/></section>
            <section className="panel mini-panel"><h3>Recent quality activity</h3><Activity mark="✓" copy="Containment action approved for NCR-1042" time="18 minutes ago · R. Karthik"/><Activity mark="8D" copy="Supplier response received from Kaveri Forgings" time="42 minutes ago · Supplier portal"/><Activity mark="AI" copy="Two similar historical cases linked to NCR-1039" time="1 hour ago · Quality Copilot"/></section>
          </div>
        </div>
      </main>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-ncr-title"><div className="modal-head"><div><p className="eyebrow">Quality intake</p><h2 id="new-ncr-title">Create non-conformance</h2></div><button className="close" onClick={() => setModalOpen(false)} aria-label="Close dialog">×</button></div><form onSubmit={createIncident}><div className="form"><div className="field full"><label htmlFor="title">Problem statement</label><input id="title" name="title" required placeholder="Describe the observed deviation clearly"/></div><div className="field"><label htmlFor="division">Division</label><select id="division" name="division"><option>Tube Products</option><option>Industrial Chains</option><option>Metal Forming</option><option>TI Cycles</option></select></div><div className="field"><label htmlFor="severity">Severity</label><select id="severity" name="severity"><option>High</option><option>Medium</option><option>Low</option></select></div><div className="field"><label htmlFor="supplier">Supplier / source</label><input id="supplier" name="supplier" required placeholder="Supplier or internal process"/></div><div className="field"><label htmlFor="component">Component</label><input id="component" name="component" required placeholder="Part or assembly name"/></div><div className="field full"><label htmlFor="details">Immediate observation</label><textarea id="details" name="details" placeholder="Include specification, measured value, lot and containment status"/></div></div><div className="modal-foot"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary" type="submit">Create and start triage</button></div></form></div></div>}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <ProductWalkthrough />
    </div>
  );
}

function Metric({ label, value, foot, icon, good = false }: { label: string; value: string; foot: string; icon: string; good?: boolean }) { return <article className="metric"><div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon">{icon}</span></div><strong className="metric-value">{value}</strong><div className={`metric-foot ${good ? "good" : ""}`}>{foot}</div></article>; }
function Bar({ label, width, value }: { label:string; width:string; value:string }) { return <div className="bar-row"><span>{label}</span><div className="bar"><i style={{width}}/></div><b>{value}</b></div>; }
function Activity({ mark, copy, time }: { mark:string; copy:string; time:string }) { return <div className="activity"><div className="activity-mark">{mark}</div><div><p>{copy}</p><time>{time}</time></div></div>; }
