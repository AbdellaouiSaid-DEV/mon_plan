"use strict";
/* ==========================================================================
   views.js — les écrans : Aujourd'hui, Semaine, Progrès, Historique, Réglages
   Chaque écran est une fonction qui renvoie { sub: "texte d'en-tête", html: "…" }.
   ========================================================================== */
const estAuj = d => iso(d) === iso(aujourdhui());
function anneau(pct, texte) {
  const c = 2 * Math.PI * 34;
  return `<div class="ring"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="34" fill="none" stroke-width="8"/><circle class="fg" cx="42" cy="42" r="34" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}"/></svg><b>${texte}</b></div>`;
}
const pastille = t => `<span class="tpill" style="--c:${TYPES[t].col}">${TYPES[t].court}</span>`;
function etapes(ex, ecoule) {
  return `<ol class="steps">` + ex.steps.map(([a, b, t]) => `<li class="${ecoule >= a && ecoule < b ? "step-on" : ""}"><span class="m">${a}–${b} min</span><span>${esc(t)}</span></li>`).join("") + `</ol>`;
}
function ligneBloc(b, date, nowMin, t) {
  const off = !actif(b, t), opt = facultatif(b, t), auj = estAuj(date);
  const cur = auj && b.s <= nowMin && nowMin < b.e, past = auj && b.e <= nowMin;
  const ex = b.ex ? PLAN.exec[b.ex] : null, ouvert = ui.open === b.id + iso(date), tk = SUIVIS.has(b.cat) && choisie(date, tacheDeBloc(b));
  const f = fait(date, b);
  return `<div class="block ${cur ? "cur" : ""} ${past && !f ? "past" : ""} ${off ? "off" : ""} ${opt ? "opt" : ""} ${f ? "ok" : ""}" style="--c:${COULEURS[b.cat] || "#999"}" data-open="${b.id}${iso(date)}">` +
    `<div class="cb"></div><div class="grow"><div class="t">${hhmm(b.s)}–${hhmm(b.e)} · ${dureeFr(dur(b))} · ${esc(b.cat)}${opt ? '<span class="tag">facultatif</span>' : ""}${off ? '<span class="tag">hors ' + TYPES[t].court.toLowerCase() + "</span>" : ""}</div>` +
    `<div class="a">${esc(b.act)}</div>` +
    (ouvert ? `<div class="det">${esc(b.det)}${b.liv && b.liv !== "—" ? `<div class="mute" style="margin-top:4px">Livrable : ${esc(b.liv)}</div>` : ""}${ex ? etapes(ex, cur ? nowMin - b.s : -1) : ""}</div>` : "") + `</div>` +
    (tk ? `<span class="badge ${f ? "ok" : ""}">${f ? "✓ fait" : "tâche"}</span>` : "") + `</div>`;
}

function ligneTache(date, k) {
  const f = fait(date, k), passe = date < aujourdhui();
  const meta = [k.s != null ? hhmm(k.s) : null, dureeFr(k.min), k.dom || k.cat].filter(Boolean).join(" · ");
  return `<div class="task ${f ? "ok" : ""} ${passe && !f ? "no" : ""}"><label class="sq"><input type="checkbox" data-done="${cle(date, k)}" ${f ? "checked" : ""} aria-label="Réalisée : ${esc(k.act)}"><span></span></label>` +
    `<div class="grow"><div class="a">${esc(k.act)}</div><div class="t">${esc(meta)}${k.custom ? '<span class="tag">ajoutée</span>' : ""}</div></div>` +
    (passe ? `<span class="yn ${f ? "y" : "n"}">${f ? "Oui" : "Non"}</span>` : "") +
    (k.custom ? `<button class="x" data-delcustom="${k.id}" aria-label="Retirer cette tâche">✕</button>` : "") + `</div>`;
}
const trier = l => l.slice().sort((a, b) => (a.s ?? 9999) - (b.s ?? 9999));
function feuilleTaches() {
  const date = ui.date, props = propositions(date);
  return `<div class="sheet-bg"><div class="sheet tall" role="dialog" aria-modal="true" aria-labelledby="st-t"><div class="eyebrow">${dateFr(date)} · ${TYPES[typeDe(date)].nom}</div>` +
    `<h2 id="st-t" class="sh-t">Mes tâches du jour</h2><div class="mute" style="margin:-6px 0 8px">Coche ce que tu veux faire aujourd'hui parmi les tâches proposées.</div>` +
    props.map(tk => `<label class="pick"><span class="sq"><input type="checkbox" data-sel="${tk.id}" ${choisie(date, tk) ? "checked" : ""}><span></span></span><span class="grow"><b>${esc(tk.act)}</b><br><span class="mute">${hhmm(tk.s)} · ${dureeFr(tk.min)} · ${esc(tk.dom || tk.cat)}</span></span></label>`).join("") +
    `<div class="eyebrow" style="margin-top:14px">Ajouter une tâche</div><div class="legend">` + DOMAINES.map(d => `<button type="button" class="chip q" style="--c:${COUL_DOM[d]}" data-quick="${d}">+ ${d}</button>`).join("") + `</div>` +
    `<form id="addtask" class="addrow"><input type="text" name="act" placeholder="Ex. Corriger les copies" required aria-label="Nom de la tâche"><select name="mat" aria-label="Matière ou type">${MATIERES.map(m => `<option>${m}</option>`).join("")}</select>` +
    `<select name="min" aria-label="Durée">${[15,30,45,60,90,120].map(m => `<option value="${m}" ${m === 30 ? "selected" : ""}>${dureeFr(m)}</option>`).join("")}</select><button class="btn gold" type="submit" style="margin:0">Ajouter</button></form>` +
    `<button class="btn" data-closesheet style="margin-top:16px">Terminé</button></div></div>`;
}

