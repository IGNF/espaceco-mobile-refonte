# Pipeline Android (CI/CD)

Ce document décrit le workflow GitHub Actions `.github/workflows/android-action.yml`, les secrets nécessaires et les opérations courantes pour livrer l'application Android sur la piste interne du Play Store.

## Vue d'ensemble

Le pipeline se déclenche lorsqu'un tag `deploy/android/*` est poussé ou manuellement via `workflow_dispatch`.

Les commandes `npm run deploy:android` et `npm run deploy` créent les tags de déploiement automatiquement. Elles incrémentent aussi le `versionCode`, créent un commit, puis poussent le commit et le tag.

Un lancement manuel via `workflow_dispatch` exécute le workflow tel quel, mais ne lance pas `scripts/deploy.js` : il ne crée donc ni commit de bump, ni tag de déploiement.

Le workflow Android :

1. détecte l'application sélectionnée dans `scripts/.selected-app` ;
2. génère un fichier `.env` à partir des secrets GitHub ;
3. installe les dépendances Node ;
4. lance `npm run build` ;
5. génère les assets Capacitor Android ;
6. synchronise Capacitor avec le projet Android ;
7. compile les artefacts Android en release ;
8. signe l'AAB ;
9. publie l'AAB signé sur la piste interne du Play Store.

Si `scripts/.selected-app` est absent, le workflow utilise `EspaceCo` par défaut.

## Environnement d'exécution

Le job `build-and-deploy-android-app` s'exécute sur `ubuntu-latest`.

Les versions utilisées par le workflow sont :

- Node.js `22` ;
- Java Temurin `21` ;
- Android build tools `34.0.0` pour l'action de signature.

## Secrets requis

Tous les secrets sont à déclarer dans le dépôt GitHub, dans *Settings -> Secrets and variables -> Actions*.

### Variables d'environnement de l'application

Ces secrets sont écrits dans le fichier `.env` généré par la CI avant le build Vite.

| Secret GitHub | Variable écrite dans `.env` | Application | Usage |
| --- | --- | --- | --- |
| `VITE_OAUTH_ANDROID_REDIRECT_URI_ESPACECO` | `VITE_OAUTH_ANDROID_REDIRECT_URI` | EspaceCo | URI de callback OAuth Android pour EspaceCo. |
| `VITE_OAUTH_ANDROID_REDIRECT_URI_NAVIFOREST` | `VITE_OAUTH_ANDROID_REDIRECT_URI` | NaviForest | URI de callback OAuth Android pour NaviForest. |
| `VITE_OAUTH_CLIENT_ID_ESPACECO` | `VITE_OAUTH_CLIENT_ID` | EspaceCo | Identifiant du client OAuth Keycloak pour EspaceCo. |
| `VITE_OAUTH_CLIENT_ID_NAVIFOREST` | `VITE_OAUTH_CLIENT_ID` | NaviForest | Identifiant du client OAuth Keycloak pour NaviForest. |
| `VITE_OAUTH_WEB_REDIRECT_URI` | `VITE_OAUTH_WEB_REDIRECT_URI` | Commun | URI de callback OAuth web. Elle reste présente dans le build même pour Android. |
| `VITE_OAUTH_BASE_URL` | `VITE_OAUTH_BASE_URL` | Commun | URL OpenID Connect du realm Keycloak. |
| `VITE_BASE_API_URL` | `VITE_BASE_API_URL` | Commun | URL de base de l'API collaborative. |

Le workflow choisit automatiquement les secrets Android spécifiques à EspaceCo ou NaviForest selon la valeur de `SELECTED_APP`.

### Variables applicatives optionnelles

Ces secrets sont encore pris en charge par le workflow, mais ils sont optionnels. La configuration principale de la variante vient des fichiers `scripts/EspaceCo/config.js` et `scripts/NaviForest/config.js`, appliqués par `scripts/prepare-app.js`.

| Secret GitHub | Variable écrite dans `.env` | Usage |
| --- | --- | --- |
| `VITE_APPLI` | `VITE_APPLI` | Type d'application exposé dans `config.app.type`. |
| `VITE_APPLI_ID` | `VITE_APPLI_ID` | Identifiant applicatif exposé dans `config.app.id`. |
| `VITE_APPLI_NAME` | `VITE_APPLI_NAME` | Nom applicatif exposé dans `config.app.name`. |

### Signature Android

