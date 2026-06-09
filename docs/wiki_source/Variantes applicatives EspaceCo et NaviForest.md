# Variantes applicatives EspaceCo et NaviForest

Cette page décrit la manière dont le projet gère deux applications à partir du même code React, TypeScript et Capacitor :

- **EspaceCo** ;
- **NaviForest**.

Les deux applications partagent le même code source dans `src/`, les mêmes projets natifs `ios/` et `android/`, les mêmes workflows GitHub Actions et la même logique de build. La différence entre les applications est appliquée par les fichiers de configuration situés dans `scripts/EspaceCo/` et `scripts/NaviForest/`, puis par les scripts `selectapp.js` et `prepare-app.js`.

## Principe général

Le dépôt ne contient pas deux applications séparées. Il contient une application paramétrable.

La variante active est déterminée par le fichier :

```text
scripts/.selected-app
```

Ce fichier contient le nom de l'application sélectionnée :

```text
EspaceCo
```

ou :

```text
NaviForest
```

Lors d'un build, `scripts/prepare-app.js` lit cette sélection, charge la configuration correspondante, puis met à jour les fichiers web, Capacitor et natifs nécessaires avant que Vite construise l'application.

Si `scripts/.selected-app` est absent ou contient une valeur invalide, `prepare-app.js` utilise **EspaceCo** par défaut.

## Commandes de sélection

Les commandes recommandées sont :

```bash
npm run selectapp:espaceco
npm run selectapp:naviforest
```

Elles exécutent :

```bash
node ./scripts/selectapp.js --espaceco && npm run build
node ./scripts/selectapp.js --naviforest && npm run build
```

Il est aussi possible d'utiliser la commande générique :

```bash
npm run selectapp -- --espaceco
npm run selectapp -- --naviforest
```

Le script `scripts/selectapp.js` fait uniquement deux choses :

1. il vérifie que l'argument correspond à `espaceco` ou `naviforest` ;
2. il écrit `EspaceCo` ou `NaviForest` dans `scripts/.selected-app`.

La commande npm lance ensuite `npm run build`, ce qui déclenche `scripts/prepare-app.js`.

## Source de vérité des variantes

Chaque variante possède son propre répertoire dans `scripts/`.

```text
scripts/
├── EspaceCo/
│   ├── config.js
│   ├── logo.png
│   └── assets/
└── NaviForest/
    ├── config.js
    ├── logo.png
    ├── appli.css
    ├── page/
    └── assets/
```

Les fichiers réellement utilisés par le nouveau projet sont :

- `config.js` : nom, identifiants natifs, version et guichet éventuel ;
- `logo.png` : logo copié vers `src/assets/img/logo.png` ;
- `assets/` : sources utilisées pour générer les assets natifs Capacitor.

Les fichiers historiques comme `appli.css` ou certains fichiers dans `page/` peuvent exister pour compatibilité ou héritage. Ils ne sont pas le mécanisme principal de configuration runtime du nouveau projet React.

## Configuration EspaceCo

La configuration EspaceCo est définie dans :

```text
scripts/EspaceCo/config.js
```

Elle contient notamment :

```js
export default {
  appli: "Espace Collaboratif",
  name: "EspaceCo",
  displayName: "Espace collaboratif IGN",
  guichetID: undefined,
  versionNumber: "3.1.0",
  ios: {
    bundleId: "fr.ign.collaboratif"
  },
  android: {
    packageName: "fr.ign.guichet"
  }
}
```

Points importants :

- `displayName` est le nom affiché de l'application ;
- `guichetID` vaut `undefined`, donc l'utilisateur peut choisir parmi ses groupes ;
- `ios.bundleId` devient l'identifiant iOS ;
- `android.packageName` devient l'identifiant Android ;
- `versionNumber` est propagé dans les projets natifs comme version fonctionnelle.

## Configuration NaviForest

La configuration NaviForest est définie dans :

