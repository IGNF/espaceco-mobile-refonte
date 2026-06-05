# Scripts npm

Cette page décrit les principaux scripts npm disponibles dans le projet. Ces commandes sont définies dans le fichier `package.json` et couvrent le développement local, la génération du build web, la préparation des variantes applicatives, la synchronisation Capacitor, l'exécution sur mobile et le déclenchement des déploiements.

## Prérequis

Avant d'exécuter ces commandes, il faut avoir installé les dépendances du projet :

```bash
npm install
```

Les commandes liées à Capacitor supposent également que les projets natifs `ios/` et `android/` sont présents et configurés. Pour lancer une application sur un simulateur, un émulateur ou un appareil physique, l'environnement natif correspondant doit être disponible :

- Xcode pour iOS ;
- Android Studio et le SDK Android pour Android.

## Vue d'ensemble

| Commande | Usage principal |
| --- | --- |
| `npm run dev` | Démarrer le serveur de développement Vite. |
| `npm run build` | Préparer l'application sélectionnée, vérifier TypeScript et générer le build de production. |
| `npm run build-dev` | Générer un build avec le mode Vite `development`. |
| `npm run selectapp -- --espaceco` ou `npm run selectapp -- --naviforest` | Sélectionner une variante d'application, puis lancer un build. |
| `npm run selectapp:naviforest` | Sélectionner NaviForest, puis lancer un build. |
| `npm run selectapp:espaceco` | Sélectionner EspaceCo, puis lancer un build. |
| `npm run generate-apk` | Générer un APK Android debug. |
| `npm run capacitor-build` | Générer le build web de production, puis synchroniser Capacitor. |
| `npm run capacitor-build-dev` | Générer le build web de développement, puis synchroniser Capacitor. |
| `npm run capacitor-run-ios` | Builder, synchroniser, puis lancer l'application iOS. |
| `npm run capacitor-run-ios-dev` | Builder en mode développement, synchroniser, puis lancer l'application iOS. |
| `npm run capacitor-run-android` | Builder, synchroniser, puis lancer l'application Android. |
| `npm run capacitor-run-android-dev` | Builder en mode développement, synchroniser, puis lancer l'application Android. |
| `npm run open-xcode` | Ouvrir le projet iOS dans Xcode. |
| `npm run open-android` | Ouvrir le projet Android dans Android Studio. |
| `npm run deploy:ios` | Préparer un déploiement iOS. |
| `npm run deploy:android` | Préparer un déploiement Android. |
| `npm run deploy` | Préparer un déploiement iOS et Android. |

## Développement web

### `npm run dev`

Cette commande lance Vite :

```bash
vite
```

Elle démarre le serveur de développement local. C'est la commande à utiliser pendant le développement de l'interface React, avec rechargement automatique lors des modifications du code.

Cette commande ne prépare pas les assets natifs et ne synchronise pas Capacitor.

## Build web

### `npm run build`

Cette commande exécute :

```bash
node ./scripts/prepare-app.js && tsc -b && vite build
```

Elle effectue trois étapes :

1. `prepare-app.js` prépare la variante d'application sélectionnée.
2. `tsc -b` lance la vérification TypeScript du projet.
3. `vite build` génère le build web de production.

Le script `prepare-app.js` lit la sélection courante dans `scripts/.selected-app`. Si aucune sélection valide n'existe, il utilise EspaceCo par défaut. Il applique ensuite la configuration de l'application sélectionnée :

- copie le logo dans `src/assets/img/logo.png` ;
- génère `src/shared/config/appVariant.ts` ;
- met à jour `capacitor.config.ts` ;
- prépare les assets dans `resources/` ;
- génère les assets natifs Capacitor pour Android et iOS ;
- met à jour les identifiants et noms dans les projets natifs ;
- synchronise les versions applicatives sans incrémenter les numéros de build.

Cette commande est le build de référence avant une synchronisation Capacitor ou une livraison.

### `npm run build-dev`

Cette commande exécute :

```bash
node ./scripts/prepare-app.js && tsc -b && vite build --mode development
```

Elle suit le même enchaînement que `npm run build`, mais demande à Vite d'utiliser le mode `development`. Elle sert à générer un build web destiné à un usage de développement, tout en conservant les étapes de préparation de la variante applicative et de vérification TypeScript.

## Sélection de l'application

Le projet peut être préparé pour plusieurs variantes applicatives. La sélection est stockée dans le fichier `scripts/.selected-app`, puis utilisée par `prepare-app.js` lors du build.

### `npm run selectapp -- --espaceco` ou `npm run selectapp -- --naviforest`

Cette commande exécute :

```bash
node ./scripts/selectapp.js && npm run build
```

Le script `selectapp.js` attend une application en argument. La commande `npm run selectapp` seule ne suffit pas : elle affiche l'usage attendu et s'arrête. Les formes valides sont :

```bash
npm run selectapp -- --espaceco
npm run selectapp -- --naviforest
```

Après avoir écrit la sélection dans `scripts/.selected-app`, il lance automatiquement `npm run build`.

### `npm run selectapp:naviforest`

Cette commande exécute :

```bash
node ./scripts/selectapp.js --naviforest && npm run build
```

Elle sélectionne explicitement la variante NaviForest, puis lance un build de production.

### `npm run selectapp:espaceco`

Cette commande exécute :

```bash
node ./scripts/selectapp.js --espaceco && npm run build
```

Elle sélectionne explicitement la variante EspaceCo, puis lance un build de production.

## Capacitor

Les commandes Capacitor combinent le build web avec la synchronisation des assets et fichiers web vers les projets natifs.