| Secret GitHub | Application | Usage | Comment l'obtenir |
| --- | --- | --- | --- |
| `SIGNING_KEY_ESPACECO` | EspaceCo | Keystore Android `.jks` encodé en base64. | Encoder le fichier keystore avec `base64 -i keystore.jks | pbcopy`. |
| `ALIAS_ESPACECO` | EspaceCo | Alias de la clé dans le keystore EspaceCo. | Valeur connue avec le keystore. |
| `KEY_PASSWORD_ESPACECO` | EspaceCo | Mot de passe de la clé privée EspaceCo. | Valeur connue avec le keystore. |
| `SIGNING_KEY_NAVIFOREST` | NaviForest | Keystore Android `.jks` encodé en base64. | Même procédure que pour EspaceCo. |
| `ALIAS_NAVIFOREST` | NaviForest | Alias de la clé dans le keystore NaviForest. | Valeur connue avec le keystore. |
| `KEY_PASSWORD_NAVIFOREST` | NaviForest | Mot de passe de la clé privée NaviForest. | Valeur connue avec le keystore. |
| `KEY_STORE_PASSWORD` | Commun | Mot de passe du keystore `.jks`. | Valeur connue avec le keystore. |

### Publication Play Store

| Secret GitHub | Usage | Comment l'obtenir |
| --- | --- | --- |
| `SERVICE_ACCOUNT_JSON` | JSON du compte de service Google Play utilisé par `r0adkll/upload-google-play@v1`. | Créer une clé JSON pour le compte de service dans Google Cloud / Play Console, puis coller le contenu JSON brut dans le secret. |

Le workflow utilise `serviceAccountJsonPlainText`, donc `SERVICE_ACCOUNT_JSON` doit contenir le JSON en clair, pas une version base64.

## Déroulé du workflow

1. **Checkout (`actions/checkout@v4`)** : récupère le dépôt.
2. **Setup Node.js (`actions/setup-node@v4`)** : installe Node.js `22` avec cache `npm`.
3. **Détection de l'application** : lit `scripts/.selected-app`, ou utilise `EspaceCo` par défaut.
4. **Création du fichier `.env`** : crée un fichier vide.
5. **Injection des secrets dans `.env`** :
   - écrit les variables OAuth Android selon l'application sélectionnée ;
   - écrit les variables communes `VITE_OAUTH_WEB_REDIRECT_URI`, `VITE_OAUTH_BASE_URL` et `VITE_BASE_API_URL` ;
   - écrit les overrides applicatifs optionnels si les secrets existent.
6. **Installation des dépendances** : exécute `npm ci`.
7. **Build web** : exécute `npm run build`.
8. **Génération des assets Capacitor Android** : exécute `npx @capacitor/assets generate --android`.
9. **Synchronisation Capacitor Android** : exécute `npx cap sync android`.
10. **Setup Java (`actions/setup-java@v4`)** : installe Temurin `21`.
11. **Vérification des build tools Android** : liste les build tools disponibles sur le runner.
12. **Paramètres de signature Android** :
    - choisit les secrets de signature EspaceCo ou NaviForest ;
    - extrait `applicationId` depuis `android/app/build.gradle` ;
    - exporte le résultat dans `PACKAGE_NAME`.
13. **Build Gradle** : exécute `./gradlew --no-daemon assembleRelease bundleRelease`.
14. **Signature de l'AAB** : signe le bundle avec `r0adkll/sign-android-release@v1`.
15. **Upload artifact GitHub** : publie l'AAB signé comme artefact `android-signed-aab` pendant 3 jours.
16. **Publication Play Store** : publie l'AAB signé sur la piste `internal` avec le statut `completed`.

## Sélection de l'application

La sélection de l'application se fait avant le déploiement, en local :

```bash
npm run selectapp:espaceco
npm run selectapp:naviforest
```

Ces commandes mettent à jour `scripts/.selected-app` et lancent un build. Le fichier doit être présent dans le commit poussé avant la création du tag de déploiement.

La configuration native est appliquée par `npm run build`, via `scripts/prepare-app.js`. Ce script met notamment à jour :

- `capacitor.config.ts` ;
- le logo et les assets ;
- les identifiants natifs ;
- `android/app/build.gradle` ;
- le package de `MainActivity.java` ;
- les versions natives à partir de `versionNumber`.

Si NaviForest est sélectionnée, les secrets de signature NaviForest doivent être renseignés (`SIGNING_KEY_NAVIFOREST`, `ALIAS_NAVIFOREST`, `KEY_PASSWORD_NAVIFOREST`). Le workflow Android actuel ne remplace pas automatiquement une signature NaviForest manquante par une signature EspaceCo ; l'étape de signature ou de publication échouera si ces secrets ne sont pas valides.

## Maintenance

### Keystores Android

Le projet conserve une différence importante entre les deux applications :

- pour signer EspaceCo, le secret `SIGNING_KEY_ESPACECO` contient le keystore encodé en base64 utilisé pour cette application ;
- pour signer NaviForest, le secret `SIGNING_KEY_NAVIFOREST` contient un keystore différent, également utilisé par d'autres applications.

Les secrets de signature sont spécifiques à chaque application. Si un keystore ou une clé de signature est remplacé, il faut mettre à jour les secrets correspondants :