/* ---------- Aujourd'hui ---------- */
function vueAujourdhui() {
  const now = new Date(), date = ui.date, auj = estAuj(date), d = jourIdx(date), t = typeDe(date);
  const nowMin = auj ? now.getHours() * 60 + now.getMinutes() : -1;
  const tous = blocsDuJour(d), blocs = tous.filter(b => b.cat !== "Sommeil" && visible(b, t));
  const st = stats(date), courant = auj ? tous.find(b => b.s <= nowMin && nowMin < b.e && b.cat !== "Sommeil" && visible(b, t)) : null;
  const prochain = auj ? prochaineTache(now) : null;
  let h = `<div class="wk"><button data-dshift="-1" aria-label="Jour précédent">${icone("left")}</button><div class="grow" style="text-align:center"><b>${auj ? "Aujourd'hui" : JOURS[d]}</b><div class="mute">${dateFr(date)}</div></div><button data-dshift="1" aria-label="Jour suivant">${icone("right")}</button></div>`;
  if (date < DEBUT_PLAN) h += `<div class="alert info">Le plan démarre le lundi 26/10/2026 : voici un aperçu.</div>`;
  const reco = recommandation(ajouteJours(lundiDe(date), -7));
  if (reco && reco.cls !== "ok") h += `<div class="alert ${reco.cls}">Bilan précédent · ${reco.txt}</div>`;
  h += `<section class="hero">${anneau(st.pct ?? 0, st.pct == null ? "–" : st.pct + " %")}<div class="grow"><div class="eyebrow">Avancement du jour</div>` +
    `<div class="big">${st.td} <span>/ ${st.tp} tâches</span></div>` +
    `<div class="mute">${st.tp ? dureeFr(st.pd) + " faites sur " + dureeFr(st.pp) : "Rien d'obligatoire aujourd'hui."}</div></div></section>`;
  if (prochain) h += `<div class="next">${icone("bell")}<span>Prochaine tâche : <b>${esc(prochain.act)}</b> à ${hhmm(prochain.s)} · dans ${dureeFr(prochain.s - nowMin)}${state.settings.remind ? " (rappel " + state.settings.lead + " min avant)" : ""}</span></div>`;
  h += `<div class="seg" role="group" aria-label="Type de journée">` + Object.keys(TYPES).map(k => `<button data-type="${k}" class="${t === k ? "on" : ""}" aria-pressed="${t === k}">${TYPES[k].court}</button>`).join("") + `</div>`;
  h += `<div class="caption"><b>${TYPES[t].nom}</b> · ${TYPES[t].desc}</div>`;
  const lt = trier(tachesDuJour(date));
  h += `<div class="row" style="margin:18px 2px 6px"><h2 class="sec" style="margin:0" id="taches">Mes tâches du jour</h2><span class="mute grow" style="text-align:right">${st.td}/${st.tp} · Oui / Non</span></div>` +
    (lt.length ? lt.map(k => ligneTache(date, k)).join("") : `<div class="card mute">Aucune tâche choisie. Appuie sur le bouton ci-dessous pour composer ta journée.</div>`) +
    `<button class="btn sec" data-picker>Choisir / ajouter des tâches</button>`;
  if (courant) {
    const ex = courant.ex ? PLAN.exec[courant.ex] : null, p = Math.round(100 * (nowMin - courant.s) / dur(courant));
    h += `<div class="card" style="border-color:var(--blue)"><div class="eyebrow">Maintenant · ${hhmm(courant.s)}–${hhmm(courant.e)} · reste ${dureeFr(courant.e - nowMin)}</div>` +
      `<div class="h" style="font-size:20px;margin-top:4px">${esc(courant.act)}</div><div class="pbar"><i style="width:${p}%"></i></div>` +
      `<div>${esc(courant.det)}</div>` + (courant.liv && courant.liv !== "—" ? `<div class="mute" style="margin-top:4px">Livrable : ${esc(courant.liv)}</div>` : "") +
      (ex ? etapes(ex, nowMin - courant.s) : "") + `</div>`;
  }
  h += `<h2 class="sec">Programme du jour</h2>` + blocs.map(b => ligneBloc(b, date, nowMin, t)).join("");
  h += `<div class="card mute">Lever ${hhmm(tous[0].e)} · Coucher ${hhmm(tous[tous.length - 1].s)} (écrans éteints).</div>`;
  return { sub: dateFr(date) + " · " + TYPES[t].court, html: h };
}
function feuilleType() {              // fenêtre « Quel type de journée ? » au lancement
  const sug = typeSuggere();
  return `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t"><div class="eyebrow">${dateFr(aujourdhui())}</div>` +
    `<h2 id="sh-t" class="sh-t">Quel type de journée aujourd'hui ?</h2>` +
    Object.keys(TYPES).map(k => `<button class="tcard" data-pick="${k}" style="--c:${TYPES[k].col}"><span class="dotc"></span><span class="grow"><b>${TYPES[k].nom}</b>${k === sug ? '<span class="tag">suggéré</span>' : ""}<br><span class="mute">${TYPES[k].desc}</span></span></button>`).join("") +
    (sug !== "pleine" ? `<div class="mute" style="margin-top:6px">Suggestion basée sur ton dernier bilan hebdomadaire.</div>` : "") + `</div></div>`;
}