```text
scripts/NaviForest/config.js
```

Elle contient notamment :

```js
export default {
  appli: "Naviforest",
  guichetID: 658,
  name: "Naviforest",
  displayName: "Naviforest",
  versionNumber: "3.1.0",
  ios: {
    bundleId: "fr.ign.navi-forest"
  },
  android: {
    packageName: "fr.ign.naviforest"
  }
}
```

La différence fonctionnelle principale est `guichetID`.

Pour NaviForest, `guichetID: 658` est converti en `fixedCommunityId`. L'application force alors le guichet NaviForest et désactive le changement de groupe dans les écrans concernés.

## Configuration runtime générée

Le code React ne lit pas directement `scripts/EspaceCo/config.js` ou `scripts/NaviForest/config.js`.

Pendant `npm run build`, `prepare-app.js` génère :

```text
src/shared/config/appVariant.ts
```

Ce fichier expose :

```ts
export interface AppVariantConfig {
  name: string;
  displayName: string;
  fixedCommunityId?: number;
  canSwitchCommunity: boolean;
  noAccessTitle: string;
  noAccessMessage: string;
}
```

Pour EspaceCo :

- `fixedCommunityId` vaut `undefined` ;
- `canSwitchCommunity` vaut `true` ;
- l'utilisateur peut sélectionner un groupe parmi ses communautés.

Pour NaviForest :

- `fixedCommunityId` vaut `658` ;
- `canSwitchCommunity` vaut `false` ;
- l'application sélectionne automatiquement le guichet NaviForest si l'utilisateur y a accès ;
- les messages d'erreur indiquent que l'accès au guichet NaviForest est requis.

Ce fichier est généré. Il ne faut pas le modifier manuellement pour changer durablement une variante. La modification serait écrasée au prochain `npm run build`.

## Effets de `prepare-app.js`

Le script `scripts/prepare-app.js` est exécuté au début de :

```bash
npm run build
npm run build-dev
```

Il est donc aussi exécuté indirectement par les commandes Capacitor et par les workflows CI/CD.

Il applique les étapes suivantes.

### 1. Lecture de la variante sélectionnée

Le script lit :

```text
scripts/.selected-app
```

Valeurs acceptées :

- `EspaceCo` ;
- `NaviForest`.

En cas d'absence ou de valeur invalide, le script affiche un avertissement et utilise `EspaceCo`.

### 2. Chargement de la configuration

Selon la sélection, il importe :

```text
scripts/EspaceCo/config.js
```

ou :

```text
scripts/NaviForest/config.js
```

Le fichier doit exporter une configuration par défaut.

### 3. Logo web

Le logo de la variante est copié vers :

```text
src/assets/img/logo.png
```

Source :

```text
scripts/<Application>/logo.png
```

### 4. Configuration React

Le fichier suivant est régénéré :

```text
src/shared/config/appVariant.ts
```

Il contient les informations nécessaires au runtime React : nom, nom affiché, guichet forcé éventuel, autorisation de changement de groupe et messages d'accès.

### 5. Configuration Capacitor

Le fichier suivant est mis à jour :

```text
capacitor.config.ts
```

Les propriétés concernées sont notamment :

- `appName` ;
- `appId` ;
- `ios.appId` ;
- `android.appId`.

Le projet utilise un cas particulier : l'identifiant iOS et l'identifiant Android peuvent être différents. `prepare-app.js` écrit donc explicitement les valeurs iOS et Android à partir de `config.js`.

### 6. Assets Capacitor

Les fichiers sources de la variante sont copiés vers `resources/` :

```text
resources/icon.png
resources/splash.png
resources/splash-dark.png
resources/android/icon-background.png
resources/android/icon-foreground.png
```

Sources :

```text
scripts/<Application>/assets/
```

Le script lance ensuite :

```bash
npx @capacitor/assets generate --android
npx @capacitor/assets generate --ios
```

Ces commandes génèrent les icônes et splash screens dans les projets natifs.

