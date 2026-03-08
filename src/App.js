import { useState, useEffect, useCallback } from "react";
import "./App.css";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) =>
  v === "" || v === null || v === undefined
    ? ""
    : Number(v).toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (v) => parseFloat((v + "").replace(/\s/g, "").replace(",", ".")) || 0;

const emptyLot = () => ({
  id: Date.now() + Math.random(),
  partenaire: "",
  designation: "",
  marche: "",
  avenants: "",
  montantEngageHT: "",
  montantConsommeHT: "",
  montantEngageTTC: "",
  montantConsommeTTC: "",
});

const SECTIONS = [
  { id: "1A", label: "1-A  Acquisition de terrain", rubriqueKey: "acquisition", rubriqueLabel: "Acquisition terrain" },
  { id: "1B", label: "1-B  Études Géotechniques (LABO, ÉTUDE DE SOL, GÉOMÈTRE…)", rubriqueKey: "geotechnique", rubriqueLabel: "Études Géotechniques" },
  { id: "2",  label: "2  Études, Suivi et Contrôle (ÉTUDES, SUIVI, CTC)", rubriqueKey: "etudes", rubriqueLabel: "ÉTUDE, SUIVI ET CONTRÔLE" },
  { id: "3A", label: "3-A  Réalisation Logements (TCE, GO, CES, CLIM, KIT CUISINE…)", rubriqueKey: "logements", rubriqueLabel: "LOGEMENTS" },
  { id: "3B", label: "3-B  Réalisation Commerces (TCE, GO, Rideaux, Aluminium…)", rubriqueKey: "commerces", rubriqueLabel: "COMMERCES" },
  { id: "3C", label: "3-C  Réalisation VRD (VRD, Aménagement, Espace vert, Clôture, Transfo…)", rubriqueKey: "vrd", rubriqueLabel: "V.R.D" },
  { id: "4",  label: "4  Raccordements et Branchements", rubriqueKey: "branchements", rubriqueLabel: "BRANCHEMENTS ET RACCORDEMENTS" },
  { id: "5",  label: "5  Prestations de Services (Expertise, Gardiennage, ANEP, Notaire…)", rubriqueKey: "prestations", rubriqueLabel: "PRESTATIONS DE SERVICES" },
];

const RECAP_ROWS = [
  { key: "acquisition",  label: "Acquisition terrain" },
  { key: "geotechnique", label: "Études Géotechniques" },
  { key: "FONCIER",      label: "FONCIER",                          isTotal: true },
  { key: "etudes",       label: "ÉTUDE, SUIVI ET CONTRÔLE",         isTotal: true },
  { key: "logements",    label: "LOGEMENTS" },
  { key: "commerces",    label: "COMMERCES" },
  { key: "vrd",          label: "V.R.D" },
  { key: "REALISATION",  label: "RÉALISATION",                      isTotal: true },
  { key: "branchements", label: "BRANCHEMENTS ET RACCORDEMENTS",    isTotal: true },
  { key: "prestations",  label: "PRESTATIONS DE SERVICES",          isTotal: true },
  { key: "FRAIS_DIVERS", label: "FRAIS DIVERS & IMPÔTS ET TAXES",   isManual: true },
  { key: "TOTAL_PRODUCTION", label: "TOTAL PRODUCTION",             isGrandTotal: true },
];

// ─── style helpers ───────────────────────────────────────────────────────────
const th = (w) => ({
  padding: "10px 8px", fontSize: 11, fontWeight: 700, textAlign: "center",
  borderRight: "1px solid rgba(255,255,255,.15)", minWidth: w,
  whiteSpace: "normal", lineHeight: 1.3,
});
const td = (w, center = false) => ({
  padding: "7px 8px", fontSize: 12,
  borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0",
  minWidth: w, textAlign: center ? "center" : "left", verticalAlign: "middle",
});
const btnStyle = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
});

