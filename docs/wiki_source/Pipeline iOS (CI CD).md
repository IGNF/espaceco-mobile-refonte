# Pipeline iOS (CI/CD)

Ce document décrit le workflow GitHub Actions `.github/workflows/ios-action.yml`, les secrets nécessaires et les opérations courantes pour livrer l'application iOS sur TestFlight.

## Vue d'ensemble

Le pipeline se déclenche lorsqu'un tag `deploy/ios/*` est poussé ou manuellement via `workflow_dispatch`.

Les commandes `npm run deploy:ios` et `npm run deploy` créent les tags de déploiement automatiquement. Elles incrémentent aussi `CURRENT_PROJECT_VERSION`, créent un commit, puis poussent le commit et le tag.

Un lancement manuel via `workflow_dispatch` exécute le workflow tel quel, mais ne lance pas `scripts/deploy.js` : il ne crée donc ni commit de bump, ni tag de déploiement.

Le workflow iOS :

1. sélectionne Xcode ;
2. détecte l'application sélectionnée dans `scripts/.selected-app` ;
3. génère un fichier `.env` à partir des secrets GitHub ;
4. installe les dépendances Node ;
5. lance `npm run build` ;
6. génère les assets Capacitor iOS ;
7. synchronise Capacitor avec le projet iOS ;
8. installe le certificat Apple Distribution et le provisioning profile ;
9. construit une archive Xcode ;
10. exporte un `.ipa` ;
11. téléverse l'IPA vers TestFlight via l'API App Store Connect.

Si `scripts/.selected-app` est absent, le workflow utilise `EspaceCo` par défaut.

## Environnement d'exécution

Le job `build-and-deploy-ios-app` s'exécute sur `macos-15`.

Les versions utilisées par le workflow sont :

- Xcode `26.3`, sélectionné avec `maxim-lobanov/setup-xcode@v1` ;
- Node.js `22`.

Le build Xcode utilise :

- workspace : `ios/App/App.xcworkspace` ;
- scheme : `App` ;
- configuration : `Release Production` ;
- destination : `generic/platform=iOS`.

## Secrets requis

Tous les secrets sont à déclarer dans le dépôt GitHub, dans *Settings -> Secrets and variables -> Actions*.

### Variables d'environnement de l'application

Ces secrets sont écrits dans le fichier `.env` généré par la CI avant le build Vite.

| Secret GitHub | Variable écrite dans `.env` | Application | Usage |
| --- | --- | --- | --- |
| `VITE_OAUTH_IOS_REDIRECT_URI_ESPACECO` | `VITE_OAUTH_IOS_REDIRECT_URI` | EspaceCo | URI de callback OAuth iOS pour EspaceCo. |
| `VITE_OAUTH_IOS_REDIRECT_URI_NAVIFOREST` | `VITE_OAUTH_IOS_REDIRECT_URI` | NaviForest | URI de callback OAuth iOS pour NaviForest. |
| `VITE_OAUTH_CLIENT_ID_ESPACECO` | `VITE_OAUTH_CLIENT_ID` | EspaceCo | Identifiant du client OAuth Keycloak pour EspaceCo. |
| `VITE_OAUTH_CLIENT_ID_NAVIFOREST` | `VITE_OAUTH_CLIENT_ID` | NaviForest | Identifiant du client OAuth Keycloak pour NaviForest. |
| `VITE_OAUTH_WEB_REDIRECT_URI` | `VITE_OAUTH_WEB_REDIRECT_URI` | Commun | URI de callback OAuth web. Elle reste présente dans le build même pour iOS. |
| `VITE_OAUTH_BASE_URL` | `VITE_OAUTH_BASE_URL` | Commun | URL OpenID Connect du realm Keycloak. |
| `VITE_BASE_API_URL` | `VITE_BASE_API_URL` | Commun | URL de base de l'API collaborative. |

Le workflow choisit automatiquement les secrets iOS spécifiques à EspaceCo ou NaviForest selon la valeur de `SELECTED_APP`.

### Variables applicatives optionnelles

Ces secrets sont encore pris en charge par le workflow, mais ils sont optionnels. La configuration principale de la variante vient des fichiers `scripts/EspaceCo/config.js` et `scripts/NaviForest/config.js`, appliqués par `scripts/prepare-app.js`.