### 7. Projet iOS

Le script met à jour :

```text
ios/App/App.xcodeproj/project.pbxproj
ios/App/App/Info.plist
```

Effets principaux :

- `PRODUCT_BUNDLE_IDENTIFIER` prend la valeur de `ios.bundleId` ;
- `CFBundleDisplayName` prend la valeur de `displayName` ;
- `MARKETING_VERSION` prend la valeur de `versionNumber`.

Le numéro de build iOS, `CURRENT_PROJECT_VERSION`, n'est pas incrémenté par `prepare-app.js`.

### 8. Projet Android

Le script met à jour :

```text
android/app/build.gradle
android/app/src/main/AndroidManifest.xml
android/app/src/main/res/values/strings.xml
android/app/src/main/java/**/MainActivity.java
```

Effets principaux :

- `applicationId` prend la valeur de `android.packageName` ;
- `namespace` prend la valeur de `android.packageName` ;
- `versionName` prend la valeur de `versionNumber` ;
- `app_name` et `title_activity_main` prennent la valeur de `displayName` ;
- `package_name` et `custom_url_scheme` prennent la valeur du package Android ;
- `MainActivity.java` est déplacé dans le package Java correspondant si nécessaire ;
- l'autorité `FileProvider` reste basée sur le placeholder Gradle `${applicationId}`.

Le `versionCode` Android n'est pas incrémenté par `prepare-app.js`.

## Fichiers générés ou modifiés

Après une sélection ou un build, il est normal de voir certains fichiers changer.

Fichiers web :

- `src/assets/img/logo.png` ;
- `src/shared/config/appVariant.ts`.

Fichiers Capacitor :

- `capacitor.config.ts` ;
- `resources/icon.png` ;
- `resources/splash.png` ;
- `resources/splash-dark.png` ;
- `resources/android/icon-background.png` ;
- `resources/android/icon-foreground.png`.

Fichiers iOS :

- `ios/App/App.xcodeproj/project.pbxproj` ;
- `ios/App/App/Info.plist` ;
- assets générés dans le projet iOS.

Fichiers Android :

- `android/app/build.gradle` ;
- `android/app/src/main/AndroidManifest.xml` ;
- `android/app/src/main/res/values/strings.xml` ;
- `android/app/src/main/java/**/MainActivity.java` ;
- assets générés dans le projet Android.

Ces changements représentent l'état préparé pour une variante donnée. Avant une livraison, il faut vérifier que ces fichiers correspondent bien à l'application cible.

## Sélection et CI/CD

Les workflows GitHub Actions Android et iOS relisent eux aussi :

```text
scripts/.selected-app
```

Si le fichier est absent, les workflows utilisent **EspaceCo** par défaut.

Pour livrer NaviForest, il faut donc que le commit portant le tag de déploiement contienne :

```text
scripts/.selected-app
```

avec :

```text
NaviForest
```

Les commandes :

```bash
npm run deploy:ios
npm run deploy:android
npm run deploy
```

ne sélectionnent pas l'application à votre place. Elles vérifient seulement que `scripts/.selected-app` existe et contient une valeur attendue, puis elles incrémentent les numéros de build et poussent les tags de déploiement.

Avant une livraison, la séquence recommandée est donc :

```bash
git status
npm run selectapp:espaceco
# ou
npm run selectapp:naviforest
git status
npm run deploy:ios
# ou npm run deploy:android
# ou npm run deploy
```

Le point important est de contrôler le `git status` après la sélection. Le build peut avoir modifié des fichiers natifs, Capacitor ou d'assets.

## Versions et numéros de build

La version fonctionnelle est définie dans chaque fichier de variante :

```text
scripts/EspaceCo/config.js
scripts/NaviForest/config.js
```

Propriété :

```js
versionNumber: "3.1.0"
```

Pendant `npm run build`, cette version est propagée vers :