/* ---------- Semaine ---------- */
function vueSemaine() {
  const lundi = ui.week, d = ui.day, date = ajouteJours(lundi, d), t = typeDe(date), sw = semaineStats(lundi);
  const blocs = blocsDuJour(d).filter(b => b.cat !== "Sommeil" && visible(b, t));
  const parCat = {}; blocsDuJour(d).forEach(b => { if (visible(b, t) && actif(b, t)) parCat[b.cat] = (parCat[b.cat] || 0) + dur(b); });
  const cats = Object.entries(parCat).sort((a, b) => b[1] - a[1]), fin = ajouteJours(lundi, 6);
  let h = `<div class="wk"><button data-weekshift="-1" aria-label="Semaine précédente">${icone("left")}</button><div class="grow" style="text-align:center"><b>${lundi.getDate()}/${pad(lundi.getMonth() + 1)} → ${fin.getDate()}/${pad(fin.getMonth() + 1)}</b></div><button data-weekshift="1" aria-label="Semaine suivante">${icone("right")}</button></div>`;
  h += `<div class="days">` + JOURS_ABR.map((j, i) => { const dd = ajouteJours(lundi, i), tt = typeDe(dd);
    return `<button data-day="${i}" class="${i === d ? "on" : ""} ${estAuj(dd) ? "today" : ""}"><small>${j}</small><b>${dd.getDate()}</b><i class="tdot" style="background:${TYPES[tt].col}"></i></button>`; }).join("") + `</div>`;
  h += `<div class="mute" style="margin:6px 4px">Point de couleur = type de journée : <span class="tpill" style="--c:${TYPES.pleine.col}">Pleine</span> <span class="tpill" style="--c:${TYPES.semi.col}">Semi</span> <span class="tpill" style="--c:${TYPES.libre.col}">Libre</span></div>`;
  h += `<div class="card"><div class="row"><div class="h grow" style="margin:0">${JOURS[d]} ${date.getDate()}/${pad(date.getMonth() + 1)}</div>${pastille(t)}</div>` +
    `<div class="seg" style="margin-top:10px" role="group" aria-label="Type de ce jour">` + Object.keys(TYPES).map(k => `<button data-type="${k}" class="${t === k ? "on" : ""}">${TYPES[k].court}</button>`).join("") + `</div>` +
    `<div class="stack" style="margin-top:12px">` + cats.map(([c, m]) => `<i style="width:${(m / 14.4).toFixed(2)}%;background:${COULEURS[c]}"></i>`).join("") + `</div>` +
    cats.map(([c, m]) => `<span class="chip" style="--c:${COULEURS[c]}">${esc(c)} · ${dureeFr(m)}</span>`).join("") + `</div>`;
  h += blocs.map(b => ligneBloc(b, date, -1, t)).join("");
  h += `<h2 class="sec">Cette semaine</h2><div class="card"><div class="row" style="gap:6px;margin-bottom:8px">` +
    ["pleine","semi","libre"].map(k => `<span class="tpill" style="--c:${TYPES[k].col}">${sw.types[k]} ${TYPES[k].court.toLowerCase()}</span>`).join("") + `</div>` +
    DOMAINES.filter(x => sw.prevu[x] || sw.par[x]).map(x => { const pr = sw.prevu[x]; return `<div class="dom"><div class="dom-h"><span>${esc(x)}</span><b>${dureeFr(sw.par[x])} / ${dureeFr(pr)}</b></div><div class="bar"><i style="width:${pr ? Math.min(100, 100 * sw.par[x] / pr).toFixed(0) : 0}%;background:${COUL_DOM[x]}"></i></div></div>`; }).join("") +
    `<div class="mute" style="margin-top:10px">Étude : <b>${dureeFr(sw.totalFait)}</b> / ${dureeFr(sw.totalPrevu)} · Sport : <b>${sw.sport}</b> / ${sw.sportPrevu}</div></div>`;
  return { sub: "Semaine du " + lundi.getDate() + "/" + pad(lundi.getMonth() + 1), html: h };
}