| Secret GitHub | Variable écrite dans `.env` | Usage |
| --- | --- | --- |
| `VITE_APPLI` | `VITE_APPLI` | Type d'application exposé dans `config.app.type`. |
| `VITE_APPLI_ID` | `VITE_APPLI_ID` | Identifiant applicatif exposé dans `config.app.id`. |
| `VITE_APPLI_NAME` | `VITE_APPLI_NAME` | Nom applicatif exposé dans `config.app.name`. |

### Signature iOS

| Secret GitHub | Application | Usage | Comment l'obtenir |
| --- | --- | --- | --- |
| `DISTRIBUTION_CERTIFICATE_P12` | Commun | Certificat Apple Distribution `.p12` encodé en base64. | Exporter l'identité "Apple Distribution" depuis Keychain Access (`Fichier -> Exporter des éléments...`), puis encoder le fichier avec `base64 -i certificat.p12 | pbcopy`. |
| `P12_PASSWORD_DISTR` | Commun | Mot de passe du fichier `.p12`. | Mot de passe choisi lors de l'export du certificat. |
| `KEYCHAIN_PASSWORD` | Commun | Mot de passe du trousseau temporaire créé par la CI. | Générer une chaîne aléatoire. |
| `APPSTORE_TEAM_ID` | Commun | Team ID Apple Developer utilisé comme `DEVELOPMENT_TEAM` pendant l'archive Xcode. | Visible dans le compte Apple Developer. |
| `DEPLOY_PROVISION_PROFILE_BASE64_ESPACECO` | EspaceCo | Provisioning profile App Store encodé en base64. | Créer ou télécharger le profil sur https://developer.apple.com/account/resources/profiles/list avec le bundle ID `fr.ign.collaboratif`, puis encoder avec `base64 -i EspaceCo.mobileprovision | pbcopy`. |
| `IOS_EXPORT_PRODUCTION_ESPACECO` | EspaceCo | `ExportOptions.plist` encodé en base64 pour l'export IPA EspaceCo. | Générer après une archive manuelle dans Xcode (`Product -> Archive`, puis `Window -> Organizer -> Distribute App -> Export...`), adapter le plist si nécessaire, puis encoder avec `base64 -i ExportOptions.plist | pbcopy`. |
| `DEPLOY_PROVISION_PROFILE_BASE64_NAVIFOREST` | NaviForest | Provisioning profile App Store encodé en base64. | Même procédure que pour EspaceCo, avec le bundle ID `fr.ign.navi-forest`. |
| `IOS_EXPORT_PRODUCTION_NAVIFOREST` | NaviForest | `ExportOptions.plist` encodé en base64 pour l'export IPA NaviForest. | Même procédure que pour EspaceCo, avec une archive NaviForest et le provisioning profile NaviForest. |

### Publication TestFlight

| Secret GitHub | Usage | Comment l'obtenir |
| --- | --- | --- |
| `APPSTORE_API_PRIVATE_KEY` | Clé privée App Store Connect `.p8` encodée en base64. | Créer une clé API dans https://appstoreconnect.apple.com/access/integrations/api, télécharger `AuthKey_<ID>.p8`, puis encoder avec `base64 -i AuthKey_<ID>.p8 | pbcopy`. |
| `APPSTORE_API_KEY_ID` | Identifiant de la clé API App Store Connect. | Visible dans App Store Connect sur la page des clés API. |
| `APPSTORE_ISSUER_ID` | Issuer ID de l'organisation App Store Connect. | Visible dans App Store Connect sur la page des clés API. |

## Déroulé du workflow

1. **Checkout (`actions/checkout@v4`)** : récupère le dépôt.
2. **Sélection de Xcode** : sélectionne Xcode `26.3`.
3. **Vérification Xcode** : affiche `xcodebuild -version`.
4. **Setup Node.js (`actions/setup-node@v4`)** : installe Node.js `22` avec cache `npm`.
5. **Détection de l'application** : lit `scripts/.selected-app`, ou utilise `EspaceCo` par défaut.
6. **Création du fichier `.env`** : crée un fichier vide.
7. **Injection des secrets dans `.env`** :
   - écrit les variables OAuth iOS selon l'application sélectionnée ;
   - écrit les variables communes `VITE_OAUTH_WEB_REDIRECT_URI`, `VITE_OAUTH_BASE_URL` et `VITE_BASE_API_URL` ;
   - écrit les overrides applicatifs optionnels si les secrets existent.