- `versionName` côté Android ;
- `MARKETING_VERSION` côté iOS.

Les numéros de build sont gérés séparément :

- Android : `versionCode` ;
- iOS : `CURRENT_PROJECT_VERSION`.

Ils sont incrémentés par :

```text
scripts/bump-build.js
```

via :

```text
scripts/deploy.js
```

Le build number de base est calculé à partir de `major.minor.patch`. Par exemple, `3.1.0` donne une base `30100`. Si le numéro actuel est déjà supérieur ou égal à cette base, il est simplement incrémenté de 1.

## Comportement fonctionnel lié au guichet

Le champ `guichetID` de `config.js` contrôle le comportement de sélection de communauté.

### `guichetID: undefined`

Cas EspaceCo.

L'application ne force pas de guichet :

- `fixedCommunityId` est absent ;
- `canSwitchCommunity` vaut `true` ;
- l'utilisateur peut choisir sa communauté active ;
- les menus et écrans de sélection de groupe restent disponibles.

### `guichetID: 658`

Cas NaviForest.

L'application force un guichet :

- `fixedCommunityId` vaut `658` ;
- `canSwitchCommunity` vaut `false` ;
- l'application cherche automatiquement ce guichet dans les communautés de l'utilisateur ;
- si l'utilisateur n'a pas accès au guichet requis, les écrans de sélection affichent le message d'accès généré ;
- les entrées de menu liées au changement de groupe sont masquées ou désactivées selon les écrans.

Le runtime utilise principalement `appVariant` via `CommunityProvider`, les pages de sélection de communauté et certains composants de navigation.

## Secrets et variables d'environnement

La sélection de variante ne remplace pas les variables d'environnement.

Les variables OAuth et API restent fournies par :

- `.env` en local ;
- les secrets GitHub Actions en CI/CD.

Les workflows choisissent les secrets OAuth mobiles spécifiques à l'application sélectionnée, par exemple :

- `VITE_OAUTH_ANDROID_REDIRECT_URI_ESPACECO` ;
- `VITE_OAUTH_ANDROID_REDIRECT_URI_NAVIFOREST` ;
- `VITE_OAUTH_IOS_REDIRECT_URI_ESPACECO` ;
- `VITE_OAUTH_IOS_REDIRECT_URI_NAVIFOREST` ;
- `VITE_OAUTH_CLIENT_ID_ESPACECO` ;
- `VITE_OAUTH_CLIENT_ID_NAVIFOREST`.

La cohérence à vérifier pour chaque application est donc :

- identifiant natif dans `config.js` ;
- redirect URI OAuth dans `.env` ou les secrets GitHub ;
- redirect URI déclarée côté Keycloak ;
- schéma natif présent dans Android et iOS.

La page `Variables d'environnement` détaille les variables OAuth et les redirect URIs.

## Ajouter une nouvelle variante

Pour ajouter une variante supplémentaire, il ne suffit pas d'ajouter un fichier `.env`.

Checklist technique :

1. Créer un répertoire :

```text
scripts/NouvelleApp/
```

2. Ajouter un fichier :

```text
scripts/NouvelleApp/config.js
```

avec au minimum :

```js
export default {
  appli: "Nom interne",
  name: "NouvelleApp",
  displayName: "Nom affiché",
  guichetID: undefined,
  versionNumber: "1.0.0",
  ios: {
    bundleId: "fr.ign.nouvelle-app"
  },
  android: {
    packageName: "fr.ign.nouvelleapp"
  }
}
```

3. Ajouter les assets attendus :

```text
scripts/NouvelleApp/logo.png
scripts/NouvelleApp/assets/icon.png
scripts/NouvelleApp/assets/splash.png
scripts/NouvelleApp/assets/splash-dark.png
```

Si des assets adaptatifs Android sont nécessaires :

```text
scripts/NouvelleApp/assets/android/icon-background.png
scripts/NouvelleApp/assets/android/icon-foreground.png
```

