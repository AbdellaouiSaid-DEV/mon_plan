"use strict";
/* ==========================================================================
   utils.js — constantes, petits outils, icônes
   ========================================================================== */
const VERSION_APP = "2.2.0";
const JOURS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const JOURS_ABR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DEBUT_PLAN = new Date(2026, 9, 26);              // lundi 26 octobre 2026 (mois 0-11 : 9 = octobre)
const FIN_PLAN = new Date(2027, 5, 30);
const FIN_PLAN_ICS = "20270630T230000Z";
// Catégories qu'on peut cocher (« tâches ») et catégories d'étude
const SUIVIS = new Set(["Étude","Revue","Sport","Marche","Admin"]);
const ETUDE = new Set(["Étude","Revue"]);
const DOMAINES = ["Maths","Physique","Informatique","Web-business","Prépa pro","Anglais","Espagnol","Français"];
const COULEURS = {"Sommeil":"#44546A","Routine":"#7A93B8","Trajet":"#8A94A3","Enseignement":"#2F6F6B","Prépa café":"#4E9C95","Sport":"#D9822B",
  "Récupération":"#D9A07A","Marche":"#5E9F67","Repas":"#C9A227","Étude":"#3B6FB6","Revue":"#7E57A8","Famille":"#C96B8A","Libre":"#6FB38A","Tampon":"#8E7CC3","Admin":"#A38F63"};
const COUL_DOM = {"Maths":"#2F5D9E","Physique":"#5B8DB8","Informatique":"#2F6F6B","Web-business":"#D9822B","Prépa pro":"#7E57A8","Anglais":"#C9A227","Espagnol":"#C96B8A","Français":"#5E9F67"};

const $ = (s, el = document) => el.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const hhmm = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parseIso = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const jourIdx = d => (d.getDay() + 6) % 7;              // lundi = 0 … dimanche = 6
const lundiDe = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - jourIdx(x)); return x; };
const ajouteJours = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const dateFr = d => JOURS[jourIdx(d)] + " " + d.getDate() + "/" + pad(d.getMonth() + 1);
const aujourdhui = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const dureeFr = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${pad(r)}` : `${h} h`) : `${r} min`; };
const moyenne = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

const ICONES = {   // icônes SVG (tracé simple, style « trait »)
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  week: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M9 9.5v11M15 9.5v11"/>',
  progress: '<path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  left: '<path d="m15 5-7 7 7 7"/>', right: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>'
};
const icone = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n]}</svg>`;
const ONGLETS = [["today","Aujourd'hui"],["week","Semaine"],["progress","Progrès"],["history","Historique"],["settings","Réglages"]];