/* ---------- Progrès ---------- */
function plage() {
  const fin = aujourdhui(); let debut = ui.periode ? ajouteJours(fin, -(ui.periode - 1)) : DEBUT_PLAN;
  const prem = parseIso(state.first) > DEBUT_PLAN ? parseIso(state.first) : DEBUT_PLAN;
  if (debut < prem) debut = prem; if (debut > fin) debut = fin;
  return [debut, fin];
}
function vueProgres() {
  const [debut, fin] = plage(); const cles = []; for (let d = debut; d <= fin; d = ajouteJours(d, 1)) cles.push(iso(d));
  const E = cles.map(k => ({ k, e: state.days[k] })).filter(x => x.e);
  const avec = E.filter(x => x.e.pp > 0), pcts = avec.map(x => Math.round(100 * x.e.pd / x.e.pp));
  const moy = pcts.length ? Math.round(moyenne(pcts)) : null;
  let serie = 0; { let d = aujourdhui(); const q = e => e && e.pp > 0 && e.pd / e.pp >= .7;
    if (!q(state.days[iso(d)])) d = ajouteJours(d, -1);
    for (; d >= DEBUT_PLAN; d = ajouteJours(d, -1)) { const e = state.days[iso(d)]; if (e && e.pp === 0) continue; if (q(e)) serie++; else break; } }
  const heures = E.reduce((s, x) => s + x.e.sd, 0), sport = E.reduce((s, x) => s + (x.e.sport || 0), 0);
  const pts = cles.map(k => { const e = state.days[k]; return { k, v: e && e.pp ? Math.round(100 * e.pd / e.pp) : null }; });
  // semaines
  const sem = {}; E.forEach(x => { const m = iso(lundiDe(parseIso(x.k))); sem[m] = sem[m] || { fait: 0, prevu: 0 }; sem[m].fait += x.e.sd / 60; sem[m].prevu += x.e.sp / 60; });
  const rows = Object.keys(sem).sort().slice(-12).map(m => ({ lib: m.slice(8) + "/" + m.slice(5, 7), fait: sem[m].fait, prevu: sem[m].prevu }));
  const dom = {}; E.forEach(x => Object.entries(x.e.by || {}).forEach(([n, v]) => dom[n] = (dom[n] || 0) + v));
  const parts = DOMAINES.map(n => ({ nom: n, v: dom[n] || 0, c: COUL_DOM[n] })).filter(p => p.v > 0);
  const types = { pleine: 0, semi: 0, libre: 0 }; E.forEach(x => types[x.e.t]++);
  const sw = semaineStats(lundiDe(aujourdhui()));
  const bil = Object.keys(state.reviews).sort().slice(-10), lab = bil.map(k => k.slice(8) + "/" + k.slice(5, 7));
  let h = `<div class="seg" role="group" aria-label="Période">` + [[7, "7 jours"], [30, "30 jours"], [0, "Tout"]].map(([n, l]) => `<button data-per="${n}" class="${ui.periode === n ? "on" : ""}">${l}</button>`).join("") + `</div>`;
  if (!E.length) return { sub: "Progrès", html: h + `<div class="card"><div class="h">Pas encore de données</div><div class="mute">Choisis ton type de journée et coche tes tâches : les courbes se construisent toutes seules.</div></div>` };
  h += `<div class="kpis k4"><div class="kpi"><b>${moy ?? "–"}${moy != null ? " %" : ""}</b><span>Moyenne réalisée</span></div><div class="kpi"><b>${serie}</b><span>Jours de suite ≥ 70 %</span></div><div class="kpi"><b>${(heures / 60).toFixed(1).replace(".", ",")} h</b><span>Étude cochée</span></div><div class="kpi"><b>${sport}</b><span>Séances de sport</span></div></div>`;
  h += `<div class="card"><div class="h">Courbe d'avancement</div><div class="mute">% des tâches faites chaque jour (journées libres sans tâche ignorées).</div>${courbeJours(pts, "Pourcentage de tâches réalisées par jour")}` +
    legende([["Jour", "var(--blue-light)"], ["Moyenne 7 jours", "var(--blue)"], ["Objectif 80 %", "var(--accent)"]]) + `</div>`;
  h += `<div class="card"><div class="h">Heures d'étude par semaine</div><div class="mute">Faites (plein) comparées au prévu (contour).</div>${barresSemaines(rows, "Heures d'étude faites et prévues par semaine")}` +
    legende([["Faites", "var(--blue)"], ["Prévues", "var(--line)"]]) + `</div>`;
  h += `<div class="card"><div class="h">Répartition par matière</div><div class="donut-row">${donut(parts, "Répartition des heures d'étude par matière")}<div class="grow">` +
    parts.map(p => `<div class="dl"><span class="chip" style="--c:${p.c};margin:0">${esc(p.nom)}</span><b>${dureeFr(p.v)}</b></div>`).join("") + `</div></div></div>`;
  h += `<div class="card"><div class="h">Cette semaine par matière</div>` + DOMAINES.filter(x => sw.prevu[x] || sw.par[x]).map(x => { const pr = sw.prevu[x]; return `<div class="dom"><div class="dom-h"><span>${esc(x)}</span><b>${dureeFr(sw.par[x])} / ${dureeFr(pr)}</b></div><div class="bar"><i style="width:${pr ? Math.min(100, 100 * sw.par[x] / pr).toFixed(0) : 0}%;background:${COUL_DOM[x]}"></i></div></div>`; }).join("") + `</div>`;
  h += `<div class="card"><div class="h">Régularité</div><div class="mute">Une case par jour, plus c'est foncé, plus tu as fait.</div>${chaleur(ajouteJours(lundiDe(fin), -7 * (ui.periode === 7 ? 3 : ui.periode === 30 ? 7 : 25)) < DEBUT_PLAN ? DEBUT_PLAN : ajouteJours(lundiDe(fin), -7 * (ui.periode === 7 ? 3 : ui.periode === 30 ? 7 : 25)), fin)}` +
    `<div class="legend"><span class="mute">moins</span>${["0","1","2","3","4"].map(n => `<i class="sw hm${n}"></i>`).join("")}<span class="mute">plus</span><i class="sw hmr"></i><span class="mute">libre</span></div>` +
    `<div class="stack" style="margin-top:12px">` + ["pleine","semi","libre"].map(k => `<i style="width:${100 * types[k] / E.length}%;background:${TYPES[k].col}"></i>`).join("") + `</div>` +
    legende(["pleine","semi","libre"].map(k => [TYPES[k].nom, TYPES[k].col, String(types[k])])) + `</div>`;
  if (bil.length) h += `<div class="card"><div class="h">Énergie (bilans hebdomadaires)</div>${courbesBilans(lab, [{ nom: "Fatigue", c: "#B3261E", vals: bil.map(k => state.reviews[k].fatigue ?? null) }, { nom: "Stress", c: "#9A5B00", vals: bil.map(k => state.reviews[k].stress ?? null) }], "Fatigue et stress par semaine", 5)}` +
    legende([["Fatigue (1-5)", "#B3261E"], ["Stress (1-5)", "#9A5B00"]]) +
    `<div class="h" style="margin-top:14px;font-size:15px">Sommeil moyen (h/nuit)</div>${courbesBilans(lab, [{ nom: "Sommeil", c: "#2F5D9E", vals: bil.map(k => state.reviews[k].sommeil === "" ? null : state.reviews[k].sommeil ?? null) }], "Sommeil moyen par semaine", 10)}</div>`;
  { const aT = {}, aM = {}; E.forEach(x => { if (parseIso(x.k) >= aujourdhui()) return; (x.e.tasks || []).forEach(k => {
      const n = (aT[k.act] ||= { n: 0, ok: 0 }); n.n++; n.ok += k.ok; const m = (aM[k.dom || k.cat] ||= { n: 0, ok: 0 }); m.n++; m.ok += k.ok; }); });
    const barres = (o, min) => Object.entries(o).filter(([, v]) => v.n >= min).map(([k, v]) => [k, v.n, Math.round(100 * v.ok / v.n)]).sort((a, b) => a[2] - b[2]);
    const rt = barres(aT, 2).slice(0, 8), rm = barres(aM, 2);
    const ligne = ([k, n, p]) => `<div class="dom"><div class="dom-h"><span>${esc(k)}</span><b>${p} % <span class="mute">(${n}×)</span></b></div><div class="bar"><i style="width:${p}%;background:${p >= 80 ? "var(--ok)" : p >= 50 ? "var(--accent)" : "var(--bad)"}"></i></div></div>`;
    if (rm.length) h += `<div class="card"><div class="h">Taux de réalisation par matière</div><div class="mute">Jours terminés seulement. Vert ≥ 80 %, doré ≥ 50 %, rouge en dessous.</div>${rm.map(ligne).join("")}</div>`;
    if (rt.length) h += `<div class="card"><div class="h">Tâches les moins réalisées</div><div class="mute">Les tâches proposées ≥ 2 fois, de la moins faite à la plus faite.</div>${rt.map(ligne).join("")}</div>`; }
  h += `<details class="card"><summary>Voir les chiffres (tableau)</summary><table><tr><th>Semaine</th><th>Faites</th><th>Prévues</th></tr>${rows.slice().reverse().map(r => `<tr><td>${r.lib}</td><td>${r.fait.toFixed(1)} h</td><td>${r.prevu.toFixed(1)} h</td></tr>`).join("")}</table></details>`;
  return { sub: "Progrès", html: h };
}

