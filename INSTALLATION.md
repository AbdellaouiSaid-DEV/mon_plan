# Installer « Mon Plan » sur abdellaouiacademy.com puis sur ton téléphone

## A. Mettre l'application en ligne (une seule fois, ≈ 10 min)
1. Connecte-toi à ton hébergement (hPanel ou cPanel) → **Gestionnaire de fichiers**.
2. Ouvre le dossier du site (souvent `public_html`) et crée un dossier nommé **`plan`**.
3. Dans `plan`, téléverse le zip puis **extrais-le** de façon à ce que `index.html` soit directement dans `plan/`
   (si tu obtiens `plan/mon-plan/index.html`, déplace le contenu un niveau plus haut).
4. Vérifie que ces éléments sont bien là : `index.html`, `sw.js`, `manifest.webmanifest`, `.htaccess` (fichier caché :
   active « Afficher les fichiers cachés »), et les dossiers `css/`, `js/`, `icons/`, `screenshots/`.
5. Ouvre **https://abdellaouiacademy.com/plan/** dans un navigateur : l'application doit s'afficher.

## B. L'installer sur ton Android
1. Ouvre l'adresse ci-dessus **dans Chrome** sur ton téléphone.
2. Menu ⋮ → **Installer l'application** (ou bouton « Installer sur mon téléphone » dans l'onglet Réglages).
3. L'icône « Mon Plan » apparaît sur l'écran d'accueil. Elle fonctionne aussi sans internet.
4. Réglages → **Télécharger le calendrier (.ics)** → ouvre-le avec Google Agenda pour avoir des alarmes fiables.

## C. Mettre à jour plus tard
1. Remplace les fichiers modifiés dans `plan/` (ex. `js/app.js`).
2. Change le numéro `VERSION` dans `sw.js` (ex. `monplan-v2.1.1`).
3. À l'ouverture suivante, l'application affiche « Nouvelle version installée » → Recharger.

## D. Si ça ne marche pas
| Problème | Cause probable | Solution |
|---|---|---|
| Page 404 | Mauvais dossier | `index.html` doit être dans `public_html/plan/` |
| Pas de bouton « Installer » | Pas en HTTPS, ou pas dans Chrome | Utiliser l'adresse https:// et Chrome |
| Ancienne version qui reste | Cache du site (LiteSpeed, WP Rocket…) | Exclure `/plan/` du cache, puis vider le cache |
| Manifest non reconnu | Type de fichier mal déclaré | Vérifier que `.htaccess` est présent (serveur Apache/LiteSpeed) |
| Le site est sur Nginx | `.htaccess` ignoré | Demander à l'hébergeur d'ajouter le type `application/manifest+json` |

## Confidentialité
Tes cases cochées et bilans restent **sur ton téléphone** (rien n'est envoyé au site). La page est en `noindex` :
Google ne la référence pas, et elle n'est liée depuis aucun menu WordPress.

## Alternative gratuite : GitHub Pages
Mets le contenu du dossier dans un dépôt GitHub, puis *Settings → Pages → branche main*. L'adresse devient
`https://TON-NOM.github.io/NOM-DU-DEPOT/`.
