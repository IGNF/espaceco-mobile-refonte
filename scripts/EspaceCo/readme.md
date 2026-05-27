# Application EspaceCo

Ce répertoire contient les fichiers utilisés par `scripts/prepare-app.js` quand l'application sélectionnée est EspaceCo.

## Fichiers utilisés

- `config.js` définit le nom de l'application, les identifiants natifs, la version et le guichet éventuel.
- `logo.png` est copié vers `src/assets/img/logo.png`.
- `assets/` alimente `resources/` avant la génération des assets natifs Capacitor.

Le script ne copie plus ce répertoire dans `src/appli`. La configuration utilisée au runtime React est générée dans `src/shared/config/appVariant.ts`.
