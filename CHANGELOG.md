# Change Log

Tous les changements notables du projet sont documentés dans ce fichier.

Le format suit [Keep a Changelog](http://keepachangelog.com/)
et le projet suit [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

### Changed

### Fixed

## [0.0.7] - 2026-05-07

### Added

- Un double-tap sur le bouton de centrage vérouille maintenant le centrage, avec un recentrage déclenché toutes les 30 secondes (ticket #135)
- On peut maintenant visualiser un signalement sur la carte depuis le brouillon de celui-ci (ticket #100)
- Un appui long sur la carte ouvre maintenant une alerte pour proposer à l'utilisateur de créer un signalement à cet endroit, ou d'ouvrir cet endroit dans une appli de navigation (ticket #106)

### Changed

- La liste des thèmes proposés dans un nouveau signalement sont ceux par défaut (shared themes) si un utilisateur n'a as de groupe associé
- La position d'un signalement peut maintenant être modifiée lorsqu'on modifie un brouillon (ticket #103)
- Dans la page listant les signalements, ceux-ci s'affichent maintenant dans l'ordre décroissant par ID, et la date de mise à jour est également affichée dans la liste (ticket #102)
- La source du GPS n'est modifiable qu'en mode expert
- Le niveau de zoom au recentrage est passé de 13 à 16  (ticket #135)

### Fixed

- L'opacité des couches Géoservices (Plan IGN) fonctionne à présent (ticket #98)
- L'opacité des "groupes de couches" sont maintenant décorrélées des couches elles-mêmes (ticket #98)

## [0.0.6] - 2026-05-06

### Added

### Changed

- Un utilisateur qui n'a pas de groupe est maintenant redirigé vers la home page et non plus vers la page de choix de groupe après connexion

### Fixed

## [0.0.5] - 2026-04-30

### Added

- Choix du mode d'affichage (débutant, confirmé, expert) dans les paramètres de l'application
- Ajout des options de l'affichage de la carte (zoom, recherche, rotation) dans les paramètres de l'application
- Ajout du mode "no cache" dans l'app, et dans les paramètres de l'application
- Ajout des informations de "Maintenance" dans les paramètres de l'application

### Changed

- Le contenu de la page "A propos du guichet" affiche maintenant la valeur du champ editorial ou description du groupe. (ticket #118)
- Item "Guichet" du menu de gauche supprimé (ticket #92)
- La tab "Guichet" de la tabbar ouvre maintenant les couches du guichet utilisé (ticket #92)

### Fixed

- Les couches s'affichent maintenant dans le bon ordre

## [0.0.4] - 2026-04-27

### Added

- Support du more hors ligne (téléchargement de zones, couches, fonds de carte ; switch online/offline ; gestion du cache)
- Pages 'À propos du guichet'
- Pages 'À propos des signalements'

### Changed

### Fixed

## [0.0.3] - 2026-04-07

### Added

- Un utilisateur peut maintenant changer de groupe via la page Mes Groupes
- Un utilisateur peut maintemander demander à rejoindre un groupe via la page Mes Groupes
- L'app affiche maintenant un loader à l'ouverture, pour éviter un écran blanc de quelques secondes
- L'app pré-sélectionne automatiquement le dernier groupe actif, lors de la page de sélection après login (voir ticket #5)
- Ajout du lien "Mot de passe oublié"

### Changed

- Le module d'authentification a été externalisé dans le package mobile-core. La refonte utilise maintenant l'auth depuis ce package, et non plus localement.
- Remplacement des libellés "Profil actif" par "Groupe" (voir ticket #5)
- Ajustements de style dans divers endroits de l'app

### Fixed

- Lors de la sélection du groupe, un text "common.loading" s'affichait brièvement à l'appui sur le bouton. C'est corrigé. (voir ticket #5)

## [0.0.2] - 2026-03-27

### Added

- Ajout des contributions directes avec gestion des conflits

### Changed

### Fixed

- Résolution d'un problème provoquant un chargement à l'ouverture long, qui pouvait faire planter l'application

## [0.0.1] - 2026-03-23

### Added

- Implémentation basique des pages 'Aide' et 'À propos'.
- Meilleure gestion des erreurs et des logs d'erreurs.

### Changed

- La modale d'onboarding est maintenant affichée seulement après la fin de l'écran de chargement initial.
- Le chargement au démarrage est plus fluide, le timeout mieux géré.
- Le nom du groupe actif est maintenant affiché à la place du placeholder

### Fixed

- La déconnexion vide maintenant complètement la session locale, donc une réouverture de l'application renvoie bien vers la page de connexion.
- Sur mobile, fermer le navigateur de connexion sans se connecter réinitialise maintenant correctement le bouton "Se connecter".
- Au redémarrage de l'application, les utilisateurs connectés ne voient plus brièvement la page de connexion avant la redirection.
- Sur Android, le tap sur les boutons, switches et éléments de menu ne montre plus le "highlight" bleu.
