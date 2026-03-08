import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./App.css";

const toNum = (v) => parseFloat(String(v ?? "").replace(/\s/g,"").replace(",",".")) || 0;
const DA = (n) => Number(n).toLocaleString("fr-DZ",{minimumFractionDigits:2,maximumFractionDigits:2});
const uid = () => Math.random().toString(36).slice(2);

const newRow = () => ({ id:uid(), partenaire:"", designation:"", marche:"", avenants:"", eHT:"", cHT:"", eTTC:"", cTTC:"" });

const GROUPS = [
  { id:"G1", num:"01", icon:"🏛️", label:"FONCIER",                        color:"#1e3a5f", glow:"#3b82f6",
    secs:[ {id:"s1a",label:"1-A · Acquisition de Terrain",       rk:"acq"},
           {id:"s1b",label:"1-B · Études Géotechniques",          rk:"geo"} ]},
  { id:"G2", num:"02", icon:"📐", label:"ÉTUDES, SUIVI ET CONTRÔLE",       color:"#14532d", glow:"#22c55e",
    secs:[ {id:"s2", label:"2 · Études, Suivi et Contrôle",       rk:"etd"} ]},
  { id:"G3", num:"03", icon:"🏗️", label:"RÉALISATION",                     color:"#7c2d12", glow:"#f97316",
    secs:[ {id:"s3a",label:"3-A · Réalisation Logements",         rk:"log"},
           {id:"s3b",label:"3-B · Réalisation Commerces",         rk:"com"},
           {id:"s3c",label:"3-C · Réalisation VRD",               rk:"vrd"} ]},
  { id:"G4", num:"04", icon:"🔌", label:"RACCORDEMENTS ET BRANCHEMENTS",    color:"#3b0764", glow:"#a855f7",
    secs:[ {id:"s4", label:"4 · Raccordements et Branchements",   rk:"bra"} ]},
  { id:"G5", num:"05", icon:"🤝", label:"PRESTATIONS DE SERVICES",          color:"#831843", glow:"#ec4899",
    secs:[ {id:"s5", label:"5 · Prestations de Services",         rk:"pre"} ]},
];
const ALL_SECS = GROUPS.flatMap(g=>g.secs);

const RECAP_ROWS = [
  {rk:"acq", label:"Acquisition terrain",               indent:true},
  {rk:"geo", label:"Études Géotechniques",               indent:true},
  {rk:"FON", label:"TOTAL 01 — FONCIER",                 tot:true, bg:"#1e3a5f"},
  {rk:"etd", label:"TOTAL 02 — ÉTUDES, SUIVI & CONTRÔLE",tot:true, bg:"#14532d"},
  {rk:"log", label:"Logements",                          indent:true},
  {rk:"com", label:"Commerces",                          indent:true},
  {rk:"vrd", label:"V.R.D",                              indent:true},
  {rk:"REA", label:"TOTAL 03 — RÉALISATION",             tot:true, bg:"#7c2d12"},
  {rk:"bra", label:"TOTAL 04 — BRANCHEMENTS & RACC.",    tot:true, bg:"#3b0764"},
  {rk:"pre", label:"TOTAL 05 — PRESTATIONS",             tot:true, bg:"#831843"},
  {rk:"FDI", label:"FRAIS DIVERS & IMPÔTS ET TAXES",     manual:true},
  {rk:"GEN", label:"TOTAL GÉNÉRAL DE PRODUCTION",        grand:true},
];

/* ── Sheet name → section id mapping (matches template) ── */
const SHEET_TO_SEC = {
  "1A":"s1a","1B":"s1b","2":"s2","3A":"s3a","3B":"s3b","3C":"s3c","4":"s4","5":"s5"
};

