"use strict";
/* ==========================================================================
   state.js — mémoire du téléphone, types de journée, règles, statistiques
   ========================================================================== */
const store = {
  get(k, def) { try { const v = localStorage.getItem("monplan." + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem("monplan." + k, JSON.stringify(v)); } catch {} }
};
const CATS_DEFAUT = ["Étude","Revue","Sport"];
const state = {
  dayType: store.get("dayType", {}),             // { "2026-10-26": "pleine" | "semi" | "libre" }
  done: store.get("done", {}),                   // { "2026-10-26|0-1020": true }
  days: store.get("days", {}),                   // historique : un résumé par jour
  sel: store.get("sel", {}),                     // { "2026-10-26": { "0-1020": true|false } } : tâches du plan choisies / retirées
  custom: store.get("custom", {}),               // { "2026-10-26": [ {id, act, cat, dom, min} ] } : tâches ajoutées à la main
  reviews: store.get("reviews", {}),             // bilans hebdomadaires
  fired: store.get("fired", {}),                 // rappels déjà envoyés
  first: store.get("first", iso(aujourdhui())),  // premier jour d'utilisation
  settings: Object.assign({ remind: true, lead: 5, sound: "carillon", volume: 0.7, vibrate: true, cats: CATS_DEFAUT, icsCats: ["Étude","Revue","Sport","Marche","Admin"] }, store.get("settings", {}))
};
const save = () => { ["dayType","done","days","sel","custom","reviews","fired","settings","first"].forEach(k => store.set(k, state[k])); };
const ui = { tab: "today", date: aujourdhui(), day: jourIdx(new Date()), week: lundiDe(new Date()), open: null, periode: 12, filtre: "all", histOpen: null, sheet: null, sheetDismissed: false };

/* ---------- Types de journée ---------- */
const TYPES = {
  pleine: { nom: "Pleine journée", court: "Pleine", col: "#2F5D9E", desc: "Tout le planning : cours, études, sport." },
  semi:   { nom: "Semi-travail", court: "Semi", col: "#C9A227", desc: "L'essentiel seulement : cours et blocs prioritaires." },
  libre:  { nom: "Journée libre", court: "Libre", col: "#2E7D5B", desc: "Pas de cours ni d'études : repos, famille. Sport et marche facultatifs." }
};
const LIBRE_VISIBLES = new Set(["Sommeil","Routine","Repas","Récupération","Marche","Sport","Famille","Libre","Tampon","Admin"]);
const typeDe = date => state.dayType[iso(date)] || "pleine";

/* ---------- Règles du planning ---------- */
const dur = b => b.e - b.s;
const blocsDuJour = d => PLAN.blocks.filter(b => b.d === d).sort((a, b) => a.s - b.s);
// visible : le bloc apparaît-il dans la frise ? (en journée libre, cours et études sont masqués)
const visible = (b, t) => t !== "libre" || LIBRE_VISIBLES.has(b.cat);
// actif : le bloc est-il gardé dans ce type de journée ? (champ "mode" du bloc : A = pleine, B = semi)
const actif = (b, t) => t === "libre" ? visible(b, t) : b.mode.includes(t === "semi" ? "B" : "A");
const facultatif = (b, t) => t === "libre" && ["Sport","Marche","Admin"].includes(b.cat);
const planifie = (b, t) => visible(b, t) && actif(b, t) && !facultatif(b, t);
const cle = (date, b) => iso(date) + "|" + b.id;
const fait = (date, b) => !!state.done[cle(date, b)];

/* ---------- Tâches du jour : proposées par le planning + choisies/ajoutées à la main ---------- */
const MATIERES = [...DOMAINES, "Sport", "Admin", "Autre"];
const catDe = m => DOMAINES.includes(m) ? "Étude" : m === "Sport" ? "Sport" : m === "Admin" ? "Admin" : "Autre";
const tacheDeBloc = b => ({ id: b.id, act: b.act, cat: b.cat, dom: b.dom || "", min: dur(b), s: b.s, custom: false, ex: b.ex });
// propositions : tout ce que le planning de ce jour de semaine propose de « cochable »
const propositions = date => blocsDuJour(jourIdx(date)).filter(b => SUIVIS.has(b.cat)).map(tacheDeBloc);
const choisie = (date, tk) => { const o = (state.sel[iso(date)] || {})[tk.id]; if (o !== undefined) return o;
  const b = PLAN.blocks.find(x => x.id === tk.id); return !!b && planifie(b, typeDe(date)); };
const ajoutees = date => (state.custom[iso(date)] || []).map(c => Object.assign({ custom: true, s: null }, c));
const tachesDuJour = date => propositions(date).filter(tk => choisie(date, tk)).concat(ajoutees(date));
const etudePrevue = (d, t) => tachesDuJour(ajouteJours(lundiDe(aujourdhui()), d)).filter(k => ETUDE.has(k.cat)).reduce((s, k) => s + k.min, 0);

/* ---------- Statistiques d'un jour / d'une semaine ---------- */
function stats(date) {
  const t = typeDe(date), r = { t, pp: 0, pd: 0, tp: 0, td: 0, sp: 0, sd: 0, sport: 0, by: {}, faits: [], tasks: [] };
  tachesDuJour(date).forEach(k => {
    const f = fait(date, k);
    r.pp += k.min; r.tp++; if (f) { r.pd += k.min; r.td++; r.faits.push(k); }
    if (ETUDE.has(k.cat)) { r.sp += k.min; if (f) r.sd += k.min; }
    if (f && k.cat === "Étude") r.by[k.dom] = (r.by[k.dom] || 0) + k.min;
    if (f && k.cat === "Sport") r.sport++;
    r.tasks.push({ id: k.id, act: k.act, cat: k.cat, dom: k.dom || "", min: k.min, h: k.s == null ? "" : hhmm(k.s), ok: f ? 1 : 0, src: k.custom ? "Ajoutée" : "Plan" });
  });
  r.pct = r.pp ? Math.round(100 * r.pd / r.pp) : null;
  return r;
}
function semaineStats(lundi) {
  const par = {}, prevu = {}; DOMAINES.forEach(x => { par[x] = 0; prevu[x] = 0; });
  let sport = 0, sportPrevu = 0, pp = 0, pd = 0; const types = { pleine: 0, semi: 0, libre: 0 };
  for (let i = 0; i < 7; i++) {
    const date = ajouteJours(lundi, i); types[typeDe(date)]++;
    tachesDuJour(date).forEach(k => {
      const f = fait(date, k);
      if (k.cat === "Étude" && k.dom in prevu) { prevu[k.dom] += k.min; if (f) par[k.dom] += k.min; }
      if (k.cat === "Sport") { sportPrevu++; if (f) sport++; }
      pp += k.min; if (f) pd += k.min;
    });
  }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  return { par, prevu, sport, sportPrevu, pp, pd, pct: pp ? Math.round(100 * pd / pp) : null, totalFait: sum(par), totalPrevu: sum(prevu), types };
}
// Historique : un « instantané » de chaque jour (y compris la liste des tâches et leur statut Oui/Non).
function snap(date) {
  if (date < DEBUT_PLAN) return;
  const k = iso(date), s = stats(date), old = state.days[k] || {};
  state.days[k] = { t: s.t, pp: s.pp, pd: s.pd, tp: s.tp, td: s.td, sp: s.sp, sd: s.sd, sport: s.sport, by: s.by, tasks: s.tasks, mood: old.mood ?? null, note: old.note || "" };
}
function completerHistorique() {
  const depart = parseIso(state.first) > DEBUT_PLAN ? parseIso(state.first) : DEBUT_PLAN;
  for (let d = depart; d <= aujourdhui(); d = ajouteJours(d, 1)) { const e = state.days[iso(d)]; if (!e || (!e.tasks && d < aujourdhui())) snap(d); }
}
const joursEcoules = () => Object.keys(state.days).sort().filter(k => parseIso(k) <= aujourdhui());

/* ---------- Bilan hebdomadaire et alertes (mêmes règles que le classeur Excel) ---------- */
const alerte = r => !!r && (r.fatigue >= 4 || r.stress >= 4 || (r.sommeil !== "" && r.sommeil != null && r.sommeil < 7));
function recommandation(lundi) {
  const r = state.reviews[iso(lundi)]; if (!r) return null;
  if (!alerte(r)) return { cls: "ok", niveau: 0, txt: "Tout va bien : continue ton rythme." };
  if (alerte(state.reviews[iso(ajouteJours(lundi, -7))])) return { cls: "bad", niveau: 2, txt: "Deux semaines d'alerte de suite : prévois des journées libres (récupération) cette semaine." };
  return { cls: "warn", niveau: 1, txt: "Alerte : privilégie des journées « semi-travail » la semaine suivante." };
}
const typeSuggere = () => { const r = recommandation(ajouteJours(lundiDe(new Date()), -7)); return r ? ["pleine","semi","libre"][r.niveau] : "pleine"; };
