import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./App.css";

// ─── utils ───────────────────────────────────────────────────────────────────
const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return 0;
  return parseFloat(String(v).replace(/\s/g, "").replace(",", ".")) || 0;
};

const fmtDA = (n) =>
  Number(n).toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const newLot = () => ({
  id: crypto.randomUUID(),
  partenaire: "",
  designation: "",
  marche: "",
  avenants: "",
  engageHT: "",
  consommeHT: "",
  engageTTC: "",
  consommeTTC: "",
});

// ─── structure ────────────────────────────────────────────────────────────────
const GROUPS = [
  {
    id: "G1", num: "01", icon: "🏛️", label: "FONCIER", bg: "#1e3a5f",
    sections: [
      { id: "s1a", label: "1-A · Acquisition de terrain", rk: "acq" },
      { id: "s1b", label: "1-B · Études Géotechniques", rk: "geo" },
    ],
  },
  {
    id: "G2", num: "02", icon: "📐", label: "ÉTUDES, SUIVI ET CONTRÔLE", bg: "#14532d",
    sections: [
      { id: "s2", label: "2 · Études, Suivi et Contrôle", rk: "etd" },
    ],
  },
  {
    id: "G3", num: "03", icon: "🏗️", label: "RÉALISATION", bg: "#7c2d12",
    sections: [
      { id: "s3a", label: "3-A · Réalisation Logements", rk: "log" },
      { id: "s3b", label: "3-B · Réalisation Commerces", rk: "com" },
      { id: "s3c", label: "3-C · Réalisation VRD", rk: "vrd" },
    ],
  },
  {
    id: "G4", num: "04", icon: "🔌", label: "RACCORDEMENTS ET BRANCHEMENTS", bg: "#3b0764",
    sections: [
      { id: "s4", label: "4 · Raccordements et Branchements", rk: "bra" },
    ],
  },
  {
    id: "G5", num: "05", icon: "🤝", label: "PRESTATIONS DE SERVICES", bg: "#831843",
    sections: [
      { id: "s5", label: "5 · Prestations de Services", rk: "pre" },
    ],
  },
];

const ALL_SECS = GROUPS.flatMap((g) => g.sections);

