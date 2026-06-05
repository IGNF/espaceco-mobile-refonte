# Variables d'environnement

Cette page décrit les variables d'environnement déclarées dans `.env.dist` et centralisées dans `src/shared/config/env.ts`.

Le projet utilise Vite : seules les variables préfixées par `VITE_` sont exposées au code front-end via `import.meta.env`. Les valeurs renseignées dans un fichier `.env` sont donc embarquées dans le build web. Il ne faut pas y placer de secret réellement confidentiel côté client.

## Fichiers concernés

- `.env.dist` : modèle des variables attendues.
- `.env` : fichier local à créer à partir de `.env.dist`, non destiné à être commité.
- `src/shared/config/env.ts` : point d'entrée TypeScript qui lit `import.meta.env` et expose l'objet `config`.

## Variables obligatoires

Pour le fonctionnement actuel de l'application, les variables nécessaires sont :

```env
VITE_BASE_API_URL=

VITE_OAUTH_CLIENT_ID=
VITE_OAUTH_BASE_URL=
VITE_OAUTH_ANDROID_REDIRECT_URI=
VITE_OAUTH_IOS_REDIRECT_URI=
VITE_OAUTH_WEB_REDIRECT_URI=
```

Ces variables alimentent les appels à l'API collaborative et le parcours d'authentification OAuth + PKCE via Keycloak.

| Variable | Rôle | Exemple dans `.env.dist` |
| --- | --- | --- |
| `VITE_BASE_API_URL` | URL de base de l'API collaborative. Elle est utilisée par le client API partagé et par certains appels directs comme la récupération des communautés. | `https://espacecollaboratif.ign.fr/api/` |
| `VITE_OAUTH_CLIENT_ID` | Identifiant du client OAuth déclaré côté Keycloak. Il est transmis à `AuthManager` et au client API collaboratif. | `my_client_id` |
| `VITE_OAUTH_BASE_URL` | URL de base du realm Keycloak, jusqu'au protocole OpenID Connect. Elle sert aux échanges OAuth et PKCE. | `monurldauthentification/auth/realms/mon_realm/protocol/openid-connect/` |
| `VITE_OAUTH_ANDROID_REDIRECT_URI` | URI de redirection utilisée lorsque l'application tourne sur Android. | `fr.ign.espaceco://callback-url` |
| `VITE_OAUTH_IOS_REDIRECT_URI` | URI de redirection utilisée lorsque l'application tourne sur iOS. | `fr.ign.guichet://callback-url` |
| `VITE_OAUTH_WEB_REDIRECT_URI` | URI de redirection utilisée en mode web, et valeur de repli si la plateforme n'est pas reconnue. | `http://localhost:5173/auth/callback` |

## API collaborative

### `VITE_BASE_API_URL`

Cette variable définit `config.api.baseUrl`.

Elle est utilisée dans :

- `src/infra/api/collabApiClient.ts`, pour instancier `ApiClient` ;
- `src/infra/auth/authService.ts`, pour configurer `AuthManager` ;
- `src/infra/community/communityApi.ts`, pour construire les URLs des endpoints de communautés.

Si la variable n'est pas renseignée, `env.ts` utilise la valeur par défaut :

```text
https://espacecollaboratif.ign.fr/api/
```

En pratique, il est préférable de la renseigner explicitement dans chaque environnement afin d'éviter de pointer accidentellement vers la production.

## OAuth, PKCE et Keycloak

Les variables OAuth sont regroupées dans `config.oAuth`.

### `VITE_OAUTH_CLIENT_ID`

Identifiant du client OAuth. Il doit correspondre au client configuré dans Keycloak pour l'application.

Il est utilisé par :

- `AuthManager`, pour initialiser le parcours de connexion ;
- `ApiClient`, pour configurer le client collaboratif avec l'authentification OAuth.

### `VITE_OAUTH_BASE_URL`

URL de base OpenID Connect du realm Keycloak.

Elle est transmise à `AuthManager` et à `ApiClient`. Elle doit pointer vers le realm et le protocole OpenID Connect, par exemple :

```text
https://auth.example.fr/auth/realms/<realm>/protocol/openid-connect/
```

### `VITE_OAUTH_ANDROID_REDIRECT_URI`

URI de callback utilisée lorsque Capacitor détecte la plateforme `android`.

La valeur doit être cohérente avec :

- la configuration du client OAuth dans Keycloak ;
- le schéma d'URL déclaré côté Android ;
- l'identifiant applicatif utilisé par la variante buildée.

### `VITE_OAUTH_IOS_REDIRECT_URI`

URI de callback utilisée lorsque Capacitor détecte la plateforme `ios`.

La valeur doit être cohérente avec :

- la configuration du client OAuth dans Keycloak ;
- le schéma d'URL déclaré côté iOS ;
- le bundle identifier utilisé par la variante buildée.

### `VITE_OAUTH_WEB_REDIRECT_URI`

URI de callback utilisée lorsque l'application tourne sur le web.

Elle sert aussi de valeur de repli dans `getRedirectUri()` si la plateforme retournée par Capacitor n'est ni `android`, ni `ios`, ni `web`.

En développement Vite, l'exemple attendu est :

```text
http://localhost:5173/auth/callback
```

### Cas particulier du développement local web

En local, `VITE_OAUTH_WEB_REDIRECT_URI` pointe généralement vers une URL `localhost`, par exemple `http://localhost:5173/auth/callback`. Cette URL permet à l'application web de recevoir le callback OAuth après la connexion Keycloak.

