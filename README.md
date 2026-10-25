# Mon Plan — Abdellaoui Academy (version 2.2)

Application web installable (PWA) : planning 2026-2027, suivi, historique et rappels. Aucune bibliothèque, 100 % local.

## Nouveautés 2.2
- **Mes tâches du jour** : liste proposée selon le jour de la semaine ; tu choisis, retires ou ajoutes tes propres tâches.
- **Case carrée à gauche** de chaque tâche : réalisée = Oui ; sur un jour passé, non cochée = Non.
- **Historique détaillé** : chaque jour garde la liste de ses tâches avec Oui/Non ; analyses « par matière » et « tâches les moins réalisées » dans Progrès.
- **Export Excel (.xlsx)** : feuilles Tâches, Journées, Par tâche (filtres prêts pour tableau croisé).

## Nouveautés 2.1
- **Type de journée** au lancement : Pleine / Semi-travail / Libre (modifiable à tout moment, jour par jour, aussi dans « Semaine »).
- **Cases à cocher** : l'avancement du jour (anneau, tâches, temps) se met à jour et est mémorisé.
- **Historique** : une fiche par jour (type, % fait, tâches cochées, note) ; on peut rouvrir et corriger un jour passé.
- **Progrès** : courbe d'avancement (+ moyenne 7 jours), heures par semaine, répartition par matière, carte de chaleur, énergie (bilans).
- **Rappel 5 min avant** la tâche suivante : bannière + sonnerie + vibration (app ouverte) et notification ; alarmes fiables via l'export Google Agenda (.ics).

## Structure
`index.html` · `css/style.css` · `js/` : `utils.js` (outils) · `state.js` (mémoire + règles + stats) · `charts.js` (graphiques SVG) · `notify.js` (rappels/sons) · `views.js` (écrans) · `xlsx.js` (export Excel) · `app.js` (événements) · `data.js` (planning généré) · `sw.js` (hors-ligne).
