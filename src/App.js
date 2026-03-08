import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./App.css";

const num = (v) => parseFloat((v + "").replace(/\s/g, "").replace(",", ".")) || 0;
const fmtNum = (v) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  if (isNaN(n)) return "";
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const emptyLot = () => ({
  id: Date.now() + Math.random(),
  partenaire: "", designation: "", marche: "", avenants: "",
  engageHT: "", consommeHT: "", engageTTC: "", consommeTTC: "",
});

const GROUPS = [
  { id:"G1", code:"01", label:"FONCIER", icon:"🏛️", color:"#0f4c75",
    sections:[
      { id:"1A", label:"1-A  Acquisition de terrain", rubKey:"acquisition" },
      { id:"1B", label:"1-B  Études Géotechniques (LABO, ÉTUDE DE SOL, GÉOMÈTRE…)", rubKey:"geotechnique" },
    ]},
  { id:"G2", code:"02", label:"ÉTUDES, SUIVI ET CONTRÔLE", icon:"📐", color:"#1b4332",
    sections:[
      { id:"2", label:"2  Études, Suivi et Contrôle (ÉTUDES, SUIVI, CTC)", rubKey:"etudes" },
    ]},
  { id:"G3", code:"03", label:"RÉALISATION", icon:"🏗️", color:"#7b2d00",
    sections:[
      { id:"3A", label:"3-A  Réalisation Logements (TCE, GO, CES, CLIM, KIT CUISINE…)", rubKey:"logements" },
      { id:"3B", label:"3-B  Réalisation Commerces (TCE, GO, Rideaux, Aluminium…)", rubKey:"commerces" },
      { id:"3C", label:"3-C  Réalisation VRD (VRD, Aménagement, Espace vert, Clôture, Transfo…)", rubKey:"vrd" },
    ]},
  { id:"G4", code:"04", label:"RACCORDEMENTS ET BRANCHEMENTS", icon:"🔌", color:"#312e81",
    sections:[
      { id:"4", label:"4  Raccordements et Branchements", rubKey:"branchements" },
    ]},
  { id:"G5", code:"05", label:"PRESTATIONS DE SERVICES", icon:"🤝", color:"#831843",
    sections:[
      { id:"5", label:"5  Prestations de Services (Expertise, Gardiennage, ANEP, Notaire…)", rubKey:"prestations" },
    ]},
];

const ALL_SECTIONS = GROUPS.flatMap((g) => g.sections);

const RECAP_ROWS = [
  { key:"acquisition",     label:"Acquisition terrain",                   indent:true },
  { key:"geotechnique",    label:"Études Géotechniques",                   indent:true },
  { key:"FONCIER",         label:"TOTAL 01 — FONCIER",                     isTotal:true, color:"#0f4c75" },
  { key:"etudes",          label:"TOTAL 02 — ÉTUDES, SUIVI & CONTRÔLE",    isTotal:true, color:"#1b4332" },
  { key:"logements",       label:"Logements",                              indent:true },
  { key:"commerces",       label:"Commerces",                              indent:true },
  { key:"vrd",             label:"V.R.D",                                  indent:true },
  { key:"REALISATION",     label:"TOTAL 03 — RÉALISATION",                 isTotal:true, color:"#7b2d00" },
  { key:"branchements",    label:"TOTAL 04 — BRANCHEMENTS & RACC.",        isTotal:true, color:"#312e81" },
  { key:"prestations",     label:"TOTAL 05 — PRESTATIONS DE SERVICES",     isTotal:true, color:"#831843" },
  { key:"FRAIS_DIVERS",    label:"FRAIS DIVERS & IMPÔTS ET TAXES",         isManual:true },
  { key:"TOTAL_PRODUCTION",label:"TOTAL GÉNÉRAL DE PRODUCTION",            isGrandTotal:true },
];