/* ---------- Historique ---------- */
function vueHistorique() {
  let h = `<div class="seg" role="group"><button data-hseg="jours" class="${ui.hseg !== "bilans" ? "on" : ""}">Mes journées</button><button data-hseg="bilans" class="${ui.hseg === "bilans" ? "on" : ""}">Bilans hebdo</button></div>`;
  if (ui.hseg === "bilans") { const v = vueBilan(); return { sub: "Bilans", html: h + v.html }; }
  h += `<button class="btn sec" id="export-xlsx" style="margin-top:12px">Exporter l'historique en Excel (.xlsx)</button>`;
  const ks = joursEcoules().reverse();
  if (!ks.length) return { sub: "Historique", html: h + `<div class="card"><div class="h">Historique vide</div><div class="mute">Chaque journée est enregistrée automatiquement dès que tu l'utilises.</div></div>` };
  h += ks.map(k => {
    const e = state.days[k], d = parseIso(k), pct = e.pp ? Math.round(100 * e.pd / e.pp) : null, ouvert = ui.histOpen === k;
    let det = "";
    if (ouvert) {
      const lst = e.tasks || [], passe = d < aujourdhui();
      const liste = lst.map(k => `<li><span class="yn ${k.ok ? "y" : "n"}">${k.ok ? "Oui" : passe ? "Non" : "…"}</span><span>${esc(k.act)}<span class="mute"> · ${dureeFr(k.min)}${k.src === "Ajoutée" ? " · ajoutée" : ""}</span></span></li>`).join("");
      det = `<div class="det"><div class="eyebrow">Tâches du jour (${lst.filter(k => k.ok).length}/${lst.length} réalisées)</div>${liste ? `<ul class="steps ht">${liste}</ul>` : '<div class="mute">Aucune tâche enregistrée ce jour-là.</div>'}` +
        `<label class="f" for="note-${k}">Note du jour</label><textarea id="note-${k}" data-note="${k}" placeholder="Ce qui a marché, ce qui a bloqué…">${esc(e.note || "")}</textarea>` +
        `<button class="btn sec" data-goday="${k}">Modifier cette journée</button></div>`;
    }
    return `<div class="card hrow" data-hopen="${k}"><div class="row"><div class="grow"><b>${dateFr(d)}</b> ${pastille(e.t)}<div class="mute">${e.tp ? e.td + "/" + e.tp + " tâches · " + dureeFr(e.pd) : "Pas de tâche obligatoire"}${e.sd ? " · étude " + dureeFr(e.sd) : ""}</div></div><div class="hp" style="color:${pct == null ? "var(--mute)" : pct >= 80 ? "var(--ok)" : pct >= 50 ? "var(--warn)" : "var(--bad)"}">${pct == null ? "–" : pct + " %"}</div></div>` +
      `<div class="bar" style="margin-top:8px"><i style="width:${pct ?? 0}%;background:${TYPES[e.t].col}"></i></div>${det}</div>`;
  }).join("");
  return { sub: "Historique", html: h };
}

