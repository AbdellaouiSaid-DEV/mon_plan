"use strict";
/* ==========================================================================
   app.js — affichage, événements, démarrage  (Mon Plan v2.2)
   Les autres fichiers : utils.js · state.js · charts.js · notify.js · views.js
   ========================================================================== */
const paramTab = new URLSearchParams(location.search).get("tab");
if (paramTab === "review") { ui.tab = "history"; ui.hseg = "bilans"; }
else if (ONGLETS.some(o => o[0] === paramTab)) ui.tab = paramTab;

function telecharger(nom, contenu, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([contenu], { type })); a.download = nom;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
let toastTimer;
function toast(msg, actionTxt, action) {
  const t = $("#toast"); t.innerHTML = `<span>${esc(msg)}</span>` + (actionTxt ? `<button id="toast-act">${esc(actionTxt)}</button>` : "");
  t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, actionTxt ? 12000 : 2600);
  if (actionTxt) $("#toast-act").onclick = () => { t.hidden = true; action(); };
}
function render() {
  const v = { today: vueAujourdhui, week: vueSemaine, progress: vueProgres, history: vueHistorique, settings: vueReglages }[ui.tab]();
  $("#sub").textContent = v.sub;
  const pick = ui.tab === "today" && ui.sheet === "tasks";
  const aOuvrir = pick || (ui.tab === "today" && estAuj(ui.date) && state.dayType[iso(ui.date)] === undefined && !ui.sheetDismissed);
  const sc = $("#sheet .sheet") ? $("#sheet .sheet").scrollTop : 0;
  $("#view").innerHTML = v.html;
  $("#sheet").innerHTML = pick ? feuilleTaches() : aOuvrir ? feuilleType() : ""; $("#sheet").hidden = !aOuvrir;
  if (pick && $("#sheet .sheet")) $("#sheet .sheet").scrollTop = sc;
  $("#tabs").innerHTML = ONGLETS.map(([k, n]) => `<button data-tab="${k}" class="${ui.tab === k ? "on" : ""}" ${ui.tab === k ? 'aria-current="page"' : ""}>${icone(k === "today" ? "today" : k)}<span>${n}</span></button>`).join("");
}
function ajouterTache(act, mat, min) {
  const k = iso(ui.date); (state.custom[k] ||= []).push({ id: "c" + Date.now().toString(36) + Math.floor(Math.random() * 99), act, cat: catDe(mat), dom: DOMAINES.includes(mat) ? mat : "", min: +min });
  snap(ui.date); save();
}
function changerType(date, t) { state.dayType[iso(date)] = t; snap(date); save(); }

document.addEventListener("click", e => {
  if (e.target.closest("#rappel-ok")) { $("#rappel").hidden = true; return; }
  const t = e.target.closest("[data-tab],[data-type],[data-pick],[data-day],[data-dshift],[data-weekshift],[data-open],[data-per],[data-hseg],[data-hopen],[data-goday],[data-picker],[data-closesheet],[data-quick],[data-delcustom],#export-xlsx,#askperm,#testson,#export-ics,#export-json,#import-json,#reset,#install"); if (!t) return;
  if (e.target.closest("label,input,select,textarea")) return;
  if (t.dataset.tab) { ui.tab = t.dataset.tab; ui.sheet = null; window.scrollTo(0, 0); }
  else if (t.dataset.picker !== undefined) ui.sheet = "tasks";
  else if (t.dataset.closesheet !== undefined) ui.sheet = null;
  else if (t.dataset.quick) ajouterTache("Révision " + t.dataset.quick, t.dataset.quick, 30);
  else if (t.dataset.delcustom) { const k = iso(ui.date); state.custom[k] = (state.custom[k] || []).filter(c => c.id !== t.dataset.delcustom); delete state.done[k + "|" + t.dataset.delcustom]; snap(ui.date); save(); }
  else if (t.id === "export-xlsx") { exporterExcel(); return; }
  else if (t.dataset.pick) { changerType(aujourdhui(), t.dataset.pick); ui.sheetDismissed = true; }
  else if (t.dataset.type) { changerType(ui.tab === "week" ? ajouteJours(ui.week, ui.day) : ui.date, t.dataset.type); }
  else if (t.dataset.day) ui.day = +t.dataset.day;
  else if (t.dataset.dshift) { const n = ajouteJours(ui.date, +t.dataset.dshift); ui.date = n; ui.sheetDismissed = true; }
  else if (t.dataset.weekshift) ui.week = ajouteJours(ui.week, 7 * +t.dataset.weekshift);
  else if (t.dataset.open) ui.open = ui.open === t.dataset.open ? null : t.dataset.open;
  else if (t.dataset.per !== undefined) ui.periode = +t.dataset.per;
  else if (t.dataset.hseg) ui.hseg = t.dataset.hseg;
  else if (t.dataset.hopen) { if (e.target.closest(".det")) return; ui.histOpen = ui.histOpen === t.dataset.hopen ? null : t.dataset.hopen; }
  else if (t.dataset.goday) { ui.date = parseIso(t.dataset.goday); ui.sheetDismissed = true; ui.tab = "today"; window.scrollTo(0, 0); }
  else if (t.id === "askperm") { Notification.requestPermission().then(render); return; }
  else if (t.id === "testson") { jouerSon(); vibrer(); const b = prochaineTache() || { s: 0, act: "Exemple de rappel", id: "x" }; afficheBanniere(b, state.settings.lead); envoyerNotif(b, state.settings.lead); return; }
  else if (t.id === "export-ics") { telecharger("mon-plan.ics", construireICS(), "text/calendar"); toast("Calendrier téléchargé : ouvre-le avec Google Agenda"); return; }
  else if (t.id === "export-json") { telecharger("mon-plan-sauvegarde.json", JSON.stringify({ v: 3, dayType: state.dayType, sel: state.sel, custom: state.custom, done: state.done, days: state.days, reviews: state.reviews, settings: state.settings, first: state.first }), "application/json"); return; }
  else if (t.id === "import-json") { $("#file-json").click(); return; }
  else if (t.id === "reset") { if (confirm("Effacer toutes les données (cases cochées, journées, bilans) ?")) { state.dayType = {}; state.sel = {}; state.custom = {}; state.done = {}; state.days = {}; state.reviews = {}; state.fired = {}; save(); } else return; }
  else if (t.id === "install" && installEvt) { installEvt.prompt(); installEvt = null; return; }
  render();
});
document.addEventListener("change", e => {
  const t = e.target, s = state.settings;
  if (t.dataset.done) {
    if (t.checked) state.done[t.dataset.done] = true; else delete state.done[t.dataset.done];
    snap(parseIso(t.dataset.done.split("|")[0])); save(); render();
  }
  else if (t.dataset.sel) { const k = iso(ui.date); (state.sel[k] ||= {})[t.dataset.sel] = t.checked; snap(ui.date); save(); render(); }
  else if (t.id === "remind") { s.remind = t.checked; save(); if (t.checked && "Notification" in window && Notification.permission === "default") Notification.requestPermission().then(render); else render(); }
  else if (t.id === "lead") { s.lead = +t.value; save(); render(); }
  else if (t.id === "sound") { s.sound = t.value; save(); jouerSon(t.value, 1); }
  else if (t.id === "volume") { s.volume = +t.value; save(); jouerSon(s.sound, 1); }
  else if (t.id === "vibrate") { s.vibrate = t.checked; save(); if (t.checked) vibrer(); }
  else if (t.dataset.rcat) { s.cats = t.checked ? [...new Set([...s.cats, t.dataset.rcat])] : s.cats.filter(c => c !== t.dataset.rcat); save(); }
  else if (t.dataset.icscat) { s.icsCats = t.checked ? [...new Set([...s.icsCats, t.dataset.icscat])] : s.icsCats.filter(c => c !== t.dataset.icscat); save(); }
  else if (t.dataset.note) { (state.days[t.dataset.note] ||= {}).note = t.value; save(); }
  else if (t.id === "file-json" && t.files[0]) {
    t.files[0].text().then(txt => { try { const d = JSON.parse(txt);
      state.dayType = d.dayType || {}; state.sel = d.sel || {}; state.custom = d.custom || {}; state.done = d.done || {}; state.days = d.days || {}; state.reviews = d.reviews || {}; state.first = d.first || state.first;
      state.settings = Object.assign(state.settings, d.settings || {}); save(); render(); toast("Sauvegarde importée ✔"); } catch { toast("Fichier non valide"); } });
  }
});
document.addEventListener("submit", e => {
  if (e.target.id === "bilan") { e.preventDefault(); enregistrerBilan(e.target); }
  else if (e.target.id === "addtask") { e.preventDefault(); const fd = new FormData(e.target), act = String(fd.get("act")).trim(); if (act) { ajouterTache(act, fd.get("mat"), fd.get("min")); render(); } }
});
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if (ui.tab === "settings") render(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); } });
setInterval(() => { if (ui.tab === "today" && !document.hidden && !document.activeElement.matches("input,textarea,select") && $("#sheet").hidden) render(); }, 60000);

if ("serviceWorker" in navigator) {
  let avait = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (avait) toast("Nouvelle version installée", "Recharger", () => location.reload()); avait = true; });
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
completerHistorique(); save();
render(); verifierRappels();