Le point bloquant arrive ensuite, au moment où l'application échange le code OAuth reçu contre des tokens auprès de Keycloak. Cette requête part depuis l'origine du navigateur, par exemple `http://localhost:5173`, vers le serveur d'authentification. Si cette origine locale n'est pas autorisée dans la configuration Keycloak, le serveur ne renvoie pas les en-têtes CORS attendus, notamment `Access-Control-Allow-Origin`. Le navigateur considère alors la réponse comme non lisible par l'application et bloque l'appel de récupération du token.

Ce blocage est spécifique au contexte web dans le navigateur :

- sur mobile natif, l'application utilise des schémas de redirection propres à Android ou iOS ;
- sur le web local, l'origine `localhost` doit être explicitement autorisée côté Keycloak pour que l'échange de token fonctionne sans contournement ;
- si `localhost` n'est pas dans la whitelist Keycloak, l'authentification peut revenir sur l'application, mais l'étape d'obtention du token API échoue côté navigateur à cause de CORS.

Le workaround utilisé côté client consiste à installer une extension navigateur capable de surcharger les en-têtes CORS des réponses, par exemple l'extension Chrome Moesif. L'extension ajoute ou modifie les en-têtes nécessaires pour que le navigateur accepte la réponse du serveur d'authentification pendant le développement local.

Ce contournement doit rester limité au développement :

- il ne modifie pas la configuration réelle de Keycloak ;
- il ne doit pas être utilisé pour valider un environnement de recette ou de production ;
- il masque uniquement un blocage CORS côté navigateur.

Si Keycloak rejette explicitement la requête avec une erreur de type `invalid_redirect_uri`, le problème est différent : l'URI `VITE_OAUTH_WEB_REDIRECT_URI` elle-même n'est pas autorisée comme redirect URI côté Keycloak. Dans ce cas, une extension CORS ne suffit pas ; il faut corriger la configuration du client Keycloak.

## Variables historiques ou secondaires

Les variables suivantes sont présentes dans `.env.dist` et encore mappées dans `src/shared/config/env.ts`, mais elles ne font pas partie des variables obligatoires pour le fonctionnement actuel décrit ci-dessus.

### Ancienne configuration d'authentification

| Variable | Mapping dans `env.ts` | Commentaire |
| --- | --- | --- |
| `VITE_COLLAB_API_CLIENT_ID` | `config.auth.clientId` en production | Ancienne configuration d'authentification production. |
| `VITE_COLLAB_API_CLIENT_SECRET` | `config.auth.clientSecret` en production | Valeur exposée côté front si elle est utilisée. À éviter pour un secret réel. |
| `VITE_BASE_AUTH_URL` | `config.auth.baseUrl` en production | Ancienne URL d'authentification production. |
| `VITE_QLF_COLLAB_API_CLIENT_ID` | `config.auth.clientId` en qualification | Ancienne configuration d'authentification qualification. |
| `VITE_QLF_COLLAB_API_CLIENT_SECRET` | `config.auth.clientSecret` en qualification | Valeur exposée côté front si elle est utilisée. À éviter pour un secret réel. |
| `VITE_QLF_BASE_AUTH_URL` | `config.auth.baseUrl` en qualification | Ancienne URL d'authentification qualification. |
| `VITE_USE_QUALIF` | `config.environment`, `config.isQualification`, `config.isProduction` | Si la valeur vaut exactement `true`, `env.ts` sélectionne la configuration `qualification` pour `config.auth`. |

Dans les usages actuels repérés, l'authentification active passe par `config.oAuth` et non par `config.auth`.

### Paramètres applicatifs

| Variable | Mapping dans `env.ts` | Valeur par défaut |
| --- | --- | --- |
| `VITE_APPLI` | `config.app.type` | `EspaceCo` |
| `VITE_APPLI_ID` | `config.app.id` | `fr.ign.guichet` |
| `VITE_APPLI_NAME` | `config.app.name` | `Espace collaboratif IGN` |
| `VITE_SECRET` | `config.app.secret` | chaîne vide |

Ces variables sont exposées par `config.app`, mais les variantes applicatives sont principalement préparées par les scripts `selectapp.js` et `prepare-app.js`, qui génèrent notamment `src/shared/config/appVariant.ts` à partir des configurations situées dans `scripts/EspaceCo/` et `scripts/NaviForest/`.

`VITE_SECRET` ne doit pas contenir de secret sensible : comme toute variable `VITE_`, sa valeur peut être incluse dans le bundle front-end.

## Exemple de fichier `.env`

Exemple minimal pour un environnement local :

```env
VITE_BASE_API_URL=https://espacecollaboratif.ign.fr/api/

VITE_OAUTH_CLIENT_ID=my_client_id
VITE_OAUTH_BASE_URL=https://auth.example.fr/auth/realms/my_realm/protocol/openid-connect/
VITE_OAUTH_ANDROID_REDIRECT_URI=fr.ign.espaceco://callback-url
VITE_OAUTH_IOS_REDIRECT_URI=fr.ign.guichet://callback-url
VITE_OAUTH_WEB_REDIRECT_URI=http://localhost:5173/auth/callback
```

## Points d'attention

- Après modification d'un fichier `.env`, il faut redémarrer le serveur Vite pour que les nouvelles valeurs soient prises en compte.
- Les variables `VITE_` sont disponibles côté navigateur et ne doivent pas contenir de secret serveur.
- Les redirect URIs OAuth doivent être déclarées côté Keycloak et correspondre aux schémas natifs configurés pour Android et iOS.
- En développement web local, `localhost` doit aussi être autorisé côté Keycloak pour éviter le blocage CORS lors de l'échange du code OAuth contre les tokens.
- `VITE_BASE_API_URL` possède une valeur de repli vers la production dans `env.ts`; une valeur explicite par environnement évite les erreurs de cible.
- Les variables OAuth sont les variables à privilégier pour l'authentification actuelle.