/* ---------- Bilan hebdomadaire (dans Historique) ---------- */
function pills(nom, val, warn) {
  return `<div class="pills ${warn ? "warn" : ""}">` + [1,2,3,4,5].map(n => `<label class="pill"><input type="radio" name="${nom}" value="${n}" ${val === n ? "checked" : ""}><span>${n}</span></label>`).join("") + `</div>`;
}
function vueBilan() {
  const lundi = ui.week, r = state.reviews[iso(lundi)] || {}, sw = semaineStats(lundi), rec = recommandation(lundi), fin = ajouteJours(lundi, 6);
  let h = `<div class="wk"><button data-weekshift="-1" aria-label="Semaine précédente">${icone("left")}</button><div class="grow" style="text-align:center"><b>${lundi.getDate()}/${pad(lundi.getMonth() + 1)} → ${fin.getDate()}/${pad(fin.getMonth() + 1)}</b></div><button data-weekshift="1" aria-label="Semaine suivante">${icone("right")}</button></div>`;
  h += `<div class="kpis"><div class="kpi"><b>${sw.pct ?? "–"}${sw.pct != null ? " %" : ""}</b><span>Tâches réalisées</span></div><div class="kpi"><b>${sw.sport}/${sw.sportPrevu}</b><span>Séances de sport</span></div><div class="kpi"><b>${dureeFr(sw.totalFait)}</b><span>Étude cochée</span></div></div>`;
  h += `<form id="bilan" class="card"><div class="h">Bilan de la semaine</div>` +
    `<label class="f" for="sommeil">Sommeil moyen (heures par nuit)</label><input type="number" inputmode="decimal" id="sommeil" name="sommeil" step="0.25" min="0" max="12" value="${r.sommeil ?? ""}">` +
    `<label class="f">Fatigue (1 = en forme · 5 = épuisé)</label>${pills("fatigue", r.fatigue ?? 2, true)}` +
    `<label class="f">Stress (1 = serein · 5 = très élevé)</label>${pills("stress", r.stress ?? 2, true)}` +
    `<label class="f" for="contexte">Contexte (vacances, examens…)</label><input type="text" id="contexte" name="contexte" value="${esc(r.contexte || "")}">` +
    `<label class="f" for="notes">Victoires et blocages</label><textarea id="notes" name="notes">${esc(r.notes || "")}</textarea>` +
    `<label class="f" for="ajust">Ajustement décidé</label><textarea id="ajust" name="ajust">${esc(r.ajust || "")}</textarea>` +
    `<button class="btn" type="submit">Enregistrer le bilan</button></form>`;
  if (rec) h += `<div class="alert ${rec.cls}">${rec.txt}</div>`;
  const hist = Object.keys(state.reviews).sort();
  if (hist.length) h += `<div class="card"><div class="h">Bilans enregistrés</div><table><tr><th>Semaine</th><th>Fait</th><th>Fatigue</th><th>Stress</th><th>Alerte</th></tr>` +
    hist.slice().reverse().map(x => { const v = state.reviews[x]; return `<tr><td>${x.slice(8)}/${x.slice(5, 7)}</td><td>${v.pct ?? "–"} %</td><td>${v.fatigue}</td><td>${v.stress}</td><td>${alerte(v) ? "⚠" : "✔"}</td></tr>`; }).join("") + `</table></div>`;
  return { sub: "Bilan hebdomadaire", html: h };
}
function enregistrerBilan(form) {
  const fd = new FormData(form), lundi = ui.week, sw = semaineStats(lundi), s = fd.get("sommeil");
  state.reviews[iso(lundi)] = { sommeil: s === "" ? "" : parseFloat(s), fatigue: +fd.get("fatigue"), stress: +fd.get("stress"),
    contexte: fd.get("contexte"), notes: fd.get("notes"), ajust: fd.get("ajust"), pct: sw.pct ?? 0 };
  save(); render(); toast("Bilan enregistré ✔");
}