const RECAP_ROWS = [
  { rk: "acq",  label: "Acquisition terrain",                 sub: true  },
  { rk: "geo",  label: "Études Géotechniques",                sub: true  },
  { rk: "FON",  label: "TOTAL 01 — FONCIER",                  tot: true, bg: "#1e3a5f" },
  { rk: "etd",  label: "TOTAL 02 — ÉTUDES, SUIVI & CONTRÔLE", tot: true, bg: "#14532d" },
  { rk: "log",  label: "Logements",                           sub: true  },
  { rk: "com",  label: "Commerces",                           sub: true  },
  { rk: "vrd",  label: "V.R.D",                               sub: true  },
  { rk: "REA",  label: "TOTAL 03 — RÉALISATION",              tot: true, bg: "#7c2d12" },
  { rk: "bra",  label: "TOTAL 04 — BRANCHEMENTS & RACC.",     tot: true, bg: "#3b0764" },
  { rk: "pre",  label: "TOTAL 05 — PRESTATIONS",              tot: true, bg: "#831843" },
  { rk: "FDI",  label: "FRAIS DIVERS & IMPÔTS ET TAXES",      manual: true },
  { rk: "GEN",  label: "TOTAL GÉNÉRAL DE PRODUCTION",         grand: true },
];

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const initLots = () => {
    const o = {};
    ALL_SECS.forEach((s) => (o[s.id] = [newLot()]));
    return o;
  };

  const [page,        setPage]        = useState("home");   // home | section | recap
  const [activeSec,   setActiveSec]   = useState(null);
  const [projName,    setProjName]    = useState("Mon Projet");
  const [projRef,     setProjRef]     = useState("");
  const [projDate,    setProjDate]    = useState(new Date().toISOString().slice(0, 10));
  const [lots,        setLots]        = useState(initLots);
  const [frais,       setFrais]       = useState({ eHT: "", cHT: "", eTTC: "", cTTC: "" });
  const [projects,    setProjects]    = useState([]);
  const [saved,       setSaved]       = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  // ── persistence ──
  useEffect(() => {
    try {
      setProjects(JSON.parse(localStorage.getItem("fc3-list") || "[]"));
      const last = localStorage.getItem("fc3-last");
      if (last) applyData(JSON.parse(last));
    } catch {}
  }, []);

  const applyData = (d) => {
    setProjName(d.projName || "Mon Projet");
    setProjRef(d.projRef   || "");
    setProjDate(d.projDate || new Date().toISOString().slice(0, 10));
    setLots(d.lots || initLots());
    setFrais(d.frais || { eHT: "", cHT: "", eTTC: "", cTTC: "" });
  };

  const save = () => {
    const d = { projName, projRef, projDate, lots, frais };
    const k = "fc3-" + projName.replace(/\W/g, "_");
    localStorage.setItem(k, JSON.stringify(d));
    localStorage.setItem("fc3-last", JSON.stringify(d));
    const nl = [...new Set([...projects, projName])];
    localStorage.setItem("fc3-list", JSON.stringify(nl));
    setProjects(nl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const loadProj = (name) => {
    const raw = localStorage.getItem("fc3-" + name.replace(/\W/g, "_"));
    if (raw) applyData(JSON.parse(raw));
    setMenuOpen(false);
  };

  const deleteProj = (name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    localStorage.removeItem("fc3-" + name.replace(/\W/g, "_"));
    const nl = projects.filter((p) => p !== name);
    localStorage.setItem("fc3-list", JSON.stringify(nl));
    setProjects(nl);
  };

  const newProj = () => {
    const n = prompt("Nom du nouveau projet :"); if (!n) return;
    setProjName(n); setProjRef(""); setProjDate(new Date().toISOString().slice(0, 10));
    setLots(initLots()); setFrais({ eHT: "", cHT: "", eTTC: "", cTTC: "" });
    setPage("home"); setMenuOpen(false);
  };

  // ── lot ops ──
  const addLot    = (sid) => setLots((p) => ({ ...p, [sid]: [...p[sid], newLot()] }));
  const delLot    = (sid, id) => setLots((p) => ({ ...p, [sid]: p[sid].filter((l) => l.id !== id) }));
  const setField  = (sid, id, f, v) =>
    setLots((p) => ({ ...p, [sid]: p[sid].map((l) => (l.id === id ? { ...l, [f]: v } : l)) }));

  // ── totals ──
  const secTot = useCallback((sid) => {
    const rows = lots[sid] || [];
    return {
      eHT:  rows.reduce((s, l) => s + toNum(l.engageHT),    0),
      cHT:  rows.reduce((s, l) => s + toNum(l.consommeHT),  0),
      eTTC: rows.reduce((s, l) => s + toNum(l.engageTTC),   0),
      cTTC: rows.reduce((s, l) => s + toNum(l.consommeTTC), 0),
    };
  }, [lots]);

  const allTots = useCallback(() => {
    const m = {};
    ALL_SECS.forEach((s) => (m[s.rk] = secTot(s.id)));
    const sum = (...ks) => ({
      eHT:  ks.reduce((s, k) => s + (m[k]?.eHT  || 0), 0),
      cHT:  ks.reduce((s, k) => s + (m[k]?.cHT  || 0), 0),
      eTTC: ks.reduce((s, k) => s + (m[k]?.eTTC || 0), 0),
      cTTC: ks.reduce((s, k) => s + (m[k]?.cTTC || 0), 0),
    });
    m["FON"] = sum("acq", "geo");
    m["REA"] = sum("log", "com", "vrd");
    m["FDI"] = { eHT: toNum(frais.eHT), cHT: toNum(frais.cHT), eTTC: toNum(frais.eTTC), cTTC: toNum(frais.cTTC) };
    m["GEN"] = sum("FON", "etd", "REA", "bra", "pre", "FDI");
    return m;
  }, [lots, frais, secTot]);

  const tots = allTots();
  const gen  = tots["GEN"];

  // ── export Excel ──
  const exportXLS = () => {
    const wb = XLSX.utils.book_new();
    ALL_SECS.forEach((sec) => {
      const st = secTot(sec.id);
      const rows = lots[sec.id] || [];
      const data = [
        ["N°","Partenaire","Désignation","Marché/BC","Avenants","Engagé HT","Consommé HT","Reste HT","Engagé TTC","Consommé TTC","Reste TTC"],
        ...rows.map((l, i) => [
          i + 1, l.partenaire, l.designation, l.marche, l.avenants,
          toNum(l.engageHT), toNum(l.consommeHT), toNum(l.engageHT) - toNum(l.consommeHT),
          toNum(l.engageTTC), toNum(l.consommeTTC), toNum(l.engageTTC) - toNum(l.consommeTTC),
        ]),
        [],
        ["","","","","TOTAL", st.eHT, st.cHT, st.eHT - st.cHT, st.eTTC, st.cTTC, st.eTTC - st.cTTC],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [5,20,26,24,16,14,14,14,14,14,14].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, sec.id + " " + sec.label.slice(4, 22));
    });
    // recap
    const recap = [
      [projName, projRef, projDate], [],
      ["N°","RUBRIQUE","ENGAGÉ HT","CONSOMMÉ HT","ÉCART HT","ENGAGÉ TTC","CONSOMMÉ TTC","ÉCART TTC","RATIO CONSO","R/ENGAG","R/CONSO"],
      ...RECAP_ROWS.map((r, i) => {
        const t = tots[r.rk] || { eHT:0, cHT:0, eTTC:0, cTTC:0 };
        return [i+1, r.label, t.eHT, t.cHT, t.eHT-t.cHT, t.eTTC, t.cTTC, t.eTTC-t.cTTC,
          t.eHT ? (t.cHT/t.eHT*100).toFixed(1)+"%" : "-",
          gen.eHT ? (t.eHT/gen.eHT*100).toFixed(1)+"%" : "-",
          gen.cHT ? (t.cHT/gen.cHT*100).toFixed(1)+"%" : "-",
        ];
      }),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(recap);
    ws2["!cols"] = [5,30,14,14,12,14,14,12,12,12,12].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, "RÉCAPITULATIF");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `${projName}_FicheCout.xlsx`);
  };

  // ── import Excel ──
  const importXLS = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const nl = { ...lots };
        ALL_SECS.forEach((sec) => {
          const sn = wb.SheetNames.find((n) => n.startsWith(sec.id));
          if (!sn) return;
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 }).slice(1)
            .filter((r) => r[0] && !isNaN(Number(r[0])));
          nl[sec.id] = rows.length
            ? rows.map((r) => ({ id: crypto.randomUUID(), partenaire: r[1]||"", designation: r[2]||"", marche: r[3]||"", avenants: r[4]||"", engageHT: r[5]||"", consommeHT: r[6]||"", engageTTC: r[8]||"", consommeTTC: r[9]||"" }))
            : [newLot()];
        });
        setLots(nl); alert("✅ Import réussi !");
      } catch (err) { alert("Erreur : " + err.message); }
    };
    reader.readAsArrayBuffer(file); e.target.value = "";
  };

  // ── Section ──────────────────────────────────────────────────────────────
  const secInfo = activeSec ? ALL_SECS.find((s) => s.id === activeSec) : null;
  const secGroup = activeSec ? GROUPS.find((g) => g.sections.some((s) => s.id === activeSec)) : null;

  // ════════════════════════════════════════════════════════════════════════
  // SECTION PAGE
  // ════════════════════════════════════════════════════════════════════════
  if (page === "section" && secInfo) {
    const st = secTot(activeSec);
    const rows = lots[activeSec] || [];
    return (
      <div className="page">
        {/* top bar */}
        <div className="topbar" style={{ background: secGroup.bg }}>
          <button className="back-btn" onClick={() => setPage("home")}>← Retour</button>
          <div className="topbar-title">
            <span className="topbar-icon">{secGroup.icon}</span>
            <span>{secInfo.label}</span>
          </div>
          <button className="save-btn" onClick={save}>{saved ? "✓ Sauvegardé" : "💾 Sauvegarder"}</button>
        </div>

        {/* totals row */}
        <div className="sec-totals-bar">
          {[
            { l: "Engagé HT",    v: st.eHT,          c: "#2563eb" },
            { l: "Consommé HT",  v: st.cHT,           c: "#0891b2" },
            { l: "Reste HT",     v: st.eHT - st.cHT,  c: st.eHT-st.cHT < 0 ? "#ef4444" : "#16a34a" },
            { l: "Engagé TTC",   v: st.eTTC,          c: "#7c3aed" },
            { l: "Consommé TTC", v: st.cTTC,          c: "#db2777" },
            { l: "Reste TTC",    v: st.eTTC - st.cTTC, c: st.eTTC-st.cTTC < 0 ? "#ef4444" : "#16a34a" },
          ].map((c) => (
            <div key={c.l} className="stbar-card">
              <div className="stbar-lbl">{c.l}</div>
              <div className="stbar-val" style={{ color: c.c }}>{fmtDA(c.v)}</div>
            </div>
          ))}
        </div>

        {/* table */}
        <div className="sec-table-wrap">
          <table className="sec-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Partenaire Intervenant</th>
                <th>Désignation des Lots</th>
                <th>Marché / Contrat / BC</th>
                <th>Avenants / DGD</th>
                <th>Engagé HT (DA)</th>
                <th>Consommé HT (DA)</th>
                <th>Reste HT</th>
                <th>Engagé TTC (DA)</th>
                <th>Consommé TTC (DA)</th>
                <th>Reste TTC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lot, i) => {
                const rHT  = toNum(lot.engageHT)  - toNum(lot.consommeHT);
                const rTTC = toNum(lot.engageTTC) - toNum(lot.consommeTTC);
                return (
                  <tr key={lot.id} className={i % 2 === 0 ? "row-a" : "row-b"}>
                    <td className="cell-n">{i + 1}</td>
                    <td><input className="cell-txt" value={lot.partenaire}  onChange={(e) => setField(activeSec, lot.id, "partenaire",  e.target.value)} placeholder="Entreprise…" /></td>
                    <td><input className="cell-txt" value={lot.designation} onChange={(e) => setField(activeSec, lot.id, "designation", e.target.value)} placeholder="Lot / Travaux…" /></td>
                    <td><input className="cell-txt" value={lot.marche}      onChange={(e) => setField(activeSec, lot.id, "marche",      e.target.value)} placeholder="N° Marché…" /></td>
                    <td><input className="cell-txt" value={lot.avenants}    onChange={(e) => setField(activeSec, lot.id, "avenants",    e.target.value)} placeholder="Avenants…" /></td>
                    <td><input className="cell-num" type="number" value={lot.engageHT}    onChange={(e) => setField(activeSec, lot.id, "engageHT",    e.target.value)} placeholder="0" /></td>
                    <td><input className="cell-num" type="number" value={lot.consommeHT}  onChange={(e) => setField(activeSec, lot.id, "consommeHT",  e.target.value)} placeholder="0" /></td>
                    <td className="cell-calc" style={{ color: rHT  < 0 ? "#ef4444" : "#16a34a" }}>{fmtDA(rHT)}</td>
                    <td><input className="cell-num" type="number" value={lot.engageTTC}   onChange={(e) => setField(activeSec, lot.id, "engageTTC",   e.target.value)} placeholder="0" /></td>
                    <td><input className="cell-num" type="number" value={lot.consommeTTC} onChange={(e) => setField(activeSec, lot.id, "consommeTTC", e.target.value)} placeholder="0" /></td>
                    <td className="cell-calc" style={{ color: rTTC < 0 ? "#ef4444" : "#16a34a" }}>{fmtDA(rTTC)}</td>
                    <td><button className="del-row" onClick={() => delLot(activeSec, lot.id)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="foot-row">
                <td colSpan={5} style={{ padding: "10px 14px", fontWeight: 700, color: "#fff" }}>TOTAL SECTION</td>
                <td className="foot-val">{fmtDA(st.eHT)}</td>
                <td className="foot-val">{fmtDA(st.cHT)}</td>
                <td className="foot-val" style={{ color: st.eHT-st.cHT < 0 ? "#fca5a5" : "#86efac" }}>{fmtDA(st.eHT-st.cHT)}</td>
                <td className="foot-val">{fmtDA(st.eTTC)}</td>
                <td className="foot-val">{fmtDA(st.cTTC)}</td>
                <td className="foot-val" style={{ color: st.eTTC-st.cTTC < 0 ? "#fca5a5" : "#86efac" }}>{fmtDA(st.eTTC-st.cTTC)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button className="add-row" onClick={() => addLot(activeSec)}>＋ Ajouter une ligne</button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // RECAP PAGE
  // ════════════════════════════════════════════════════════════════════════
  if (page === "recap") {
    return (
      <div className="page">
        <div className="topbar" style={{ background: "#0a1628" }}>
          <button className="back-btn" onClick={() => setPage("home")}>← Retour</button>
          <div className="topbar-title"><span>📊</span><span>Récapitulatif Général</span></div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="action-btn export-btn" onClick={exportXLS}>📊 Excel</button>
            <button className="action-btn print-btn"  onClick={() => window.print()}>🖨️ Print</button>
            <button className="save-btn" onClick={save}>{saved ? "✓ Sauvegardé" : "💾 Sauvegarder"}</button>
          </div>
        </div>

        <div className="recap-body">
          <div className="recap-proj-info">
            <span className="rpi-name">{projName}</span>
            {projRef && <span className="rpi-ref">Réf : {projRef}</span>}
            <span className="rpi-date">{projDate}</span>
          </div>

          {/* frais divers */}
          <div className="frais-card">
            <div className="frais-card-title">FRAIS DIVERS &amp; IMPÔTS ET TAXES</div>
            <div className="frais-inputs">
              {[["eHT","Engagé HT"],["cHT","Consommé HT"],["eTTC","Engagé TTC"],["cTTC","Consommé TTC"]].map(([k, lbl]) => (
                <label key={k} className="frais-field">
                  <span>{lbl}</span>
                  <input type="number" className="frais-num" value={frais[k]}
                    onChange={(e) => setFrais((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder="0" />
                </label>
              ))}
            </div>
          </div>

          {/* recap table */}
          <div className="recap-tbl-wrap">
            <table className="recap-tbl">
              <thead>
                <tr>
                  <th className="rth-n">N°</th>
                  <th className="rth-lbl">RUBRIQUE</th>
                  <th className="rth-v">ENGAGÉ HT</th>
                  <th className="rth-v">CONSOMMÉ HT</th>
                  <th className="rth-v">ÉCART HT</th>
                  <th className="rth-v">ENGAGÉ TTC</th>
                  <th className="rth-v">CONSOMMÉ TTC</th>
                  <th className="rth-v">ÉCART TTC</th>
                  <th className="rth-v">RATIO CONSO</th>
                  <th className="rth-v">% ENGAG</th>
                  <th className="rth-v">% CONSO</th>
                </tr>
              </thead>
              <tbody>
                {RECAP_ROWS.map((row, i) => {
                  const t   = tots[row.rk] || { eHT:0, cHT:0, eTTC:0, cTTC:0 };
                  const eHT = t.eHT  - t.cHT;
                  const eTTC= t.eTTC - t.cTTC;
                  const r1  = t.eHT  ? (t.cHT / t.eHT   * 100).toFixed(1) + "%" : "—";
                  const r2  = gen.eHT ? (t.eHT / gen.eHT  * 100).toFixed(1) + "%" : "—";
                  const r3  = gen.cHT ? (t.cHT / gen.cHT  * 100).toFixed(1) + "%" : "—";
                  const style = row.grand ? { background:"#0a1628", color:"#fff", fontWeight:700 }
                              : row.tot   ? { background: row.bg,    color:"#fff", fontWeight:700 }
                              : row.sub   ? { background: i%2===0?"#f9fafb":"#fff" }
                              : { background:"#fef3c7" };
                  const textColor = (row.tot || row.grand) ? "#fff" : "#1e293b";
                  return (
                    <tr key={row.rk} style={style}>
                      <td className="rtd-n" style={{ color: textColor }}>{i + 1}</td>
                      <td className="rtd-lbl" style={{ color: textColor, paddingLeft: row.sub ? 28 : 12 }}>{row.label}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{fmtDA(t.eHT)}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{fmtDA(t.cHT)}</td>
                      <td className="rtd-v" style={{ color: eHT < 0 ? "#ef4444" : (row.tot||row.grand) ? "#86efac" : "#16a34a" }}>{fmtDA(eHT)}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{fmtDA(t.eTTC)}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{fmtDA(t.cTTC)}</td>
                      <td className="rtd-v" style={{ color: eTTC < 0 ? "#ef4444" : (row.tot||row.grand) ? "#86efac" : "#16a34a" }}>{fmtDA(eTTC)}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{r1}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{r2}</td>
                      <td className="rtd-v" style={{ color: textColor }}>{r3}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="page">
      {/* header */}
      <div className="home-header">
        <div className="home-header-left">
          <div className="home-logo">🏗️</div>
          <div>
            <input className="home-proj-name" value={projName} onChange={(e) => setProjName(e.target.value)} />
            <div className="home-meta">
              <input className="home-meta-inp" placeholder="Référence" value={projRef}  onChange={(e) => setProjRef(e.target.value)}  />
              <input className="home-meta-inp" type="date"              value={projDate} onChange={(e) => setProjDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="home-header-right">
          <label className="hbtn hbtn-import">📥 Import Excel<input type="file" accept=".xlsx,.xls" onChange={importXLS} style={{display:"none"}}/></label>
          <button className="hbtn hbtn-export"   onClick={exportXLS}>📊 Export Excel</button>
          <button className="hbtn hbtn-recap"    onClick={() => setPage("recap")}>📊 Récapitulatif</button>
          <button className="hbtn hbtn-menu"     onClick={() => setMenuOpen((p) => !p)}>📂 Projets</button>
          <button className="hbtn hbtn-new"      onClick={newProj}>＋ Nouveau</button>
          <button className="hbtn hbtn-save"     onClick={save}>{saved ? "✓ Sauvegardé" : "💾 Sauvegarder"}</button>
        </div>
      </div>

      {/* projects menu */}
      {menuOpen && (
        <div className="proj-menu">
          <div className="proj-menu-title">PROJETS SAUVEGARDÉS</div>
          {projects.length === 0 && <p className="proj-menu-empty">Aucun projet</p>}
          {projects.map((p) => (
            <div key={p} className="proj-menu-row">
              <button className="proj-menu-load" onClick={() => loadProj(p)}>{p}</button>
              <button className="proj-menu-del"  onClick={() => deleteProj(p)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {/* grand total summary */}
      <div className="home-summary">
        {[
          { l: "Total Engagé HT",    v: gen.eHT,           c: "#1d4ed8" },
          { l: "Total Consommé HT",  v: gen.cHT,           c: "#0e7490" },
          { l: "Reste à Consommer HT", v: gen.eHT-gen.cHT, c: gen.eHT-gen.cHT<0?"#dc2626":"#15803d" },
          { l: "Total Engagé TTC",   v: gen.eTTC,          c: "#6d28d9" },
          { l: "Total Consommé TTC", v: gen.cTTC,          c: "#9d174d" },
        ].map((c) => (
          <div key={c.l} className="home-sum-card">
            <div className="hsc-lbl">{c.l}</div>
            <div className="hsc-val" style={{ color: c.c }}>{fmtDA(c.v)} DA</div>
          </div>
        ))}
      </div>

      {/* groups accordion */}
      <div className="home-groups">
        {GROUPS.map((grp) => {
          const gt = grp.sections.reduce((acc, s) => {
            const t = secTot(s.id);
            return { eHT: acc.eHT+t.eHT, cHT: acc.cHT+t.cHT, eTTC: acc.eTTC+t.eTTC, cTTC: acc.cTTC+t.cTTC };
          }, { eHT:0, cHT:0, eTTC:0, cTTC:0 });

          return (
            <div key={grp.id} className="grp-card">
              {/* group title */}
              <div className="grp-card-header" style={{ background: grp.bg }}>
                <span className="grp-card-icon">{grp.icon}</span>
                <span className="grp-card-code">{grp.num}</span>
                <span className="grp-card-lbl">{grp.label}</span>
                <div className="grp-card-tots">
                  <span>EHT : <strong>{fmtDA(gt.eHT)}</strong></span>
                  <span>CHT : <strong>{fmtDA(gt.cHT)}</strong></span>
                </div>
              </div>
              {/* sections buttons */}
              <div className="grp-card-secs">
                {grp.sections.map((sec) => {
                  const st = secTot(sec.id);
                  const hasData = (lots[sec.id]||[]).some(l => l.engageHT || l.designation);
                  return (
                    <button
                      key={sec.id}
                      className={`sec-btn ${hasData ? "sec-btn-filled" : ""}`}
                      onClick={() => { setActiveSec(sec.id); setPage("section"); }}
                    >
                      <div className="sec-btn-top">
                        <span className="sec-btn-lbl">{sec.label}</span>
                        {hasData && <span className="sec-btn-badge">✓</span>}
                      </div>
                      <div className="sec-btn-tots">
                        <span>Engagé HT : <strong>{fmtDA(st.eHT)}</strong></span>
                        <span>Consommé HT : <strong>{fmtDA(st.cHT)}</strong></span>
                      </div>
                      <div className="sec-btn-arrow">Ouvrir et saisir →</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