### `npm run capacitor-build`

Cette commande exécute :

```bash
npm run build && npx cap sync
```

Elle génère le build web de production, puis synchronise Capacitor pour les plateformes natives configurées. C'est la commande à utiliser avant d'ouvrir ou compiler les projets natifs lorsque l'on veut embarquer la dernière version web de production.

### `npm run capacitor-build-dev`

Cette commande exécute :

```bash
npm run build-dev && npx cap sync
```

Elle génère un build web en mode `development`, puis synchronise Capacitor. Elle est utile pour tester sur mobile une version construite avec la configuration de développement.

### `npm run capacitor-run-ios`

Cette commande exécute :

```bash
npm run capacitor-build && npx cap run ios
```

Elle prépare un build de production, synchronise Capacitor, puis lance l'application iOS via Capacitor. Elle nécessite un environnement iOS fonctionnel avec Xcode.

### `npm run capacitor-run-ios-dev`

Cette commande exécute :

```bash
npm run capacitor-build-dev && npx cap run ios
```

Elle suit le même principe que `capacitor-run-ios`, mais avec un build web en mode `development`.

### `npm run capacitor-run-android`

Cette commande exécute :

```bash
npm run capacitor-build && npx cap run android
```

Elle prépare un build de production, synchronise Capacitor, puis lance l'application Android via Capacitor. Elle nécessite un environnement Android fonctionnel avec Android Studio, le SDK Android et un appareil ou émulateur disponible.

### `npm run capacitor-run-android-dev`

Cette commande exécute :

```bash
npm run capacitor-build-dev && npx cap run android
```

Elle suit le même principe que `capacitor-run-android`, mais avec un build web en mode `development`.

## Ouverture des projets natifs

### `npm run open-xcode`

Cette commande exécute :

```bash
npx cap open ios
```

Elle ouvre le projet iOS dans Xcode. Elle ne lance pas de build web et ne synchronise pas Capacitor. Si les fichiers web ou la configuration viennent de changer, il faut exécuter `npm run capacitor-build` ou `npm run capacitor-build-dev` avant d'ouvrir le projet.

### `npm run open-android`

Cette commande exécute :

```bash
npx cap open android
```

Elle ouvre le projet Android dans Android Studio. Elle ne lance pas de build web et ne synchronise pas Capacitor. Si les fichiers web ou la configuration viennent de changer, il faut exécuter `npm run capacitor-build` ou `npm run capacitor-build-dev` avant d'ouvrir le projet.

## APK Android

### `npm run generate-apk`

Cette commande exécute :

```bash
bash ./scripts/generate-apk.sh
```

Le script génère un APK Android debug :

1. lance `npm run build` ;
2. synchronise Capacitor pour Android avec `npx cap sync android` ;
3. exécute `./gradlew assembleDebug` dans le dossier `android/` ;
4. ouvre le dossier de sortie si le système le permet.

L'APK généré se trouve dans :

```text
android/app/build/outputs/apk/debug
```

Cette commande produit un APK de debug. Elle ne remplace pas le processus de déploiement ou de publication.

## Déploiement

Les commandes de déploiement utilisent `scripts/deploy.js`. Ce script prépare les numéros de build, crée un commit et pousse des tags Git utilisés par la CI/CD.

Avant d'exécuter ces commandes, le working tree Git doit être propre. Si des fichiers sont modifiés, le script s'arrête avec une erreur et demande de commit ou stash les changements.

Le script vérifie également la sélection d'application courante dans `scripts/.selected-app`. Si le fichier est absent ou inattendu, il affiche un avertissement.

### `npm run deploy:ios`

Cette commande exécute :

```bash
node ./scripts/deploy.js ios
```

Elle prépare un déploiement iOS uniquement. Le script incrémente les informations de build nécessaires pour iOS, crée un commit du type :

```text
chore: bump iOS build number
```

Puis il crée et pousse un tag Git au format :

```text
deploy/ios/YYYYMMDD-HHMMSS
```

### `npm run deploy:android`

Cette commande exécute :

```bash
node ./scripts/deploy.js android
```

Elle prépare un déploiement Android uniquement. Le script incrémente les informations de build nécessaires pour Android, crée un commit du type :

```text
chore: bump Android build number
```

Puis il crée et pousse un tag Git au format :

```text
deploy/android/YYYYMMDD-HHMMSS
```

### `npm run deploy`

Cette commande exécute :

```bash
node ./scripts/deploy.js both
```

Elle prépare un déploiement Android et iOS. Le script incrémente les informations de build pour les deux plateformes, crée un commit du type :

```text
chore: bump build numbers
```

Puis il crée et pousse deux tags Git :

```text
deploy/android/YYYYMMDD-HHMMSS
deploy/ios/YYYYMMDD-HHMMSS
```

Ces tags sont ensuite utilisés par les pipelines CI/CD.

## Points d'attention

- `npm run build` et `npm run build-dev` peuvent modifier des fichiers de configuration et des assets générés, car ils exécutent `prepare-app.js`.
- `npm run selectapp` doit recevoir une variante en argument ; les commandes `selectapp:*` sélectionnent directement une variante avant de builder.
- Les commandes `capacitor-run-*` lancent d'abord un build et une synchronisation Capacitor avant d'exécuter l'application native.
- Les commandes `open-xcode` et `open-android` ouvrent seulement les projets natifs ; elles ne synchronisent pas automatiquement les dernières modifications web.
- Les commandes `deploy:*` créent des commits et des tags Git, puis les poussent vers le dépôt distant.
