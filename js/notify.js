"use strict";
/* ==========================================================================
   notify.js — rappel de la tâche suivante (notification + sonnerie + vibration)
   Limite du web : le téléphone n'autorise une page à sonner que si l'application
   est ouverte (ou récemment utilisée). Pour une alarme garantie même téléphone
   verrouillé, utilise l'export Google Agenda (Réglages) — il sonne comme ton calendrier.
   ========================================================================== */
let audio = null;
const SONS = {
  carillon: { nom: "Carillon", notes: [[880, 0], [1108.7, .22], [1318.5, .44], [1760, .66]], dur: 1.1, type: "sine" },
  cloche:   { nom: "Cloche",   notes: [[523.3, 0], [784, .02], [1046.5, .04]], dur: 2.2, type: "triangle" },
  bip:      { nom: "Bip double", notes: [[1000, 0], [1000, .28]], dur: .2, type: "square" }
};
function deverrouilleAudio() {            // le navigateur exige un geste de l'utilisateur avant de jouer du son
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch {}
}
function jouerSon(nom = state.settings.sound, fois = 2) {
  const s = SONS[nom]; if (!s || nom === "aucun") return;
  deverrouilleAudio(); if (!audio) return;
  const vol = Math.max(0, Math.min(1, state.settings.volume));
  for (let r = 0; r < fois; r++) s.notes.forEach(([f, t]) => {
    const t0 = audio.currentTime + r * 1.6 + t, o = audio.createOscillator(), g = audio.createGain();
    o.type = s.type; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol * (s.type === "square" ? .25 : .5)), t0 + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + s.dur); o.start(t0); o.stop(t0 + s.dur + .05);
  });
}
function vibrer() { if (state.settings.vibrate && navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]); }

/* Quelle est la prochaine tâche à rappeler ? (type de journée respecté, déjà faites ignorées) */
function prochaineTache(now = new Date()) {
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  return tachesDuJour(now).filter(k => k.s != null && k.s > nowMin && state.settings.cats.includes(k.cat) && !fait(now, k)).sort((a, b) => a.s - b.s)[0] || null;
}
let bannieres = null;
function afficheBanniere(b, lead) {
  const el = $("#rappel"); if (!el) return;
  el.innerHTML = `<div class="r-ic">${icone("bell")}</div><div class="grow"><div class="eyebrow">Dans ${lead} min · ${hhmm(b.s)}</div><div class="r-t">${esc(b.act)}</div></div><button id="rappel-ok" class="r-ok">OK</button>`;
  el.hidden = false; clearTimeout(bannieres); bannieres = setTimeout(() => { el.hidden = true; }, 120000);
}
async function envoyerNotif(b, lead) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: hhmm(b.s) + " · " + b.act + (b.liv && b.liv !== "—" ? " — " + b.liv : ""), icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    tag: "monplan-" + b.id, renotify: true, silent: false, vibrate: [300, 150, 300, 150, 500], requireInteraction: true, data: { tab: "today" } };
  const titre = "Dans " + lead + " min : " + b.act.slice(0, 40);
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); reg ? reg.showNotification(titre, opts) : new Notification(titre, opts); } catch {}
}
function declencher(b, lead) {
  afficheBanniere(b, lead);
  if (!document.hidden) { jouerSon(); vibrer(); }      // page visible : on sonne nous-mêmes
  envoyerNotif(b, lead);                               // sinon : la notification sonne avec le son par défaut du téléphone
}
function verifierRappels(now = new Date()) {
  const s = state.settings; if (!s.remind) return;
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60, jour = iso(now);
  const b = prochaineTache(now); if (!b) return;
  const cleF = jour + "|" + b.id;
  if (nowMin >= b.s - s.lead && !state.fired[cleF]) {
    Object.keys(state.fired).forEach(k => { if (!k.startsWith(jour)) delete state.fired[k]; });
    state.fired[cleF] = true; save(); declencher(b, Math.max(1, Math.round(b.s - nowMin)));
  }
}
setInterval(() => verifierRappels(), 10000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) verifierRappels(); });
document.addEventListener("pointerdown", deverrouilleAudio, { once: true });