/* ── NumericInput ── */
function NumericInput({ value, onChange, placeholder="0,00" }) {
  const [display, setDisplay] = useState(value !== "" ? fmtNum(value) : "");
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDisplay(value !== "" ? fmtNum(value) : ""); }, [value, focused]);
  return (
    <input
      type="text" inputMode="decimal"
      value={display}
      placeholder={placeholder}
      className="num-cell"
      onFocus={() => { setFocused(true); setDisplay(value !== "" ? String(value) : ""); }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g,"");
        setDisplay(raw);
        const p = parseFloat(raw.replace(",","."));
        onChange(isNaN(p) ? "" : p);
      }}
      onBlur={() => { setFocused(false); setDisplay(value !== "" && value !== undefined ? fmtNum(value) : ""); }}
    />
  );
}

/* ══ APP ══ */
export default function App() {
  const [projectName,  setProjectName]  = useState("Projet Immobilier");
  const [projectRef,   setProjectRef]   = useState("");
  const [projectDate,  setProjectDate]  = useState(new Date().toISOString().slice(0,10));
  const [lots,         setLots]         = useState(() => { const i={}; ALL_SECTIONS.forEach(s=>(i[s.id]=[emptyLot()])); return i; });
  const [fraisDivers,  setFraisDivers]  = useState({ engageHT:"", consommeHT:"", engageTTC:"", consommeTTC:"" });
  const [openGroups,   setOpenGroups]   = useState({ G1:true });
  const [openSections, setOpenSections] = useState({});
  const [activeTab,    setActiveTab]    = useState("saisie");
  const [projects,     setProjects]     = useState([]);
  const [saved,        setSaved]        = useState(false);
  const [showProjList, setShowProjList] = useState(false);

  useEffect(() => {
    try {
      setProjects(JSON.parse(localStorage.getItem("fc2-list")||"[]"));
      const last = localStorage.getItem("fc2-last");
      if (last) loadData(JSON.parse(last));
    } catch {}
  }, []);

  const loadData = (d) => {
    setProjectName(d.projectName||"Projet Immobilier");
    setProjectRef(d.projectRef||""); setProjectDate(d.projectDate||new Date().toISOString().slice(0,10));
    setLots(d.lots||{}); setFraisDivers(d.fraisDivers||{engageHT:"",consommeHT:"",engageTTC:"",consommeTTC:""});
  };

  const handleSave = () => {
    const data = { projectName, projectRef, projectDate, lots, fraisDivers };
    const key  = "fc2-"+projectName.replace(/\s+/g,"_");
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem("fc2-last", JSON.stringify(data));
    const nl = [...new Set([...projects, projectName])];
    localStorage.setItem("fc2-list", JSON.stringify(nl));
    setProjects(nl); setSaved(true); setTimeout(()=>setSaved(false),2500);
  };

  const handleNew = () => {
    const n = prompt("Nom du nouveau projet :"); if (!n) return;
    setProjectName(n); setProjectRef(""); setProjectDate(new Date().toISOString().slice(0,10));
    const i={}; ALL_SECTIONS.forEach(s=>(i[s.id]=[emptyLot()]));
    setLots(i); setFraisDivers({engageHT:"",consommeHT:"",engageTTC:"",consommeTTC:""}); setShowProjList(false);
  };

  const handleLoad   = (name) => { const r=localStorage.getItem("fc2-"+name.replace(/\s+/g,"_")); if(r) loadData(JSON.parse(r)); setShowProjList(false); };
  const handleDelete = (name) => { if(!window.confirm(`Supprimer "${name}" ?`)) return; localStorage.removeItem("fc2-"+name.replace(/\s+/g,"_")); const nl=projects.filter(p=>p!==name); localStorage.setItem("fc2-list",JSON.stringify(nl)); setProjects(nl); };

  const addLot    = (sid) => setLots(p=>({...p,[sid]:[...p[sid],emptyLot()]}));
  const removeLot = (sid,id) => setLots(p=>({...p,[sid]:p[sid].filter(l=>l.id!==id)}));
  const updateLot = (sid,id,f,v) => setLots(p=>({...p,[sid]:p[sid].map(l=>l.id===id?{...l,[f]:v}:l)}));

  const secTotal = useCallback((sid) => {
    const r = lots[sid]||[];
    return { engageHT:r.reduce((s,l)=>s+num(l.engageHT),0), consommeHT:r.reduce((s,l)=>s+num(l.consommeHT),0), engageTTC:r.reduce((s,l)=>s+num(l.engageTTC),0), consommeTTC:r.reduce((s,l)=>s+num(l.consommeTTC),0) };
  },[lots]);

  const allTotals = useCallback(() => {
    const m={};
    ALL_SECTIONS.forEach(s=>{m[s.rubKey]=secTotal(s.id);});
    const sum=(...keys)=>({ engageHT:keys.reduce((s,k)=>s+(m[k]?.engageHT||0),0), consommeHT:keys.reduce((s,k)=>s+(m[k]?.consommeHT||0),0), engageTTC:keys.reduce((s,k)=>s+(m[k]?.engageTTC||0),0), consommeTTC:keys.reduce((s,k)=>s+(m[k]?.consommeTTC||0),0) });
    m["FONCIER"]=sum("acquisition","geotechnique");
    m["REALISATION"]=sum("logements","commerces","vrd");
    m["FRAIS_DIVERS"]={engageHT:num(fraisDivers.engageHT),consommeHT:num(fraisDivers.consommeHT),engageTTC:num(fraisDivers.engageTTC),consommeTTC:num(fraisDivers.consommeTTC)};
    m["TOTAL_PRODUCTION"]=sum("FONCIER","etudes","REALISATION","branchements","prestations","FRAIS_DIVERS");
    return m;
  },[lots,fraisDivers,secTotal]);

  const totals   = allTotals();
  const grandTot = totals["TOTAL_PRODUCTION"];

  const groupTotal = (g) => {
    const keys=g.sections.map(s=>s.rubKey);
    return { engageHT:keys.reduce((s,k)=>s+(totals[k]?.engageHT||0),0), consommeHT:keys.reduce((s,k)=>s+(totals[k]?.consommeHT||0),0), engageTTC:keys.reduce((s,k)=>s+(totals[k]?.engageTTC||0),0), consommeTTC:keys.reduce((s,k)=>s+(totals[k]?.consommeTTC||0),0) };
  };

  /* Excel export */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    ALL_SECTIONS.forEach(sec=>{
      const rows=lots[sec.id]||[]; const st=secTotal(sec.id);
      const data=[
        ["N°","Partenaire Intervenant","Désignation des Lots","Marché/Contrat/Convention/BC","Avenants/DGD","Montant Engagé HT","Montant Consommé HT","Reste à Consommer HT","Montant Engagé TTC","Montant Consommé TTC","Reste à Consommer TTC"],
        ...rows.map((l,i)=>[i+1,l.partenaire,l.designation,l.marche,l.avenants,num(l.engageHT),num(l.consommeHT),num(l.engageHT)-num(l.consommeHT),num(l.engageTTC),num(l.consommeTTC),num(l.engageTTC)-num(l.consommeTTC)]),
        [],[,"","","","TOTAL",st.engageHT,st.consommeHT,st.engageHT-st.consommeHT,st.engageTTC,st.consommeTTC,st.engageTTC-st.consommeTTC],
      ];
      const ws=XLSX.utils.aoa_to_sheet(data); ws["!cols"]=[6,22,28,28,18,16,16,16,16,16,16].map(w=>({wch:w}));
      XLSX.utils.book_append_sheet(wb,ws,sec.id+" "+sec.label.slice(0,18));
    });
    const recapData=[
      [projectName,"",projectRef,"",projectDate],[],
      ["N°","RUBRIQUE","ENGAGÉ HT","CONSOMMÉ HT","ÉCART HT","ENGAGÉ TTC","CONSOMMÉ TTC","ÉCART TTC","RATIO CONSO HT","RATIO/RUBR/ENGAG HT","RATIO/RUBR/CONSO HT"],
      ...RECAP_ROWS.map((row,i)=>{
        const t=totals[row.key]||{engageHT:0,consommeHT:0,engageTTC:0,consommeTTC:0};
        return [i+1,row.label,t.engageHT,t.consommeHT,t.engageHT-t.consommeHT,t.engageTTC,t.consommeTTC,t.engageTTC-t.consommeTTC,
          t.engageHT?(t.consommeHT/t.engageHT*100).toFixed(1)+"%":"-",
          grandTot.engageHT?(t.engageHT/grandTot.engageHT*100).toFixed(1)+"%":"-",
          grandTot.consommeHT?(t.consommeHT/grandTot.consommeHT*100).toFixed(1)+"%":"-",
        ];
      }),
    ];
    const ws2=XLSX.utils.aoa_to_sheet(recapData); ws2["!cols"]=[5,32,16,16,14,16,16,14,16,20,20].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws2,"RÉCAPITULATIF");
    const buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});
    saveAs(new Blob([buf],{type:"application/octet-stream"}),`${projectName}_FicheCout.xlsx`);
  };

  /* Excel import */
  const importExcel = (e) => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(evt)=>{
      try {
        const wb=XLSX.read(evt.target.result,{type:"array"});
        const newLots={...lots};
        ALL_SECTIONS.forEach(sec=>{
          const sn=wb.SheetNames.find(n=>n.startsWith(sec.id)); if(!sn) return;
          const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1});
          const data=rows.slice(1).filter(r=>r[0]&&!isNaN(Number(r[0])));
          newLots[sec.id]=data.map(r=>({id:Date.now()+Math.random(),partenaire:r[1]||"",designation:r[2]||"",marche:r[3]||"",avenants:r[4]||"",engageHT:r[5]||"",consommeHT:r[6]||"",engageTTC:r[8]||"",consommeTTC:r[9]||""}));
          if(newLots[sec.id].length===0) newLots[sec.id]=[emptyLot()];
        });
        setLots(newLots); alert("✅ Import réussi !");
      } catch(err){ alert("Erreur import : "+err.message); }
    };
    reader.readAsArrayBuffer(file); e.target.value="";
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header no-print">
        <div className="header-left">
          <div className="logo">🏗️</div>
          <div className="header-titles">
            <input className="proj-name-input" value={projectName} onChange={e=>setProjectName(e.target.value)} />
            <div className="header-meta">
              <input className="meta-input" placeholder="Référence projet" value={projectRef}  onChange={e=>setProjectRef(e.target.value)}  />
              <input className="meta-input" type="date"                    value={projectDate} onChange={e=>setProjectDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="header-actions">
          <label className="btn btn-import">📥 Import Excel<input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{display:"none"}} /></label>
          <button className="btn btn-export"   onClick={exportExcel}>📊 Export Excel</button>
          <button className="btn btn-print"    onClick={()=>window.print()}>🖨️ Imprimer</button>
          <button className="btn btn-projects" onClick={()=>setShowProjList(p=>!p)}>📂 Projets</button>
          <button className="btn btn-new"      onClick={handleNew}>+ Nouveau</button>
          <button className="btn btn-save"     onClick={handleSave}>{saved?"✓ Sauvegardé":"💾 Sauvegarder"}</button>
        </div>
      </header>

      {showProjList && (
        <div className="proj-dropdown no-print">
          <div className="proj-dropdown-hdr">PROJETS SAUVEGARDÉS</div>
          {projects.length===0 && <p className="proj-empty">Aucun projet sauvegardé</p>}
          {projects.map(p=>(
            <div key={p} className="proj-row">
              <button className="proj-load" onClick={()=>handleLoad(p)}>{p}</button>
              <button className="proj-del"  onClick={()=>handleDelete(p)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="tabs no-print">
        {[["saisie","✏️  Saisie des données"],["recap","📊  Récapitulatif"]].map(([id,lbl])=>(
          <button key={id} className={`tab-btn ${activeTab===id?"active":""}`} onClick={()=>setActiveTab(id)}>{lbl}</button>
        ))}
      </div>

      {/* ═══ SAISIE ═══ */}
      {activeTab==="saisie" && (
        <div className="saisie-view">
          {/* Grand total bar */}
          <div className="grand-total-bar">
            {[
              {l:"Total Engagé HT",   v:grandTot.engageHT,   c:"#3b82f6"},
              {l:"Total Consommé HT", v:grandTot.consommeHT, c:"#06b6d4"},
              {l:"Reste à Conso HT",  v:grandTot.engageHT-grandTot.consommeHT, c:grandTot.engageHT-grandTot.consommeHT<0?"#ef4444":"#22c55e"},
              {l:"Total Engagé TTC",  v:grandTot.engageTTC,  c:"#a855f7"},
              {l:"Total Consommé TTC",v:grandTot.consommeTTC,c:"#ec4899"},
            ].map(c=>(
              <div key={c.l} className="gtbar-card">
                <span className="gtbar-label">{c.l}</span>
                <span className="gtbar-value" style={{color:c.c}}>{fmtNum(c.v)} DA</span>
              </div>
            ))}
          </div>

          {/* Accordion */}
          {GROUPS.map(grp=>{
            const gt=groupTotal(grp);
            return (
              <div key={grp.id} className="group-block">
                <button className="group-header" style={{"--gc":grp.color}} onClick={()=>setOpenGroups(p=>({...p,[grp.id]:!p[grp.id]}))}>
                  <span className="grp-icon">{grp.icon}</span>
                  <span className="grp-code">{grp.code}</span>
                  <span className="grp-lbl">{grp.label}</span>
                  <div className="grp-totals">
                    <span>Engagé HT : <strong>{fmtNum(gt.engageHT)}</strong></span>
                    <span>Consommé HT : <strong>{fmtNum(gt.consommeHT)}</strong></span>
                    <span>Engagé TTC : <strong>{fmtNum(gt.engageTTC)}</strong></span>
                  </div>
                  <span className="grp-chev">{openGroups[grp.id]?"▲":"▼"}</span>
                </button>

                {openGroups[grp.id] && (
                  <div className="group-body">
                    {grp.sections.map(sec=>{
                      const st=secTotal(sec.id); const isOpen=openSections[sec.id];
                      return (
                        <div key={sec.id} className="section-block">
                          <button className="section-header" onClick={()=>setOpenSections(p=>({...p,[sec.id]:!p[sec.id]}))}>
                            <span className="sec-lbl">{sec.label}</span>
                            <div className="sec-mini">
                              <span>EHT: <strong>{fmtNum(st.engageHT)}</strong></span>
                              <span>CHT: <strong>{fmtNum(st.consommeHT)}</strong></span>
                              <span>ETTC: <strong>{fmtNum(st.engageTTC)}</strong></span>
                              <span>CTTC: <strong>{fmtNum(st.consommeTTC)}</strong></span>
                            </div>
                            <span className="sec-chev">{isOpen?"▲":"▼"}</span>
                          </button>

                          {isOpen && (
                            <div className="section-body">
                              <div className="sec-cards">
                                {[
                                  {l:"Engagé HT",        v:st.engageHT,                 c:"#1d4ed8"},
                                  {l:"Consommé HT",      v:st.consommeHT,               c:"#0e7490"},
                                  {l:"Reste à Conso HT", v:st.engageHT-st.consommeHT,   c:st.engageHT-st.consommeHT<0?"#dc2626":"#16a34a"},
                                  {l:"Engagé TTC",       v:st.engageTTC,                c:"#6d28d9"},
                                  {l:"Consommé TTC",     v:st.consommeTTC,              c:"#9d174d"},
                                  {l:"Reste à Conso TTC",v:st.engageTTC-st.consommeTTC, c:st.engageTTC-st.consommeTTC<0?"#dc2626":"#16a34a"},
                                ].map(c=>(
                                  <div key={c.l} className="sec-card">
                                    <div className="sc-lbl">{c.l}</div>
                                    <div className="sc-val" style={{color:c.c}}>{fmtNum(c.v)}</div>
                                  </div>
                                ))}
                              </div>

                              <div className="tbl-wrap">
                                <table className="lot-table">
                                  <thead>
                                    <tr>
                                      <th className="th-n">N°</th>
                                      <th className="th-txt">Partenaire Intervenant</th>
                                      <th className="th-wide">Désignation des Lots</th>
                                      <th className="th-txt">Marché / Contrat / Convention / BC</th>
                                      <th className="th-txt">Avenants / DGD</th>
                                      <th className="th-num">Engagé HT</th>
                                      <th className="th-num">Consommé HT</th>
                                      <th className="th-calc">Reste HT</th>
                                      <th className="th-num">Engagé TTC</th>
                                      <th className="th-num">Consommé TTC</th>
                                      <th className="th-calc">Reste TTC</th>
                                      <th style={{width:36}}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(lots[sec.id]||[]).map((lot,i)=>{
                                      const rHT=num(lot.engageHT)-num(lot.consommeHT);
                                      const rTTC=num(lot.engageTTC)-num(lot.consommeTTC);
                                      return (
                                        <tr key={lot.id} className={i%2===0?"tr-even":"tr-odd"}>
                                          <td className="td-n">{i+1}</td>
                                          <td><input className="txt-cell" value={lot.partenaire}  onChange={e=>updateLot(sec.id,lot.id,"partenaire",e.target.value)}  placeholder="Partenaire…" /></td>
                                          <td><input className="txt-cell" value={lot.designation} onChange={e=>updateLot(sec.id,lot.id,"designation",e.target.value)} placeholder="Désignation…" /></td>
                                          <td><input className="txt-cell" value={lot.marche}       onChange={e=>updateLot(sec.id,lot.id,"marche",e.target.value)}       placeholder="Réf. marché…" /></td>
                                          <td><input className="txt-cell" value={lot.avenants}     onChange={e=>updateLot(sec.id,lot.id,"avenants",e.target.value)}     placeholder="Avenants…" /></td>
                                          <td><NumericInput value={lot.engageHT}    onChange={v=>updateLot(sec.id,lot.id,"engageHT",v)}    /></td>
                                          <td><NumericInput value={lot.consommeHT}  onChange={v=>updateLot(sec.id,lot.id,"consommeHT",v)}  /></td>
                                          <td className="td-calc" style={{color:rHT<0?"#ef4444":"#16a34a"}}>{fmtNum(rHT)}</td>
                                          <td><NumericInput value={lot.engageTTC}   onChange={v=>updateLot(sec.id,lot.id,"engageTTC",v)}   /></td>
                                          <td><NumericInput value={lot.consommeTTC} onChange={v=>updateLot(sec.id,lot.id,"consommeTTC",v)} /></td>
                                          <td className="td-calc" style={{color:rTTC<0?"#ef4444":"#16a34a"}}>{fmtNum(rTTC)}</td>
                                          <td><button className="del-btn" onClick={()=>removeLot(sec.id,lot.id)} title="Supprimer">✕</button></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="tr-total">
                                      <td colSpan={5} className="td-tlbl">TOTAL SECTION</td>
                                      <td className="td-tv">{fmtNum(st.engageHT)}</td>
                                      <td className="td-tv">{fmtNum(st.consommeHT)}</td>
                                      <td className="td-tv" style={{color:st.engageHT-st.consommeHT<0?"#fca5a5":"#86efac"}}>{fmtNum(st.engageHT-st.consommeHT)}</td>
                                      <td className="td-tv">{fmtNum(st.engageTTC)}</td>
                                      <td className="td-tv">{fmtNum(st.consommeTTC)}</td>
                                      <td className="td-tv" style={{color:st.engageTTC-st.consommeTTC<0?"#fca5a5":"#86efac"}}>{fmtNum(st.engageTTC-st.consommeTTC)}</td>
                                      <td></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                              <button className="add-row-btn" onClick={()=>addLot(sec.id)}>+ Ajouter une ligne</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ RÉCAP ═══ */}
      {activeTab==="recap" && (
        <div className="recap-view">
          <div className="recap-hdr-info print-only-title">
            <h2 className="recap-title">📊 Récapitulatif Général</h2>
            <p className="recap-sub">{projectName}{projectRef&&` — Réf : ${projectRef}`} — Date : {projectDate}</p>
          </div>

          <div className="frais-box">
            <div className="frais-title">FRAIS DIVERS &amp; IMPÔTS ET TAXES</div>
            <div className="frais-grid">
              {[["engageHT","Engagé HT"],["consommeHT","Consommé HT"],["engageTTC","Engagé TTC"],["consommeTTC","Consommé TTC"]].map(([k,lbl])=>(
                <label key={k} className="frais-lbl">
                  {lbl}
                  <NumericInput value={fraisDivers[k]} onChange={v=>setFraisDivers(p=>({...p,[k]:v}))} />
                </label>
              ))}
            </div>
          </div>

          <div className="tbl-wrap">
            <table className="recap-table">
              <thead>
                <tr>
                  <th className="th-n">N°</th>
                  <th style={{minWidth:240,textAlign:"left",padding:"10px 12px"}}>RUBRIQUE</th>
                  <th className="th-num">ENGAGÉ DA HT</th>
                  <th className="th-num">CONSOMMÉ DA HT</th>
                  <th className="th-num">ÉCART HT</th>
                  <th className="th-num">ENGAGÉ DA TTC</th>
                  <th className="th-num">CONSOMMÉ DA TTC</th>
                  <th className="th-num">ÉCART TTC</th>
                  <th className="th-num">RATIO CONSO HT</th>
                  <th className="th-num">RATIO/RUBR/ENGAG HT</th>
                  <th className="th-num">RATIO/RUBR/CONSO HT</th>
                </tr>
              </thead>
              <tbody>
                {RECAP_ROWS.map((row,i)=>{
                  const t=totals[row.key]||{engageHT:0,consommeHT:0,engageTTC:0,consommeTTC:0};
                  const eHT=t.engageHT-t.consommeHT; const eTTC=t.engageTTC-t.consommeTTC;
                  const r1=t.engageHT?(t.consommeHT/t.engageHT*100).toFixed(1)+"%":"—";
                  const r2=grandTot.engageHT?(t.engageHT/grandTot.engageHT*100).toFixed(1)+"%":"—";
                  const r3=grandTot.consommeHT?(t.consommeHT/grandTot.consommeHT*100).toFixed(1)+"%":"—";
                  const cls=row.isGrandTotal?"tr-grand-total":row.isTotal?"tr-subtotal":row.indent?"tr-indent":i%2===0?"tr-even":"tr-odd";
                  return (
                    <tr key={row.key} className={cls} style={(row.isTotal||row.isGrandTotal)?{"--rc":row.color||"#0a2540"}:{}}>
                      <td className="td-n">{i+1}</td>
                      <td style={{padding:"8px 12px",fontWeight:row.isTotal||row.isGrandTotal?700:400,paddingLeft:row.indent?"28px":"12px"}}>{row.label}</td>
                      <td className="td-r">{fmtNum(t.engageHT)}</td>
                      <td className="td-r">{fmtNum(t.consommeHT)}</td>
                      <td className="td-r" style={{color:eHT<0?"#ef4444":"inherit"}}>{fmtNum(eHT)}</td>
                      <td className="td-r">{fmtNum(t.engageTTC)}</td>
                      <td className="td-r">{fmtNum(t.consommeTTC)}</td>
                      <td className="td-r" style={{color:eTTC<0?"#ef4444":"inherit"}}>{fmtNum(eTTC)}</td>
                      <td className="td-r">{r1}</td>
                      <td className="td-r">{r2}</td>
                      <td className="td-r">{r3}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