4. Modifier `scripts/selectapp.js` pour accepter la nouvelle application.

5. Vérifier que `scripts/prepare-app.js` accepte bien la nouvelle valeur dans `readSelection()`.

6. Ajouter, si souhaité, une commande npm dédiée dans `package.json`.

7. Provisionner les secrets CI/CD :

- OAuth web et mobile ;
- signature Android ;
- provisioning profile iOS ;
- `ExportOptions.plist` iOS ;
- accès Play Store ou TestFlight selon la cible.

8. Déclarer les redirect URIs dans Keycloak.

9. Vérifier les identifiants natifs dans Apple Developer, App Store Connect, Google Play Console et Android.

10. Lancer :

```bash
npm run selectapp -- --nouvelleapp
npm run build
npx cap sync
```

11. Tester au minimum :

- lancement web ;
- login OAuth ;
- callback mobile iOS et Android ;
- accès au guichet attendu ;
- icône et splash screen ;
- build natif local si possible.

## Points d'attention

- `src/shared/config/appVariant.ts` est généré : modifier `scripts/<Application>/config.js` plutôt que ce fichier.
- `src/assets/img/logo.png` est remplacé à chaque préparation d'application.
- Les fichiers natifs peuvent changer après un simple `npm run build`, car `prepare-app.js` est exécuté avant Vite.
- `npm run deploy:*` ne choisit pas l'application cible. Il faut sélectionner la variante avant.
- En CI/CD, une absence de `scripts/.selected-app` revient à construire EspaceCo.
- NaviForest dépend de son `guichetID`. Si l'identifiant du guichet change, mettre à jour `scripts/NaviForest/config.js` et tester l'accès avec un compte membre.
- Les identifiants iOS et Android peuvent être différents pour une même application. Ne pas déduire automatiquement l'un depuis l'autre.
- Les redirect URIs OAuth doivent rester cohérentes avec les identifiants natifs et la configuration Keycloak.
- Les assets natifs sont générés à partir de `resources/`, eux-mêmes alimentés par `scripts/<Application>/assets/`.

## Diagnostic rapide

### La mauvaise application est buildée

Vérifier :

```bash
cat scripts/.selected-app
```

Puis relancer :

```bash
npm run selectapp:espaceco
# ou
npm run selectapp:naviforest
```

### Le nom ou l'icône n'est pas le bon

Vérifier :

- `scripts/<Application>/config.js` ;
- `scripts/<Application>/logo.png` ;
- `scripts/<Application>/assets/` ;
- les logs de `npm run build` ;
- les assets générés après `npx @capacitor/assets generate`.

### NaviForest laisse changer de groupe

Vérifier que :

- `scripts/.selected-app` contient `NaviForest` ;
- `scripts/NaviForest/config.js` contient bien `guichetID: 658` ;
- `src/shared/config/appVariant.ts` a été régénéré avec `fixedCommunityId: 658` et `canSwitchCommunity: false`.

### L'utilisateur NaviForest n'a pas accès à l'application

Vérifier :

- que le compte est membre actif du guichet `658` ;
- que le rôle n'est pas `pending` ;
- que l'API retourne bien ce guichet dans les communautés de l'utilisateur ;
- que `fixedCommunityId` correspond à l'identifiant attendu.

### Le callback OAuth mobile échoue

Vérifier :

- la redirect URI de l'application sélectionnée ;
- le client OAuth Keycloak ;
- le schéma natif Android ou iOS ;
- les secrets GitHub Actions si l'erreur apparaît uniquement en CI ;
- le fichier `.env` si l'erreur apparaît uniquement en local.

### La CI publie la mauvaise application

Vérifier dans le commit tagué :

- le contenu de `scripts/.selected-app` ;
- les fichiers natifs modifiés par `prepare-app.js` ;
- les secrets de l'application sélectionnée ;
- le tag utilisé : `deploy/ios/*` ou `deploy/android/*`.