8. **Installation des dépendances** : exécute `npm ci`.
9. **Build web** : exécute `npm run build`.
10. **Génération des assets Capacitor iOS** : exécute `npx @capacitor/assets generate --ios`.
11. **Synchronisation Capacitor iOS** : exécute `npx cap sync ios`.
12. **Détection des paramètres de signature iOS** :
    - relit `scripts/.selected-app` ;
    - charge le provisioning profile et l'`ExportOptions.plist` associés ;
    - utilise les secrets EspaceCo si NaviForest est sélectionné mais que les secrets NaviForest de signature sont absents ;
    - échoue si les secrets finalement retenus sont absents.
13. **Installation du certificat et du provisioning profile** :
    - décode le certificat `.p12` ;
    - crée un trousseau temporaire ;
    - importe le certificat ;
    - copie le provisioning profile dans `~/Library/MobileDevice/Provisioning Profiles`.
14. **Affichage des réglages Xcode** : affiche les paramètres de signature utiles au diagnostic.
15. **Archive Xcode** : exécute `xcodebuild clean archive` en configuration `Release Production`. La signature est désactivée pendant l'archive et appliquée ensuite à l'export.
16. **Export IPA** : décode `IOS_EXPORT_PRODUCTION` en `ExportOptions.plist`, puis exécute `xcodebuild -exportArchive`.
17. **Installation de la clé API App Store Connect** : décode `APPSTORE_API_PRIVATE_KEY` en `AuthKey_<ID>.p8`.
18. **Upload TestFlight** : exécute `xcrun altool --upload-app` avec `APPSTORE_API_KEY_ID` et `APPSTORE_ISSUER_ID`.

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
- `ios/App/App.xcodeproj/project.pbxproj` ;
- `ios/App/App/Info.plist` ;
- les versions natives à partir de `versionNumber`.

Le fallback de signature vers EspaceCo en cas de secrets NaviForest absents est uniquement un comportement de secours du workflow. Pour un déploiement NaviForest, il faut provisionner les secrets NaviForest et vérifier que le provisioning profile, l'`ExportOptions.plist` et le bundle ID `fr.ign.navi-forest` sont cohérents.

## Renouvellement des certificats et profils

Cette section est critique : le workflow iOS dépend à la fois du certificat Apple Distribution, des provisioning profiles App Store, de l'`ExportOptions.plist` associé à chaque application et de la clé API App Store Connect. Lorsqu'un certificat, un profil ou une clé expire, il faut mettre à jour les secrets GitHub correspondants avant de relancer la CI.

### 1. Certificat Apple Distribution

1. Se connecter à Apple Developer : https://developer.apple.com/account/resources/certificates/list.
2. Vérifier l'état du certificat **Apple Distribution** utilisé par la CI.
3. Si nécessaire, révoquer l'ancien certificat et générer un nouveau certificat **Apple Distribution**.
4. Pour générer un nouveau certificat, créer une CSR depuis le Mac de développement dans Keychain Access :
   - ouvrir **Keychain Access** ;
   - menu **Keychain Access -> Certificate Assistant -> Request a Certificate From a Certificate Authority...** ;
   - renseigner l'adresse e-mail et le nom commun ;
   - choisir **Saved to disk** ;
   - enregistrer le fichier `.certSigningRequest`.
5. Uploader la CSR sur Apple Developer, puis télécharger le fichier `.cer`.
6. Importer le `.cer` dans Keychain Access, dans le trousseau `login`, sur la machine qui possède la clé privée associée.
7. Vérifier que l'identité apparaît comme **Apple Distribution** avec une clé privée rattachée.
8. Exporter l'identité en `.p12` :
   - clic droit sur l'identité **Apple Distribution** ;
   - **Exporter** ou **Fichier -> Exporter des éléments...** ;
   - choisir le format `.p12` ;
   - définir un mot de passe d'export.
9. Encoder le `.p12` en base64 :

```bash
base64 -i certificat.p12 | pbcopy
```

10. Mettre à jour les secrets GitHub :
    - `DISTRIBUTION_CERTIFICATE_P12` avec la valeur base64 ;
    - `P12_PASSWORD_DISTR` avec le mot de passe choisi pendant l'export `.p12`.

Le secret `KEYCHAIN_PASSWORD` n'est pas le mot de passe du certificat. Il sert uniquement à créer et déverrouiller le trousseau temporaire du runner GitHub Actions. Il peut rester inchangé sauf rotation volontaire.

### 2. Provisioning profiles

Chaque application doit avoir son provisioning profile App Store, lié au bon bundle ID et au certificat Apple Distribution utilisé par la CI :

