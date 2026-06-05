# EspaceCo Mobile

EspaceCo Mobile est l'application mobile IGN de contribution collaborative, construite avec React 19, TypeScript, Vite et Capacitor 8. Elle permet aux utilisateurs authentifies de consulter une carte, de gerer leurs communautes, de creer des signalements, de contribuer directement sur des couches geographiques et de preparer des donnees pour un usage hors ligne.

Le depot contient aussi les projets natifs iOS et Android generes par Capacitor afin de tester et distribuer l'application sur mobile.

## Fonctionnalites principales

- Authentification OAuth/PKCE et gestion de session.
- Carte OpenLayers avec fonds Geoportail, couches de signalements, couches communautaires et couches raster hors ligne.
- Recherche Geoportail et recentrage sur la position utilisateur.
- Gestion des communautes et selection de la communaute active.
- Creation, edition, consultation et synchronisation de signalements.
- Signalement rapide par GPS avec suivi de trace.
- Contribution directe sur les couches communautaires, avec gestion des conflits.
- Mode hors ligne : cache de couches, zones, fonds raster telecharges et consultation en mobilite.
- Parametres applicatifs, choix de source GPS, aide, a propos et informations utilisateur.
- Support de plusieurs variantes applicatives via les scripts `selectapp` (`EspaceCo` et `NaviForest`).

## Stack technique

- React 19, React Router 7 et TypeScript strict.
- Vite 7 pour le developpement web et le build.
- Capacitor 8 pour les projets natifs iOS et Android.
- OpenLayers 10 et `ol-ext` pour la carte.
- `i18next` et `react-i18next` pour l'internationalisation.
- ESLint 9 en flat config, avec les regles TypeScript, React Hooks et React Refresh.
- `vite-plugin-svgr` pour importer les icones SVG comme composants React.

## Prerequis

- Node.js compatible avec Vite 7 et TypeScript 5.9.
- npm.
- Un acces SSH aux dependances privees IGN referencees dans `package.json`.
- Pour les builds natifs : Xcode pour iOS, Android Studio pour Android, ainsi que les outils Capacitor habituels.

## Installation

Installez les dependances :

```bash
npm install
```

Preparez la configuration locale :

```bash
cp .env.dist .env
```

Puis renseignez les variables necessaires dans `.env` :

- `VITE_BASE_API_URL` : URL de l'API Espace Collaboratif.
- `VITE_COLLAB_API_CLIENT_ID`, `VITE_COLLAB_API_CLIENT_SECRET`, `VITE_BASE_AUTH_URL` : configuration d'authentification production.
- `VITE_QLF_COLLAB_API_CLIENT_ID`, `VITE_QLF_COLLAB_API_CLIENT_SECRET`, `VITE_QLF_BASE_AUTH_URL` : configuration d'authentification qualification.
- `VITE_OAUTH_CLIENT_ID`, `VITE_OAUTH_BASE_URL`, `VITE_OAUTH_ANDROID_REDIRECT_URI`, `VITE_OAUTH_IOS_REDIRECT_URI`, `VITE_OAUTH_WEB_REDIRECT_URI` : configuration OAuth/PKCE.
- `VITE_APPLI`, `VITE_APPLI_ID`, `VITE_APPLI_NAME`, `VITE_SECRET` : parametrage de la variante applicative.

Par defaut, l'application utilise l'environnement de production. Pour utiliser les variables de qualification, definir :

```bash
VITE_USE_QUALIF=true
```

### Configuration locale

Le fichier `.env` n'est pas versionne. Le modele `.env.dist` documente les variables attendues.

Les variables `VITE_*` sont injectees par Vite au build. Toute modification de `.env` necessite donc de relancer le serveur de developpement ou de reconstruire l'application.

L'alias TypeScript/Vite `@` pointe vers `src/`. Les imports applicatifs peuvent donc utiliser `@/features/...`, `@/shared/...` ou `@/domain/...`.

### Variantes applicatives

Les variantes disponibles sont decrites dans `scripts/EspaceCo/` et `scripts/NaviForest/`.

Le script `scripts/selectapp.js` ecrit la variante active dans `scripts/.selected-app`. Le script `scripts/prepare-app.js`, execute au debut de `npm run build`, lit cette selection et met a jour la configuration runtime, Capacitor et les assets natifs necessaires.

## Commandes utiles

### Developpement web

```bash
npm run dev
```

Lance le serveur Vite en local.

```bash
npm run build
```

Execute le type-check TypeScript puis genere le build de production dans `dist/`.

```bash
npm run lint
```

Lance ESLint sur le depot.

```bash
npm run preview
```

Previsualise le build de production.

```bash
npm run build-dev
```

Genere un build Vite en mode `development`, utile avant une synchronisation native de debug.

### Selection de variante applicative

```bash
npm run selectapp:espaceco
npm run selectapp:naviforest
```

Ces commandes selectionnent la variante cible dans `scripts/.selected-app`, puis lancent un build.

Il est aussi possible d'utiliser la commande generique :

```bash
npm run selectapp -- --espaceco
npm run selectapp -- --naviforest
```

### Capacitor et projets natifs

```bash
npm run capacitor-build
npm run capacitor-build-dev
```

Construit l'application web et synchronise les assets avec Capacitor. La variante `-dev` utilise `npm run build-dev`.

```bash
npm run capacitor-run-ios
npm run capacitor-run-android
npm run capacitor-run-ios-dev
npm run capacitor-run-android-dev
```

Construit, synchronise et lance l'application sur iOS ou Android.

```bash
npm run open-xcode
npm run open-android
```

Ouvre le projet natif correspondant dans Xcode ou Android Studio.

```bash
npx cap sync
```

Synchronise manuellement `dist/` vers les projets natifs.

```bash
npm run generate-apk
```

Genere un APK Android via le script `scripts/generate-apk.sh`.

### Livraison

```bash
npm run deploy:ios
npm run deploy:android
npm run deploy
```

Les scripts de livraison verifient que le working tree est propre, mettent a jour les numeros de build, creent un commit et poussent les tags de deploiement. Ils doivent donc etre lances depuis une branche propre et prete a publier.

## Architecture du projet

Le code applicatif est dans `src/` et suit une architecture en couches. L'objectif est de separer la logique metier, les integrations techniques et l'orchestration UI.

```text
src/
├── app/        # Shell applicatif : router, providers, navigation globale
├── domain/     # Modeles et logique metier pure
├── infra/      # APIs, persistance, OpenLayers, synchronisation
├── platform/   # Wrappers Capacitor et APIs natives
├── features/   # Modules fonctionnels React
├── shared/     # UI, hooks, utilitaires, constantes, i18n
├── styles/     # Styles globaux
└── assets/     # Assets applicatifs
```

### Regles de dependances

- `domain/` reste pur et ne depend pas des autres couches.
- `infra/` implemente les acces externes : API collaborative, stockage local, cache, synchronisation, OpenLayers.
- `platform/` isole les APIs natives Capacitor : geolocalisation, camera, fichiers, partage, orientation, source GPS, lancement d'applications externes.
- `features/` contient les pages, composants, hooks et etats propres aux parcours utilisateur.
- `shared/` regroupe ce qui est transverse : composants UI, i18n, styles partages, constantes, erreurs et utilitaires.

### Flux applicatif

Le point d'entree React est `src/main.tsx`, qui monte `src/app/App.tsx`.

`App` installe les providers globaux dans cet ordre :

- `I18nProvider` pour charger les traductions ;
- `AuthProvider` pour l'etat de session ;
- `AppSettingsProvider` pour les preferences applicatives ;
- `CommunityProvider` pour la communaute active ;
- `OfflineProvider` pour l'etat et les caches hors ligne ;
- `RouterProvider` pour la navigation.

Au demarrage, l'application restaure aussi la source GPS preferee via `platform/device/gpsSource`.

Le router declare les routes publiques `welcome`, `login` et `auth/callback`. Les routes `home` et `community-selection` sont protegees par `AuthGuard`. Les ecrans secondaires sont declares comme `overlayRoutes` et ouverts par-dessus la page carte.

## Organisation des modules

### `src/app/`

Contient le composant racine, les providers globaux et le router :

- `AuthProvider`
- `AppSettingsProvider`
- `CommunityProvider`
- `OfflineProvider`
- `I18nProvider`
- `AuthGuard`
- `BottomTabbar`
- `LeftMenu`

Les routes principales sont `welcome`, `login`, `auth/callback`, `home` et `community-selection`. Les ecrans secondaires sont ouverts en overlays depuis la page carte.

### `src/domain/`

Contient les modeles et fonctions metier pour :

- l'authentification ;
- les communautes ;
- les contributions directes ;
- les signalements ;
- la carte ;
- l'utilisateur ;
- le mode hors ligne.

Cette couche doit rester independante de React, Capacitor, OpenLayers et des APIs reseau.

### `src/infra/`

Contient les implementations concretes :

- client API collaborative ;
- API d'authentification ;
- APIs communautes et signalements ;
- repositories et files d'attente de contributions ;
- services de couches Geoportail, vectorielles et raster ;
- repositories de cache et mode hors ligne ;
- synchronisation reseau ;
- stockage local.

### `src/platform/`

Regroupe les wrappers natifs :

- geolocalisation ;
- source GPS ;
- orientation ;
- partage ;
- stockage fichier ;
- export email ;
- lifecycle applicatif ;
- ouverture d'applications externes.

### `src/features/`

Chaque fonctionnalite suit autant que possible la structure `pages/`, `components/`, `hooks/`, `state/`.

Modules principaux :

- `auth/` : connexion, callback OAuth, deconnexion, informations utilisateur.
- `home/` : page carte, navigation principale, actions GPS et orchestration globale.
- `map/` : panneaux de couches, couches communautaires, contributions directes, consultation d'objets.
- `report/` : creation, edition, liste, filtres, details, traces et signalement rapide.
- `community/` : selection, adhesion et gestion des communautes.
- `offline/` : gestion du mode hors ligne, zones, caches et rasters.
- `search/` : recherche Geoportail.
- `settings/` : preferences utilisateur et maintenance.
- `onboarding/`, `welcome/`, `about/`, `help/` : parcours d'accueil et pages transverses.

### `src/shared/`

Contient les briques reutilisables :

- composants UI (`Button`, `Alert`, `ActionSheet`, `Tabs`, `Toast`, `SearchBar`, etc.) ;
- hooks partages ;
- utilitaires de dates, geometrie, couleurs, stockage, GPX, EXIF, authentification ;
- constantes applicatives ;
- i18n et fichier de traduction `fr.json` ;
- icones et sons.

## Donnees, stockage et synchronisation

Les integrations reseau et stockage sont centralisees dans `src/infra/` :

- `infra/api/` et `infra/auth/` gerent les clients HTTP et l'authentification.
- `infra/community/` et `infra/contribution/` gerent les donnees metier synchronisees avec l'API collaborative.
- `infra/map/` regroupe les services lies aux couches, a OpenLayers et aux contributions directes.
- `infra/offline/` gere les zones, les caches de couches et les rasters hors ligne.
- `infra/persistence/` et `infra/storage/` isolent les preferences et le stockage local.
- `infra/sync/` coordonne la synchronisation et l'etat reseau.

Les appels aux APIs natives doivent passer par `src/platform/` afin de garder les composants React et la logique metier independants de Capacitor.

## Conventions de code

- Utiliser TypeScript strict et eviter `any` sauf lorsqu'une API externe ne fournit pas de typage exploitable.
- Garder `domain/` sans dependance vers React, Capacitor, OpenLayers ou le reseau.
- Preferer les imports via l'alias `@` pour les chemins applicatifs.
- Respecter les modules de fonctionnalite : une page ou un hook specifique a un parcours reste dans `src/features/{feature}/`.
- Ajouter une abstraction seulement lorsqu'elle evite une complexite reelle ou une duplication significative.
- Les styles de composants sont majoritairement portes par des fichiers `*.module.css`; les styles globaux et tokens restent dans `src/styles/` et `src/shared/styles/`.

## Tests et verification

Aucun runner de tests dedie n'est configure dans `package.json` a ce stade. Pour valider une modification, lancer au minimum :

```bash
npm run lint
npm run build
```

Pour les changements UI ou mobiles, verifier aussi le parcours concerne dans le navigateur via `npm run dev`, puis sur simulateur ou appareil avec les commandes Capacitor.

Lorsqu'une nouvelle logique metier est introduite, ajouter des tests adaptes ou documenter clairement la procedure de verification manuelle.

## Documentation

La documentation projet se trouve dans `docs/` :

- `docs/README.md` : index de documentation.
- `docs/developper/Doc_commit.md` : convention de commit.
- `docs/contributions-directes-refonte.md` et `docs/contributions-directes-conflits.md` : contribution directe.
- `docs/mode-hors-ligne-refonte.md` : mode hors ligne.
- `docs/signalement-rapide-gps-plan.md` et `docs/gps-sketch-tracking-plan.md` : signalement rapide et suivi GPS.

## Conventions de contribution

Le projet utilise une convention de commit de type Angular :

```text
<type>(<scope>): <subject> #<issue>
```

Types courants :

- `feat`
- `fix`
- `refactor`
- `style`
- `docs`
- `test`
- `build`
- `ci`
- `revert`

Avant d'ouvrir une pull request, inclure :

- un resume clair des changements ;
- les commandes de verification lancees et leurs resultats ;
- des captures ou enregistrements pour les changements UI ;
- le lien vers l'issue associee si elle existe.

## Racine du depot

- `src/` : code source de l'application.
- `public/` : fichiers statiques servis par Vite.
- `android/` : projet natif Android.
- `ios/` : projet natif iOS.
- `scripts/` : scripts de selection d'application, build, APK et deploiement.
- `docs/` : documentation technique et fonctionnelle.
- `tests/` : rappel et espace reserve aux procedures de test.
- `capacitor.config.ts` : configuration Capacitor.
- `vite.config.ts` : configuration Vite.
- `eslint.config.js` : configuration ESLint flat config.