// ─── main component ──────────────────────────────────────────────────────────
export default function App() {
  const [projectName, setProjectName] = useState("Projet Immobilier");
  const [lots, setLots] = useState(() => {
    const init = {};
    SECTIONS.forEach((s) => (init[s.id] = [emptyLot()]));
    return init;
  });
  const [fraisDivers, setFraisDivers] = useState({ engageHT: "", consommeHT: "", engageTTC: "", consommeTTC: "" });
  const [activeSection, setActiveSection] = useState("recap");
  const [saved, setSaved] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);

  // ── load on mount ──
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("fc-projects-list") || "[]");
      setProjects(list);
      const last = localStorage.getItem("fc-last-project");
      if (last) {
        const data = JSON.parse(last);
        setProjectName(data.projectName || "Projet Immobilier");
        setLots(data.lots);
        setFraisDivers(data.fraisDivers || { engageHT: "", consommeHT: "", engageTTC: "", consommeTTC: "" });
      }
    } catch {}
  }, []);

  // ── save ──
  const handleSave = () => {
    const data = { projectName, lots, fraisDivers, savedAt: new Date().toISOString() };
    try {
      const key = "fc-project-" + projectName.replace(/\s+/g, "_");
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem("fc-last-project", JSON.stringify(data));
      const newList = [...new Set([...projects, projectName])];
      localStorage.setItem("fc-projects-list", JSON.stringify(newList));
      setProjects(newList);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("Erreur sauvegarde: " + e.message);
    }
  };

  const handleNewProject = () => {
    const name = prompt("Nom du nouveau projet :");
    if (!name) return;
    setProjectName(name);
    const init = {};
    SECTIONS.forEach((s) => (init[s.id] = [emptyLot()]));
    setLots(init);
    setFraisDivers({ engageHT: "", consommeHT: "", engageTTC: "", consommeTTC: "" });
    setActiveSection("recap");
    setShowProjectList(false);
  };

  const handleLoadProject = (name) => {
    try {
      const key = "fc-project-" + name.replace(/\s+/g, "_");
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        setProjectName(data.projectName);
        setLots(data.lots);
        setFraisDivers(data.fraisDivers || { engageHT: "", consommeHT: "", engageTTC: "", consommeTTC: "" });
      }
      setShowProjectList(false);
    } catch {}
  };

  const handleDeleteProject = (name) => {
    if (!window.confirm(`Supprimer le projet "${name}" ?`)) return;
    localStorage.removeItem("fc-project-" + name.replace(/\s+/g, "_"));
    const newList = projects.filter((p) => p !== name);
    localStorage.setItem("fc-projects-list", JSON.stringify(newList));
    setProjects(newList);
  };

  // ── lot CRUD ──
  const addLot    = (secId) => setLots((p) => ({ ...p, [secId]: [...p[secId], emptyLot()] }));
  const removeLot = (secId, id) => setLots((p) => ({ ...p, [secId]: p[secId].filter((l) => l.id !== id) }));
  const updateLot = (secId, id, field, value) =>
    setLots((p) => ({ ...p, [secId]: p[secId].map((l) => (l.id === id ? { ...l, [field]: value } : l)) }));

  // ── totals ──
  const sectionTotal = useCallback((secId) => {
    const rows = lots[secId] || [];
    return {
      engageHT:    rows.reduce((s, l) => s + num(l.montantEngageHT), 0),
      consommeHT:  rows.reduce((s, l) => s + num(l.montantConsommeHT), 0),
      engageTTC:   rows.reduce((s, l) => s + num(l.montantEngageTTC), 0),
      consommeTTC: rows.reduce((s, l) => s + num(l.montantConsommeTTC), 0),
    };
  }, [lots]);

  const totByRubrique = useCallback(() => {
    const map = {};
    SECTIONS.forEach((s) => { map[s.rubriqueKey] = sectionTotal(s.id); });
    map["FONCIER"] = {
      engageHT:    map.acquisition.engageHT    + map.geotechnique.engageHT,
      consommeHT:  map.acquisition.consommeHT  + map.geotechnique.consommeHT,
      engageTTC:   map.acquisition.engageTTC   + map.geotechnique.engageTTC,
      consommeTTC: map.acquisition.consommeTTC + map.geotechnique.consommeTTC,
    };
    map["REALISATION"] = {
      engageHT:    map.logements.engageHT    + map.commerces.engageHT    + map.vrd.engageHT,
      consommeHT:  map.logements.consommeHT  + map.commerces.consommeHT  + map.vrd.consommeHT,
      engageTTC:   map.logements.engageTTC   + map.commerces.engageTTC   + map.vrd.engageTTC,
      consommeTTC: map.logements.consommeTTC + map.commerces.consommeTTC + map.vrd.consommeTTC,
    };
    map["FRAIS_DIVERS"] = {
      engageHT:    num(fraisDivers.engageHT),
      consommeHT:  num(fraisDivers.consommeHT),
      engageTTC:   num(fraisDivers.engageTTC),
      consommeTTC: num(fraisDivers.consommeTTC),
    };
    const keys = ["FONCIER", "etudes", "REALISATION", "branchements", "prestations", "FRAIS_DIVERS"];
    map["TOTAL_PRODUCTION"] = {
      engageHT:    keys.reduce((s, k) => s + (map[k]?.engageHT    || 0), 0),
      consommeHT:  keys.reduce((s, k) => s + (map[k]?.consommeHT  || 0), 0),
      engageTTC:   keys.reduce((s, k) => s + (map[k]?.engageTTC   || 0), 0),
      consommeTTC: keys.reduce((s, k) => s + (map[k]?.consommeTTC || 0), 0),
    };
    return map;
  }, [lots, fraisDivers, sectionTotal]);

  const totals = totByRubrique();
  const grandTotal = totals["TOTAL_PRODUCTION"];

  const navItems = [
    { id: "recap", label: "📊 Récapitulatif" },
    { id: "1A",  label: "1-A · Terrain" },
    { id: "1B",  label: "1-B · Géotechnique" },
    { id: "2",   label: "2 · Études & Suivi" },
    { id: "3A",  label: "3-A · Logements" },
    { id: "3B",  label: "3-B · Commerces" },
    { id: "3C",  label: "3-C · VRD" },
    { id: "4",   label: "4 · Branchements" },
    { id: "5",   label: "5 · Prestations" },
  ];

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <span className="header-icon">🏗️</span>
        <div className="header-title">
          <input
            className="project-name-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <span className="header-sub">FICHE COÛT — RÉCAPITULATIF GÉNÉRAL</span>
        </div>
        <div className="header-actions">
          <button onClick={handleNewProject} style={btnStyle("#475569")}>+ Nouveau</button>
          <button onClick={() => setShowProjectList((p) => !p)} style={btnStyle("#2563eb")}>📂 Projets</button>
          <button onClick={handleSave} style={btnStyle(saved ? "#16a34a" : "#059669")}>
            {saved ? "✓ Sauvegardé" : "💾 Sauvegarder"}
          </button>
        </div>
      </header>

      {/* ── Project dropdown ── */}
      {showProjectList && (
        <div className="project-dropdown">
          <div className="project-dropdown-title">PROJETS SAUVEGARDÉS</div>
          {projects.length === 0 && <div className="project-empty">Aucun projet sauvegardé</div>}
          {projects.map((p) => (
            <div key={p} className="project-item">
              <button className="project-load-btn" onClick={() => handleLoadProject(p)}>{p}</button>
              <button className="project-delete-btn" onClick={() => handleDeleteProject(p)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      <div className="layout">
        {/* ── Sidebar ── */}
        <nav className="sidebar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`nav-btn ${activeSection === item.id ? "active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <main className="content">
          {activeSection !== "recap" ? (
            <SectionEditor
              section={SECTIONS.find((s) => s.id === activeSection)}
              lots={lots[activeSection] || []}
              onAdd={() => addLot(activeSection)}
              onRemove={(id) => removeLot(activeSection, id)}
              onUpdate={(id, f, v) => updateLot(activeSection, id, f, v)}
              total={sectionTotal(activeSection)}
            />
          ) : (
            <RecapView
              totals={totals}
              grandTotal={grandTotal}
              fraisDivers={fraisDivers}
              setFraisDivers={setFraisDivers}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Section Editor ──────────────────────────────────────────────────────────
function SectionEditor({ section, lots, onAdd, onRemove, onUpdate, total }) {
  const cols = [
    { key: "partenaire",        label: "Partenaire Intervenant",              w: 150 },
    { key: "designation",       label: "Désignation des Lots",                w: 200 },
    { key: "marche",            label: "MARCHÉ / CONTRAT / CONVENTION / BC",  w: 170 },
    { key: "avenants",          label: "AVENANTS / DGD",                      w: 130 },
    { key: "montantEngageHT",   label: "Montant Total Engagé HT",             w: 150, num: true },
    { key: "montantConsommeHT", label: "Montant Total Consommé HT",           w: 150, num: true },
    { key: "montantEngageTTC",  label: "Montant Total Engagé TTC",            w: 150, num: true },
    { key: "montantConsommeTTC",label: "Montant Total Consommé TTC",          w: 150, num: true },
  ];

  const resteHT  = total.engageHT  - total.consommeHT;
  const resteTTC = total.engageTTC - total.consommeTTC;

  return (
    <div>
      <h2 className="section-title">{section.label}</h2>

      {/* Summary cards */}
      <div className="summary-cards">
        {[
          { label: "Engagé HT",   val: total.engageHT,   color: "#1d4ed8" },
          { label: "Consommé HT", val: total.consommeHT, color: "#0891b2" },
          { label: "Reste à Consommer HT",  val: resteHT,  color: resteHT  < 0 ? "#dc2626" : "#16a34a" },
          { label: "Engagé TTC",  val: total.engageTTC,  color: "#7c3aed" },
          { label: "Consommé TTC",val: total.consommeTTC,color: "#be185d" },
          { label: "Reste à Consommer TTC", val: resteTTC, color: resteTTC < 0 ? "#dc2626" : "#16a34a" },
        ].map((c) => (
          <div key={c.label} className="summary-card">
            <div className="summary-card-label">{c.label}</div>
            <div className="summary-card-value" style={{ color: c.color }}>{fmt(c.val)} DA</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={th(40)}>N°</th>
              {cols.map((c) => <th key={c.key} style={th(c.w)}>{c.label}</th>)}
              <th style={th(50)}></th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot, i) => (
              <tr key={lot.id} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                <td style={td(40, true)}>{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.key} style={td(c.w)}>
                    <input
                      value={lot[c.key]}
                      onChange={(e) => onUpdate(lot.id, c.key, e.target.value)}
                      className={`cell-input ${c.num ? "num-input" : ""}`}
                      placeholder={c.num ? "0,00" : ""}
                    />
                  </td>
                ))}
                <td style={td(50, true)}>
                  <button onClick={() => onRemove(lot.id)} className="delete-btn">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="footer-row">
              <td style={td(40, true)} colSpan={5} className="footer-label">TOTAL</td>
              <td style={{ ...td(150), textAlign: "right" }} className="footer-val">{fmt(total.engageHT)}</td>
              <td style={{ ...td(150), textAlign: "right" }} className="footer-val">{fmt(total.consommeHT)}</td>
              <td style={{ ...td(150), textAlign: "right" }} className="footer-val">{fmt(total.engageTTC)}</td>
              <td style={{ ...td(150), textAlign: "right" }} className="footer-val">{fmt(total.consommeTTC)}</td>
              <td style={td(50)}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={onAdd} className="add-btn">+ Ajouter une ligne</button>
    </div>
  );
}

// ─── Recap View ──────────────────────────────────────────────────────────────
function RecapView({ totals, grandTotal, fraisDivers, setFraisDivers }) {
  const totalEngageHT = grandTotal.engageHT;

  return (
    <div>
      <h2 className="section-title">📊 Récapitulatif Général</h2>

      {/* Grand total cards */}
      <div className="summary-cards" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Engagé HT",   val: grandTotal.engageHT,   color: "#1d4ed8" },
          { label: "Total Consommé HT", val: grandTotal.consommeHT, color: "#0891b2" },
          { label: "Total Engagé TTC",  val: grandTotal.engageTTC,  color: "#7c3aed" },
          { label: "Total Consommé TTC",val: grandTotal.consommeTTC,color: "#be185d" },
        ].map((c) => (
          <div key={c.label} className="summary-card summary-card-lg">
            <div className="summary-card-label">{c.label}</div>
            <div className="summary-card-value" style={{ color: c.color, fontSize: 16 }}>{fmt(c.val)} DA</div>
          </div>
        ))}
      </div>

      {/* Frais divers */}
      <div className="frais-box">
        <div className="frais-title">FRAIS DIVERS &amp; IMPÔTS ET TAXES</div>
        <div className="frais-inputs">
          {[["engageHT","Engagé HT"],["consommeHT","Consommé HT"],["engageTTC","Engagé TTC"],["consommeTTC","Consommé TTC"]].map(([k, label]) => (
            <label key={k} className="frais-label">
              {label}
              <input
                value={fraisDivers[k]}
                onChange={(e) => setFraisDivers((p) => ({ ...p, [k]: e.target.value }))}
                className="frais-input"
                placeholder="0,00"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Recap table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={th(35)}>N°</th>
              <th style={th(220)}>RUBRIQUE</th>
              <th style={th(130)}>ENGAGÉ DA HT</th>
              <th style={th(130)}>CONSOMMÉ DA HT</th>
              <th style={th(120)}>ÉCART HT</th>
              <th style={th(130)}>ENGAGÉ DA TTC</th>
              <th style={th(130)}>CONSOMMÉ DA TTC</th>
              <th style={th(120)}>ÉCART TTC</th>
              <th style={th(110)}>RATIO CONSO HT</th>
              <th style={th(120)}>RATIO / RUBRIQUES / ENGAG. HT</th>
              <th style={th(120)}>RATIO / RUBRIQUES / CONSO. HT</th>
            </tr>
          </thead>
          <tbody>
            {RECAP_ROWS.map((row, i) => {
              const t = totals[row.key] || { engageHT: 0, consommeHT: 0, engageTTC: 0, consommeTTC: 0 };
              const ecartHT  = t.engageHT  - t.consommeHT;
              const ecartTTC = t.engageTTC - t.consommeTTC;
              const ratioConsom  = t.engageHT              ? (t.consommeHT  / t.engageHT              * 100) : 0;
              const ratioEngag   = totalEngageHT            ? (t.engageHT   / totalEngageHT            * 100) : 0;
              const ratioConsDist= grandTotal.consommeHT   ? (t.consommeHT  / grandTotal.consommeHT   * 100) : 0;

              const rowClass = row.isGrandTotal ? "row-grand-total" : row.isTotal ? "row-total" : i % 2 === 0 ? "row-even" : "row-odd";

              return (
                <tr key={row.key} className={rowClass}>
                  <td style={td(35, true)}>{i + 1}</td>
                  <td style={td(220)}>{row.label}</td>
                  <td style={{ ...td(130), textAlign: "right" }}>{fmt(t.engageHT)}</td>
                  <td style={{ ...td(130), textAlign: "right" }}>{fmt(t.consommeHT)}</td>
                  <td style={{ ...td(120), textAlign: "right", color: ecartHT < 0 ? "#ef4444" : "inherit" }}>{fmt(ecartHT)}</td>
                  <td style={{ ...td(130), textAlign: "right" }}>{fmt(t.engageTTC)}</td>
                  <td style={{ ...td(130), textAlign: "right" }}>{fmt(t.consommeTTC)}</td>
                  <td style={{ ...td(120), textAlign: "right", color: ecartTTC < 0 ? "#ef4444" : "inherit" }}>{fmt(ecartTTC)}</td>
                  <td style={{ ...td(110), textAlign: "right" }}>{t.engageHT ? ratioConsom.toFixed(2) + "%" : "—"}</td>
                  <td style={{ ...td(120), textAlign: "right" }}>{totalEngageHT ? ratioEngag.toFixed(2) + "%" : "—"}</td>
                  <td style={{ ...td(120), textAlign: "right" }}>{grandTotal.consommeHT ? ratioConsDist.toFixed(2) + "%" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
