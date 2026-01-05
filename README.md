# Modèle de ReadMe

Ci-dessous une proposition de readme pour tout projet


## Description/Résumé du projet

Dans cette section, on décrit la vision générale du projet ainsi que ses objectifs à destination des futurs utilisateurs et des développeurs.

Pour ce dépôt : 

Ce dépôt permet de répertorier les différents éléments essentiels dans un dépôt SIDC :
* ce ReadMe
* des modèles de tickets type pour des ajouts de fonctionnalité, réparation de bug, ajout de documentation, maintenance/montée de version...
* des milestones témoins (ex: backlog, sprint1...)
* des exemples de github Actions CI/CD (lancement de test, build d'images...)
* des exemples de label pour les futurs tickets


## Installation

La procédure d'installation du projet doit être décrite dans cette section ou dans un fichier complémentaire dont le lien est présent ici.


## Documentation développeurs

Lien vers la documentation pour les développeurs, à la fois pour maintenir le projet, le déployer et ajouter de nouvelles fonctionnalités. Schémas UML...


## L'arborescence du projet

Espaceco est une application mobile IGN construite avec React 19, TypeScript et Capacitor 8. Le projet suit une **architecture en couches** avec des règles de dépendances strictes :

### Racine du projet

* `src/` : code source de l'application (voir détail ci-dessous)
* `android/` : projet natif Android généré par Capacitor
* `ios/` : projet natif iOS généré par Capacitor
* `public/` : fichiers statiques servis par Vite
* `docs/` : documentation du projet (conventions de commit, etc.)
* `tests/` : scripts et explications pour lancer les tests
* `package.json` : dépendances et scripts npm
* `capacitor.config.ts` : configuration Capacitor
* `vite.config.ts` : configuration du bundler Vite
* `eslint.config.js` : configuration ESLint
* `README.md` : ce fichier

### Architecture du dossier `src/`

L'application suit le pattern suivant :

* **`app/`** : shell de l'application
  * `App.tsx` : composant racine
  * `providers/` : providers React (Auth, i18n, Query, Theme)
  * `router/` : configuration du routage et guards d'authentification

* **`domain/`** : logique métier pure (sans dépendances externes)
  * `auth/` : modèles d'authentification
  * `contribution/` : modèles de contributions géographiques
  * `map/` : modèles cartographiques
  * `user/` : modèles utilisateur
  * Principe : cette couche ne dépend d'aucune autre couche

* **`infra/`** : implémentations concrètes et adaptateurs
  * `auth/` : API et stockage de session d'authentification
  * `contribution/` : API, repository et queue de contributions
  * `http/` : client HTTP et API IGN
  * `map/openlayers/` : implémentation cartographique avec OpenLayers
  * `persistence/` : stockage local (SQLite, Preferences, Settings)
  * `sync/` : gestion de la synchronisation réseau
  * Principe : implémente les ports définis dans `domain/`

* **`platform/`** : wrappers des APIs natives Capacitor
  * `app/` : lifecycle de l'application
  * `device/` : APIs appareil (caméra, fichiers, géolocalisation, permissions, partage)
  * Principe : abstraction des capacités natives sans logique métier

* **`features/`** : modules fonctionnels (UI + orchestration)
  * Chaque feature suit la structure : `pages/`, `components/`, `hooks/`, `state/`
  * `auth/` : authentification et login
  * `contribution/` : création et gestion des contributions
  * `map/` : visualisation cartographique
  * `onboarding/` : parcours d'introduction
  * `settings/` : paramètres de l'application
  * `welcome/` : écran d'accueil
  * `about/` : à propos de l'application
  * Principe : orchestre les couches domain/infra/platform

* **`shared/`** : éléments transverses réutilisables
  * `ui/` : composants UI génériques (Button, Loading, Sheet, Toast)
  * `hooks/` : hooks React partagés
  * `utils/` : utilitaires (date, assertions)

* **`styles/`** : styles globaux et tokens de design
  * `global.css` : styles CSS globaux

* **`assets/`** : ressources statiques (images, icônes)

* **`main.tsx`** : point d'entrée de l'application React

## Contacts du projets

Ici on met la liste des personnes qui travaillent sur ce projet et le maintiennent à jour.


|Nom|Prénom|mail|fonction|
|---|---|---|---|
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |
