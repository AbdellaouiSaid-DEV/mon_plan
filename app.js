"use strict";
/* ==========================================================================
   Mon Plan 2026-27 — application locale (PWA), sans framework.
   Organisation du fichier :
     1. Constantes et petits outils
     2. Stockage (localStorage = mémoire du téléphone)
     3. Règles du planning (modes A/B/C, heures prévues)
     4. Écrans : Aujourd'hui, Semaine, Bilan, Réglages
     5. Rappels et export calendrier (.ics)
     6. Démarrage
   ========================================================================== */

/* ---------- 1. Constantes et outils ---------- */
const JOURS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const JOURS_COURTS = ["L","M","M","J","V","S","D"];
const DEBUT_PLAN = new Date(2026, 9, 26);            // lundi 26 octobre 2026 (mois 0-11 : 9 = octobre)
const FIN_PLAN_ICS = "20270630T230000Z";
const SUIVIS = new Set(["Étude","Revue","Sport","Marche","Admin"]);   // blocs qu'on peut cocher
const ETUDE = new Set(["Étude","Revue"]);
const DOMAINES = ["Maths","Physique","Informatique","Web-business","Prépa pro","Anglais","Espagnol","Français"];
const $ = (s, el = document) => el.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const hhmm = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const jourIdx = d => (d.getDay() + 6) % 7;            // lundi = 0 … dimanche = 6
const lundiDe = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - jourIdx(x)); return x; };
const ajouteJours = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const dateFr = d => JOURS[jourIdx(d)] + " " + d.getDate() + "/" + pad(d.getMonth() + 1);
const heures = min => (min / 60).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " h";

/* ---------- 2. Stockage ---------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem("monplan." + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem("monplan." + k, JSON.stringify(v)); } catch {} }
};
const state = {
  mode: store.get("mode", "A"),
  done: store.get("done", {}),                 // { "2026-10-26|0-1020": true }
  reviews: store.get("reviews", {}),           // { "2026-10-26": {...} }
  settings: store.get("settings", { remind: false, lead: 10, remindCats: ["Étude","Revue","Sport"], icsCats: ["Étude","Revue","Sport","Marche","Admin"] })
};
const save = () => { store.set("mode", state.mode); store.set("done", state.done); store.set("reviews", state.reviews); store.set("settings", state.settings); };
const ui = { tab: "today", day: jourIdx(new Date()), week: lundiDe(new Date()), open: null };

/* ---------- 3. Règles du planning ---------- */
const dur = b => b.e - b.s;
const blocsDuJour = d => PLAN.blocks.filter(b => b.d === d).sort((a, b) => a.s - b.s);
// Un bloc est actif dans un mode si son champ "mode" contient la lettre du mode (A, B ou C).
const actif = (b, mode = state.mode) => b.mode.includes(mode);
// Mode C : sport et marche deviennent facultatifs (à faire seulement si on se sent bien).
const facultatif = (b, mode = state.mode) => mode === "C" && (b.cat === "Sport" || b.cat === "Marche");
const prevuSemaine = (mode = state.mode) => {
  const par = Object.fromEntries(DOMAINES.map(d => [d, 0])); let revue = 0;
  PLAN.blocks.forEach(b => { if (b.cat === "Étude" && actif(b, mode)) par[b.dom] += dur(b); if (b.cat === "Revue" && actif(b, mode)) revue += dur(b); });
  return { par, total: Object.values(par).reduce((a, b) => a + b, 0), revue };
};
const cle = (date, b) => iso(date) + "|" + b.id;
const fait = (date, b) => !!state.done[cle(date, b)];

/* ---------- 4a. Écran « Aujourd'hui » ---------- */
function vueAujourdhui() {
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), d = jourIdx(now);
  const tous = blocsDuJour(d), blocs = tous.filter(b => b.cat !== "Sommeil");
  const courant = tous.find(b => b.s <= nowMin && nowMin < b.e);
  const etudeJour = blocs.filter(b => ETUDE.has(b.cat) && actif(b));
  const prevu = etudeJour.reduce((s, b) => s + dur(b), 0);
  const realise = etudeJour.filter(b => fait(now, b)).reduce((s, b) => s + dur(b), 0);
  const pct = prevu ? Math.round(100 * realise / prevu) : 0;
  const avantDebut = now < DEBUT_PLAN;
  let h = "";
  if (avantDebut) h += `<div class="alert warn">Le plan démarre le lundi 26/10/2026. Ceci est un aperçu du ${JOURS[d].toLowerCase()}.</div>`;
  h += `<div class="seg" role="group" aria-label="Mode">` + ["A","B","C"].map(m => `<button data-mode="${m}" class="${state.mode === m ? "on" : ""}">Mode ${m}</button>`).join("") + `</div>`;
  h += `<div class="mute">${{A:"Journée pleine : tout le planning.",B:"Capacité réduite : on garde l'essentiel (≈ 12 h d'étude par semaine).",C:"Récupération : aucune étude, sport et marche facultatifs."}[state.mode]}</div>`;
  if (courant) {
    const ex = courant.ex ? PLAN.exec[courant.ex] : null;
    h += `<div class="card now"><div class="mute">Maintenant · ${hhmm(courant.s)}–${hhmm(courant.e)}</div><div class="h">${esc(courant.act)}</div>` +
         `<div>${esc(courant.det)}</div>` + (courant.liv && courant.liv !== "—" ? `<div class="mute">Livrable : ${esc(courant.liv)}</div>` : "") +
         (ex ? etapes(ex, nowMin - courant.s) : "") + `</div>`;
  }
  h += `<div class="card"><div class="row"><div class="grow"><div class="h">Étude du jour</div><div class="mute">${heures(realise)} faites sur ${heures(prevu)} prévues</div></div><b>${pct} %</b></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  h += blocs.map(b => ligneBloc(b, now, nowMin, true)).join("");
  const reveil = tous[0].e, coucher = tous[tous.length - 1].s;
  h += `<div class="card mute">Lever ${hhmm(reveil)} · Coucher ${hhmm(coucher)} (lumière éteinte).</div>`;
  return { sub: dateFr(now) + " · Mode " + state.mode, html: h };
}
function etapes(ex, ecoule) {
  return `<div class="det"><b>Déroulé</b><ol>` + ex.steps.map(([a, b, t]) => `<li class="${ecoule >= a && ecoule < b ? "step-on" : ""}"><span class="mute">${a}–${b} min</span><span>${esc(t)}</span></li>`).join("") + `</ol></div>`;
}
function ligneBloc(b, date, nowMin, cochable) {
  const c = PLAN.cats[b.cat], off = !actif(b), opt = facultatif(b);
  const estAujourdhui = iso(date) === iso(new Date());
  const cur = estAujourdhui && b.s <= nowMin && nowMin < b.e, past = estAujourdhui && b.e <= nowMin;
  const ex = b.ex ? PLAN.exec[b.ex] : null, ouvert = ui.open === b.id + iso(date);
  const coche = cochable && SUIVIS.has(b.cat) && !off;
  return `<div class="block ${cur ? "cur" : ""} ${past ? "past" : ""} ${off ? "off" : ""} ${opt ? "opt" : ""}" style="border-left-color:${c.bg}" data-open="${b.id}${iso(date)}">` +
    `<div class="row">` +
    (coche ? `<input type="checkbox" class="chk" data-done="${cle(date, b)}" ${fait(date, b) ? "checked" : ""} aria-label="Fait">` : "") +
    `<div class="grow"><div class="t">${hhmm(b.s)}–${hhmm(b.e)} · ${heures(dur(b))} · ${esc(b.cat)}${opt ? " · facultatif" : ""}${off ? " · non retenu en mode " + state.mode : ""}</div><div class="a">${esc(b.act)}</div></div></div>` +
    (ouvert ? `<div class="det">${esc(b.det)}${b.liv && b.liv !== "—" ? `<div class="mute">Livrable : ${esc(b.liv)}</div>` : ""}${ex ? etapes(ex, cur ? nowMin - b.s : -1) : ""}</div>` : "") + `</div>`;
}

/* ---------- 4b. Écran « Semaine » ---------- */
function vueSemaine() {
  const d = ui.day, date = ajouteJours(lundiDe(new Date()), d);
  const blocs = blocsDuJour(d).filter(b => b.cat !== "Sommeil");
  const parCat = {}; blocsDuJour(d).forEach(b => { if (actif(b)) parCat[b.cat] = (parCat[b.cat] || 0) + dur(b); });
  const p = prevuSemaine();
  const sommeil = PLAN.blocks.filter(b => b.cat === "Sommeil").reduce((s, b) => s + dur(b), 0) / 7;
  let h = `<div class="days">` + JOURS_COURTS.map((j, i) => `<button data-day="${i}" class="${i === d ? "on" : ""} ${i === jourIdx(new Date()) ? "today" : ""}">${j}</button>`).join("") + `</div>`;
  h += `<div class="card"><div class="h">${JOURS[d]}</div>` + Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([c, m]) => `<span class="chip" style="background:${PLAN.cats[c].bg};color:${PLAN.cats[c].fg}">${esc(c)} ${heures(m)}</span>`).join("") + `</div>`;
  h += blocs.map(b => ligneBloc(b, date, -1, false)).join("");
  h += `<div class="card"><div class="h">Semaine en mode ${state.mode}</div><div class="grid">` +
    `<span>Étude prévue</span><b>${heures(p.total)}</b><span>Revue</span><b>${heures(p.revue)}</b><span>Sommeil moyen</span><b>${sommeil.toFixed(2).replace(".", ",")} h</b></div>` +
    `<div style="margin-top:8px">` + DOMAINES.filter(x => p.par[x]).map(x => `<span class="chip">${esc(x)} ${heures(p.par[x])}</span>`).join("") + `</div></div>`;
  return { sub: "Semaine type · Mode " + state.mode, html: h };
}

/* ---------- 4c. Écran « Bilan » ---------- */
function heuresFaites(lundi) {
  const par = Object.fromEntries(DOMAINES.map(d => [d, 0])); let sport = 0;
  for (let i = 0; i < 7; i++) {
    const date = ajouteJours(lundi, i);
    blocsDuJour(i).forEach(b => { if (fait(date, b)) { if (b.cat === "Étude") par[b.dom] += dur(b); if (b.cat === "Sport") sport++; } });
  }
  return { par, total: Object.values(par).reduce((a, b) => a + b, 0), sport };
}
// Mêmes règles d'alerte que dans le classeur Excel.
function alerte(r) { return !!r && (r.fatigue >= 4 || r.stress >= 4 || (r.sommeil !== "" && r.sommeil !== null && r.sommeil < 7)); }
function recommandation(lundi) {
  const k = iso(lundi), r = state.reviews[k]; if (!r) return null;
  const prec = state.reviews[iso(ajouteJours(lundi, -7))];
  if (!alerte(r)) return { cls: "ok", txt: "✔ Tout va bien : continue en mode " + r.mode + "." };
  if (alerte(prec)) return { cls: "bad", txt: "⚠ 2 semaines d'alerte de suite : passe en MODE C (récupération) cette semaine." };
  return { cls: "warn", txt: "⚠ Alerte : passe en MODE B (capacité réduite) la semaine prochaine." };
}
function vueBilan() {
  const lundi = ui.week, k = iso(lundi), r = state.reviews[k] || {};
  const f = heuresFaites(lundi), mode = r.mode || state.mode, p = prevuSemaine(mode);
  const pct = p.total ? Math.round(100 * f.total / p.total) : 0;
  const rec = recommandation(lundi);
  let h = `<div class="wk"><button data-weekshift="-1" aria-label="Semaine précédente">◀</button><div class="grow" style="text-align:center"><b>Semaine du ${lundi.getDate()}/${pad(lundi.getMonth() + 1)}</b></div><button data-weekshift="1" aria-label="Semaine suivante">▶</button></div>`;
  h += `<div class="card"><div class="h">Heures faites (cases cochées)</div><div class="grid">` +
    DOMAINES.map(x => `<span>${esc(x)}</span><b>${heures(f.par[x])} / ${heures(p.par[x])}</b>`).join("") +
    `<span><b>Total</b></span><b>${heures(f.total)} / ${heures(p.total)} (${pct} %)</b><span>Séances de sport</span><b>${f.sport} / 5</b></div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(pct, 100)}%"></i></div></div>`;
  h += `<form id="bilan" class="card"><div class="h">Bilan de la semaine</div>` +
    `<label class="f">Mode utilisé</label><select name="mode">${["A","B","C"].map(m => `<option ${mode === m ? "selected" : ""}>${m}</option>`).join("")}</select>` +
    `<label class="f">Sommeil moyen (h)</label><input type="number" name="sommeil" step="0.25" min="0" max="12" value="${r.sommeil ?? ""}">` +
    `<label class="f">Fatigue (1 = en forme, 5 = épuisé)</label><select name="fatigue">${[1,2,3,4,5].map(n => `<option ${r.fatigue === n ? "selected" : ""}>${n}</option>`).join("")}</select>` +
    `<label class="f">Stress (1–5)</label><select name="stress">${[1,2,3,4,5].map(n => `<option ${r.stress === n ? "selected" : ""}>${n}</option>`).join("")}</select>` +
    `<label class="f">Contexte (vacances, examens…)</label><input type="text" name="contexte" value="${esc(r.contexte || "")}">` +
    `<label class="f">Victoires et blocages</label><textarea name="notes">${esc(r.notes || "")}</textarea>` +
    `<label class="f">Ajustement décidé</label><textarea name="ajust">${esc(r.ajust || "")}</textarea>` +
    `<button class="btn" type="submit">Enregistrer le bilan</button></form>`;
  if (rec) h += `<div class="alert ${rec.cls}">${rec.txt}</div>`;
  const hist = Object.keys(state.reviews).sort().reverse();
  if (hist.length) h += `<div class="card"><div class="h">Historique</div><table><tr><th>Semaine</th><th>Mode</th><th>Fait</th><th>Alerte</th></tr>` +
    hist.map(x => { const v = state.reviews[x]; return `<tr><td>${x.slice(8)}/${x.slice(5, 7)}</td><td>${esc(v.mode)}</td><td>${v.pct ?? "–"} %</td><td>${alerte(v) ? "⚠" : "✔"}</td></tr>`; }).join("") + `</table></div>`;
  return { sub: "Bilan hebdomadaire", html: h };
}
function enregistrerBilan(form) {
  const fd = new FormData(form), lundi = ui.week, f = heuresFaites(lundi), mode = fd.get("mode"), p = prevuSemaine(mode);
  const s = fd.get("sommeil");
  state.reviews[iso(lundi)] = { mode, sommeil: s === "" ? "" : parseFloat(s), fatigue: +fd.get("fatigue"), stress: +fd.get("stress"),
    contexte: fd.get("contexte"), notes: fd.get("notes"), ajust: fd.get("ajust"), faites: f.total, prevues: p.total, pct: p.total ? Math.round(100 * f.total / p.total) : 0 };
  save(); render();
}

/* ---------- 4d. Écran « Réglages » ---------- */
let installEvt = null;
const CATS_ICS = ["Étude","Revue","Sport","Marche","Admin","Repas","Famille","Libre","Enseignement"];
function vueReglages() {
  const s = state.settings, perm = ("Notification" in window) ? Notification.permission : "indisponible";
  let h = `<div class="card"><div class="h">Rappels dans l'application</div>` +
    `<div class="sw"><input type="checkbox" class="chk" id="remind" ${s.remind ? "checked" : ""}><label for="remind">Me rappeler avant les blocs</label></div>` +
    `<label class="f">Minutes avant le bloc</label><select id="lead">${[5,10,15,30].map(n => `<option ${s.lead === n ? "selected" : ""}>${n}</option>`).join("")}</select>` +
    `<div class="mute" style="margin-top:6px">Autorisation des notifications : <b>${perm}</b>. Ces rappels marchent quand l'application est ouverte ou récemment utilisée. Pour des alarmes fiables toute la journée, utilise l'export calendrier ci-dessous.</div>` +
    `<button class="btn sec" id="askperm">Autoriser les notifications</button></div>`;
  h += `<div class="card"><div class="h">Export calendrier Android (alarmes fiables)</div><div class="mute">Crée un fichier .ics : chaque bloc choisi devient un événement hebdomadaire (26/10/2026 → 30/06/2027) avec alarme ${s.lead} min avant. Ouvre-le avec Google Agenda.</div>` +
    CATS_ICS.map(c => `<div class="sw"><input type="checkbox" class="chk" data-icscat="${c}" id="ics-${c}" ${s.icsCats.includes(c) ? "checked" : ""}><label for="ics-${c}">${c}</label></div>`).join("") +
    `<button class="btn" id="export-ics">Télécharger le calendrier (.ics)</button></div>`;
  h += `<div class="card"><div class="h">Sauvegarde de tes données</div><div class="mute">Cases cochées et bilans restent sur ce téléphone. Exporte une copie de temps en temps.</div>` +
    `<button class="btn sec" id="export-json">Exporter une sauvegarde (.json)</button><button class="btn sec" id="import-json">Importer une sauvegarde</button><input type="file" id="file-json" accept="application/json" hidden>` +
    `<button class="btn bad" id="reset">Effacer toutes les données</button></div>`;
  h += `<div class="card"><div class="h">Installation</div>` + (installEvt ? `<button class="btn" id="install">Installer l'application</button>` : `<div class="mute">Si le bouton n'apparaît pas : menu ⋮ de Chrome → « Installer l'application » ou « Ajouter à l'écran d'accueil ».</div>`) + `<div class="mute" style="margin-top:8px">Version 1.0 · données 100 % locales.</div></div>`;
  return { sub: "Réglages", html: h };
}

/* ---------- 5. Rappels et export .ics ---------- */
let timers = [];
async function planifierRappels() {
  timers.forEach(clearTimeout); timers = [];
  const s = state.settings; if (!s.remind || !("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const reg = await (navigator.serviceWorker ? navigator.serviceWorker.getRegistration() : null);
  blocsDuJour(jourIdx(now)).filter(b => s.remindCats.includes(b.cat) && actif(b) && !facultatif(b)).forEach(b => {
    const delai = (b.s - s.lead - nowMin) * 60000;
    if (delai > 0 && delai < 24 * 3600 * 1000) timers.push(setTimeout(() => {
      const opts = { body: hhmm(b.s) + " · " + b.act + (b.liv && b.liv !== "—" ? " — " + b.liv : ""), icon: "icons/icon-192.png", tag: b.id };
      reg ? reg.showNotification("Dans " + s.lead + " min", opts) : new Notification("Dans " + s.lead + " min", opts);
    }, delai));
  });
}
const icsEsc = t => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsFold = l => { let o = ""; while (l.length > 74) { o += l.slice(0, 74) + "\r\n "; l = l.slice(74); } return o + l; };
function construireICS() {
  const s = state.settings, L = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mon Plan 2026-27//FR","CALSCALE:GREGORIAN","X-WR-CALNAME:Mon Plan 2026-27",
    "BEGIN:VTIMEZONE","TZID:Africa/Casablanca","BEGIN:STANDARD","DTSTART:19700101T000000","TZOFFSETFROM:+0100","TZOFFSETTO:+0100","TZNAME:+01","END:STANDARD","END:VTIMEZONE"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  PLAN.blocks.filter(b => s.icsCats.includes(b.cat) && b.e <= 1440).forEach(b => {
    const date = ajouteJours(DEBUT_PLAN, b.d), ds = date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
    const t = m => pad(Math.floor(m / 60)) + pad(m % 60) + "00";
    L.push("BEGIN:VEVENT", "UID:monplan-" + b.id + "@local", "DTSTAMP:" + stamp,
      "DTSTART;TZID=Africa/Casablanca:" + ds + "T" + t(b.s), "DTEND;TZID=Africa/Casablanca:" + ds + "T" + t(b.e),
      "RRULE:FREQ=WEEKLY;UNTIL=" + FIN_PLAN_ICS, icsFold("SUMMARY:" + icsEsc(b.act)),
      icsFold("DESCRIPTION:" + icsEsc(b.det + (b.liv && b.liv !== "—" ? "\nLivrable : " + b.liv : ""))), "CATEGORIES:" + icsEsc(b.cat),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(b.act), "TRIGGER:-PT" + s.lead + "M", "END:VALARM", "END:VEVENT");
  });
  L.push("END:VCALENDAR"); return L.join("\r\n");
}
function telecharger(nom, contenu, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([contenu], { type })); a.download = nom;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- 6. Affichage et événements ---------- */
function render() {
  const v = { today: vueAujourdhui, week: vueSemaine, review: vueBilan, settings: vueReglages }[ui.tab]();
  $("#sub").textContent = v.sub; $("#view").innerHTML = v.html;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === ui.tab));
  planifierRappels();
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-tab],[data-mode],[data-day],[data-weekshift],[data-open],#askperm,#export-ics,#export-json,#import-json,#reset,#install"); if (!t) return;
  if (e.target.matches("input,label,select,textarea")) return;
  if (t.dataset.tab) { ui.tab = t.dataset.tab; window.scrollTo(0, 0); }
  else if (t.dataset.mode) { state.mode = t.dataset.mode; save(); }
  else if (t.dataset.day) ui.day = +t.dataset.day;
  else if (t.dataset.weekshift) ui.week = ajouteJours(ui.week, 7 * +t.dataset.weekshift);
  else if (t.dataset.open) ui.open = ui.open === t.dataset.open ? null : t.dataset.open;
  else if (t.id === "askperm") { Notification.requestPermission().then(render); return; }
  else if (t.id === "export-ics") { telecharger("mon-plan.ics", construireICS(), "text/calendar"); return; }
  else if (t.id === "export-json") { telecharger("mon-plan-sauvegarde.json", JSON.stringify({ done: state.done, reviews: state.reviews, settings: state.settings, mode: state.mode }), "application/json"); return; }
  else if (t.id === "import-json") { $("#file-json").click(); return; }
  else if (t.id === "reset") { if (confirm("Effacer toutes les cases cochées et tous les bilans ?")) { state.done = {}; state.reviews = {}; save(); } else return; }
  else if (t.id === "install" && installEvt) { installEvt.prompt(); installEvt = null; return; }
  render();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.done) { if (t.checked) state.done[t.dataset.done] = true; else delete state.done[t.dataset.done]; save(); render(); }
  else if (t.id === "remind") { state.settings.remind = t.checked; save(); if (t.checked && Notification.permission === "default") Notification.requestPermission().then(render); else render(); }
  else if (t.id === "lead") { state.settings.lead = +t.value; save(); render(); }
  else if (t.dataset.icscat) { const s = state.settings; s.icsCats = t.checked ? [...new Set([...s.icsCats, t.dataset.icscat])] : s.icsCats.filter(c => c !== t.dataset.icscat); save(); }
  else if (t.id === "file-json" && t.files[0]) {
    t.files[0].text().then(txt => { const d = JSON.parse(txt); state.done = d.done || {}; state.reviews = d.reviews || {}; state.settings = Object.assign(state.settings, d.settings || {}); state.mode = d.mode || "A"; save(); render(); }).catch(() => alert("Fichier invalide."));
  }
});
document.addEventListener("submit", e => { if (e.target.id === "bilan") { e.preventDefault(); enregistrerBilan(e.target); } });
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if (ui.tab === "settings") render(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
setInterval(() => { if (ui.tab === "today" && !document.hidden) render(); }, 60000);   // met à jour « Maintenant » chaque minute
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
