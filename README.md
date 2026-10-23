# Mon Plan 2026-27 — application locale (PWA)

Planning quotidien, suivi des blocs, bilan hebdomadaire avec alertes anti-burnout, rappels et export calendrier.
Aucune donnée ne quitte ton téléphone (tout est dans le stockage local).

## Structure
- `index.html` : la page unique
- `css/style.css` : l'apparence (clair/sombre automatique)
- `js/data.js` : le planning (généré depuis le classeur Excel)
- `js/app.js` : la logique (modes A/B/C, cases à cocher, bilan, rappels, export .ics)
- `sw.js` : service worker (fonctionne hors ligne)
- `manifest.webmanifest` + `icons/` : rend l'app installable

## Tester sur ordinateur
    python3 -m http.server 8000      # puis ouvrir http://localhost:8000

## Mettre à jour
Modifier un fichier, puis changer `VERSION` dans `sw.js` (ex. v1.0.2) pour que le téléphone récupère la nouvelle version.