export default function App() {
  const init = () => { const o={}; ALL_SECS.forEach(s=>(o[s.id]=[newRow()])); return o; };

  const [view,      setView]     = useState("home");   // home | sec | recap
  const [secId,     setSecId]    = useState(null);
  const [pName,     setPName]    = useState("Mon Projet");
  const [pRef,      setPRef]     = useState("");
  const [pDate,     setPDate]    = useState(new Date().toISOString().slice(0,10));
  const [rows,      setRows]     = useState(init);
  const [frais,     setFrais]    = useState({eHT:"",cHT:"",eTTC:"",cTTC:""});
  const [saved,     setSaved]    = useState(false);
  const [projects,  setProjects] = useState([]);
  const [projOpen,  setProjOpen] = useState(false);
  const [importMsg, setImportMsg]= useState("");

  useEffect(()=>{
    try {
      setProjects(JSON.parse(localStorage.getItem("fc4-list")||"[]"));
      const last = localStorage.getItem("fc4-last");
      if (last) apply(JSON.parse(last));
    } catch {}
  },[]);

  const apply = d => {
    setPName(d.pName||"Mon Projet"); setPRef(d.pRef||"");
    setPDate(d.pDate||new Date().toISOString().slice(0,10));
    setRows(d.rows||init()); setFrais(d.frais||{eHT:"",cHT:"",eTTC:"",cTTC:""});
  };

  const save = () => {
    const d = {pName,pRef,pDate,rows,frais};
    const k = "fc4-"+pName.replace(/\W/g,"_");
    localStorage.setItem(k,JSON.stringify(d)); localStorage.setItem("fc4-last",JSON.stringify(d));
    const nl=[...new Set([...projects,pName])]; localStorage.setItem("fc4-list",JSON.stringify(nl));
    setProjects(nl); setSaved(true); setTimeout(()=>setSaved(false),2500);
  };

  const newProj = () => { const n=prompt("Nom du nouveau projet:"); if(!n)return; setPName(n); setPRef(""); setRows(init()); setFrais({eHT:"",cHT:"",eTTC:"",cTTC:""}); setProjOpen(false); };
  const loadProj = n => { const r=localStorage.getItem("fc4-"+n.replace(/\W/g,"_")); if(r) apply(JSON.parse(r)); setProjOpen(false); };
  const delProj  = n => { if(!window.confirm(`Supprimer "${n}" ?`))return; localStorage.removeItem("fc4-"+n.replace(/\W/g,"_")); const nl=projects.filter(p=>p!==n); localStorage.setItem("fc4-list",JSON.stringify(nl)); setProjects(nl); };

  const addRow  = sid => setRows(p=>({...p,[sid]:[...p[sid],newRow()]}));
  const delRow  = (sid,id) => setRows(p=>({...p,[sid]:p[sid].filter(r=>r.id!==id)}));
  const setF    = (sid,id,f,v) => setRows(p=>({...p,[sid]:p[sid].map(r=>r.id===id?{...r,[f]:v}:r)}));

  const secTot = useCallback(sid=>{
    const rs=rows[sid]||[];
    return { eHT:rs.reduce((s,r)=>s+toNum(r.eHT),0), cHT:rs.reduce((s,r)=>s+toNum(r.cHT),0),
             eTTC:rs.reduce((s,r)=>s+toNum(r.eTTC),0), cTTC:rs.reduce((s,r)=>s+toNum(r.cTTC),0) };
  },[rows]);

  const allTots = useCallback(()=>{
    const m={}; ALL_SECS.forEach(s=>{m[s.rk]=secTot(s.id);});
    const sum=(...ks)=>({eHT:ks.reduce((s,k)=>s+(m[k]?.eHT||0),0),cHT:ks.reduce((s,k)=>s+(m[k]?.cHT||0),0),eTTC:ks.reduce((s,k)=>s+(m[k]?.eTTC||0),0),cTTC:ks.reduce((s,k)=>s+(m[k]?.cTTC||0),0)});
    m["FON"]=sum("acq","geo"); m["REA"]=sum("log","com","vrd");
    m["FDI"]={eHT:toNum(frais.eHT),cHT:toNum(frais.cHT),eTTC:toNum(frais.eTTC),cTTC:toNum(frais.cTTC)};
    m["GEN"]=sum("FON","etd","REA","bra","pre","FDI");
    return m;
  },[rows,frais,secTot]);

  const tots = allTots();
  const gen  = tots["GEN"];

  /* ── EXCEL EXPORT ── */
  const exportXLS = () => {
    const wb = XLSX.utils.book_new();
    ALL_SECS.forEach(sec=>{
      const st=secTot(sec.id); const rs=rows[sec.id]||[];
      const data=[
        ["N°","Partenaire Intervenant","Désignation des Lots","Marché/Contrat/Convention/BC","Avenants/DGD",
         "Montant Engagé HT (DA)","Montant Consommé HT (DA)","Reste à Consommer HT",
         "Montant Engagé TTC (DA)","Montant Consommé TTC (DA)","Reste à Consommer TTC"],
        ...rs.map((r,i)=>[i+1,r.partenaire,r.designation,r.marche,r.avenants,
          toNum(r.eHT),toNum(r.cHT),toNum(r.eHT)-toNum(r.cHT),
          toNum(r.eTTC),toNum(r.cTTC),toNum(r.eTTC)-toNum(r.cTTC)]),
        [],
        ["","","","","TOTAL",st.eHT,st.cHT,st.eHT-st.cHT,st.eTTC,st.cTTC,st.eTTC-st.cTTC],
      ];
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws["!cols"]=[5,22,28,26,18,16,16,16,16,16,16].map(w=>({wch:w}));
      XLSX.utils.book_append_sheet(wb,ws,sec.id+" "+sec.label.slice(4,22));
    });
    // recap sheet
    const recapData=[
      [pName,pRef,pDate],[],
      ["N°","RUBRIQUE","ENGAGÉ HT","CONSOMMÉ HT","ÉCART HT","ENGAGÉ TTC","CONSOMMÉ TTC","ÉCART TTC","RATIO CONSO","% ENGAG","% CONSO"],
      ...RECAP_ROWS.map((row,i)=>{
        const t=tots[row.rk]||{eHT:0,cHT:0,eTTC:0,cTTC:0};
        return [i+1,row.label,t.eHT,t.cHT,t.eHT-t.cHT,t.eTTC,t.cTTC,t.eTTC-t.cTTC,
          t.eHT?(t.cHT/t.eHT*100).toFixed(1)+"%":"-",
          gen.eHT?(t.eHT/gen.eHT*100).toFixed(1)+"%":"-",
          gen.cHT?(t.cHT/gen.cHT*100).toFixed(1)+"%":"-",
        ];
      }),
    ];
    const ws2=XLSX.utils.aoa_to_sheet(recapData);
    ws2["!cols"]=[5,30,14,14,12,14,14,12,12,12,12].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws2,"RÉCAPITULATIF");
    const buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});
    saveAs(new Blob([buf],{type:"application/octet-stream"}),`${pName}_FicheCout.xlsx`);
  };

  /* ── EXCEL IMPORT — lit le modèle fourni ── */
  const importXLS = e => {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try {
        const wb=XLSX.read(ev.target.result,{type:"array"});
        const newRows={...rows};
        let imported=0;

        wb.SheetNames.forEach(sheetName=>{
          // Find section by prefix (e.g. "1A", "1B", "3A"…)
          const prefix=sheetName.split(" ")[0].split("-")[0];
          const secId = SHEET_TO_SEC[prefix];
          if(!secId) return;

          const ws=wb.Sheets[sheetName];
          const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});

          // Find header row (contains "Engagé" or "Montant")
          let dataStart=1;
          for(let r=0;r<raw.length;r++){
            const rowStr=raw[r].join(" ").toLowerCase();
            if(rowStr.includes("engag") && rowStr.includes("montant")){dataStart=r+1;break;}
            if(rowStr.includes("n°") || rowStr.includes("n°")){dataStart=r+1;break;}
          }

          // Read data rows — stop at TOTAL or empty N°
          const dataRows=[];
          for(let r=dataStart;r<raw.length;r++){
            const row=raw[r];
            const n=row[0];
            if(!n || String(n).toUpperCase().includes("TOTAL")) break;
            if(isNaN(Number(n))) continue;
            dataRows.push({
              id:uid(),
              partenaire: String(row[1]||""),
              designation:String(row[2]||""),
              marche:     String(row[3]||""),
              avenants:   String(row[4]||""),
              eHT:  row[5]!==""?Number(row[5])||"":"",
              cHT:  row[6]!==""?Number(row[6])||"":"",
              eTTC: row[8]!==""?Number(row[8])||"":"",
              cTTC: row[9]!==""?Number(row[9])||"":"",
            });
          }
          if(dataRows.length>0){ newRows[secId]=dataRows; imported++; }
        });

        setRows(newRows);
        setImportMsg(`✅ ${imported} feuille(s) importée(s) avec succès !`);
        setTimeout(()=>setImportMsg(""),4000);
      } catch(err){ setImportMsg("❌ Erreur : "+err.message); setTimeout(()=>setImportMsg(""),5000); }
    };
    reader.readAsArrayBuffer(file); e.target.value="";
  };

  /* ════ SECTION VIEW ════ */
  if(view==="sec"&&secId){
    const sec=ALL_SECS.find(s=>s.id===secId);
    const grp=GROUPS.find(g=>g.secs.some(s=>s.id===secId));
    const st=secTot(secId);
    const secRows=rows[secId]||[];
    return (
      <div className="app dark">
        {/* topbar */}
        <div className="topbar" style={{background:grp.color,borderBottom:`3px solid ${grp.glow}`}}>
          <button className="btn-back" onClick={()=>setView("home")}>
            <span>←</span> Retour
          </button>
          <div className="topbar-center">
            <span className="topbar-icon">{grp.icon}</span>
            <span className="topbar-title">{sec.label}</span>
          </div>
          <div className="topbar-right">
            <button className="btn-save" onClick={save}>{saved?"✓ Sauvegardé":"💾 Sauvegarder"}</button>
          </div>
        </div>

        {/* stat cards */}
        <div className="stat-bar">
          {[
            {l:"Engagé HT",    v:st.eHT,              c:"#60a5fa",icon:"📋"},
            {l:"Consommé HT",  v:st.cHT,              c:"#34d399",icon:"✅"},
            {l:"Reste HT",     v:st.eHT-st.cHT,       c:st.eHT-st.cHT<0?"#f87171":"#a3e635",icon:"⚖️"},
            {l:"Engagé TTC",   v:st.eTTC,             c:"#c084fc",icon:"📋"},
            {l:"Consommé TTC", v:st.cTTC,             c:"#f472b6",icon:"✅"},
            {l:"Reste TTC",    v:st.eTTC-st.cTTC,     c:st.eTTC-st.cTTC<0?"#f87171":"#a3e635",icon:"⚖️"},
          ].map(c=>(
            <div key={c.l} className="stat-card">
              <div className="stat-icon">{c.icon}</div>
              <div className="stat-info">
                <div className="stat-lbl">{c.l}</div>
                <div className="stat-val" style={{color:c.c}}>{DA(c.v)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* table */}
        <div className="tbl-container">
          <div className="tbl-scroll">
            <table className="data-tbl">
              <thead>
                <tr>
                  <th className="th-idx">N°</th>
                  <th>Partenaire Intervenant</th>
                  <th className="th-wide">Désignation des Lots</th>
                  <th>Marché / Contrat / BC</th>
                  <th>Avenants / DGD</th>
                  <th className="th-num">Engagé HT (DA)</th>
                  <th className="th-num">Consommé HT (DA)</th>
                  <th className="th-calc">Reste HT</th>
                  <th className="th-num">Engagé TTC (DA)</th>
                  <th className="th-num">Consommé TTC (DA)</th>
                  <th className="th-calc">Reste TTC</th>
                  <th className="th-del"></th>
                </tr>
              </thead>
              <tbody>
                {secRows.map((row,i)=>{
                  const rHT=toNum(row.eHT)-toNum(row.cHT);
                  const rTTC=toNum(row.eTTC)-toNum(row.cTTC);
                  return (
                    <tr key={row.id} className={i%2===0?"tr-a":"tr-b"}>
                      <td className="td-idx">{i+1}</td>
                      <td><input className="inp-txt" value={row.partenaire}  onChange={e=>setF(secId,row.id,"partenaire", e.target.value)} placeholder="Entreprise…" /></td>
                      <td><input className="inp-txt" value={row.designation} onChange={e=>setF(secId,row.id,"designation",e.target.value)} placeholder="Désignation du lot…" /></td>
                      <td><input className="inp-txt" value={row.marche}      onChange={e=>setF(secId,row.id,"marche",     e.target.value)} placeholder="N° Marché / BC…" /></td>
                      <td><input className="inp-txt" value={row.avenants}    onChange={e=>setF(secId,row.id,"avenants",   e.target.value)} placeholder="Avenants…" /></td>
                      <td><input className="inp-num" type="number" value={row.eHT}  onChange={e=>setF(secId,row.id,"eHT", e.target.value)} placeholder="0" /></td>
                      <td><input className="inp-num" type="number" value={row.cHT}  onChange={e=>setF(secId,row.id,"cHT", e.target.value)} placeholder="0" /></td>
                      <td className="td-calc" style={{color:rHT<0?"#f87171":"#4ade80"}}>{DA(rHT)}</td>
                      <td><input className="inp-num" type="number" value={row.eTTC} onChange={e=>setF(secId,row.id,"eTTC",e.target.value)} placeholder="0" /></td>
                      <td><input className="inp-num" type="number" value={row.cTTC} onChange={e=>setF(secId,row.id,"cTTC",e.target.value)} placeholder="0" /></td>
                      <td className="td-calc" style={{color:rTTC<0?"#f87171":"#4ade80"}}>{DA(rTTC)}</td>
                      <td><button className="btn-del" onClick={()=>delRow(secId,row.id)}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="tr-foot">
                  <td colSpan={5} className="td-foot-lbl">TOTAL SECTION</td>
                  <td className="td-foot-v">{DA(st.eHT)}</td>
                  <td className="td-foot-v">{DA(st.cHT)}</td>
                  <td className="td-foot-v" style={{color:st.eHT-st.cHT<0?"#fca5a5":"#86efac"}}>{DA(st.eHT-st.cHT)}</td>
                  <td className="td-foot-v">{DA(st.eTTC)}</td>
                  <td className="td-foot-v">{DA(st.cTTC)}</td>
                  <td className="td-foot-v" style={{color:st.eTTC-st.cTTC<0?"#fca5a5":"#86efac"}}>{DA(st.eTTC-st.cTTC)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <button className="btn-add-row" onClick={()=>addRow(secId)}>＋ Ajouter une ligne</button>
      </div>
    );
  }

  /* ════ RECAP VIEW ════ */
  if(view==="recap"){
    return (
      <div className="app dark">
        <div className="topbar" style={{background:"#0a1628",borderBottom:"3px solid #3b82f6"}}>
          <button className="btn-back" onClick={()=>setView("home")}><span>←</span> Retour</button>
          <div className="topbar-center"><span className="topbar-icon">📊</span><span className="topbar-title">Récapitulatif Général</span></div>
          <div className="topbar-right">
            <button className="btn-action export" onClick={exportXLS}>📊 Excel</button>
            <button className="btn-action print"  onClick={()=>window.print()}>🖨️ Print</button>
            <button className="btn-save" onClick={save}>{saved?"✓ Sauvegardé":"💾 Sauvegarder"}</button>
          </div>
        </div>

        <div className="recap-wrap">
          <div className="recap-info-row">
            <span className="recap-pname">{pName}</span>
            {pRef&&<span className="recap-badge">{pRef}</span>}
            <span className="recap-date">📅 {pDate}</span>
          </div>

          {/* Frais divers */}
          <div className="frais-panel">
            <div className="frais-panel-title">⚙️ FRAIS DIVERS &amp; IMPÔTS ET TAXES</div>
            <div className="frais-panel-grid">
              {[["eHT","Engagé HT"],["cHT","Consommé HT"],["eTTC","Engagé TTC"],["cTTC","Consommé TTC"]].map(([k,lbl])=>(
                <div key={k} className="frais-field">
                  <label className="frais-lbl">{lbl}</label>
                  <input type="number" className="frais-inp" value={frais[k]}
                    onChange={e=>setFrais(p=>({...p,[k]:e.target.value}))} placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          {/* recap table */}
          <div className="tbl-scroll">
            <table className="recap-tbl">
              <thead>
                <tr>
                  <th className="th-idx">N°</th>
                  <th className="th-rubrique">RUBRIQUE</th>
                  <th className="th-num">ENGAGÉ HT</th>
                  <th className="th-num">CONSOMMÉ HT</th>
                  <th className="th-num">ÉCART HT</th>
                  <th className="th-num">ENGAGÉ TTC</th>
                  <th className="th-num">CONSOMMÉ TTC</th>
                  <th className="th-num">ÉCART TTC</th>
                  <th className="th-pct">RATIO CONSO</th>
                  <th className="th-pct">% ENGAG</th>
                  <th className="th-pct">% CONSO</th>
                </tr>
              </thead>
              <tbody>
                {RECAP_ROWS.map((row,i)=>{
                  const t=tots[row.rk]||{eHT:0,cHT:0,eTTC:0,cTTC:0};
                  const eHT=t.eHT-t.cHT; const eTTC=t.eTTC-t.cTTC;
                  const r1=t.eHT?(t.cHT/t.eHT*100).toFixed(1)+"%":"—";
                  const r2=gen.eHT?(t.eHT/gen.eHT*100).toFixed(1)+"%":"—";
                  const r3=gen.cHT?(t.cHT/gen.cHT*100).toFixed(1)+"%":"—";
                  const cls=row.grand?"tr-grand":row.tot?"tr-sub":row.manual?"tr-manual":i%2===0?"tr-a":"tr-b";
                  const fg=(row.tot||row.grand)?"#fff":"#e2e8f0";
                  const bg=row.grand?"#0a1628":row.tot?row.bg:row.manual?"#1c1a14":i%2===0?"#1e293b":"#162032";
                  return (
                    <tr key={row.rk} style={{background:bg}}>
                      <td className="td-idx" style={{color:fg}}>{i+1}</td>
                      <td className="td-rubrique" style={{color:fg,fontWeight:row.tot||row.grand?700:400,paddingLeft:row.indent?28:12}}>{row.label}</td>
                      <td className="td-num" style={{color:fg}}>{DA(t.eHT)}</td>
                      <td className="td-num" style={{color:fg}}>{DA(t.cHT)}</td>
                      <td className="td-num" style={{color:eHT<0?"#f87171":row.tot||row.grand?"#86efac":"#4ade80"}}>{DA(eHT)}</td>
                      <td className="td-num" style={{color:fg}}>{DA(t.eTTC)}</td>
                      <td className="td-num" style={{color:fg}}>{DA(t.cTTC)}</td>
                      <td className="td-num" style={{color:eTTC<0?"#f87171":row.tot||row.grand?"#86efac":"#4ade80"}}>{DA(eTTC)}</td>
                      <td className="td-pct" style={{color:fg}}>{r1}</td>
                      <td className="td-pct" style={{color:fg}}>{r2}</td>
                      <td className="td-pct" style={{color:fg}}>{r3}</td>
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

  /* ════ HOME VIEW ════ */
  return (
    <div className="app dark">
      {/* header */}
      <div className="home-hdr">
        <div className="home-hdr-left">
          <div className="home-logo">🏗️</div>
          <div className="home-hdr-info">
            <input className="home-pname" value={pName} onChange={e=>setPName(e.target.value)} placeholder="Nom du projet" />
            <div className="home-meta-row">
              <input className="home-meta" placeholder="Référence" value={pRef}  onChange={e=>setPRef(e.target.value)} />
              <input className="home-meta" type="date"              value={pDate} onChange={e=>setPDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="home-hdr-right">
          <label className="btn-hdr import-btn" title="Importer depuis Excel (modèle fourni)">
            📥 Import Excel
            <input type="file" accept=".xlsx,.xls" onChange={importXLS} style={{display:"none"}} />
          </label>
          <button className="btn-hdr export-btn" onClick={exportXLS}>📊 Export</button>
          <button className="btn-hdr recap-btn"  onClick={()=>setView("recap")}>📊 Récap</button>
          <button className="btn-hdr proj-btn"   onClick={()=>setProjOpen(p=>!p)}>📂 Projets</button>
          <button className="btn-hdr new-btn"    onClick={newProj}>＋ Nouveau</button>
          <button className="btn-hdr save-btn"   onClick={save}>{saved?"✓ OK":"💾 Sauver"}</button>
        </div>
      </div>

      {/* import message */}
      {importMsg && <div className="import-toast">{importMsg}</div>}

      {/* projects panel */}
      {projOpen && (
        <div className="proj-panel">
          <div className="proj-panel-title">📂 PROJETS SAUVEGARDÉS</div>
          {projects.length===0&&<p className="proj-empty">Aucun projet</p>}
          {projects.map(p=>(
            <div key={p} className="proj-item">
              <button className="proj-load" onClick={()=>loadProj(p)}>{p}</button>
              <button className="proj-del"  onClick={()=>delProj(p)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {/* global totals */}
      <div className="home-totals">
        {[
          {l:"Total Engagé HT",     v:gen.eHT,          c:"#60a5fa"},
          {l:"Total Consommé HT",   v:gen.cHT,           c:"#34d399"},
          {l:"Reste à Conso HT",    v:gen.eHT-gen.cHT,   c:gen.eHT-gen.cHT<0?"#f87171":"#a3e635"},
          {l:"Total Engagé TTC",    v:gen.eTTC,          c:"#c084fc"},
          {l:"Total Consommé TTC",  v:gen.cTTC,          c:"#f472b6"},
        ].map(c=>(
          <div key={c.l} className="home-tot-card">
            <div className="htc-lbl">{c.l}</div>
            <div className="htc-val" style={{color:c.c}}>{DA(c.v)} <span className="htc-unit">DA</span></div>
          </div>
        ))}
      </div>

      {/* groups */}
      <div className="home-groups">
        {GROUPS.map(grp=>{
          const gt=grp.secs.reduce((a,s)=>{const t=secTot(s.id);return{eHT:a.eHT+t.eHT,cHT:a.cHT+t.cHT,eTTC:a.eTTC+t.eTTC,cTTC:a.cTTC+t.cTTC};},{eHT:0,cHT:0,eTTC:0,cTTC:0});
          const pct = gt.eHT ? Math.min((gt.cHT/gt.eHT)*100,100) : 0;
          return (
            <div key={grp.id} className="grp-card" style={{"--gc":grp.color,"--glow":grp.glow}}>
              <div className="grp-hdr">
                <span className="grp-icon">{grp.icon}</span>
                <div className="grp-hdr-info">
                  <div className="grp-title"><span className="grp-num">{grp.num}</span>{grp.label}</div>
                  <div className="grp-tots">
                    <span>Engagé HT : <strong>{DA(gt.eHT)}</strong></span>
                    <span>Consommé HT : <strong>{DA(gt.cHT)}</strong></span>
                    <span>TTC Engagé : <strong>{DA(gt.eTTC)}</strong></span>
                  </div>
                </div>
                {/* progress bar */}
                <div className="grp-progress-wrap">
                  <div className="grp-progress-bar">
                    <div className="grp-progress-fill" style={{width:`${pct}%`,background:grp.glow}}></div>
                  </div>
                  <span className="grp-pct">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grp-secs">
                {grp.secs.map(sec=>{
                  const st=secTot(sec.id);
                  const hasDt=(rows[sec.id]||[]).some(r=>r.eHT||r.designation);
                  const p2=st.eHT?(st.cHT/st.eHT*100):0;
                  return (
                    <button key={sec.id} className={`sec-card ${hasDt?"filled":""}`}
                      onClick={()=>{setSecId(sec.id);setView("sec");}}>
                      <div className="sc-top">
                        <span className="sc-label">{sec.label}</span>
                        {hasDt&&<span className="sc-check">✓</span>}
                      </div>
                      <div className="sc-nums">
                        <div className="sc-num-item"><span>EHT</span><strong style={{color:"#60a5fa"}}>{DA(st.eHT)}</strong></div>
                        <div className="sc-num-item"><span>CHT</span><strong style={{color:"#34d399"}}>{DA(st.cHT)}</strong></div>
                        <div className="sc-num-item"><span>ETTC</span><strong style={{color:"#c084fc"}}>{DA(st.eTTC)}</strong></div>
                      </div>
                      <div className="sc-progress">
                        <div className="sc-prog-bar"><div className="sc-prog-fill" style={{width:`${Math.min(p2,100)}%`}}></div></div>
                        <span className="sc-prog-pct">{p2.toFixed(1)}% consommé</span>
                      </div>
                      <div className="sc-open">Ouvrir et saisir →</div>
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