/* ---------- Réglages ---------- */
let installEvt = null;
const CATS_ICS = ["Étude","Revue","Sport","Marche","Admin","Repas","Famille","Libre","Enseignement"];
const CATS_RAPPEL = ["Étude","Revue","Sport","Marche","Admin"];
const installee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const interrupteur = (id, on, txt, data = "") => `<div class="sw"><label class="tick"><input type="checkbox" ${id ? `id="${id}"` : ""} ${data} ${on ? "checked" : ""}><span></span></label><label ${id ? `for="${id}"` : ""} class="grow">${txt}</label></div>`;
function vueReglages() {
  const s = state.settings, perm = ("Notification" in window) ? Notification.permission : "indisponible";
  const permFr = { granted: "autorisées ✔", denied: "refusées (à réactiver dans les réglages du site)", default: "pas encore demandées", indisponible: "indisponibles" }[perm];
  let h = `<div class="card"><div class="h">Installation</div>` +
    (installee() ? `<div class="alert ok" style="margin:0">Application installée ✔</div>` :
     installEvt ? `<button class="btn gold" id="install" style="margin:4px 0">Installer sur mon téléphone</button>` :
     `<div class="mute">Menu ⋮ de Chrome → « Installer l'application » ou « Ajouter à l'écran d'accueil ».</div>`) + `</div>`;
  h += `<div class="card"><div class="h">Rappel de la tâche suivante</div>` + interrupteur("remind", s.remind, "Me rappeler avant chaque tâche") +
    `<label class="f" for="lead">Délai avant la tâche</label><select id="lead">${[1,2,5,10,15,30].map(n => `<option value="${n}" ${s.lead === n ? "selected" : ""}>${n} min</option>`).join("")}</select>` +
    `<label class="f" for="sound">Sonnerie (application ouverte)</label><select id="sound">${Object.entries(SONS).map(([k, v]) => `<option value="${k}" ${s.sound === k ? "selected" : ""}>${v.nom}</option>`).join("")}<option value="aucun" ${s.sound === "aucun" ? "selected" : ""}>Aucune</option></select>` +
    `<label class="f" for="volume">Volume</label><input type="range" id="volume" min="0.1" max="1" step="0.1" value="${s.volume}">` +
    interrupteur("vibrate", s.vibrate, "Vibration") +
    `<div class="eyebrow" style="margin-top:12px">Quelles tâches rappeler ?</div>` + CATS_RAPPEL.map(c => interrupteur("", s.cats.includes(c), `<span class="chip" style="--c:${COULEURS[c]};margin:0">${c}</span>`, `data-rcat="${c}"`)).join("") +
    `<div class="row" style="gap:8px"><button class="btn sec" id="askperm" style="margin:10px 0">Autoriser les notifications</button><button class="btn sec" id="testson" style="margin:10px 0">Tester la sonnerie</button></div>` +
    `<div class="mute">Notifications : <b>${permFr}</b>.<br>Application ouverte : sonnerie choisie + vibration. Application en arrière-plan : notification avec le son par défaut du téléphone, tant que Chrome n'a pas été fermé par le système. <b>Pour une alarme garantie à 100 %, même téléphone verrouillé : exporte vers Google Agenda ci-dessous.</b></div></div>`;
  h += `<div class="card"><div class="h">Alarmes fiables : Google Agenda</div><div class="mute">Un fichier .ics : chaque bloc coché devient un événement hebdomadaire (26/10/2026 → 30/06/2027) avec une alarme ${s.lead} min avant, qui sonne avec la sonnerie de ton agenda. Ouvre-le avec Google Agenda.</div>` +
    CATS_ICS.map(c => interrupteur("", s.icsCats.includes(c), `<span class="chip" style="--c:${COULEURS[c]};margin:0">${c}</span>`, `data-icscat="${c}"`)).join("") +
    `<button class="btn" id="export-ics">Télécharger le calendrier (.ics)</button></div>`;
  h += `<div class="card"><div class="h">Sauvegarde</div><div class="mute">Tes cases cochées, journées et bilans restent sur ce téléphone. Exporte une copie de temps en temps.</div>` +
    `<button class="btn sec" id="export-xlsx">Exporter l'historique en Excel (.xlsx)</button><button class="btn sec" id="export-json">Exporter une sauvegarde (.json)</button><button class="btn sec" id="import-json">Importer une sauvegarde</button><input type="file" id="file-json" accept="application/json" hidden>` +
    `<button class="btn bad" id="reset">Effacer toutes les données</button></div>`;
  h += `<div class="card mute" style="text-align:center">Mon Plan · version ${VERSION_APP}<br>Abdellaoui Academy · données 100 % locales</div>`;
  return { sub: "Réglages", html: h };
}

/* ---------- Export .ics ---------- */
const icsEsc = t => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsFold = l => { let o = ""; while (l.length > 74) { o += l.slice(0, 74) + "\r\n "; l = l.slice(74); } return o + l; };
function construireICS() {
  const s = state.settings, L = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mon Plan Abdellaoui Academy//FR","CALSCALE:GREGORIAN","X-WR-CALNAME:Mon Plan 2026-27",
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
