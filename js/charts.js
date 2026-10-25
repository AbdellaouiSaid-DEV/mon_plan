"use strict";
/* ==========================================================================
   charts.js — graphiques SVG faits à la main (aucune bibliothèque)
   Règles : traits fins, un seul axe, grille discrète, légende toujours visible,
   valeurs au toucher (infobulle) et tableau de secours pour l'accessibilité.
   ========================================================================== */
const svgOuvre = (W, H, label) => `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">`;
const fmtJ = k => k.slice(8) + "/" + k.slice(5, 7);

// Courbe : valeurs 0-100 par jour + moyenne glissante. pts = [{k, v}] (v peut être null)
function courbeJours(pts, label) {
  const W = 340, H = 170, L = 30, R = 8, T = 10, B = 24, n = pts.length;
  if (n < 2) return `<div class="mute">La courbe apparaît dès 2 jours d'historique.</div>`;
  const x = i => L + i * (W - L - R) / (n - 1), y = v => T + (100 - v) / 100 * (H - T - B);
  const lisse = pts.map((_, i) => { const w = pts.slice(Math.max(0, i - 6), i + 1).map(p => p.v).filter(v => v != null); return w.length ? moyenne(w) : null; });
  let g = [0, 50, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 5}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join("");
  const pas = Math.max(1, Math.ceil(n / 5));
  g += pts.map((p, i) => i % pas === 0 || i === n - 1 ? `<text x="${x(i)}" y="${H - 6}" class="ax" text-anchor="middle">${fmtJ(p.k)}</text>` : "").join("");
  const chemin = arr => { let d = "", on = false; arr.forEach((v, i) => { if (v == null) { on = false; return; } d += (on ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); on = true; }); return d; };
  const pointsV = pts.map((p, i) => p.v == null ? "" : `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${n > 40 ? 1.8 : 3}" class="dot" data-tip="${fmtJ(p.k)} · ${p.v} %"/>`).join("");
  return svgOuvre(W, H, label) + g + `<line x1="${L}" x2="${W - R}" y1="${y(80)}" y2="${y(80)}" class="goal"/>` +
    `<path d="${chemin(pts.map(p => p.v))}" class="l-day"/>${pointsV}<path d="${chemin(lisse)}" class="l-avg"/></svg>`;
}
// Barres verticales groupées : fait (plein) vs prévu (contour). rows = [{lib, fait, prevu}] en heures
function barresSemaines(rows, label) {
  const W = 340, H = 170, L = 30, R = 6, T = 12, B = 24, n = rows.length;
  if (!n) return `<div class="mute">Pas encore de données.</div>`;
  const max = Math.max(1, ...rows.map(r => Math.max(r.fait, r.prevu))), top = Math.ceil(max / 5) * 5 || 5;
  const y = v => T + (1 - v / top) * (H - T - B), bw = Math.min(22, (W - L - R) / n * .62), cx = i => L + (i + .5) * (W - L - R) / n;
  let g = [0, top / 2, top].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 5}" y="${y(v) + 4}" class="ax" text-anchor="end">${v % 1 ? v.toFixed(1) : v}</text>`).join("");
  rows.forEach((r, i) => {
    const hF = Math.max(0, (H - B) - y(r.fait));
    g += `<rect x="${cx(i) - bw / 2}" y="${y(r.prevu)}" width="${bw}" height="${(H - B) - y(r.prevu)}" rx="4" class="b-plan"/>`;
    g += `<rect x="${cx(i) - bw / 2}" y="${y(r.fait)}" width="${bw}" height="${hF}" rx="4" class="b-fait" data-tip="${esc(r.lib)} · ${r.fait.toFixed(1)} h faites / ${r.prevu.toFixed(1)} h prévues"/>`;
    g += `<text x="${cx(i)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(r.lib)}</text>`;
  });
  return svgOuvre(W, H, label) + g + `</svg>`;
}
// Anneau (donut) : parts = [{nom, v, c}]
function donut(parts, label) {
  const tot = parts.reduce((s, p) => s + p.v, 0); if (!tot) return `<div class="mute">Coche des blocs d'étude pour voir la répartition.</div>`;
  const R = 52, r = 34, C = 70; let a = -Math.PI / 2, g = "";
  parts.filter(p => p.v > 0).forEach(p => {
    const da = p.v / tot * 2 * Math.PI, a2 = a + da - (parts.length > 1 ? .04 : 0), big = da > Math.PI ? 1 : 0;
    const P = (rad, ang) => (C + rad * Math.cos(ang)).toFixed(2) + " " + (C + rad * Math.sin(ang)).toFixed(2);
    g += `<path d="M${P(R, a)} A${R} ${R} 0 ${big} 1 ${P(R, a2)} L${P(r, a2)} A${r} ${r} 0 ${big} 0 ${P(r, a)}Z" fill="${p.c}" data-tip="${esc(p.nom)} · ${dureeFr(p.v)} (${Math.round(100 * p.v / tot)} %)"/>`;
    a += da;
  });
  return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="${esc(label)}">${g}<text x="70" y="68" text-anchor="middle" class="d-big">${(tot / 60).toFixed(tot >= 6000 ? 0 : 1).replace(".", ",")}</text><text x="70" y="84" text-anchor="middle" class="ax">heures</text></svg>`;
}
// Carte de chaleur : une case par jour, colonnes = semaines (lundi en haut)
function chaleur(debut, fin) {
  const sem = Math.round((lundiDe(fin) - lundiDe(debut)) / 6048e5) + 1, cs = 17, W = 28 + sem * cs, H = 7 * cs + 18;
  let g = JOURS_ABR.map((j, i) => i % 2 === 0 ? `<text x="0" y="${14 + i * cs + 3}" class="ax">${j[0]}</text>` : "").join("");
  for (let s = 0; s < sem; s++) for (let j = 0; j < 7; j++) {
    const d = ajouteJours(lundiDe(debut), s * 7 + j); if (d < debut || d > fin) continue;
    const e = state.days[iso(d)], v = e && e.pp ? Math.round(100 * e.pd / e.pp) : null;
    const niv = !e ? "n" : e.t === "libre" && !e.pp ? "r" : v == null ? "n" : v >= 80 ? "4" : v >= 60 ? "3" : v >= 30 ? "2" : v > 0 ? "1" : "0";
    g += `<rect x="${24 + s * cs}" y="${10 + j * cs}" width="${cs - 3}" height="${cs - 3}" rx="3" class="hm hm${niv}" data-tip="${dateFr(d)} · ${!e ? "pas de donnée" : e.t === "libre" && !e.pp ? "journée libre" : (v ?? 0) + " %"}"/>`;
  }
  return `<div class="scrollx"><svg class="hmap" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Carte de chaleur des jours">${g}</svg></div>`;
}
// Courbes simples (bilans) : séries = [{nom, c, vals[]}] sur 1-5 ou heures
function courbesBilans(labels, series, label, max) {
  const W = 340, H = 140, L = 26, R = 10, T = 10, B = 22, n = labels.length;
  if (n < 2) return `<div class="mute">Disponible dès 2 bilans hebdomadaires.</div>`;
  const x = i => L + i * (W - L - R) / (n - 1), y = v => T + (1 - v / max) * (H - T - B);
  let g = [0, max / 2, max].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 5}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join("");
  g += labels.map((l, i) => `<text x="${x(i)}" y="${H - 5}" class="ax" text-anchor="middle">${l}</text>`).join("");
  series.forEach(s => {
    const d = s.vals.map((v, i) => v == null ? "" : (s.vals.slice(0, i).some(u => u != null) ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
    g += `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      s.vals.map((v, i) => v == null ? "" : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.4" fill="${s.c}" stroke="var(--surface)" stroke-width="2" data-tip="${esc(s.nom)} · ${labels[i]} : ${v}"/>`).join("");
  });
  return svgOuvre(W, H, label) + g + `</svg>`;
}
const legende = items => `<div class="legend">` + items.map(([n, c, t]) => `<span class="chip" style="--c:${c}">${esc(n)}${t ? " · " + esc(t) : ""}</span>`).join("") + `</div>`;

// Infobulle : toucher un point/une barre affiche sa valeur
document.addEventListener("click", e => {
  const el = e.target.closest("[data-tip]"), tip = $("#tip");
  if (!el) { tip.hidden = true; return; }
  tip.textContent = el.dataset.tip; tip.hidden = false;
  const r = el.getBoundingClientRect(), w = tip.offsetWidth;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  tip.style.top = Math.max(8, r.top - 40) + "px";
});