- EspaceCo : bundle ID `fr.ign.collaboratif` ;
- NaviForest : bundle ID `fr.ign.navi-forest`.

Pour renouveler un profil existant :

1. Aller sur https://developer.apple.com/account/resources/profiles/list.
2. Ouvrir le profil de l'application concernée, par exemple `EspaceCo_provProf` ou `NaviForest_provProf` si ces noms sont utilisés côté Apple Developer.
3. Cliquer sur **Edit**.
4. Sélectionner le nouveau certificat **Apple Distribution**.
5. Cliquer sur **Generate**.
6. Télécharger le nouveau fichier `.mobileprovision`.
7. Encoder le fichier :

```bash
base64 -i fichier.mobileprovision | pbcopy
```

8. Mettre à jour le secret GitHub correspondant :
   - `DEPLOY_PROVISION_PROFILE_BASE64_ESPACECO` pour EspaceCo ;
   - `DEPLOY_PROVISION_PROFILE_BASE64_NAVIFOREST` pour NaviForest.

Pour créer un nouveau profil :

1. Aller sur https://developer.apple.com/account/resources/profiles/list.
2. Créer un profil de distribution.
3. Choisir **App Store Connect** comme type de distribution.
4. Sélectionner le bundle ID de l'application.
5. Sélectionner le certificat **Apple Distribution** utilisé par la CI.
6. Générer et télécharger le `.mobileprovision`.
7. Encoder le fichier en base64 et mettre à jour le secret GitHub de l'application.

### 3. ExportOptions.plist

Le fichier `ExportOptions.plist` contrôle l'étape `xcodebuild -exportArchive`. Il doit correspondre à l'application, au bundle ID et au provisioning profile utilisé. Un profil renouvelé ou renommé peut nécessiter une mise à jour de ce plist.

Pour générer un nouvel `ExportOptions.plist` :

1. Préparer localement la bonne application avec `npm run selectapp:espaceco` ou `npm run selectapp:naviforest`.
2. Ouvrir le projet iOS dans Xcode ou utiliser l'archive existante dans l'Organizer.
3. Créer une archive avec **Product -> Archive**.
4. Ouvrir **Window -> Organizer** si nécessaire.
5. Sélectionner l'archive, puis lancer **Distribute App**.
6. Choisir le flux de distribution App Store Connect, puis aller jusqu'à l'étape d'export.
7. Exporter l'IPA localement.
8. Récupérer le fichier `ExportOptions.plist` généré dans le dossier exporté.

Avant de l'encoder, vérifier et modifier le contenu du `ExportOptions.plist` :

- `destination` doit être `export` ;
- `signingStyle` doit être `manual` ;
- la clé `provisioningProfiles` doit contenir le bundle ID exact et le nom du provisioning profile App Store.

Exemple pour EspaceCo :

```xml
<key>destination</key>
<string>export</string>
<key>signingStyle</key>
<string>manual</string>
<key>provisioningProfiles</key>
<dict>
  <key>fr.ign.collaboratif</key>
  <string>EspaceCo_provProf</string>
</dict>
```

Exemple pour NaviForest :

```xml
<key>destination</key>
<string>export</string>
<key>signingStyle</key>
<string>manual</string>
<key>provisioningProfiles</key>
<dict>
  <key>fr.ign.navi-forest</key>
  <string>NaviForest_provProf</string>
</dict>
```

Encoder ensuite le fichier :

```bash
base64 -i ExportOptions.plist | pbcopy
```

Mettre à jour le secret GitHub correspondant :

- `IOS_EXPORT_PRODUCTION_ESPACECO` ;
- `IOS_EXPORT_PRODUCTION_NAVIFOREST`.

### 4. Clé API App Store Connect

La publication TestFlight utilise `xcrun altool` avec une clé API App Store Connect.

Si la clé API est expirée, révoquée ou doit être remplacée :

1. Aller sur https://appstoreconnect.apple.com/access/integrations/api.
2. Utiliser un compte disposant des droits nécessaires, par exemple **Admin** ou **Account Holder**.
3. Créer une nouvelle clé API.
4. Noter le **Key ID**.
5. Noter l'**Issuer ID** de l'organisation.
6. Télécharger le fichier `AuthKey_<ID>.p8`. Il n'est téléchargeable qu'une seule fois.
7. Encoder la clé :

```bash
base64 -i AuthKey_<ID>.p8 | pbcopy
```