- `SIGNING_KEY_<APP>` ;
- `ALIAS_<APP>` ;
- `KEY_PASSWORD_<APP>` ;
- `KEY_STORE_PASSWORD` si le mot de passe du keystore change.

À terme, il serait préférable d'uniformiser ce comportement et d'utiliser le même modèle de gestion de keystore pour les deux applications. Cela implique cependant une action côté Google Play Console pour l'application concernée : aller dans **Test and release -> App integrity -> Play app signing**, ouvrir les **settings**, puis utiliser **Request upload key reset** dans la section **Upload key certificate**.

Cette procédure est également nécessaire si la clé d'upload Play Store change.

### Compte de service Google Play

Le compte de service utilisé par `SERVICE_ACCOUNT_JSON` doit avoir les droits nécessaires pour publier sur la piste interne. Vérifier notamment que le rôle **Release Manager**, ou un rôle équivalent, est attribué côté Play Console.

En cas de rotation de la clé JSON, remplacer le contenu JSON brut du secret `SERVICE_ACCOUNT_JSON`. Le workflow utilise `serviceAccountJsonPlainText`, donc ce secret doit contenir le JSON en clair et non une version encodée en base64.

### Variables API et OAuth

Les anciens secrets de l'application legacy (`COLLAB_API_CLIENT_ID`, `COLLAB_API_CLIENT_SECRET`, `BASE_AUTH_URL`, `QLF_*`, `SECRET`, etc.) ne sont plus ceux utilisés par ce workflow.

Pour changer les paramètres d'API ou d'authentification du nouveau projet, mettre à jour les secrets `VITE_BASE_API_URL`, `VITE_OAUTH_BASE_URL`, `VITE_OAUTH_WEB_REDIRECT_URI`, `VITE_OAUTH_CLIENT_ID_<APP>` et `VITE_OAUTH_ANDROID_REDIRECT_URI_<APP>`.

### Version applicative

La version fonctionnelle de l'application est définie dans les fichiers de configuration de variante :

- `scripts/EspaceCo/config.js` ;
- `scripts/NaviForest/config.js`.

La propriété `versionNumber` est propagée dans le projet Android par `scripts/prepare-app.js` pendant `npm run build`. Le script `npm run deploy:android` incrémente ensuite uniquement le `versionCode`, à partir de la version native courante.

## Dépannage

- **Mauvaise application construite** : vérifier le contenu de `scripts/.selected-app` dans le commit qui porte le tag.
- **Erreur OAuth au lancement de l'app** : vérifier `VITE_OAUTH_CLIENT_ID_<APP>`, `VITE_OAUTH_ANDROID_REDIRECT_URI_<APP>` et la configuration Keycloak.
- **Erreur de signature** : vérifier que `SIGNING_KEY_<APP>`, `ALIAS_<APP>`, `KEY_PASSWORD_<APP>` et `KEY_STORE_PASSWORD` correspondent au même keystore.
- **Erreur Play Store** : vérifier que `SERVICE_ACCOUNT_JSON` contient le JSON brut et que le compte de service a les droits de publication.
- **Erreur de package name** : vérifier que `scripts/<App>/config.js` contient le bon `android.packageName`, puis relancer `npm run build`.
- **Version incorrecte** : vérifier `versionNumber` dans `scripts/<App>/config.js` et les logs de `npm run build`, qui indiquent la synchronisation des versions natives.
- **Assets Android absents ou incorrects** : vérifier les logs de `npm run build` et de `npx @capacitor/assets generate --android`. Les assets sources doivent être présents dans `scripts/<App>/assets/` et sont copiés dans `resources/` par `scripts/prepare-app.js`.
- **Secret manquant ou invalide** : vérifier que le secret existe pour l'application sélectionnée, que son nom correspond exactement au workflow et que sa valeur a été copiée sans caractère parasite.

## Générer seulement un APK debug

Pour générer un APK debug localement, utiliser :

```bash
npm run generate-apk
```

L'APK est généré dans :

```text
android/app/build/outputs/apk/debug
```

Cette commande ne publie rien sur le Play Store.

## Déploiement depuis la ligne de commande

Deux commandes peuvent déclencher le pipeline Android :

- `npm run deploy:android` : incrémente `versionCode`, crée un commit, génère un tag `deploy/android/<timestamp>` et pousse l'ensemble.
- `npm run deploy` : applique les incréments Android et iOS, puis pousse les tags `deploy/android/<timestamp>` et `deploy/ios/<timestamp>`.

Avant d'exécuter ces commandes :

1. vérifier que le dépôt est propre avec `git status` ;
2. sélectionner l'application cible avec `npm run selectapp:espaceco` ou `npm run selectapp:naviforest` ;
3. vérifier que les secrets GitHub de l'application sélectionnée sont provisionnés ;
4. vérifier que l'on dispose des droits de push sur le dépôt.

Les tags utilisent l'UTC au format `YYYYMMDD-HHMMSS` et servent d'historique de déploiement.