8. Mettre à jour les secrets GitHub :
   - `APPSTORE_API_PRIVATE_KEY` avec la clé `.p8` encodée en base64 ;
   - `APPSTORE_API_KEY_ID` avec le Key ID ;
   - `APPSTORE_ISSUER_ID` avec l'Issuer ID.

Pendant le workflow, la clé est décodée puis copiée dans `~/private_keys` et `~/.appstoreconnect/private_keys/`, emplacements attendus par `altool`.

### 5. Validation après renouvellement

Après modification des secrets :

1. Vérifier que l'application cible est bien sélectionnée avec `scripts/.selected-app`.
2. Lancer le workflow **iOS CI/CD** depuis l'onglet **Actions** de GitHub, ou pousser un tag `deploy/ios/*` via `npm run deploy:ios`.
3. Vérifier dans les logs :
   - l'installation du certificat `.p12` ;
   - la copie du provisioning profile ;
   - les paramètres affichés par `xcodebuild -showBuildSettings` ;
   - la génération de `App.xcarchive` ;
   - l'export de l'IPA ;
   - l'upload TestFlight.

En cas d'échec de signature ou d'export, reproduire localement sur un Mac de développement avec `xcodebuild archive` puis `xcodebuild -exportArchive`, en utilisant le même bundle ID, le même certificat, le même provisioning profile et le même `ExportOptions.plist`.

## Maintenance des variables API et OAuth

Les anciens secrets de l'application legacy (`COLLAB_API_CLIENT_ID`, `COLLAB_API_CLIENT_SECRET`, `BASE_AUTH_URL`, `QLF_*`, `SECRET`, etc.) ne sont plus ceux utilisés par ce workflow.

Pour changer les paramètres d'API ou d'authentification du nouveau projet, mettre à jour les secrets `VITE_BASE_API_URL`, `VITE_OAUTH_BASE_URL`, `VITE_OAUTH_WEB_REDIRECT_URI`, `VITE_OAUTH_CLIENT_ID_<APP>` et `VITE_OAUTH_IOS_REDIRECT_URI_<APP>`.

## Dépannage

- **Mauvaise application construite** : vérifier le contenu de `scripts/.selected-app` dans le commit qui porte le tag.
- **Erreur OAuth au lancement de l'app** : vérifier `VITE_OAUTH_CLIENT_ID_<APP>`, `VITE_OAUTH_IOS_REDIRECT_URI_<APP>` et la configuration Keycloak.
- **Erreur de provisioning profile** : vérifier que le profil correspond au bundle ID de l'application sélectionnée.
- **Erreur d'export IPA** : vérifier le contenu de `IOS_EXPORT_PRODUCTION_<APP>`, notamment la clé `provisioningProfiles`.
- **Erreur App Store Connect** : vérifier `APPSTORE_API_PRIVATE_KEY`, `APPSTORE_API_KEY_ID`, `APPSTORE_ISSUER_ID` et les droits associés à la clé.
- **Erreur de team** : vérifier `APPSTORE_TEAM_ID`.
- **Secret manquant ou invalide** : vérifier que tous les secrets requis pour l'application sélectionnée existent, que leurs noms correspondent exactement au workflow et que les valeurs base64 ont été copiées sans caractère parasite.
- **Erreur de signature difficile à diagnostiquer** : reproduire localement sur un Mac de développement avec `xcodebuild archive` puis `xcodebuild -exportArchive`, en utilisant le même bundle ID, le même certificat et le même provisioning profile.

## Déploiement depuis la ligne de commande

Deux commandes peuvent déclencher le pipeline iOS :

- `npm run deploy:ios` : incrémente `CURRENT_PROJECT_VERSION`, crée un commit, génère un tag `deploy/ios/<timestamp>` et pousse l'ensemble.
- `npm run deploy` : applique les incréments iOS et Android, puis pousse les tags `deploy/ios/<timestamp>` et `deploy/android/<timestamp>`.

Avant d'exécuter ces commandes :

1. vérifier que le dépôt est propre avec `git status` ;
2. sélectionner l'application cible avec `npm run selectapp:espaceco` ou `npm run selectapp:naviforest` ;
3. vérifier que les secrets GitHub de l'application sélectionnée sont provisionnés ;
4. vérifier que l'on dispose des droits de push sur le dépôt.

Les tags utilisent l'UTC au format `YYYYMMDD-HHMMSS` et servent d'historique de déploiement.
